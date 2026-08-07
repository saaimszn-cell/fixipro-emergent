import os
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from core import db, now, oid, serialize, serialize_list, get_current_user, require_roles

router = APIRouter(prefix="/ai", tags=["ai"])

DEFAULT_PROMPTS = {
    "customer": "You are ServiceHub's customer assistant for a UK home services marketplace. Help customers describe jobs, understand pricing and booking. Concise, friendly British English.",
    "provider": "You are ServiceHub's provider assistant. Help tradespeople write winning quotes and price UK jobs fairly. Concise and practical.",
    "admin": "You are ServiceHub's admin assistant. Summarise platform activity, flag anomalies, help draft announcements. Be precise.",
    "whatsapp": "You are ServiceHub's WhatsApp assistant. Qualify leads, answer FAQs, collect job details. Short messages.",
}


def get_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    return key


async def get_prompt(assistant: str) -> str:
    cfg = await db.ai_configs.find_one({"key": f"{assistant}_assistant"})
    if cfg and cfg.get("enabled") is False:
        raise HTTPException(status_code=403, detail="This assistant is disabled")
    return (cfg or {}).get("system_prompt") or DEFAULT_PROMPTS.get(assistant, DEFAULT_PROMPTS["customer"])


async def get_model(assistant: str) -> str:
    cfg = await db.ai_configs.find_one({"key": f"{assistant}_assistant"})
    return (cfg or {}).get("model") or "gpt-5.4"


async def log_ai(user_id: str, feature: str, summary: str):
    await db.ai_logs.insert_one({"user_id": user_id, "feature": feature,
                                 "summary": summary[:300], "created_at": now()})


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str = ""
    assistant: str = "customer"


@router.post("/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    assistant = body.assistant if body.assistant in DEFAULT_PROMPTS else "customer"
    session_id = body.session_id or f"{user['id']}-{assistant}-{now().timestamp()}"
    system_prompt = await get_prompt(assistant)
    model = await get_model(assistant)

    if not body.session_id:
        await db.ai_conversations.insert_one({
            "session_id": session_id, "user_id": user["id"], "assistant": assistant,
            "messages": [{"role": "user", "text": body.message, "at": now()}],
            "created_at": now(), "updated_at": now(),
        })
    else:
        await db.ai_conversations.update_one(
            {"session_id": session_id, "user_id": user["id"]},
            {"$push": {"messages": {"role": "user", "text": body.message, "at": now()}},
             "$set": {"updated_at": now()}})

    history_doc = await db.ai_conversations.find_one({"session_id": session_id})
    prior = (history_doc or {}).get("messages", [])[:-1][-10:]
    context = "\n".join(f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['text']}" for m in prior)

    chat = LlmChat(api_key=get_key(), session_id=session_id,
                   system_message=system_prompt + (f"\n\nConversation so far:\n{context}" if context else ""))
    chat.with_model("openai", model)

    full = []

    async def stream():
        try:
            async for event in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(event, TextDelta):
                    full.append(event.content)
                    yield f"data: {json.dumps({'delta': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if full:
                await db.ai_conversations.update_one(
                    {"session_id": session_id},
                    {"$push": {"messages": {"role": "assistant", "text": "".join(full), "at": now()}},
                     "$set": {"updated_at": now()}})
                await log_ai(user["id"], f"chat:{assistant}", body.message[:120])
        yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/conversations")
async def ai_conversations(user: dict = Depends(get_current_user)):
    items = await db.ai_conversations.find({"user_id": user["id"]},
                                           {"messages": 0}).sort("updated_at", -1).to_list(50)
    return serialize_list(items)


@router.get("/conversations/{session_id}")
async def ai_conversation_detail(session_id: str, user: dict = Depends(get_current_user)):
    doc = await db.ai_conversations.find_one({"session_id": session_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return serialize(doc)


@router.post("/quote-assist")
async def quote_assist(body: dict, user: dict = Depends(require_roles("provider"))):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    request_id = body.get("request_id") or ""
    req = await db.requests.find_one({"_id": oid(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    chat = LlmChat(api_key=get_key(), session_id=f"quote-assist-{request_id}-{user['id']}",
                   system_message=await get_prompt("provider"))
    chat.with_model("openai", await get_model("provider"))
    prompt = (f"Suggest a competitive quote for this UK job. Title: {req['title']}. "
              f"Details: {req['description']}. Location: {req.get('city') or req.get('postcode')}. "
              f"Respond with: 1) suggested price in GBP, 2) a 2-sentence customer-facing message, "
              f"3) one line on what's included. Keep it under 80 words.")
    reply = await chat.send_message(UserMessage(text=prompt))
    await log_ai(user["id"], "quote_assist", req["title"])
    return {"suggestion": reply}


@router.post("/match")
async def ai_match(body: dict, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    request_id = body.get("request_id") or ""
    req = await db.requests.find_one({"_id": oid(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    providers = await db.providers.find({"verified": True}).to_list(50)
    scored = []
    for p in providers:
        score = (p.get("rating", 0) * 10) + min(p.get("jobs_done", 0), 50)
        if req.get("service_id") in p.get("services", []):
            score += 40
        if req.get("city") and req["city"] in p.get("coverage", []):
            score += 20
        scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:5]
    results = []
    for score, p in top:
        owner = await db.users.find_one({"_id": oid(p["user_id"])})
        results.append({
            "provider_id": p["user_id"], "business_name": p.get("business_name"),
            "owner_name": owner["name"] if owner else "", "rating": p.get("rating", 0),
            "jobs_done": p.get("jobs_done", 0), "coverage": p.get("coverage", []),
            "match_score": min(round(score), 100),
        })
    rationale = ""
    if results:
        try:
            chat = LlmChat(api_key=get_key(), session_id=f"match-{request_id}",
                           system_message=await get_prompt("customer"))
            chat.with_model("openai", await get_model("customer"))
            names = ", ".join(r["business_name"] or r["owner_name"] for r in results)
            rationale = await chat.send_message(UserMessage(
                text=f"In 2 short sentences, explain why these providers are a good match for the job "
                     f"'{req['title']}': {names}."))
        except Exception:
            rationale = ""
    await log_ai(user["id"], "job_match", req["title"])
    return {"matches": results, "rationale": rationale}
