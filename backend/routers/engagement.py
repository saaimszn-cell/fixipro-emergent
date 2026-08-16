from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core import db, now, oid, serialize, serialize_list, get_current_user, require_roles, notify

router = APIRouter(tags=["engagement"])


class ReviewIn(BaseModel):
    job_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


@router.post("/reviews")
async def create_review(body: ReviewIn, user: dict = Depends(require_roles("customer"))):
    job = await db.jobs.find_one({"_id": oid(body.job_id)})
    if not job or job["customer_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="You can review after the job is completed")
    if await db.reviews.find_one({"job_id": body.job_id}):
        raise HTTPException(status_code=409, detail="Job already reviewed")
    doc = {
        "job_id": body.job_id, "customer_id": user["id"], "customer_name": user["name"],
        "provider_id": job["provider_id"], "service_name": job["service_name"],
        "rating": body.rating, "comment": body.comment, "status": "published", "created_at": now(),
    }
    res = await db.reviews.insert_one(doc)
    agg = [r async for r in db.reviews.find({"provider_id": job["provider_id"]})]
    if agg:
        avg = sum(r["rating"] for r in agg) / len(agg)
        await db.providers.update_one({"user_id": job["provider_id"]}, {"$set": {"rating": round(avg, 1)}})
    await notify(job["provider_id"], "New review", f"{user['name']} rated you {body.rating}/5.", "review", "/pro/reviews")
    return serialize(await db.reviews.find_one({"_id": res.inserted_id}))


@router.get("/reviews/mine")
async def my_reviews(user: dict = Depends(get_current_user)):
    if user["role"] == "provider":
        items = await db.reviews.find({"provider_id": user["id"]}).sort("created_at", -1).to_list(200)
    else:
        items = await db.reviews.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(200)
    return serialize_list(items)


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"participants": user["id"]}).sort("updated_at", -1).to_list(100)
    out = serialize_list(convs)
    for c in out:
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        if other_id:
            from bson import ObjectId
            other = await db.users.find_one({"_id": ObjectId(other_id)})
            c["other_name"] = other["name"] if other else "Unknown"
            c["other_role"] = other.get("role") if other else ""
        c["unread"] = await db.messages.count_documents(
            {"conversation_id": c["id"], "sender_id": {"$ne": user["id"]}, "read": False})
    return out


@router.post("/conversations")
async def create_conversation(body: dict, user: dict = Depends(get_current_user)):
    other_id = body.get("user_id")
    if not other_id:
        raise HTTPException(status_code=400, detail="user_id required")
    # Chat is only unlocked between a customer and their claimed handyman
    # after payment has been confirmed. Admins can chat with anyone.
    if user["role"] not in ("admin", "super_admin"):
        # Find any paid job between these two users
        paid_txn = await db.jobs.aggregate([
            {"$match": {"$or": [
                {"customer_id": user["id"], "provider_id": other_id},
                {"provider_id": user["id"], "customer_id": other_id},
            ]}},
            {"$lookup": {"from": "payment_transactions", "localField": "_id",
                         "foreignField": "job_id", "as": "txn"}},
        ]).to_list(20)
        # motor aggregation returns _id as ObjectId, and job_id is stored as string
        # So above lookup won't match. Do it manually:
        jobs = await db.jobs.find({"$or": [
            {"customer_id": user["id"], "provider_id": other_id},
            {"provider_id": user["id"], "customer_id": other_id},
        ]}).to_list(20)
        has_paid = False
        for j in jobs:
            txn = await db.payment_transactions.find_one({"job_id": str(j["_id"]),
                                                          "payment_status": "paid"})
            if txn:
                has_paid = True
                break
        if not has_paid:
            raise HTTPException(status_code=403,
                                detail="You can only chat with a handyman/customer after payment is confirmed.")
    existing = await db.conversations.find_one({"participants": {"$all": [user["id"], other_id]}})
    if existing:
        return serialize(existing)
    res = await db.conversations.insert_one({
        "participants": [user["id"], other_id], "last_message": "",
        "created_at": now(), "updated_at": now(),
    })
    return serialize(await db.conversations.find_one({"_id": res.inserted_id}))


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"_id": oid(conv_id)})
    if not conv or user["id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.messages.update_many({"conversation_id": conv_id, "sender_id": {"$ne": user["id"]}},
                                  {"$set": {"read": True}})
    msgs = await db.messages.find({"conversation_id": conv_id}).sort("created_at", 1).to_list(500)
    return serialize_list(msgs)


@router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, body: dict, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"_id": oid(conv_id)})
    if not conv or user["id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    res = await db.messages.insert_one({
        "conversation_id": conv_id, "sender_id": user["id"], "sender_name": user["name"],
        "text": text, "read": False, "created_at": now(),
    })
    await db.conversations.update_one({"_id": conv["_id"]},
                                      {"$set": {"last_message": text[:100], "updated_at": now()}})
    other = next((p for p in conv["participants"] if p != user["id"]), None)
    if other:
        await notify(other, "New message", f"{user['name']}: {text[:60]}", "message", "/dashboard/messages")
    return serialize(await db.messages.find_one({"_id": res.inserted_id}))


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return serialize_list(items)


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"_id": oid(notif_id), "user_id": user["id"]},
                                      {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.get("/favourites")
async def get_favourites(user: dict = Depends(require_roles("customer"))):
    favs = user.get("favourites", [])
    out = []
    for pid in favs:
        prof = await db.providers.find_one({"user_id": pid})
        if prof:
            p = serialize(prof)
            owner = await db.users.find_one({"_id": oid(pid)})
            p["name"] = owner["name"] if owner else ""
            out.append(p)
    return out


@router.post("/favourites/{provider_id}")
async def add_favourite(provider_id: str, user: dict = Depends(require_roles("customer"))):
    await db.users.update_one({"_id": oid(user["id"])}, {"$addToSet": {"favourites": provider_id}})
    return {"ok": True}


@router.delete("/favourites/{provider_id}")
async def remove_favourite(provider_id: str, user: dict = Depends(require_roles("customer"))):
    await db.users.update_one({"_id": oid(user["id"])}, {"$pull": {"favourites": provider_id}})
    return {"ok": True}


@router.get("/support/tickets")
async def list_tickets(user: dict = Depends(get_current_user)):
    if user["role"] in ("admin", "super_admin"):
        items = await db.support_tickets.find().sort("created_at", -1).to_list(200)
    else:
        items = await db.support_tickets.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return serialize_list(items)


@router.post("/support/tickets")
async def create_ticket(body: dict, user: dict = Depends(get_current_user)):
    subject = (body.get("subject") or "").strip()
    message = (body.get("message") or "").strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")
    res = await db.support_tickets.insert_one({
        "user_id": user["id"], "user_name": user["name"], "user_role": user["role"],
        "subject": subject, "message": message, "priority": body.get("priority", "normal"),
        "status": "open", "replies": [], "created_at": now(),
    })
    return serialize(await db.support_tickets.find_one({"_id": res.inserted_id}))


@router.post("/support/tickets/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, body: dict, user: dict = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one({"_id": oid(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] not in ("admin", "super_admin") and ticket["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    await db.support_tickets.update_one({"_id": ticket["_id"]}, {
        "$push": {"replies": {"author": user["name"], "role": user["role"], "text": text, "at": now()}},
        "$set": {"status": body.get("status", ticket["status"])},
    })
    if user["role"] in ("admin", "super_admin"):
        await notify(ticket["user_id"], "Support replied", f"Re: {ticket['subject']}", "support", "/dashboard/support")
    return {"ok": True}
