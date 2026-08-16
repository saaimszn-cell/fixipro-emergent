from fastapi import APIRouter, HTTPException, Depends
from core import db, now, oid, serialize, serialize_list, require_roles, notify, audit

router = APIRouter(prefix="/provider", tags=["provider"])

provider_only = require_roles("provider")


async def get_profile(user_id: str):
    profile = await db.providers.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    return profile


@router.get("/profile")
async def profile(user: dict = Depends(provider_only)):
    p = serialize(await get_profile(user["id"]))
    services = await db.services.find({"_id": {"$in": [oid(s) for s in p.get("services", [])]}}).to_list(50) \
        if p.get("services") else []
    p["service_details"] = serialize_list(services)
    return p


@router.put("/profile")
async def update_profile(body: dict, user: dict = Depends(provider_only)):
    allowed = {}
    for k in ("business_name", "bio", "availability"):
        if isinstance(body.get(k), str):
            allowed[k] = body[k]
    for k in ("services", "coverage", "certifications"):
        if isinstance(body.get(k), list):
            allowed[k] = body[k]
    if isinstance(body.get("insurance"), dict):
        allowed["insurance"] = body["insurance"]
    if not allowed:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.providers.update_one({"user_id": user["id"]}, {"$set": allowed})
    await audit(user["id"], "update_provider_profile", "provider", user["id"])
    return serialize(await get_profile(user["id"]))


@router.post("/verification")
async def submit_verification(body: dict, user: dict = Depends(provider_only)):
    docs = body.get("documents") or []
    if not docs:
        raise HTTPException(status_code=400, detail="At least one document is required")
    for d in docs:
        d.setdefault("status", "pending")
        d["uploaded_at"] = now()
    await db.providers.update_one({"user_id": user["id"]}, {
        "$push": {"documents": {"$each": docs}},
        "$set": {"verification_status": "pending"},
    })
    await audit(user["id"], "submit_verification", "provider", user["id"])
    return {"ok": True, "verification_status": "pending"}


@router.get("/verification")
async def verification_status(user: dict = Depends(provider_only)):
    p = serialize(await get_profile(user["id"]))
    return {"verification_status": p.get("verification_status"), "verified": p.get("verified"),
            "documents": p.get("documents", [])}


@router.get("/availability")
async def get_availability(user: dict = Depends(provider_only)):
    items = await db.availability.find({"provider_id": user["id"]}).to_list(400)
    return serialize_list(items)


@router.post("/availability")
async def set_availability(body: dict, user: dict = Depends(provider_only)):
    date = body.get("date")
    if not date:
        raise HTTPException(status_code=400, detail="date required")
    blocked = bool(body.get("blocked"))
    slots = body.get("slots") or []
    await db.availability.update_one(
        {"provider_id": user["id"], "date": date},
        {"$set": {"provider_id": user["id"], "date": date, "blocked": blocked, "slots": slots}},
        upsert=True)
    return {"ok": True}


@router.get("/earnings")
async def earnings(user: dict = Depends(provider_only)):
    items = await db.provider_earnings.find({"provider_id": user["id"]}).sort("created_at", -1).to_list(300)
    out = serialize_list(items)
    for e in out:
        job = await db.jobs.find_one({"_id": oid(e["job_id"])})
        e["job_title"] = job["title"] if job else ""
    total_gross = sum(e["gross"] for e in out)
    total_net = sum(e["net"] for e in out)
    return {"entries": out, "total_gross": round(total_gross, 2), "total_net": round(total_net, 2)}


@router.get("/wallet")
async def wallet(user: dict = Depends(provider_only)):
    earned = [e async for e in db.provider_earnings.find({"provider_id": user["id"]})]
    total_net = sum(e["net"] for e in earned)
    withdrawals = await db.withdrawals.find({"provider_id": user["id"],
                                             "status": {"$in": ["pending", "processed"]}}).to_list(200)
    withdrawn = sum(w["amount"] for w in withdrawals)
    return {"balance": round(total_net - withdrawn, 2), "total_earned": round(total_net, 2),
            "total_withdrawn": round(withdrawn, 2)}


@router.post("/withdrawals")
async def request_withdrawal(body: dict, user: dict = Depends(provider_only)):
    amount = float(body.get("amount") or 0)
    if amount < 10:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is £10")
    w = await wallet(user)
    if amount > w["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    res = await db.withdrawals.insert_one({
        "provider_id": user["id"], "amount": round(amount, 2), "status": "pending", "created_at": now(),
    })
    return serialize(await db.withdrawals.find_one({"_id": res.inserted_id}))


@router.get("/withdrawals")
async def list_withdrawals(user: dict = Depends(provider_only)):
    items = await db.withdrawals.find({"provider_id": user["id"]}).sort("created_at", -1).to_list(100)
    return serialize_list(items)
