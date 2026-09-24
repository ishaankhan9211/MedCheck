const KEY = 'medcheck_history'
const MAX = 50

export function saveToHistory(patient, result) {
  const entry = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    patientName: patient.name,
    patientAge: patient.age,
    patientSex: patient.sex,
    medicationCount: patient.medications?.length || 0,
    medications: patient.medications?.map(m => m.name || m) || [],
    summary: result.summary || {},
    overallRisk: result.summary?.overall_risk || 'unknown',
    result,
    patient,
  }
  const all = getHistory()
  const updated = [entry, ...all].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch (_) {}
  return entry
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) { return [] }
}

export function deleteHistory(id) {
  const updated = getHistory().filter(e => e.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch (_) {}
}

export function clearHistory() {
  try { localStorage.removeItem(KEY) } catch (_) {}
}

export function getEntry(id) {
  return getHistory().find(e => e.id === id) || null
}
