from fastapi import APIRouter, HTTPException, Depends
from core import db, now, oid, serialize, serialize_list, require_roles, audit

router = APIRouter(prefix="/admin", tags=["admin"])

admin_only = require_roles("admin", "super_admin")

MANAGEABLE = {
    "categories", "services", "blog_posts", "cms_pages", "faqs",
    "email_templates", "sms_templates", "push_templates", "settings",
    "reviews", "support_tickets", "ai_configs", "requests", "quotes", "jobs",
    "payment_transactions", "withdrawals", "notifications",
}


@router.get("/stats")
async def stats(user: dict = Depends(admin_only)):
    paid = [t async for t in db.payment_transactions.find({"payment_status": "paid"})]
    revenue = sum(t.get("amount", 0) for t in paid)
    return {
        "users": await db.users.count_documents({}),
        "customers": await db.users.count_documents({"role": "customer"}),
        "providers": await db.users.count_documents({"role": "provider"}),
        "pending_verifications": await db.providers.count_documents({"verification_status": "pending"}),
        "requests": await db.requests.count_documents({}),
        "open_requests": await db.requests.count_documents({"status": {"$in": ["open", "quoted"]}}),
        "jobs": await db.jobs.count_documents({}),
        "active_jobs": await db.jobs.count_documents({"status": {"$in": ["scheduled", "in_progress", "awaiting_payment"]}}),
        "completed_jobs": await db.jobs.count_documents({"status": "completed"}),
        "revenue": round(revenue, 2),
        "transactions": len(paid),
        "reviews": await db.reviews.count_documents({}),
        "open_tickets": await db.support_tickets.count_documents({"status": "open"}),
    }


@router.get("/users")
async def list_users(role: str = "", q: str = "", user: dict = Depends(admin_only)):
    query = {}
    if role:
        query["role"] = role
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(500)
    return serialize_list(users)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: dict, user: dict = Depends(admin_only)):
    allowed = {k: v for k, v in body.items() if k in ("status", "role", "name")}
    if "role" in allowed and allowed["role"] not in ("customer", "provider", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if not allowed:
        raise HTTPException(status_code=400, detail="Nothing to update")
    target = await db.users.find_one({"_id": oid(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "super_admin" and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify super admin")
    await db.users.update_one({"_id": target["_id"]}, {"$set": allowed})
    await audit(user["id"], "admin_update_user", "user", user_id, allowed)
    return serialize(await db.users.find_one({"_id": target["_id"]}, {"password_hash": 0}))


@router.get("/providers")
async def list_providers(status: str = "", user: dict = Depends(admin_only)):
    query = {}
    if status:
        query["verification_status"] = status
    providers = await db.providers.find(query).sort("created_at", -1).to_list(300)
    out = serialize_list(providers)
    for p in out:
        owner = await db.users.find_one({"_id": oid(p["user_id"])})
        p["email"] = owner["email"] if owner else ""
        p["owner_name"] = owner["name"] if owner else ""
    return out


@router.post("/providers/{provider_id}/verify")
async def verify_provider(provider_id: str, body: dict, user: dict = Depends(admin_only)):
    approve = bool(body.get("approve", True))
    profile = await db.providers.find_one({"_id": oid(provider_id)})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider not found")
    status = "approved" if approve else "rejected"
    await db.providers.update_one({"_id": profile["_id"]},
                                  {"$set": {"verification_status": status, "verified": approve}})
    from core import notify
    await notify(profile["user_id"], f"Verification {status}",
                 "You can now quote on jobs." if approve else "Please re-submit your documents.",
                 "verification", "/pro/verification")
    await audit(user["id"], f"provider_{status}", "provider", provider_id)
    return {"ok": True, "verification_status": status}


@router.get("/collection/{name}")
async def collection_list(name: str, user: dict = Depends(admin_only)):
    if name not in MANAGEABLE:
        raise HTTPException(status_code=404, detail="Unknown collection")
    items = await db[name].find({}, {"password_hash": 0}).sort("_id", -1).to_list(500)
    return serialize_list(items)


@router.post("/collection/{name}")
async def collection_create(name: str, body: dict, user: dict = Depends(admin_only)):
    if name not in MANAGEABLE:
        raise HTTPException(status_code=404, detail="Unknown collection")
    body.pop("id", None)
    body.pop("_id", None)
    body["created_at"] = now()
    res = await db[name].insert_one(body)
    await audit(user["id"], "admin_create", name, str(res.inserted_id))
    return serialize(await db[name].find_one({"_id": res.inserted_id}))


@router.patch("/collection/{name}/{doc_id}")
async def collection_update(name: str, doc_id: str, body: dict, user: dict = Depends(admin_only)):
    if name not in MANAGEABLE:
        raise HTTPException(status_code=404, detail="Unknown collection")
    body.pop("id", None)
    body.pop("_id", None)
    res = await db[name].update_one({"_id": oid(doc_id)}, {"$set": body})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Document not found")
    await audit(user["id"], "admin_update", name, doc_id)
    return serialize(await db[name].find_one({"_id": oid(doc_id)}))


@router.delete("/collection/{name}/{doc_id}")
async def collection_delete(name: str, doc_id: str, user: dict = Depends(admin_only)):
    if name not in MANAGEABLE:
        raise HTTPException(status_code=404, detail="Unknown collection")
    await db[name].delete_one({"_id": oid(doc_id)})
    await audit(user["id"], "admin_delete", name, doc_id)
    return {"ok": True}


@router.get("/reports/revenue")
async def revenue_report(user: dict = Depends(admin_only)):
    paid = [t async for t in db.payment_transactions.find({"payment_status": "paid"})]
    by_month = {}
    for t in paid:
        month = str(t.get("created_at", ""))[:7]
        by_month[month] = round(by_month.get(month, 0) + t.get("amount", 0), 2)
    earnings = [e async for e in db.provider_earnings.find()]
    fees = round(sum(e.get("fee", 0) for e in earnings), 2)
    return {
        "gross_revenue": round(sum(t.get("amount", 0) for t in paid), 2),
        "platform_fees": fees,
        "transactions": len(paid),
        "by_month": [{"month": k, "revenue": v} for k, v in sorted(by_month.items())],
    }


@router.get("/reports/overview")
async def overview_report(user: dict = Depends(admin_only)):
    reqs = await db.requests.find().to_list(1000)
    by_status = {}
    for r in reqs:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
    cats = await db.categories.find().to_list(50)
    cat_counts = []
    for c in cats:
        count = await db.requests.count_documents({"category_slug": c["slug"]})
        cat_counts.append({"name": c["name"], "requests": count})
    return {"requests_by_status": [{"status": k, "count": v} for k, v in by_status.items()],
            "requests_by_category": cat_counts}


@router.get("/audit-logs")
async def audit_logs(user: dict = Depends(admin_only)):
    items = await db.audit_logs.find().sort("created_at", -1).to_list(300)
    out = serialize_list(items)
    for log in out:
        actor = await db.users.find_one({"_id": oid(log["actor_id"])}) if log.get("actor_id") else None
        log["actor_name"] = actor["name"] if actor else "system"
    return out


@router.get("/ai/logs")
async def ai_logs(user: dict = Depends(admin_only)):
    items = await db.ai_logs.find().sort("created_at", -1).to_list(200)
    return serialize_list(items)
