import { supabase } from './supabaseClient'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Calls the FastAPI backend, automatically attaching the current Supabase
 * session's access token so protected endpoints can identify the user.
 */
export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch (err) {
    throw new Error(
      `Could not reach the backend at ${BASE_URL}. Is it running? (${err.message})`
    )
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const err = await res.json()
      message = err.detail || err.error || message
    } catch (_) {}
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}
