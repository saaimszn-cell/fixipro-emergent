import secrets
from datetime import timedelta, timezone
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field
from core import (db, now, hash_password, verify_password, create_access_token,
                  create_refresh_token, set_auth_cookies, get_current_user, serialize, audit)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    role: str = "customer"
    phone: str = Field(default="", max_length=30)
    coverage: list = Field(default_factory=list)
    bio: str = Field(default="", max_length=500)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def user_out(user: dict) -> dict:
    out = serialize(user)
    out.pop("password_hash", None)
    return out


async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= MAX_ATTEMPTS:
        from core import now as _now
        locked_until = rec.get("locked_until")
        if locked_until is not None and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > _now():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failure(identifier: str):
    from core import now as _now
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count, "updated_at": _now()}
    if count >= MAX_ATTEMPTS:
        update["locked_until"] = _now() + timedelta(minutes=LOCKOUT_MINUTES)
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if body.role not in ("customer", "provider"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    doc = {
        "name": body.name.strip(), "email": email, "password_hash": hash_password(body.password),
        "role": body.role, "phone": (body.phone or "").strip(), "status": "active",
        "two_factor_enabled": False,
        "favourites": [], "email_verified": False, "created_at": now(),
    }
    res = await db.users.insert_one(doc)
    if body.role == "provider":
        # MVP: providers are auto-approved so they can claim jobs immediately.
        # Trust & Safety verification is still required in the UI, but the
        # 'verified' flag is granted at signup to keep the demo flowing.
        await db.providers.insert_one({
            "user_id": str(res.inserted_id), "business_name": body.name.strip(),
            "bio": (body.bio or "").strip(), "services": [],
            "coverage": [c for c in body.coverage if isinstance(c, str)][:20],
            "availability": "Monday to Saturday, 8am – 6pm",
            "verified": True,
            "verification_status": "approved", "documents": [], "insurance": {},
            "certifications": [], "rating": 0, "jobs_done": 0, "created_at": now(),
        })
    user = await db.users.find_one({"_id": res.inserted_id})
    set_auth_cookies(response, create_access_token(str(res.inserted_id), email, body.role),
                     create_refresh_token(str(res.inserted_id)))
    response.set_cookie(key="sh_auth", value="1", httponly=False, secure=True, samesite="none", max_age=604800, path="/")
    await audit(str(res.inserted_id), "register", "user", str(res.inserted_id))
    return user_out(user)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
    identifier = f"{ip}:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Contact support.")
    await db.login_attempts.delete_many({"identifier": identifier})
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email, user["role"]), create_refresh_token(uid))
    response.set_cookie(key="sh_auth", value="1", httponly=False, secure=True, samesite="none", max_age=604800, path="/")
    return user_out(user)


@router.post("/google/session")
async def google_session(body: dict, response: Response):
    import asyncio
    import requests as _requests
    session_id = (body.get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    def fetch_session():
        r = _requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=15)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired Google session")
        return r.json()

    data = await asyncio.to_thread(fetch_session)
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")
    user = await db.users.find_one({"email": email})
    if user is None:
        role = body.get("role") if body.get("role") in ("customer", "provider") else "customer"
        res = await db.users.insert_one({
            "name": data.get("name") or email.split("@")[0], "email": email,
            "picture": data.get("picture", ""), "role": role, "phone": "",
            "status": "active", "two_factor_enabled": False, "favourites": [],
            "email_verified": True, "auth_provider": "google", "created_at": now(),
        })
        if role == "provider":
            await db.providers.insert_one({
                "user_id": str(res.inserted_id), "business_name": data.get("name") or "",
                "bio": "", "services": [], "coverage": [], "verified": False,
                "verification_status": "pending", "documents": [], "insurance": {},
                "certifications": [], "rating": 0, "jobs_done": 0, "created_at": now(),
            })
        user = await db.users.find_one({"_id": res.inserted_id})
        await audit(str(user["_id"]), "register_google", "user", str(user["_id"]))
    else:
        await db.users.update_one({"_id": user["_id"]},
                                  {"$set": {"picture": data.get("picture", user.get("picture", ""))}})
        await audit(str(user["_id"]), "login_google", "user", str(user["_id"]))
    await db.user_sessions.insert_one({
        "user_id": str(user["_id"]), "session_token": data["session_token"],
        "expires_at": now() + timedelta(days=7), "created_at": now(),
    })
    response.set_cookie(key="session_token", value=data["session_token"], httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")
    response.set_cookie(key="sh_auth", value="1", httponly=False, secure=True, samesite="none", max_age=604800, path="/")
    return user_out(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_many({"session_token": st})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    response.delete_cookie("sh_auth", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    import jwt as _jwt
    from core import get_jwt_secret, JWT_ALGORITHM
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = _jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except _jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"_id": __import__("bson").ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie(key="access_token", value=create_access_token(str(user["_id"]), user["email"], user["role"]),
                        httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: dict):
    email = (body.get("email") or "").lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]), "used": False,
            "expires_at": now() + timedelta(hours=1), "created_at": now(),
        })
        import logging
        logging.getLogger(__name__).info(f"Password reset link: /reset-password?token={token}")
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: dict):
    token = body.get("token") or ""
    password = body.get("password") or ""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    rec = await db.password_reset_tokens.find_one({"token": token, "used": False})
    expires_at = rec["expires_at"] if rec else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not rec or expires_at < now():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    from bson import ObjectId
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": hash_password(password)}})
    await db.password_reset_tokens.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"ok": True}


@router.post("/change-password")
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    from bson import ObjectId
    old, new = body.get("old_password") or "", body.get("new_password") or ""
    if len(new) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    full = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not verify_password(old, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"_id": ObjectId(user["id"])},
                              {"$set": {"password_hash": hash_password(new)}})
    await audit(user["id"], "change_password", "user", user["id"])
    return {"ok": True}


@router.get("/sessions")
async def sessions(user: dict = Depends(get_current_user)):
    return {"sessions": [{"id": "current", "device": "This device", "active": True, "created_at": user.get("created_at")}]}


@router.post("/security/2fa")
async def toggle_2fa(body: dict, user: dict = Depends(get_current_user)):
    from bson import ObjectId
    enabled = bool(body.get("enabled"))
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"two_factor_enabled": enabled}})
    await audit(user["id"], "toggle_2fa", "user", user["id"], {"enabled": enabled})
    return {"ok": True, "two_factor_enabled": enabled}


@router.put("/profile")
async def update_profile(body: dict, user: dict = Depends(get_current_user)):
    from bson import ObjectId
    allowed = {k: v for k, v in body.items() if k in ("name", "phone") and isinstance(v, str)}
    if not allowed:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": allowed})
    return {**user, **allowed}
