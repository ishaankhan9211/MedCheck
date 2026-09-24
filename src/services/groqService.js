const API_KEY = import.meta.env.VITE_GROQ_API_KEY
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL   = 'llama-3.3-70b-versatile'

function buildSystemPrompt() {
  return `You are a senior clinical pharmacist AI with expertise in pharmacology, drug interactions, clinical toxicology, and medication management. You know all drugs across FDA, WHO, Indian pharmacopoeia (CDSCO), European EMA, and global formularies — including brand names from 1mg, Netmeds, PharmEasy, and other Indian/global sources.

Always respond with ONLY a valid JSON object — no markdown, no preamble.`
}

function buildUserPrompt(patientData) {
  const { name, age, sex, weight, allergies, symptoms, history, medications, otc, vitals, labs } = patientData

  const medList = medications.length
    ? medications.map(m =>
        `${m.name}${m.dose ? ' ' + m.dose : ''}${m.frequency ? ', ' + m.frequency : ''}${m.timing ? ', ' + m.timing : ''}${m.withFood !== undefined ? (m.withFood ? ', with food' : ', empty stomach') : ''}${m.notes ? ' [' + m.notes + ']' : ''}${m.source === 'prescription' ? ' (from Rx)' : ''}`
      ).join('\n  - ')
    : 'None provided'

  const vStr = [
    vitals.bp_sys && vitals.bp_dia ? `BP ${vitals.bp_sys}/${vitals.bp_dia} mmHg` : '',
    vitals.hr    ? `HR ${vitals.hr} bpm`        : '',
    vitals.temp  ? `Temp ${vitals.temp}°C`       : '',
    vitals.spo2  ? `SpO2 ${vitals.spo2}%`        : '',
    vitals.egfr  ? `eGFR ${vitals.egfr} mL/min`  : '',
  ].filter(Boolean).join(', ')

  const lStr = [
    labs.hba1c      ? `HbA1c ${labs.hba1c}%`              : '',
    labs.creatinine ? `Creatinine ${labs.creatinine} mg/dL` : '',
    labs.potassium  ? `K+ ${labs.potassium} mEq/L`          : '',
    labs.sodium     ? `Na+ ${labs.sodium} mEq/L`            : '',
    labs.alt        ? `ALT ${labs.alt} U/L`                 : '',
    labs.inr        ? `INR ${labs.inr}`                     : '',
    labs.other      || '',
  ].filter(Boolean).join(', ')

  return `Analyze this patient profile and produce a complete drug interaction report with optimized medication schedule.

=== PATIENT PROFILE ===
Name: ${name} | Age: ${age} | Sex: ${sex}${weight ? ` | Weight: ${weight}kg` : ''}
${allergies ? `Allergies: ${allergies}` : ''}
${symptoms  ? `Symptoms: ${symptoms}` : ''}
${history   ? `Medical History: ${history}` : ''}

Medications (with patient-specified dosage/timing where provided):
  - ${medList}

${otc  ? `OTC/Supplements: ${otc}` : ''}
${vStr ? `Vitals: ${vStr}` : ''}
${lStr ? `Labs: ${lStr}` : ''}

IMPORTANT: If a patient has manually specified a dosage or timing for a drug, respect it in the schedule unless it is clinically unsafe — in which case flag it as a recommendation.

Return ONLY this JSON:
{
  "summary": {
    "critical": 0, "major": 0, "moderate": 0, "minor": 0,
    "total_drugs_reviewed": 0,
    "overall_risk": "low|moderate|high|critical"
  },
  "data_sources_used": ["FDA labeling","RxNorm/NIH","Indian Pharmacopoeia","WHO formulary","Patient profile"],
  "interactions": [
    {
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
    }
  ],
  "allergy_alerts": [
    {
      "drug": "Drug name",
      "allergen": "Conflicting allergen",
      "reaction_type": "Cross-reactivity|Direct allergy",
      "severity": "critical|major",
      "note": "Explanation"
    }
  ],
  "lab_flags": [
    {
      "type": "danger|warning|info",
      "parameter": "Lab name",
      "patient_value": "Value with unit",
      "reference_range": "Normal range",
      "status": "high|low|borderline",
      "drug_implications": "Effect on drug safety/dosing",
      "action": "Recommended action"
    }
  ],
  "renal_adjustments": [
    {
      "drug": "Drug name",
      "egfr_threshold": "Threshold",
      "current_egfr": "Patient eGFR",
      "recommendation": "Dose adjustment",
      "alternative": "Alternative if applicable"
    }
  ],
  "schedule": [
    {
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
    }
  ],
  "dosage_safety_flags": [
    {
      "drug": "Drug name",
      "patient_dose": "What patient entered",
      "recommended_dose": "Standard recommended dose",
      "concern": "over|under|incorrect_timing",
      "note": "Clinical explanation"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "monitoring|substitution|lifestyle|follow-up|dosing",
      "text": "Actionable recommendation"
    }
  ],
  "new_drug_note": "Flag newer drugs needing verification"
}`
}

export async function analyzePatient(patientData) {
  if (!API_KEY || API_KEY === 'your_groq_api_key_here') throw new Error('MISSING_API_KEY')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user',   content: buildUserPrompt(patientData) },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse AI response')
  }
}

export const AI_PROVIDER = {
  name: 'Groq', model: MODEL,
  modelLabel: 'Llama 3.3 70B',
  badge: 'Groq · Llama 3.3 70B',
  color: '#f55036',
}
