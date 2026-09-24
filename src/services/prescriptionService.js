// Prescription image reader — uses Groq Vision (llava-v1.5-7b or llama-3.2-vision)
// Reads doctor prescription images and extracts drug names + dosages

const API_KEY = import.meta.env.VITE_GROQ_API_KEY
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct' // Groq's latest vision model

export async function readPrescriptionImage(base64Image, mimeType = 'image/jpeg') {
  if (!API_KEY || API_KEY === 'your_groq_api_key_here') {
    throw new Error('MISSING_API_KEY')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are a clinical pharmacist AI specializing in reading and interpreting medical prescriptions. 
Extract ALL medications, dosages, frequencies, and instructions from the prescription image with high accuracy.
Always respond with ONLY a valid JSON object — no markdown, no preamble.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: `Read this medical prescription carefully and extract all medication information.

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
}`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Vision API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse prescription data from image')
  }
}

// Convert file to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
