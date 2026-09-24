// History is now stored server-side in Supabase Postgres (per logged-in
// user) instead of the browser's localStorage. See
// backend/app/routers/history.py. These functions are now async.
import { apiFetch } from '../lib/apiClient'

export async function saveToHistory(patient, result) {
  return apiFetch('/api/history', {
    method: 'POST',
    body: JSON.stringify({ patient, result }),
  })
}

export async function getHistory() {
  try {
    return await apiFetch('/api/history')
  } catch (_) {
    return []
  }
}

export async function deleteHistory(id) {
  return apiFetch(`/api/history/${id}`, { method: 'DELETE' })
}

export async function clearHistory() {
  return apiFetch('/api/history', { method: 'DELETE' })
}

export async function getEntry(id) {
  const all = await getHistory()
  return all.find(e => e.id === id) || null
}
