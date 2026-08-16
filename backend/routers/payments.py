import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from core import (db, now, oid, serialize, serialize_list, get_current_user, require_roles,
                  notify, audit, generate_completion_code, hash_completion_code)

router = APIRouter(tags=["payments"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Services marketplace, no digital catalog -> Stripe Tax calculation mode.
TAX_MODE = "calc_only"


class CheckoutIn(BaseModel):
    quote_id: str
    origin_url: str


async def mark_paid(session_id: str, obj: dict):
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "stripe_payment_intent_id": obj.get("payment_intent"),
                  "updated_at": now()}})
    if res.modified_count:
        txn = await db.payment_transactions.find_one({"session_id": session_id})
        if txn and txn.get("job_id"):
            # Generate a single-use completion code for this job and store the hash.
            # Plaintext is retained ONLY so the customer can see it in their dashboard.
            code = generate_completion_code()
            code_hash = hash_completion_code(code)
            await db.jobs.update_one({"_id": oid(txn["job_id"])}, {
                "$set": {
                    "status": "scheduled",
                    "completion_code_hash": code_hash,
                    "completion_code_plaintext": code,
                    "code_attempts": 0,
                },
                "$push": {"timeline": {"status": "paid", "at": now()}},
            })
            job = await db.jobs.find_one({"_id": oid(txn["job_id"])})
            if job:
                await notify(job["provider_id"], "Job paid & scheduled",
                             f"Payment received for '{job['title']}'. Ask the customer for their completion code when finished.",
                             "payment", "/pro/jobs")
                await notify(job["customer_id"], "Payment received",
                             f"Your payment for '{job['title']}' is held securely. Share your completion code with the handyman only when the work is done.",
                             "payment", f"/dashboard/requests/{job['request_id']}")


@router.post("/payments/checkout")
async def create_checkout(body: CheckoutIn, user: dict = Depends(require_roles("customer"))):
    quote = await db.quotes.find_one({"_id": oid(body.quote_id)})
    if not quote or quote["status"] != "accepted":
        raise HTTPException(status_code=404, detail="Accepted quote not found")
    job = await db.jobs.find_one({"quote_id": body.quote_id})
    if not job or job["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    existing = await db.payment_transactions.find_one({"job_id": str(job["_id"]), "payment_status": "paid"})
    if existing:
        raise HTTPException(status_code=409, detail="Job already paid")

    # ==== MOCK PAYMENT PATH (no Stripe key configured) ====
    # Real Stripe keys are not configured (STRIPE_SECRET_KEY missing / demo).
    # We simulate a successful checkout & funds-held-in-escrow flow so the
    # completion-code / payout logic is fully testable end-to-end.
    # TO GO LIVE: set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) in backend/.env.
    key = stripe.api_key or ""
    use_mock = (not key) or key in ("sk_test_emergent", "sk_test_placeholder")
    if use_mock:
        import secrets as _secrets
        session_id = f"mock_cs_{_secrets.token_hex(12)}"
        await db.payment_transactions.update_one(
            {"job_id": str(job["_id"]), "payment_status": {"$in": ["pending", "failed", "expired"]}},
            {"$set": {"status": "superseded", "updated_at": now()}}, )
        await db.payment_transactions.insert_one({
            "session_id": session_id, "user_id": user["id"], "job_id": str(job["_id"]),
            "quote_id": body.quote_id, "amount": job["amount"], "currency": "gbp",
            "title": job["title"], "status": "initiated", "payment_status": "pending",
            "mock": True, "created_at": now(), "updated_at": now(),
        })
        # In MOCK mode we redirect straight to our internal success page — the
        # customer confirms the mock payment there (see /api/payments/mock/{session_id}/confirm).
        checkout_url = f"{body.origin_url}/payment/success?session_id={session_id}&mock=1"
        await audit(user["id"], "checkout_created_mock", "job", str(job["_id"]))
        return {"checkout_url": checkout_url, "session_id": session_id, "mock": True}

    amount_pence = int(round(job["amount"] * 100))
    kwargs = dict(
        line_items=[{
            "price_data": {
                "currency": "gbp",
                "unit_amount": amount_pence,
                "product_data": {"name": f"FixiPro: {job['service_name']}",
                                 "description": job["title"]},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/payment/cancel",
        metadata={"user_id": user["id"], "job_id": str(job["_id"]), "quote_id": body.quote_id},
    )
    try:
        session = stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True},
                                                 billing_address_collection="required")
    except stripe.error.InvalidRequestError:
        session = stripe.checkout.Session.create(**kwargs)
    await db.payment_transactions.update_one(
        {"job_id": str(job["_id"]), "payment_status": {"$in": ["pending", "failed", "expired"]}},
        {"$set": {"status": "superseded", "updated_at": now()}}, )
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"], "job_id": str(job["_id"]),
        "quote_id": body.quote_id, "amount": job["amount"], "currency": "gbp",
        "title": job["title"], "status": "initiated", "payment_status": "pending",
        "created_at": now(), "updated_at": now(),
    })
    await audit(user["id"], "checkout_created", "job", str(job["_id"]))
    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/payments/mock/{session_id}/confirm")
async def confirm_mock_payment(session_id: str, user: dict = Depends(require_roles("customer"))):
    """Confirm a MOCK payment (used only when no live Stripe key is present).
    This simulates the webhook -> mark_paid transition so escrow logic runs."""
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not txn.get("mock"):
        raise HTTPException(status_code=400, detail="Not a mock transaction")
    await mark_paid(session_id, {"payment_intent": f"mock_pi_{session_id[-10:]}"})
    return {"ok": True, "session_id": session_id, "payment_status": "paid"}


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid" and not record.get("mock"):
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await mark_paid(session_id, {"payment_intent": s.payment_intent})
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "job_id": record.get("job_id"),
            "mock": bool(record.get("mock"))}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await mark_paid(obj["id"], obj)
    elif t in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        await db.payment_transactions.update_one({"session_id": obj["id"]},
                                                 {"$set": {"status": t.rsplit(".", 1)[-1],
                                                           "payment_status": "failed", "updated_at": now()}})
    elif t == "charge.refunded":
        await db.payment_transactions.update_one(
            {"stripe_payment_intent_id": obj.get("payment_intent")},
            {"$set": {"status": "refunded", "payment_status": "refunded", "updated_at": now()}})
    return {"status": "ok"}


@router.get("/payments/mine")
async def my_payments(user: dict = Depends(get_current_user)):
    if user["role"] == "customer":
        items = await db.payment_transactions.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    elif user["role"] == "provider":
        jobs = await db.jobs.find({"provider_id": user["id"]}).to_list(500)
        job_ids = [str(j["_id"]) for j in jobs]
        items = await db.payment_transactions.find({"job_id": {"$in": job_ids}}).sort("created_at", -1).to_list(200)
    else:
        items = await db.payment_transactions.find().sort("created_at", -1).to_list(300)
    return serialize_list(items)


@router.get("/invoices/mine")
async def my_invoices(user: dict = Depends(get_current_user)):
    query = {"payment_status": "paid"}
    if user["role"] == "customer":
        query["user_id"] = user["id"]
    items = await db.payment_transactions.find(query).sort("created_at", -1).to_list(200)
    out = serialize_list(items)
    for i, inv in enumerate(out):
        inv["invoice_no"] = f"INV-{str(inv['created_at'])[:10].replace('-', '')}-{i + 1001}"
    return out


@router.post("/payments/{session_id}/refund")
async def refund_payment(session_id: str, user: dict = Depends(require_roles("admin", "super_admin"))):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn or txn.get("payment_status") != "paid":
        raise HTTPException(status_code=404, detail="Paid transaction not found")
    if not txn.get("stripe_payment_intent_id"):
        raise HTTPException(status_code=400, detail="No payment intent on record")
    stripe.Refund.create(payment_intent=txn["stripe_payment_intent_id"])
    await db.payment_transactions.update_one({"session_id": session_id},
                                             {"$set": {"status": "refunded", "payment_status": "refunded",
                                                       "updated_at": now()}})
    await audit(user["id"], "refund", "payment", session_id)
    return {"ok": True}
