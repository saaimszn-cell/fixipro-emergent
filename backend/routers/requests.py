from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from core import (db, now, oid, serialize, serialize_list, get_current_user,
                  require_roles, notify, audit, PLATFORM_FEE_PCT)

router = APIRouter(tags=["marketplace"])


class RequestIn(BaseModel):
    service_id: str
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    postcode: str = Field(min_length=3, max_length=10)
    city: str = ""
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


@router.post("/requests")
async def create_request(body: RequestIn, user: dict = Depends(require_roles("customer"))):
    service = await db.services.find_one({"_id": oid(body.service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    doc = body.model_dump()
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
    status = None
    if user["role"] == "customer":
        items = await db.requests.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(200)
    elif user["role"] == "provider":
        quoted = await db.quotes.find({"provider_id": user["id"]}).to_list(500)
        req_ids = [oid(q["request_id"]) for q in quoted]
        items = await db.requests.find({"_id": {"$in": req_ids}}).sort("created_at", -1).to_list(200) if req_ids else []
    else:
        items = await db.requests.find().sort("created_at", -1).to_list(300)
    out = serialize_list(items)
    for r in out:
        r["quote_count"] = await db.quotes.count_documents({"request_id": r["id"]})
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
    return out


@router.get("/requests/{request_id}")
async def request_detail(request_id: str, user: dict = Depends(get_current_user)):
    req = serialize(await get_request_or_404(request_id))
    if user["role"] == "customer" and req["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    quotes = await db.quotes.find({"request_id": request_id}).sort("created_at", -1).to_list(50)
    req["quotes"] = serialize_list(quotes)
    job = await db.jobs.find_one({"request_id": request_id})
    req["job"] = serialize(job) if job else None
    txn = await db.payment_transactions.find_one({"job_id": req["job"]["id"]}) if req.get("job") else None
    req["payment"] = serialize(txn) if txn else None
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
        "amount": round(body.amount, 2), "message": body.message,
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
    await db.requests.update_one({"_id": req["_id"]}, {"$set": {"status": "accepted"}})
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
    return out


@router.post("/jobs/{job_id}/status")
async def update_job_status(job_id: str, body: dict, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": oid(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    new_status = body.get("status")
    allowed = {"provider": ["scheduled", "in_progress", "completed"],
               "customer": ["cancelled"], "admin": ["scheduled", "in_progress", "completed", "cancelled"],
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
    if new_status == "completed":
        fee = round(job["amount"] * PLATFORM_FEE_PCT / 100, 2)
        await db.provider_earnings.insert_one({
            "provider_id": job["provider_id"], "job_id": job_id,
            "gross": job["amount"], "fee": fee, "net": round(job["amount"] - fee, 2),
            "created_at": now(),
        })
        await db.providers.update_one({"user_id": job["provider_id"]}, {"$inc": {"jobs_done": 1}})
        await notify(job["customer_id"], "Job completed",
                     f"'{job['title']}' is complete. Please leave a review.", "job", "/dashboard/reviews")
    other = job["customer_id"] if user["id"] == job["provider_id"] else job["provider_id"]
    await notify(other, "Job status update", f"'{job['title']}' is now {new_status}.", "job")
    return {"ok": True, "status": new_status}
