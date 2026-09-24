import { useState, useCallback } from 'react'

const INITIAL_STATE = {
  name: '', age: '', sex: '',
  weight: '', allergies: '', symptoms: '', history: '',
  medications: [],   // [{ name, dose, frequency, timing, withFood, notes, source }]
  otc: '',
  vitals: { bp_sys: '', bp_dia: '', hr: '', temp: '', spo2: '', egfr: '' },
  labs:   { hba1c: '', creatinine: '', potassium: '', sodium: '', alt: '', inr: '', other: '' },
}

const DEFAULT_MED = {
  name: '', dose: '', frequency: 'once daily', timing: 'morning',
  withFood: true, notes: '', source: 'manual',
}

export function usePatientForm() {
  const [form, setForm]     = useState(INITIAL_STATE)
  const [errors, setErrors] = useState({})

  const setField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }, [errors])

  const setVital = useCallback((key, value) =>
    setForm(prev => ({ ...prev, vitals: { ...prev.vitals, [key]: value } })), [])

  const setLab = useCallback((key, value) =>
    setForm(prev => ({ ...prev, labs: { ...prev.labs, [key]: value } })), [])

  // Add a medication (with full detail object)
  const addMedication = useCallback((medOrName) => {
    const med = typeof medOrName === 'string'
      ? { ...DEFAULT_MED, name: medOrName.trim() }
      : { ...DEFAULT_MED, ...medOrName }
    if (!med.name.trim()) return false
    // prevent exact duplicate names
    setForm(prev => {
      if (prev.medications.find(m => m.name.toLowerCase() === med.name.toLowerCase())) return prev
      return { ...prev, medications: [...prev.medications, med] }
    })
    return true
  }, [])

  // Update a field on an existing medication row
  const updateMedication = useCallback((index, field, value) => {
    setForm(prev => {
      const meds = [...prev.medications]
      meds[index] = { ...meds[index], [field]: value }
      return { ...prev, medications: meds }
    })
  }, [])

  const removeMedication = useCallback((index) =>
    setForm(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== index) })), [])

  // Bulk-add from prescription scan
  const addMedicationsFromPrescription = useCallback((prescMeds) => {
    const mapped = prescMeds.map(pm => ({
      ...DEFAULT_MED,
      name:      pm.drug_name  || pm.generic_name || '',
      dose:      pm.dosage     || '',
      frequency: pm.frequency  || 'once daily',
      timing:    pm.timing === 'at bedtime'    ? 'night'
                : pm.timing === 'before meals' ? 'morning'
                : pm.timing === 'after meals'  ? 'morning'
                : 'morning',
      withFood:  pm.timing?.includes('meal') ?? true,
      notes:     [pm.special_instructions, pm.duration].filter(Boolean).join(' · '),
      source:    'prescription',
    })).filter(m => m.name)
    setForm(prev => {
      const existingNames = new Set(prev.medications.map(m => m.name.toLowerCase()))
      const toAdd = mapped.filter(m => !existingNames.has(m.name.toLowerCase()))
      return { ...prev, medications: [...prev.medications, ...toAdd] }
    })
    return mapped.length
  }, [])

  const validate = useCallback(() => {
    const e = {}
    if (!form.name.trim()) e.name = 'Patient name is required'
    if (!form.age)         e.age  = 'Age is required'
    if (!form.sex)         e.sex  = 'Sex is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  const reset = useCallback(() => { setForm(INITIAL_STATE); setErrors({}) }, [])

  return {
    form, errors,
    setField, setVital, setLab,
    addMedication, updateMedication, removeMedication,
    addMedicationsFromPrescription,
    validate, reset,
  }
}
