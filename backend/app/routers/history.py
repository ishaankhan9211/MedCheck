from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..schemas import HistoryCreate
from ..supabase_client import supabase

router = APIRouter(prefix="/api/history", tags=["history"])

MAX_ENTRIES = 50


def _to_entry(row: dict) -> dict:
    """Reshape a DB row back into the shape the frontend already expects
    (the same shape the old localStorage-based historyService used)."""
    return {
        "id": row["id"],
        "date": row["created_at"],
        "patientName": row.get("patient_name"),
        "patientAge": row.get("patient_age"),
        "patientSex": row.get("patient_sex"),
        "medicationCount": row.get("medication_count", 0),
        "medications": row.get("medications", []),
        "summary": row.get("summary", {}),
        "overallRisk": row.get("overall_risk", "unknown"),
        "result": row.get("result", {}),
        "patient": row.get("patient", {}),
    }


@router.get("")
def list_history(user: dict = Depends(get_current_user)):
    res = (
        supabase.table("analyses")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(MAX_ENTRIES)
        .execute()
    )
    return [_to_entry(row) for row in (res.data or [])]


@router.post("")
def create_history(entry: HistoryCreate, user: dict = Depends(get_current_user)):
    patient = entry.patient or {}
    result = entry.result or {}
    medications = patient.get("medications", []) or []

    row = {
        "user_id": user["id"],
        "patient_name": patient.get("name"),
        "patient_age": str(patient.get("age", "")),
        "patient_sex": patient.get("sex"),
        "medication_count": len(medications),
        "medications": [m.get("name", m) if isinstance(m, dict) else m for m in medications],
        "summary": result.get("summary", {}),
        "overall_risk": (result.get("summary", {}) or {}).get("overall_risk", "unknown"),
        "result": result,
        "patient": patient,
    }

    res = supabase.table("analyses").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save history entry")
    return _to_entry(res.data[0])


@router.delete("/{entry_id}")
def delete_one(entry_id: str, user: dict = Depends(get_current_user)):
    supabase.table("analyses").delete().eq("id", entry_id).eq("user_id", user["id"]).execute()
    return {"ok": True}


@router.delete("")
def clear_all(user: dict = Depends(get_current_user)):
    supabase.table("analyses").delete().eq("user_id", user["id"]).execute()
    return {"ok": True}
