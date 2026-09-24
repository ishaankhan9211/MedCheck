import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..config import settings
from ..prompts import CHATBOT_SYSTEM_PROMPT
from ..schemas import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


@router.post("")
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GROQ_API_KEY. Add it to backend/.env and restart the server.",
        )

    messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}] + [
        {"role": m.role, "content": m.content} for m in body.messages[-10:]
    ]

    payload = {"model": settings.GROQ_TEXT_MODEL, "temperature": 0.4, "max_tokens": 600, "messages": messages}

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"API error {r.status_code}")

    data = r.json()
    reply = data.get("choices", [{}])[0].get("message", {}).get("content") or (
        "Sorry, I could not generate a response."
    )
    return {"reply": reply}
