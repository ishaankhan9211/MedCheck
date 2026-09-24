import json
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..config import settings
from ..prompts import build_system_prompt, build_user_prompt
from ..schemas import PatientData

router = APIRouter(prefix="/api", tags=["analyze"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Human-friendly labels for known model IDs, purely for the UI badge.
# Falls back to showing the raw model ID for anything not in this map, so
# swapping GROQ_TEXT_MODEL in .env never breaks the frontend.
_MODEL_LABELS = {
    "openai/gpt-oss-120b": "GPT-OSS 120B",
    "openai/gpt-oss-20b": "GPT-OSS 20B",
    "qwen/qwen3.6-27b": "Qwen 3.6 27B",
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
}


def _parse_json_response(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        raise HTTPException(status_code=502, detail="Failed to parse AI response")


@router.get("/provider")
def get_provider():
    """Public (no auth) -- just tells the UI which model is currently
    configured, so the header badge stays accurate even after a model
    swap in .env, and so it can render before the user logs in."""
    label = _MODEL_LABELS.get(settings.GROQ_TEXT_MODEL, settings.GROQ_TEXT_MODEL)
    return {
        "name": "Groq",
        "model": settings.GROQ_TEXT_MODEL,
        "modelLabel": label,
        "badge": f"Groq \u00b7 {label}",
        "color": "#f55036",
    }


@router.post("/analyze")
async def analyze(patient: PatientData, user: dict = Depends(get_current_user)):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GROQ_API_KEY. Add it to backend/.env and restart the server.",
        )

    payload = {
        "model": settings.GROQ_TEXT_MODEL,
        "temperature": 0.1,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(patient.model_dump())},
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"Groq API error: {r.text}")

    data = r.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return _parse_json_response(text)
