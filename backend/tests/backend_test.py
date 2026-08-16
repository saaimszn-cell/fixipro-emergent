"""FixiPro backend API integration tests."""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://brand-refresh-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = ("saaimszn@gmail.com", "Admin@123")
CUSTOMER = ("customer@example.com", "Customer@123")
PROVIDER = ("provider@example.com", "Provider@123")


def session_login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return s


# ---------------- Health / catalog ----------------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_services_catalog():
    r = requests.get(f"{API}/services", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 10


def test_categories():
    r = requests.get(f"{API}/categories", timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ---------------- FixiPro rebrand + 15% commission sanity ----------------
def test_root_api_is_fixipro():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("message") == "FixiPro API"


def test_categories_count_and_new_ones():
    r = requests.get(f"{API}/categories", timeout=15)
    assert r.status_code == 200
    cats = r.json()
    slugs = {c.get("slug") for c in cats}
    assert len(cats) == 8, f"expected 8 categories, got {len(cats)}: {slugs}"
    assert "general-repairs" in slugs
    assert "appliance-repair" in slugs


def test_services_count_19():
    r = requests.get(f"{API}/services", timeout=15)
    assert r.status_code == 200
    services = r.json()
    assert len(services) == 19, f"expected 19 services, got {len(services)}"


def test_settings_support_email_and_fee():
    """Admin can read settings collection — verify hello.fixipro@gmail.com and 15% fee."""
    s = session_login(*ADMIN)
    r = s.get(f"{API}/admin/collection/settings", timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    kv = {i.get("key"): i.get("value") for i in items if isinstance(i, dict)}
    assert kv.get("support_email") == "hello.fixipro@gmail.com", f"support_email={kv.get('support_email')}"
    assert kv.get("site_name") == "FixiPro"
    # platform fee may be stored either in settings collection or hardcoded — verify constant via math
    # (checked in test_15pct_fee_math)


def test_15pct_fee_math_constant():
    """Verify PLATFORM_FEE_PCT constant in core.py is 15.0 (parse without importing)."""
    with open("/app/backend/core.py") as f:
        src = f.read()
    assert "PLATFORM_FEE_PCT = 15.0" in src, "PLATFORM_FEE_PCT must be 15.0"




# ---------------- Auth ----------------
def test_login_all_three_roles():
    for email, pw in (ADMIN, CUSTOMER, PROVIDER):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
        assert r.status_code == 200, f"{email}: {r.text}"
        j = r.json()
        assert j.get("email") == email
        assert "password_hash" not in j


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": CUSTOMER[0], "password": "wrong-xyz"}, timeout=15)
    assert r.status_code in (401, 429)


def test_register_and_me():
    email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Passw0rd!", "role": "customer"}, timeout=20)
    assert r.status_code == 200, r.text
    r2 = s.get(f"{API}/auth/me", timeout=15)
    assert r2.status_code == 200
    assert r2.json()["email"] == email


def test_forgot_password_ok():
    r = requests.post(f"{API}/auth/forgot-password", json={"email": CUSTOMER[0]}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------------- Customer flow ----------------
def test_customer_dashboard_and_requests():
    s = session_login(*CUSTOMER)
    r = s.get(f"{API}/requests/mine", timeout=15)
    assert r.status_code == 200
    reqs = r.json()
    assert isinstance(reqs, list)
    # There should be a seeded request
    assert any("Kitchen" in (x.get("title") or "") for x in reqs), f"seeded request missing: {reqs}"


def test_customer_create_request():
    s = session_login(*CUSTOMER)
    # need a service_id
    services = requests.get(f"{API}/services", timeout=10).json()
    svc = services[0]
    payload = {
        "service_id": svc["id"],
        "title": f"TEST_ request {uuid.uuid4().hex[:6]}",
        "description": "Automated test request",
        "postcode": "SW1A 1AA",
    }
    r = s.post(f"{API}/requests", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("title") == payload["title"]


# ---------------- Provider ----------------
def test_provider_browse_open_requests():
    s = session_login(*PROVIDER)
    r = s.get(f"{API}/requests/open", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_provider_dashboard_stats():
    # Provider stats are aggregated client-side from /provider/earnings + /provider/wallet
    s = session_login(*PROVIDER)
    e = s.get(f"{API}/provider/earnings", timeout=15)
    w = s.get(f"{API}/provider/wallet", timeout=15)
    assert e.status_code == 200 and w.status_code == 200


# ---------------- Admin ----------------
def test_admin_stats():
    s = session_login(*ADMIN)
    r = s.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_admin_users_list():
    s = session_login(*ADMIN)
    r = s.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list) and len(users) >= 3


def test_admin_payments_list():
    s = session_login(*ADMIN)
    r = s.get(f"{API}/payments/mine", timeout=15)
    assert r.status_code == 200


def test_role_isolation_customer_cannot_admin():
    s = session_login(*CUSTOMER)
    r = s.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code in (401, 403)


def test_unauthenticated_dashboard_blocked():
    r = requests.get(f"{API}/requests/mine", timeout=10)
    assert r.status_code in (401, 403)


# ---------------- AI ----------------
def test_ai_assistant_configs():
    s = session_login(*ADMIN)
    r = s.get(f"{API}/admin/collection/ai_configs", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 4, f"expected 4 AI configs, got {len(data)}"


# ---------------- Comms ----------------
def test_comms_conversations():
    s = session_login(*ADMIN)
    r = s.get(f"{API}/comms/conversations", timeout=15)
    assert r.status_code == 200


# ---------------- Payments checkout (light) ----------------
def test_customer_can_view_payments():
    s = session_login(*CUSTOMER)
    r = s.get(f"{API}/payments/mine", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_brute_force_lockout():
    email = f"bruteforce_{uuid.uuid4().hex[:6]}@example.com"
    # Register user
    r = requests.post(f"{API}/auth/register", json={"name": "Brute", "email": email, "password": "Passw0rd!", "role": "customer"}, timeout=15)
    assert r.status_code == 200
    got_429 = False
    # Force same X-Forwarded-For so identifier is stable across attempts
    headers = {"X-Forwarded-For": "203.0.113.77"}
    for _ in range(7):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"}, headers=headers, timeout=15)
        if r.status_code == 429:
            got_429 = True
            break
    assert got_429, "Expected 429 lockout after repeated failures"


# ---------------- Google OAuth session ----------------
def test_google_session_invalid_returns_401():
    r = requests.post(f"{API}/auth/google/session", json={"session_id": "bogus_invalid_xyz", "role": "customer"}, timeout=20)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"


def test_google_manual_session_insert():
    """Manually insert user_sessions row and hit /me with Bearer session_token per auth_testing.md."""
    import subprocess
    from bson import ObjectId  # type: ignore
    uid = str(ObjectId())
    token = f"test_session_google_{uuid.uuid4().hex[:8]}"
    email = f"google.test.{uuid.uuid4().hex[:6]}@example.com"
    mongo_js = f'''
db = db.getSiblingDB("test_database");
db.users.insertOne({{_id: ObjectId("{uid}"), email:"{email}", name:"Google Test", role:"customer", phone:"", status:"active", two_factor_enabled:false, favourites:[], auth_provider:"google", created_at:new Date()}});
db.user_sessions.insertOne({{user_id: "{uid}", session_token:"{token}", expires_at:new Date(Date.now()+7*864e5), created_at:new Date()}});
'''
    res = subprocess.run(["mongosh", "--quiet", "--eval", mongo_js], capture_output=True, text=True, timeout=15)
    assert res.returncode == 0, f"mongosh setup failed: {res.stderr}"
    try:
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, f"/me with bearer session_token failed: {r.status_code} {r.text}"
        assert r.json().get("email") == email
        # Bearer session_token also works on protected endpoints
        r2 = requests.get(f"{API}/requests/mine", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r2.status_code == 200, r2.text
        assert isinstance(r2.json(), list)
    finally:
        cleanup = f'''
db = db.getSiblingDB("test_database");
db.user_sessions.deleteMany({{session_token:"{token}"}});
db.users.deleteMany({{email:"{email}"}});
'''
        subprocess.run(["mongosh", "--quiet", "--eval", cleanup], capture_output=True, text=True, timeout=15)
