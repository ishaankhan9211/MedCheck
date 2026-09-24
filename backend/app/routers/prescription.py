import json
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..config import settings
from ..prompts import PRESCRIPTION_SYSTEM_PROMPT, PRESCRIPTION_USER_INSTRUCTIONS
from ..schemas import PrescriptionImageRequest

router = APIRouter(prefix="/api/prescription", tags=["prescription"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


@router.post("/read")
async def read_prescription(
    body: PrescriptionImageRequest, user: dict = Depends(get_current_user)
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GROQ_API_KEY. Add it to backend/.env and restart the server.",
        )

    payload = {
        "model": settings.GROQ_VISION_MODEL,
        "temperature": 0.1,
        "max_tokens": 2048,
        "messages": [
            {"role": "system", "content": PRESCRIPTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{body.mime_type};base64,{body.image_base64}"
                        },
                    },
                    {"type": "text", "text": PRESCRIPTION_USER_INSTRUCTIONS},
                ],
            },
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"Vision API error: {r.text}")

    data = r.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        raise HTTPException(
            status_code=502, detail="Could not parse prescription data from image"
        )
