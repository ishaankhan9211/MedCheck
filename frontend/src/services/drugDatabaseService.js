// Multi-source drug search — proxied through the backend
// (backend/app/routers/drugs.py), which fans out to FDA, RxNorm, and
// DailyMed server-side. Keeping this server-side means the browser makes
// one request instead of five, and rate limits/abuse are easier to manage
// centrally later.
import { apiFetch } from '../lib/apiClient'

export async function searchDrugs(query) {
  if (!query || query.length < 2) return []
  return apiFetch(`/api/drugs/search?q=${encodeURIComponent(query)}`)
}

export async function getDrugDetails(drugName) {
  try {
    return await apiFetch(`/api/drugs/details?name=${encodeURIComponent(drugName)}`)
  } catch (_) {
    return null
  }
}
