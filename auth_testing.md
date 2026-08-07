# Auth Testing Playbook

## Test Accounts
- Super Admin: saaimszn@gmail.com / Admin@123 (role: super_admin)
- Customer: customer@example.com / Customer@123 (Emma Thompson)
- Provider: provider@example.com / Provider@123 (James Carter, verified: Carter Home Services Ltd)

## Email/Password Endpoints (all under /api/auth)
- POST /register {name, email, password, role: customer|provider}
- POST /login {email, password} → sets httpOnly access_token + refresh_token cookies
- POST /logout → clears access_token, refresh_token, session_token; deletes Google session row
- GET /me (accepts access_token cookie, session_token cookie, or Bearer of either)
- POST /refresh
- POST /forgot-password {email} → logs reset link to backend console
- POST /reset-password {token, password}
- POST /change-password {old_password, new_password}
- POST /security/2fa {enabled: bool}

## Google OAuth (Emergent-managed)
- Frontend button redirects to https://auth.emergentagent.com/?redirect=<origin>/oauth/callback?role=<customer|provider>
  (redirect URL is built from window.location.origin — never hardcoded)
- Emergent returns to /oauth/callback#session_id=... — App.js AppRouter detects hash during render → AuthCallback
- AuthCallback POSTs /api/auth/google/session {session_id, role}
- Backend exchanges session_id at https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data (X-Session-ID header), links/creates user by email, stores row in user_sessions (7-day expiry, TTL index), sets httpOnly session_token cookie
- Existing accounts keep their role (e.g. saaimszn@gmail.com Google sign-in → super_admin). New accounts get the chosen role.

## Google flow test without a real Google account
```
mongosh test_database --eval '
var uid = ObjectId().toString();
db.users.insertOne({_id: ObjectId(uid), email:"google.test@example.com", name:"Google Test", role:"customer", phone:"", status:"active", two_factor_enabled:false, favourites:[], auth_provider:"google", created_at:new Date()});
db.user_sessions.insertOne({user_id: uid, session_token:"test_session_google_1", expires_at:new Date(Date.now()+7*864e5), created_at:new Date()});
'
curl -s -H "Authorization: Bearer test_session_google_1" $API/api/auth/me
# expect user object for google.test@example.com
# cleanup: db.user_sessions.deleteMany({session_token:/test_session/}); db.users.deleteMany({email:/google\.test/})
```
Invalid session_id to /api/auth/google/session must return 401.

## API Checks
```
curl -c /tmp/c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"saaimszn@gmail.com","password":"Admin@123"}'
curl -b /tmp/c.txt $API/api/auth/me
```

## Mongo Checks
```
mongosh test_database --eval 'db.users.find({role:"super_admin"},{email:1,role:1})'
```
Indexes: users.email unique; login_attempts.identifier; password_reset_tokens.expires_at TTL; user_sessions.session_token unique + expires_at TTL.
Brute force: 5 failed logins on same email+IP (X-Forwarded-For aware) locks for 15 minutes (429).
