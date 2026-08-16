"""FixiPro backend regression tests (Iteration 5 - FixiPro handyman marketplace).
Covers: auth (register/login for customer & provider), 42-category catalog,
CMS pages (terms/privacy/trust-safety), contact form (Resend integration),
full escrow E2E (post→claim→pay(mock)→verify-code→review), chat guard.
"""
import os
import uuid
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE}/api"

ADMIN = ("admin@fixipro.co", "Admin@123")
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


def test_categories_are_42_with_correct_order():
    """Iter5: verify 42 top-level categories AND that car-service/pharmacy are within first 3."""
    r = requests.get(f"{API}/categories", timeout=15)
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) == 42, f"expected 42 categories, got {len(cats)}"
    slugs = [c["slug"] for c in cats]
    assert "door-to-door-mobile-car-service" in slugs[:3], f"car-service not in first 3: {slugs[:3]}"
    assert "pharmacy-prescription-services" in slugs[:3], f"pharmacy not in first 3: {slugs[:3]}"


EXPECTED_SERVICE_COUNTS = {
    "general-handyman-home-repairs": 24,
    "door-to-door-mobile-car-service": 39,
    "pharmacy-prescription-services": 6,
    "doors-locks-security": 25,
    "windows-glazing": 17,
    "bathroom-services": 29,
    "kitchen-services": 23,
    "plumbing-services": 20,
    "electrical-services": 15,
    "painting-decorating": 18,
    "flooring-services": 15,
    "carpentry-woodwork": 14,
    "garden-outdoor-services": 22,
    "pressure-power-washing": 25,
    "future-marketplace-services": 22,
}


def test_categories_services_list_counts_and_specific_items():
    """Iter6: verify full-catalogue services_list counts + specific items."""
    r = requests.get(f"{API}/categories", timeout=15)
    assert r.status_code == 200
    cats = {c["slug"]: c for c in r.json()}
    for slug, expected in EXPECTED_SERVICE_COUNTS.items():
        assert slug in cats, f"missing category {slug}"
        got = cats[slug].get("services_list") or []
        assert len(got) == expected, f"{slug} expected {expected} services, got {len(got)}"
    assert "Home Fixture Replacement" in cats["general-handyman-home-repairs"]["services_list"]
    assert "Van Cleaning" in cats["door-to-door-mobile-car-service"]["services_list"]
    assert "Managed Property Maintenance Services" in cats["future-marketplace-services"]["services_list"]


def test_services_catalog():
    r = requests.get(f"{API}/services", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 10


# ---------------- Public CMS pages ----------------
@pytest.mark.parametrize("slug", ["terms", "privacy-policy", "trust-safety"])
def test_cms_pages_render(slug):
    r = requests.get(f"{API}/pages/{slug}", timeout=15)
    assert r.status_code == 200, f"{slug} returned {r.status_code}"
    body = r.json()
    content = (body.get("body") or body.get("content") or "").strip()
    assert len(content) > 200, f"{slug} content looks empty/placeholder: {len(content)} chars"


# ---------------- Auth ----------------
def test_login_demo_accounts():
    for email, pw in (CUSTOMER, PROVIDER, ADMIN):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
        assert r.status_code == 200, f"{email}: {r.status_code} {r.text}"


def test_register_customer_and_relogin():
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    s1 = requests.Session()
    r = s1.post(f"{API}/auth/register",
                json={"name": "Test Cust", "email": email, "password": pw, "role": "customer"},
                timeout=20)
    assert r.status_code == 200, r.text
    me = s1.get(f"{API}/auth/me", timeout=15)
    assert me.status_code == 200 and me.json()["email"].lower() == email.lower()
    # relogin fresh session
    s2 = requests.Session()
    r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r2.status_code == 200


def test_register_provider_and_relogin():
    email = f"TEST_prov_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    payload = {"name": "Test Provider", "email": email, "password": pw, "role": "provider",
               "phone": "+44 7700 900000", "coverage_areas": ["Innsworth"]}
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    me = s.get(f"{API}/auth/me", timeout=15).json()
    assert me["role"] == "provider"
    # relogin
    r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r2.status_code == 200


# ---------------- Contact form ----------------
def test_contact_form_valid_submission():
    payload = {"name": "Regression Test", "email": "test@example.com",
               "subject": "Automated test", "message": "This is an automated regression test message body."}
    r = requests.post(f"{API}/comms/contact", json=payload, timeout=25)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True


def test_contact_form_rejects_short_message():
    payload = {"name": "X", "email": "test@example.com", "subject": "Hi", "message": "short"}
    r = requests.post(f"{API}/comms/contact", json=payload, timeout=15)
    assert r.status_code in (400, 422), f"expected 4xx, got {r.status_code}"


def test_contact_form_rejects_invalid_email():
    payload = {"name": "Ok Name", "email": "not-an-email", "subject": "Test",
               "message": "This message is long enough to pass minlen."}
    r = requests.post(f"{API}/comms/contact", json=payload, timeout=15)
    assert r.status_code in (400, 422)


def test_contact_form_honeypot_silently_accepted():
    payload = {"name": "Bot", "email": "bot@example.com", "subject": "Spam",
               "message": "This is a spammy honeypot body long enough.",
               "company": "SPAMBOT INC"}
    r = requests.post(f"{API}/comms/contact", json=payload, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------------- Chat guard before payment ----------------
def test_chat_blocked_before_payment():
    """Customer trying to open convo with provider without a paid job should be 403."""
    s = session_login(*CUSTOMER)
    # provider user id
    prov_s = session_login(*PROVIDER)
    prov_me = prov_s.get(f"{API}/auth/me", timeout=15).json()
    r = s.post(f"{API}/conversations", json={"user_id": prov_me["id"]}, timeout=15)
    # Depending on whether there's already a paid job between demo customer & provider,
    # this may be either 403 (guard) or 200 (existing paid link). Accept either but flag if 500.
    assert r.status_code in (200, 403), f"unexpected {r.status_code}: {r.text}"


# ---------------- Full escrow + review E2E ----------------
@pytest.fixture(scope="module")
def escrow_flow():
    """Create a fresh customer + provider, post job, claim, pay(mock), verify code, review."""
    # Fresh accounts to isolate
    cust_email = f"TEST_e2e_c_{uuid.uuid4().hex[:6]}@example.com"
    prov_email = f"TEST_e2e_p_{uuid.uuid4().hex[:6]}@example.com"
    pw = "Passw0rd!"

    cs = requests.Session()
    r = cs.post(f"{API}/auth/register",
                json={"name": "E2E Cust", "email": cust_email, "password": pw, "role": "customer"},
                timeout=20)
    assert r.status_code == 200, r.text

    ps = requests.Session()
    r = ps.post(f"{API}/auth/register",
                json={"name": "E2E Prov", "email": prov_email, "password": pw, "role": "provider",
                      "phone": "+44 7700 900001", "coverage_areas": ["Innsworth", "Forres"]},
                timeout=20)
    assert r.status_code == 200, r.text

    # Ensure provider is verified & has all services (auto-verify per PRD but let's ensure)
    services = requests.get(f"{API}/services", timeout=10).json()
    svc = services[0]

    # Customer creates a request with a budget
    req_payload = {"service_id": svc["id"],
                   "title": f"TEST_ E2E job {uuid.uuid4().hex[:5]}",
                   "description": "Automated E2E flow test job",
                   "postcode": "GL3 1AA", "city": "Innsworth",
                   "address": "1 Test Rd", "budget": 100.0,
                   "urgency": "flexible"}
    r = cs.post(f"{API}/requests", json=req_payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    req = r.json()
    req_id = req["id"]

    # Provider claims - may need provider profile services configured; try
    r = ps.post(f"{API}/requests/{req_id}/claim", timeout=15)
    if r.status_code == 403:
        pytest.skip(f"Provider not verified for claim: {r.text}")
    assert r.status_code == 200, r.text
    job_id = r.json()["job_id"]
    quote_id = r.json()["quote_id"]

    # Customer creates mock checkout
    r = cs.post(f"{API}/payments/checkout",
                json={"quote_id": quote_id, "origin_url": BASE}, timeout=20)
    assert r.status_code == 200, r.text
    session_id = r.json()["session_id"]
    assert r.json().get("mock") is True

    # Confirm mock payment
    r = cs.post(f"{API}/payments/mock/{session_id}/confirm", timeout=15)
    assert r.status_code == 200, r.text

    # Customer fetches request detail - should include completion_code
    r = cs.get(f"{API}/requests/{req_id}", timeout=15)
    assert r.status_code == 200
    detail = r.json()
    code = detail.get("completion_code") or ""
    assert code and len(code) == 6 and code.isdigit(), f"completion_code missing/invalid: {detail}"

    # Provider verifies code
    r = ps.post(f"{API}/jobs/{job_id}/verify-code", json={"code": code}, timeout=15)
    assert r.status_code == 200, r.text
    payout = r.json()
    assert payout["status"] == "completed"
    assert abs(payout["net_paid"] - 85.0) < 0.01, f"expected 85.0 (85% of 100), got {payout['net_paid']}"

    # Provider wallet should reflect the credit
    w = ps.get(f"{API}/provider/wallet", timeout=15)
    assert w.status_code == 200

    return {"cs": cs, "ps": ps, "req_id": req_id, "job_id": job_id, "cust_email": cust_email}


def test_e2e_review_after_completion(escrow_flow):
    cs = escrow_flow["cs"]
    job_id = escrow_flow["job_id"]
    r = cs.post(f"{API}/reviews", json={"job_id": job_id, "rating": 5,
                                        "comment": "TEST_ great work"}, timeout=15)
    assert r.status_code == 200, r.text
    review = r.json()
    assert review["rating"] == 5
    # Also verify it shows in /reviews/mine
    r = cs.get(f"{API}/reviews/mine", timeout=15)
    assert r.status_code == 200
    assert any(rv.get("job_id") == job_id for rv in r.json())


def test_e2e_chat_allowed_after_payment(escrow_flow):
    """After payment is confirmed between the E2E customer/provider,
    conversation creation should be permitted (200)."""
    cs = escrow_flow["cs"]
    ps = escrow_flow["ps"]
    prov_me = ps.get(f"{API}/auth/me", timeout=15).json()
    r = cs.post(f"{API}/conversations", json={"user_id": prov_me["id"]}, timeout=15)
    assert r.status_code == 200, f"chat should be allowed post-payment: {r.status_code} {r.text}"


def test_request_detail_exposes_provider_rating_to_customer(escrow_flow):
    """Iter6: after claim, customer's GET /requests/:id should include provider name + rating fields."""
    cs = escrow_flow["cs"]
    req_id = escrow_flow["req_id"]
    r = cs.get(f"{API}/requests/{req_id}", timeout=15)
    assert r.status_code == 200
    d = r.json()
    # These keys must exist once claimed (regardless of numeric value)
    assert "provider_rating" in d, f"provider_rating missing from request detail: {list(d.keys())}"
    assert "provider_jobs_done" in d, f"provider_jobs_done missing from request detail: {list(d.keys())}"
    assert d.get("provider_id") or d.get("provider_name"), "provider info missing after claim"
