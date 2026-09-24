// Calls the backend's /api/analyze endpoint instead of Groq directly.
// The Groq API key now lives only on the backend (backend/.env) — the
// browser never sees it.
import { apiFetch } from '../lib/apiClient'

export async function analyzePatient(patientData) {
  return apiFetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(patientData),
  })
}

// Generic fallback shown until the real value loads (or if the backend
// is unreachable) — deliberately NOT a specific model name, since Groq
// periodically retires model IDs and a hardcoded name here would go
// stale again (as llama-3.3-70b-versatile did). The actual model in use
// is configured server-side (backend/.env) and fetched at runtime.
export const AI_PROVIDER_FALLBACK = {
  name: 'Groq',
  modelLabel: 'AI-powered',
  badge: 'Groq · AI-powered',
  color: '#f55036',
}

// /api/provider requires no login, so this can be called from anywhere,
// including before the user signs in.
export async function fetchAIProvider() {
  try {
    return await apiFetch('/api/provider')
  } catch (_) {
    return AI_PROVIDER_FALLBACK
  }
}
