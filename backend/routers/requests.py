from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from bson import ObjectId
from core import (db, now, oid, serialize, serialize_list, get_current_user,
                  require_roles, notify, audit, sanitize_text, PLATFORM_FEE_PCT)

router = APIRouter(tags=["marketplace"])


class RequestIn(BaseModel):
    service_id: str
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    postcode: str = Field(min_length=3, max_length=10)
    city: str = ""
    address: str = Field(default="", max_length=200)
    budget: Optional[float] = Field(default=None, ge=1, le=1000000)
    urgency: str = "flexible"
    preferred_date: Optional[str] = None


class QuoteIn(BaseModel):
    amount: float = Field(gt=0, le=1000000)
    message: str = Field(default="", max_length=1000)


async def get_request_or_404(request_id: str):
    req = await db.requests.find_one({"_id": oid(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


def redact_request_for_provider(req: dict, viewer_id: str, paid: bool) -> dict:
    """Hide customer address until payment is confirmed for the claiming provider."""
    out = dict(req)
    if not paid or out.get("claimed_by") != viewer_id:
        out["address"] = ""
        out["address_hidden"] = True
    else:
        out["address_hidden"] = False
    return out


@router.post("/requests")
async def create_request(body: RequestIn, user: dict = Depends(require_roles("customer"))):
    service = await db.services.find_one({"_id": oid(body.service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    doc = body.model_dump()
    doc["title"] = sanitize_text(doc["title"], 120)
    doc["description"] = sanitize_text(doc["description"], 2000)
    doc["address"] = sanitize_text(doc.get("address", ""), 200)
    doc["postcode"] = sanitize_text(doc["postcode"], 10)
    doc["city"] = sanitize_text(doc.get("city", ""), 80)
    doc.update({
        "customer_id": user["id"], "customer_name": user["name"],
        "service_name": service["name"], "category_slug": service["category_slug"],
        "status": "open", "created_at": now(),
    })
    res = await db.requests.insert_one(doc)
    await audit(user["id"], "create_request", "request", str(res.inserted_id))
    providers = await db.providers.find({"services": body.service_id, "verified": True}).to_list(50)
    for p in providers:
        await notify(p["user_id"], "New job near you", f"{doc['title']} — {doc['city'] or doc['postcode']}",
                     "job", "/pro/jobs")
    return serialize(await db.requests.find_one({"_id": res.inserted_id}))


@router.get("/requests/mine")
async def my_requests(user: dict = Depends(get_current_user)):
    if user["role"] == "customer":
        items = await db.requests.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(200)
    elif user["role"] == "provider":
        # Provider sees requests they either quoted on OR claimed
        claimed = await db.requests.find({"claimed_by": user["id"]}).to_list(200)
        quoted = await db.quotes.find({"provider_id": user["id"]}).to_list(500)
        req_ids = list({str(r["_id"]) for r in claimed} | {q["request_id"] for q in quoted})
        items = await db.requests.find({"_id": {"$in": [oid(i) for i in req_ids]}}).sort("created_at", -1).to_list(200) if req_ids else []
    else:
        items = await db.requests.find().sort("created_at", -1).to_list(300)
    out = serialize_list(items)
    for r in out:
        r["quote_count"] = await db.quotes.count_documents({"request_id": r["id"]})
        # never leak address in list views
        r["address"] = ""
    return out


@router.get("/requests/open")
async def open_requests(user: dict = Depends(require_roles("provider", "admin", "super_admin"))):
    query = {"status": {"$in": ["open", "quoted"]}}
    if user["role"] == "provider":
        profile = await db.providers.find_one({"user_id": user["id"]})
        if profile and profile.get("services"):
            query["service_id"] = {"$in": profile["services"]}
    items = await db.requests.find(query).sort("created_at", -1).to_list(200)
    out = serialize_list(items)
    if user["role"] == "provider":
        my_quotes = await db.quotes.find({"provider_id": user["id"]}).to_list(500)
        quoted_ids = {q["request_id"] for q in my_quotes}
        for r in out:
            r["already_quoted"] = r["id"] in quoted_ids
            r["address"] = ""  # never leak address until claimed & paid
    return out


@router.get("/requests/{request_id}")
async def request_detail(request_id: str, user: dict = Depends(get_current_user)):
    req = serialize(await get_request_or_404(request_id))
    is_customer = user["role"] == "customer" and req["customer_id"] == user["id"]
    is_provider_claim = user["role"] == "provider" and req.get("claimed_by") == user["id"]
    is_provider_quoted = False
    if user["role"] == "provider" and not is_provider_claim:
        q = await db.quotes.find_one({"request_id": request_id, "provider_id": user["id"]})
        is_provider_quoted = bool(q)
    is_admin = user["role"] in ("admin", "super_admin")

    if not (is_customer or is_provider_claim or is_provider_quoted or is_admin):
        # Providers who haven't engaged with this request see only a lite view
        if user["role"] != "provider":
            raise HTTPException(status_code=403, detail="Forbidden")

    quotes = await db.quotes.find({"request_id": request_id}).sort("created_at", -1).to_list(50)
    req["quotes"] = serialize_list(quotes)
    job = await db.jobs.find_one({"request_id": request_id})
    req["job"] = serialize(job) if job else None
    txn = await db.payment_transactions.find_one({"job_id": req["job"]["id"]}) if req.get("job") else None
    req["payment"] = serialize(txn) if txn else None
    paid = bool(txn and txn.get("payment_status") == "paid")

    # Reveal customer info only to the claimed provider AFTER payment
    if user["role"] == "provider":
        if not (is_provider_claim and paid):
            req["address"] = ""
            req["address_hidden"] = True
            # Also hide customer contact info
            req["customer_phone"] = ""
        else:
            customer = await db.users.find_one({"_id": ObjectId(req["customer_id"])})
            req["customer_phone"] = (customer or {}).get("phone", "")
            req["address_hidden"] = False

    # For customer, reveal handyman info once claimed
    if is_customer and req.get("claimed_by"):
        provider_user = await db.users.find_one({"_id": ObjectId(req["claimed_by"])})
        if provider_user:
            req["provider_name"] = provider_user.get("name", "")
            # Only reveal provider phone after payment
            req["provider_phone"] = provider_user.get("phone", "") if paid else ""
        provider_profile = await db.providers.find_one({"user_id": req["claimed_by"]})
        if provider_profile:
            req["provider_rating"] = provider_profile.get("rating", 0)
            req["provider_jobs_done"] = provider_profile.get("jobs_done", 0)

    # Return completion code (plaintext) ONLY to the customer, ONLY after payment
    if is_customer and req.get("job") and paid:
        req["completion_code"] = req["job"].get("completion_code_plaintext", "")
    else:
        if req.get("job"):
            req["job"].pop("completion_code_plaintext", None)
            req["job"].pop("completion_code_hash", None)

    # Strip sensitive fields universally from job payload
    if req.get("job"):
        req["job"].pop("completion_code_hash", None)
        if not (is_customer and paid):
            req["job"].pop("completion_code_plaintext", None)

    return req


@router.post("/requests/{request_id}/cancel")
async def cancel_request(request_id: str, user: dict = Depends(get_current_user)):
    req = await get_request_or_404(request_id)
    if user["role"] == "customer" and req["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if req["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Request already {req['status']}")
    await db.requests.update_one({"_id": req["_id"]}, {"$set": {"status": "cancelled"}})
    await db.jobs.update_many({"request_id": request_id}, {"$set": {"status": "cancelled"}})
    await audit(user["id"], "cancel_request", "request", request_id)
    return {"ok": True, "status": "cancelled"}


@router.post("/requests/{request_id}/claim")
async def claim_request(request_id: str, user: dict = Depends(require_roles("provider"))):
    """First-come-first-served claim by any verified handyman. Creates an
    accepted quote at the customer's stated budget and a job awaiting payment."""
    profile = await db.providers.find_one({"user_id": user["id"]})
    if not profile or not profile.get("verified"):
        raise HTTPException(status_code=403, detail="Complete verification before claiming jobs")

    # Atomic claim: only succeeds if request is still open and un-claimed
    result = await db.requests.find_one_and_update(
        {"_id": oid(request_id), "status": {"$in": ["open", "quoted"]}, "claimed_by": {"$exists": False}},
        {"$set": {"claimed_by": user["id"], "claimed_at": now(), "status": "accepted"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="This job has already been claimed or is no longer open.")

    amount = float(result.get("budget") or 0)
    if amount <= 0:
        # Fall back: block claim if no budget was set (shouldn't happen, but safe)
        await db.requests.update_one({"_id": result["_id"]},
                                     {"$unset": {"claimed_by": "", "claimed_at": ""},
                                      "$set": {"status": "open"}})
        raise HTTPException(status_code=400, detail="This job has no budget set. Ask the customer to add one.")

    # Auto-create an accepted quote so wallet & downstream logic keep working
    provider_name = profile.get("business_name") or user["name"]
    quote_res = await db.quotes.insert_one({
        "request_id": request_id, "provider_id": user["id"],
        "provider_name": provider_name, "provider_rating": profile.get("rating", 0),
        "amount": round(amount, 2), "message": "Claimed job at your budget.",
        "status": "accepted", "created_at": now(),
    })
    # Decline any other pending quotes on this request
    await db.quotes.update_many(
        {"request_id": request_id, "_id": {"$ne": quote_res.inserted_id}, "status": "pending"},
        {"$set": {"status": "declined"}})

    job_res = await db.jobs.insert_one({
        "request_id": request_id, "quote_id": str(quote_res.inserted_id),
        "customer_id": result["customer_id"], "provider_id": user["id"],
        "title": result["title"], "service_name": result["service_name"],
        "amount": round(amount, 2), "status": "awaiting_payment",
        "scheduled_date": result.get("preferred_date"),
        "timeline": [{"status": "claimed", "at": now()}],
        "created_at": now(),
    })
    await notify(result["customer_id"], "A handyman claimed your job",
                 f"{provider_name} claimed '{result['title']}'. Please pay to schedule the work.",
                 "quote", f"/dashboard/requests/{request_id}")
    await audit(user["id"], "claim_request", "request", request_id)
    return {"ok": True, "job_id": str(job_res.inserted_id), "quote_id": str(quote_res.inserted_id)}


@router.post("/requests/{request_id}/quotes")
async def submit_quote(request_id: str, body: QuoteIn, user: dict = Depends(require_roles("provider"))):
    req = await get_request_or_404(request_id)
    if req["status"] not in ("open", "quoted"):
        raise HTTPException(status_code=400, detail="Request is no longer accepting quotes")
    profile = await db.providers.find_one({"user_id": user["id"]})
    if not profile or not profile.get("verified"):
        raise HTTPException(status_code=403, detail="Complete verification before quoting")
    existing = await db.quotes.find_one({"request_id": request_id, "provider_id": user["id"]})
    if existing:
        raise HTTPException(status_code=409, detail="You already quoted on this request")
    doc = {
        "request_id": request_id, "provider_id": user["id"],
        "provider_name": profile.get("business_name") or user["name"],
        "provider_rating": profile.get("rating", 0),
        "amount": round(body.amount, 2), "message": sanitize_text(body.message, 1000),
        "status": "pending", "created_at": now(),
    }
    res = await db.quotes.insert_one(doc)
    await db.requests.update_one({"_id": req["_id"]}, {"$set": {"status": "quoted"}})
    await notify(req["customer_id"], "New quote received",
                 f"{doc['provider_name']} quoted £{doc['amount']:.2f} for '{req['title']}'",
                 "quote", f"/dashboard/requests/{request_id}")
    return serialize(await db.quotes.find_one({"_id": res.inserted_id}))


@router.get("/quotes/mine")
async def my_quotes(user: dict = Depends(require_roles("provider"))):
    quotes = await db.quotes.find({"provider_id": user["id"]}).sort("created_at", -1).to_list(200)
    out = serialize_list(quotes)
    for q in out:
        req = await db.requests.find_one({"_id": oid(q["request_id"])})
        if req:
            q["request_title"] = req["title"]
            q["request_status"] = req["status"]
            q["postcode"] = req.get("postcode", "")
    return out


@router.post("/quotes/{quote_id}/accept")
async def accept_quote(quote_id: str, user: dict = Depends(require_roles("customer"))):
    quote = await db.quotes.find_one({"_id": oid(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    req = await get_request_or_404(quote["request_id"])
    if req["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if quote["status"] != "pending":
        raise HTTPException(status_code=400, detail="Quote is no longer pending")
    await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"status": "accepted"}})
    await db.quotes.update_many({"request_id": quote["request_id"], "_id": {"$ne": quote["_id"]}},
                                {"$set": {"status": "declined"}})
    await db.requests.update_one({"_id": req["_id"]},
                                 {"$set": {"status": "accepted", "claimed_by": quote["provider_id"],
                                           "claimed_at": now()}})
    job = await db.jobs.insert_one({
        "request_id": quote["request_id"], "quote_id": quote_id,
        "customer_id": user["id"], "provider_id": quote["provider_id"],
        "title": req["title"], "service_name": req["service_name"],
        "amount": quote["amount"], "status": "awaiting_payment",
        "scheduled_date": req.get("preferred_date"),
        "timeline": [{"status": "quote_accepted", "at": now()}],
        "created_at": now(),
    })
    await notify(quote["provider_id"], "Quote accepted",
                 f"Your quote for '{req['title']}' was accepted.", "job", "/pro/jobs")
    await audit(user["id"], "accept_quote", "quote", quote_id)
    return {"ok": True, "job_id": str(job.inserted_id)}


@router.post("/quotes/{quote_id}/decline")
async def decline_quote(quote_id: str, user: dict = Depends(require_roles("customer"))):
    quote = await db.quotes.find_one({"_id": oid(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    req = await get_request_or_404(quote["request_id"])
    if req["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"status": "declined"}})
    return {"ok": True}


@router.get("/jobs/mine")
async def my_jobs(user: dict = Depends(get_current_user)):
    if user["role"] == "customer":
        items = await db.jobs.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(200)
    elif user["role"] == "provider":
        items = await db.jobs.find({"provider_id": user["id"]}).sort("created_at", -1).to_list(200)
    else:
        items = await db.jobs.find().sort("created_at", -1).to_list(300)
    out = serialize_list(items)
    for j in out:
        txn = await db.payment_transactions.find_one({"job_id": j["id"], "payment_status": "paid"})
        j["paid"] = bool(txn)
        review = await db.reviews.find_one({"job_id": j["id"]})
        j["reviewed"] = bool(review)
        # Strip completion code hashes from list responses
        j.pop("completion_code_hash", None)
        j.pop("completion_code_plaintext", None)
    return out


class CodeVerifyIn(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


@router.post("/jobs/{job_id}/verify-code")
async def verify_job_code(job_id: str, body: CodeVerifyIn, user: dict = Depends(require_roles("provider"))):
    """Handyman submits the customer's 6-digit code to unlock payout.
    On success: platform keeps 15%, provider wallet credited with 85%.
    Rate-limited to 5 attempts, then a 30-minute lock."""
    from core import verify_completion_code, now as _now
    job = await db.jobs.find_one({"_id": oid(job_id)})
    if not job or job.get("provider_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Job is already completed.")
    txn = await db.payment_transactions.find_one({"job_id": job_id, "payment_status": "paid"})
    if not txn:
        raise HTTPException(status_code=402, detail="Customer payment not confirmed yet.")

    locked_until = job.get("code_locked_until")
    if locked_until is not None:
        from datetime import timezone as _tz
        if hasattr(locked_until, "tzinfo") and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=_tz.utc)
        if locked_until > _now():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    if not verify_completion_code(body.code, job.get("completion_code_hash", "")):
        attempts = int(job.get("code_attempts", 0)) + 1
        update = {"$set": {"code_attempts": attempts}}
        if attempts >= 5:
            update["$set"]["code_locked_until"] = _now() + timedelta(minutes=30)
            update["$set"]["code_attempts"] = 0
        await db.jobs.update_one({"_id": job["_id"]}, update)
        raise HTTPException(status_code=400, detail="Incorrect code. Please ask the customer to double-check.")

    # Success — complete job & credit provider wallet net of platform fee
    gross = float(job["amount"])
    fee = round(gross * PLATFORM_FEE_PCT / 100, 2)
    net = round(gross - fee, 2)
    await db.jobs.update_one({"_id": job["_id"]}, {
        "$set": {"status": "completed", "code_attempts": 0, "completed_at": now()},
        "$unset": {"completion_code_hash": "", "completion_code_plaintext": "", "code_locked_until": ""},
        "$push": {"timeline": {"status": "completed", "at": now()}},
    })
    await db.provider_earnings.insert_one({
        "provider_id": job["provider_id"], "job_id": job_id,
        "gross": gross, "fee": fee, "net": net, "created_at": now(),
    })
    await db.providers.update_one({"user_id": job["provider_id"]}, {"$inc": {"jobs_done": 1}})
    await db.requests.update_one({"_id": oid(job["request_id"])}, {"$set": {"status": "completed"}})
    await notify(job["customer_id"], "Job completed",
                 f"'{job['title']}' is complete. Please leave a review.", "job", "/dashboard/reviews")
    await notify(job["provider_id"], "Payment released",
                 f"£{net:.2f} added to your wallet for '{job['title']}'.", "payment", "/pro/earnings")
    await audit(user["id"], "verify_completion_code", "job", job_id)
    return {"ok": True, "net_paid": net, "fee": fee, "status": "completed"}


@router.post("/jobs/{job_id}/status")
async def update_job_status(job_id: str, body: dict, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": oid(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    new_status = body.get("status")
    # completion is now driven by the code verification flow, not this endpoint
    allowed = {"provider": ["scheduled", "in_progress"],
               "customer": ["cancelled"],
               "admin": ["scheduled", "in_progress", "completed", "cancelled"],
               "super_admin": ["scheduled", "in_progress", "completed", "cancelled"]}
    if new_status not in allowed.get(user["role"], []):
        raise HTTPException(status_code=403, detail="Not allowed")
    is_party = job["provider_id"] == user["id"] or job["customer_id"] == user["id"]
    if user["role"] not in ("admin", "super_admin") and not is_party:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.jobs.update_one({"_id": job["_id"]}, {
        "$set": {"status": new_status},
        "$push": {"timeline": {"status": new_status, "at": now()}},
    })
    other = job["customer_id"] if user["id"] == job["provider_id"] else job["provider_id"]
    await notify(other, "Job status update", f"'{job['title']}' is now {new_status}.", "job")
    return {"ok": True, "status": new_status}
