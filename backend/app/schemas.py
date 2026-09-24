from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PatientData(BaseModel):
    name: str = ""
    age: Any = ""
    sex: str = ""
    weight: Optional[Any] = ""
    allergies: Optional[str] = ""
    symptoms: Optional[str] = ""
    history: Optional[str] = ""
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    otc: Optional[str] = ""
    vitals: Dict[str, Any] = Field(default_factory=dict)
    labs: Dict[str, Any] = Field(default_factory=dict)


class PrescriptionImageRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class HistoryCreate(BaseModel):
    patient: Dict[str, Any]
    result: Dict[str, Any]
