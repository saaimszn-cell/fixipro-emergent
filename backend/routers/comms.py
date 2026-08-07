from fastapi import APIRouter, HTTPException, Depends
from core import db, now, oid, serialize, serialize_list, get_current_user, require_roles, notify

router = APIRouter(prefix="/comms", tags=["communications"])

DEMO_CONVERSATIONS = [
    {"channel": "whatsapp", "contact_name": "Sophie Reynolds", "contact": "+44 7700 111222",
     "status": "ai_handling", "ai_handled": True, "handover": False,
     "messages": [
         {"from": "customer", "text": "Hi, my boiler stopped working this morning. Can someone come today?", "at": "2026-06-10T09:12:00"},
         {"from": "ai", "text": "Sorry to hear that, Sophie. I can help. Could you share your postcode and the boiler make if you know it?", "at": "2026-06-10T09:12:20"},
         {"from": "customer", "text": "M14 5QT, it's a Worcester Bosch", "at": "2026-06-10T09:13:05"},
         {"from": "ai", "text": "Thanks. There are 3 Gas Safe engineers covering M14 with same-day slots. Shall I collect quotes for a boiler repair visit?", "at": "2026-06-10T09:13:22"},
     ]},
    {"channel": "whatsapp", "contact_name": "David Okafor", "contact": "+44 7700 333444",
     "status": "with_agent", "ai_handled": False, "handover": True,
     "messages": [
         {"from": "customer", "text": "I want to change the date of my booking", "at": "2026-06-09T15:02:00"},
         {"from": "ai", "text": "I can help with that. Could you confirm the booking reference or the service?", "at": "2026-06-09T15:02:15"},
         {"from": "customer", "text": "Actually I'd rather speak to a person", "at": "2026-06-09T15:03:00"},
         {"from": "agent", "text": "Hi David, this is Priya from FixiPro support. Happy to help move your booking — what date suits you?", "at": "2026-06-09T15:06:40"},
     ]},
    {"channel": "email", "contact_name": "Manchester Lettings Ltd", "contact": "ops@mlettings.co.uk",
     "status": "with_agent", "ai_handled": False, "handover": False,
     "messages": [
         {"from": "customer", "text": "Do you offer end-of-tenancy cleans for a portfolio of 30 flats?", "at": "2026-06-08T11:20:00"},
         {"from": "agent", "text": "Yes — we support portfolio scheduling with volume pricing. Shall we set up a call?", "at": "2026-06-08T13:45:00"},
     ]},
    {"channel": "internal", "contact_name": "Ops Team", "contact": "internal",
     "status": "open", "ai_handled": False, "handover": False,
     "messages": [
         {"from": "agent", "text": "Reminder: verification queue has 2 pending providers.", "at": "2026-06-10T08:00:00"},
     ]},
]


async def ensure_demo():
    if await db.comm_conversations.count_documents({}) == 0:
        for c in DEMO_CONVERSATIONS:
            await db.comm_conversations.insert_one({**c, "updated_at": now()})


@router.get("/integrations")
async def integrations(user: dict = Depends(get_current_user)):
    setting = await db.settings.find_one({"key": "whatsapp_integration"})
    state = setting["value"] if setting else {"connected": False, "mode": "stub"}
    return {
        "whatsapp": {"connected": state.get("connected", False), "mode": "stub",
                     "note": "Live WhatsApp Business API connection is stubbed for internal testing. UI and logs are fully functional.",
                     "phone_number": state.get("phone_number", ""), "business_name": "FixiPro UK"},
        "email": {"connected": True, "provider": "Transactional email (internal)"},
        "sms": {"connected": False, "mode": "stub", "note": "SMS sending stubbed for internal testing."},
        "push": {"connected": False, "mode": "stub", "note": "Push notifications stubbed for internal testing."},
    }


@router.post("/integrations/whatsapp/connect")
async def whatsapp_connect(body: dict, user: dict = Depends(require_roles("admin", "super_admin"))):
    from core import audit
    await db.settings.update_one({"key": "whatsapp_integration"},
                                 {"$set": {"key": "whatsapp_integration", "value": {
                                     "connected": True, "mode": "stub",
                                     "phone_number": body.get("phone_number", "+44 20 7946 0958"),
                                 }}}, upsert=True)
    await audit(user["id"], "whatsapp_connect_stub", "settings", "whatsapp_integration")
    return {"ok": True, "connected": True, "mode": "stub",
            "note": "Stub connection saved. No live messages will be sent."}


@router.post("/integrations/whatsapp/disconnect")
async def whatsapp_disconnect(user: dict = Depends(require_roles("admin", "super_admin"))):
    await db.settings.update_one({"key": "whatsapp_integration"},
                                 {"$set": {"key": "whatsapp_integration",
                                           "value": {"connected": False, "mode": "stub"}}}, upsert=True)
    return {"ok": True, "connected": False}


@router.get("/conversations")
async def conversations(channel: str = "", user: dict = Depends(get_current_user)):
    await ensure_demo()
    query = {}
    if channel:
        query["channel"] = channel
    items = await db.comm_conversations.find(query).sort("updated_at", -1).to_list(100)
    return serialize_list(items)


@router.get("/conversations/{conv_id}")
async def conversation_detail(conv_id: str, user: dict = Depends(get_current_user)):
    doc = await db.comm_conversations.find_one({"_id": oid(conv_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return serialize(doc)


@router.post("/conversations/{conv_id}/messages")
async def send_comm_message(conv_id: str, body: dict, user: dict = Depends(get_current_user)):
    conv = await db.comm_conversations.find_one({"_id": oid(conv_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    msg = {"from": "agent", "text": text, "at": now().isoformat(), "author": user["name"]}
    await db.comm_conversations.update_one({"_id": conv["_id"]},
                                           {"$push": {"messages": msg}, "$set": {"updated_at": now()}})
    await db.comm_logs.insert_one({"channel": conv["channel"], "conversation_id": conv_id,
                                   "direction": "outbound", "text": text, "mode": "stub",
                                   "created_at": now()})
    return {"ok": True, "message": serialize({"_id": conv_id, **msg})}


@router.post("/conversations/{conv_id}/handover")
async def toggle_handover(conv_id: str, body: dict, user: dict = Depends(get_current_user)):
    conv = await db.comm_conversations.find_one({"_id": oid(conv_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    to_agent = bool(body.get("to_agent", True))
    await db.comm_conversations.update_one({"_id": conv["_id"]}, {"$set": {
        "handover": to_agent, "ai_handled": not to_agent,
        "status": "with_agent" if to_agent else "ai_handling", "updated_at": now()}})
    return {"ok": True, "status": "with_agent" if to_agent else "ai_handling"}


@router.post("/conversations/{conv_id}/simulate-inbound")
async def simulate_inbound(conv_id: str, body: dict, user: dict = Depends(get_current_user)):
    conv = await db.comm_conversations.find_one({"_id": oid(conv_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    text = (body.get("text") or "").strip() or "Test inbound message"
    msg = {"from": "customer", "text": text, "at": now().isoformat()}
    update = {"$push": {"messages": msg}, "$set": {"updated_at": now()}}
    reply_text = None
    if conv.get("ai_handled") and not conv.get("handover"):
        reply_text = ("Thanks for your message. I'm the FixiPro assistant (demo mode) — "
                      "a team member will follow up shortly.")
        update["$push"]["messages"] = msg
    await db.comm_conversations.update_one({"_id": conv["_id"]}, update)
    if reply_text:
        await db.comm_conversations.update_one({"_id": conv["_id"]}, {
            "$push": {"messages": {"from": "ai", "text": reply_text, "at": now().isoformat()}}})
    await db.comm_logs.insert_one({"channel": conv["channel"], "conversation_id": conv_id,
                                   "direction": "inbound", "text": text, "mode": "stub",
                                   "created_at": now()})
    return serialize(await db.comm_conversations.find_one({"_id": conv["_id"]}))


@router.get("/logs")
async def comm_logs(user: dict = Depends(require_roles("admin", "super_admin"))):
    items = await db.comm_logs.find().sort("created_at", -1).to_list(200)
    return serialize_list(items)
