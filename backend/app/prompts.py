"""
Prompt builders for the main patient-analysis call. Ported directly from
the original frontend's src/services/groqService.js so the AI's behaviour
and output schema are unchanged -- only *where* the call happens (now the
backend, so the Groq key never reaches the browser) is different.
"""


def build_system_prompt() -> str:
    return (
        "You are a senior clinical pharmacist AI with expertise in pharmacology, "
        "drug interactions, clinical toxicology, and medication management. You know "
        "all drugs across FDA, WHO, Indian pharmacopoeia (CDSCO), European EMA, and "
        "global formularies — including brand names from 1mg, Netmeds, PharmEasy, and "
        "other Indian/global sources.\n\n"
        "Always respond with ONLY a valid JSON object — no markdown, no preamble."
    )


def _fmt_med(m: dict) -> str:
    parts = [m.get("name", "")]
    if m.get("dose"):
        parts.append(f" {m['dose']}")
    if m.get("frequency"):
        parts.append(f", {m['frequency']}")
    if m.get("timing"):
        parts.append(f", {m['timing']}")
    if "withFood" in m and m["withFood"] is not None:
        parts.append(", with food" if m["withFood"] else ", empty stomach")
    if m.get("notes"):
        parts.append(f" [{m['notes']}]")
    if m.get("source") == "prescription":
        parts.append(" (from Rx)")
    return "".join(parts)


def build_user_prompt(patient: dict) -> str:
    name = patient.get("name", "")
    age = patient.get("age", "")
    sex = patient.get("sex", "")
    weight = patient.get("weight", "")
    allergies = patient.get("allergies", "")
    symptoms = patient.get("symptoms", "")
    history = patient.get("history", "")
    medications = patient.get("medications", []) or []
    otc = patient.get("otc", "")
    vitals = patient.get("vitals", {}) or {}
    labs = patient.get("labs", {}) or {}

    med_list = (
        "\n  - ".join(_fmt_med(m) for m in medications) if medications else "None provided"
    )

    v_parts = []
    if vitals.get("bp_sys") and vitals.get("bp_dia"):
        v_parts.append(f"BP {vitals['bp_sys']}/{vitals['bp_dia']} mmHg")
    if vitals.get("hr"):
        v_parts.append(f"HR {vitals['hr']} bpm")
    if vitals.get("temp"):
        v_parts.append(f"Temp {vitals['temp']}\u00b0C")
    if vitals.get("spo2"):
        v_parts.append(f"SpO2 {vitals['spo2']}%")
    if vitals.get("egfr"):
        v_parts.append(f"eGFR {vitals['egfr']} mL/min")
    v_str = ", ".join(v_parts)

    l_parts = []
    if labs.get("hba1c"):
        l_parts.append(f"HbA1c {labs['hba1c']}%")
    if labs.get("creatinine"):
        l_parts.append(f"Creatinine {labs['creatinine']} mg/dL")
    if labs.get("potassium"):
        l_parts.append(f"K+ {labs['potassium']} mEq/L")
    if labs.get("sodium"):
        l_parts.append(f"Na+ {labs['sodium']} mEq/L")
    if labs.get("alt"):
        l_parts.append(f"ALT {labs['alt']} U/L")
    if labs.get("inr"):
        l_parts.append(f"INR {labs['inr']}")
    if labs.get("other"):
        l_parts.append(labs["other"])
    l_str = ", ".join(l_parts)

    weight_str = f" | Weight: {weight}kg" if weight else ""

    return f"""Analyze this patient profile and produce a complete drug interaction report with optimized medication schedule.

=== PATIENT PROFILE ===
Name: {name} | Age: {age} | Sex: {sex}{weight_str}
{f"Allergies: {allergies}" if allergies else ""}
{f"Symptoms: {symptoms}" if symptoms else ""}
{f"Medical History: {history}" if history else ""}

Medications (with patient-specified dosage/timing where provided):
  - {med_list}

{f"OTC/Supplements: {otc}" if otc else ""}
{f"Vitals: {v_str}" if v_str else ""}
{f"Labs: {l_str}" if l_str else ""}

IMPORTANT: If a patient has manually specified a dosage or timing for a drug, respect it in the schedule unless it is clinically unsafe — in which case flag it as a recommendation.

Return ONLY this JSON:
{{
  "summary": {{
    "critical": 0, "major": 0, "moderate": 0, "minor": 0,
    "total_drugs_reviewed": 0,
    "overall_risk": "low|moderate|high|critical"
  }},
  "data_sources_used": ["FDA labeling","RxNorm/NIH","Indian Pharmacopoeia","WHO formulary","Patient profile"],
  "interactions": [
    {{
      "id": "1",
      "severity": "critical|major|moderate|minor",
      "title": "Short title",
      "drugs_involved": ["Drug A","Drug B"],
      "mechanism": "Pharmacological mechanism",
      "clinical_significance": "Clinical effect and why it matters",
      "patient_specific_risk": "Risk specific to this patient",
      "action_required": "What clinician should do",
      "monitoring": "What to monitor",
      "source": "FDA label|Clinical pharmacology|Both"
    }}
  ],
  "allergy_alerts": [
    {{
      "drug": "Drug name",
      "allergen": "Conflicting allergen",
      "reaction_type": "Cross-reactivity|Direct allergy",
      "severity": "critical|major",
      "note": "Explanation"
    }}
  ],
  "lab_flags": [
    {{
      "type": "danger|warning|info",
      "parameter": "Lab name",
      "patient_value": "Value with unit",
      "reference_range": "Normal range",
      "status": "high|low|borderline",
      "drug_implications": "Effect on drug safety/dosing",
      "action": "Recommended action"
    }}
  ],
  "renal_adjustments": [
    {{
      "drug": "Drug name",
      "egfr_threshold": "Threshold",
      "current_egfr": "Patient eGFR",
      "recommendation": "Dose adjustment",
      "alternative": "Alternative if applicable"
    }}
  ],
  "schedule": [
    {{
      "drug": "Drug name",
      "generic_name": "Generic",
      "dose": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "slots": ["morning","evening"],
      "times": ["8:00 AM","8:00 PM"],
      "with_food": true,
      "food_note": "e.g. Take with full glass of water",
      "special_instructions": "e.g. Avoid grapefruit, separate from antacids by 2h",
      "missed_dose": "Missed dose instructions",
      "patient_specified": false
    }}
  ],
  "dosage_safety_flags": [
    {{
      "drug": "Drug name",
      "patient_dose": "What patient entered",
      "recommended_dose": "Standard recommended dose",
      "concern": "over|under|incorrect_timing",
      "note": "Clinical explanation"
    }}
  ],
  "recommendations": [
    {{
      "priority": "high|medium|low",
      "category": "monitoring|substitution|lifestyle|follow-up|dosing",
      "text": "Actionable recommendation"
    }}
  ],
  "new_drug_note": "Flag newer drugs needing verification"
}}"""


CHATBOT_SYSTEM_PROMPT = """You are MedBot, a friendly and knowledgeable clinical pharmacist assistant built into the MedCheck drug interaction checker. You help users understand:
- Drug interactions and what they mean
- How to take medications correctly (timing, food, storage)
- Side effects and what to expect
- General medication questions
- Indian brand names and their generic equivalents
- When to consult a doctor

Keep responses clear, concise, and practical. Use simple language. Always remind users to verify with their doctor for personal medical decisions. Never diagnose or replace professional medical advice."""


PRESCRIPTION_SYSTEM_PROMPT = """You are a clinical pharmacist AI specializing in reading and interpreting medical prescriptions.
Extract ALL medications, dosages, frequencies, and instructions from the prescription image with high accuracy.
Always respond with ONLY a valid JSON object — no markdown, no preamble."""

PRESCRIPTION_USER_INSTRUCTIONS = """Read this medical prescription carefully and extract all medication information.

Return ONLY this JSON structure:
{
  "patient_name": "name if visible, else null",
  "doctor_name": "doctor name if visible, else null",
  "date": "prescription date if visible, else null",
  "medications": [
    {
      "drug_name": "exact drug name as written",
      "generic_name": "generic name if you can identify it",
      "dosage": "e.g. 500mg, 10mg",
      "form": "tablet|capsule|syrup|injection|drops|cream|inhaler|other",
      "frequency": "e.g. twice daily, once at night, every 8 hours",
      "duration": "e.g. 5 days, 1 month, ongoing",
      "timing": "before meals|after meals|with meals|empty stomach|at bedtime|as needed",
      "special_instructions": "any special notes e.g. avoid alcohol, take with water",
      "quantity": "total quantity if written e.g. 30 tablets"
    }
  ],
  "diagnosis": "diagnosis if written on prescription, else null",
  "additional_notes": "any other notes from the prescription",
  "confidence": "high|medium|low",
  "unclear_items": ["list any parts that were unclear or unreadable"]
}"""
