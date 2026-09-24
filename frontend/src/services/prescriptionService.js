// Prescription image reader — proxied through the backend so the Groq
// key stays server-side. See backend/app/routers/prescription.py.
import { apiFetch } from '../lib/apiClient'

export async function readPrescriptionImage(base64Image, mimeType = 'image/jpeg') {
  return apiFetch('/api/prescription/read', {
    method: 'POST',
    body: JSON.stringify({ image_base64: base64Image, mime_type: mimeType }),
  })
}

// Convert file to base64 — unchanged, this still happens in the browser
// since the file itself never needs to leave the client until this point.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
