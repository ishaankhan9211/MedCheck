import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatientForm } from '../hooks/usePatientForm'
import { analyzePatient, AI_PROVIDER } from '../services/groqService'
import StepNav from '../components/StepNav'
import Card from '../components/Card'
import FormField from '../components/FormField'
import DrugSearch from '../components/DrugSearch'
import MedicationRow from '../components/MedicationRow'
import PrescriptionUpload from '../components/PrescriptionUpload'
import styles from './Checker.module.css'

const GRID2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }
const GRID3 = { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }

export default function Checker() {
  const navigate = useNavigate()
  const { form, errors, setField, setVital, setLab,
    addMedication, updateMedication, removeMedication,
    addMedicationsFromPrescription, validate } = usePatientForm()

  const [step,     setStep]     = useState('patient')
  const [visited,  setVisited]  = useState(new Set(['patient']))
  const [loading,  setLoading]  = useState(false)
  const [loadMsg,  setLoadMsg]  = useState('')
  const [apiError, setApiError] = useState('')

  const goStep = (s) => {
    if (s !== 'patient' && !validate()) return
    setStep(s)
    setVisited(prev => new Set([...prev, s]))
  }

  const handleAnalyze = async () => {
    if (!validate()) return
    setLoading(true); setApiError('')
    const msgs = [
      'Querying FDA · RxNorm · DailyMed databases…',
      'Cross-referencing drug interactions…',
      'Comparing patient labs and vitals…',
      `Running ${AI_PROVIDER.modelLabel} analysis…`,
      'Generating optimized medication schedule…',
    ]
    let i = 0; setLoadMsg(msgs[0])
    const iv = setInterval(() => { i = (i+1)%msgs.length; setLoadMsg(msgs[i]) }, 1800)
    try {
      const result = await analyzePatient(form)
      clearInterval(iv)
      navigate('/results', { state: { result, patient: form } })
    } catch (err) {
      clearInterval(iv); setLoading(false)
      setApiError(err.message === 'MISSING_API_KEY'
        ? 'API key not set. Open .env, add VITE_GROQ_API_KEY=gsk_... then restart the server.'
        : `Analysis failed: ${err.message}`)
    }
  }

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingBox}>
        <div className={styles.loadSpinner} />
        <p className={styles.loadMsg}>{loadMsg}</p>
        <div className={styles.loadSources}>
          <span className={styles.dot}/> FDA · RxNorm · DailyMed · NDC
          <span className={styles.dot} style={{marginLeft:16}}/> {AI_PROVIDER.badge}
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.hdr}>
        <h1 className={styles.title}>New analysis</h1>
        <p className={styles.sub}><span className={styles.req}>* Required</span> — everything else is optional.</p>
      </div>

      <StepNav current={step} visited={visited} onSelect={goStep} />

      {/* ── STEP 1: Patient ── */}
      {step === 'patient' && (
        <div className="fade-up">
          <Card title="Basic information" badge="Required" badgeType="required">
            <div style={GRID3}>
              <FormField label="Full name" required error={errors.name}>
                <input value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Patient name"/>
              </FormField>
              <FormField label="Age" required error={errors.age}>
                <input type="number" min="0" max="120" value={form.age} onChange={e=>setField('age',e.target.value)} placeholder="e.g. 52"/>
              </FormField>
              <FormField label="Sex at birth" required error={errors.sex}>
                <select value={form.sex} onChange={e=>setField('sex',e.target.value)}>
                  <option value="">Select…</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </FormField>
            </div>
          </Card>
          <Card title="Additional details" badge="Optional">
            <div style={{...GRID2, marginBottom:14}}>
              <FormField label="Weight (kg)">
                <input type="number" value={form.weight} onChange={e=>setField('weight',e.target.value)} placeholder="e.g. 72"/>
              </FormField>
              <FormField label="Known allergies">
                <input value={form.allergies} onChange={e=>setField('allergies',e.target.value)} placeholder="e.g. Penicillin, Sulfonamides"/>
              </FormField>
            </div>
            <FormField label="Current symptoms / complaints">
              <textarea rows={3} value={form.symptoms} onChange={e=>setField('symptoms',e.target.value)} placeholder="Describe symptoms, onset, severity…"/>
            </FormField>
            <div style={{marginTop:12}}>
              <FormField label="Relevant medical history">
                <textarea rows={2} value={form.history} onChange={e=>setField('history',e.target.value)} placeholder="e.g. Type 2 diabetes, hypertension, CKD stage 3…"/>
              </FormField>
            </div>
          </Card>
          <div className={styles.navRow}>
            <button className={styles.nextBtn} onClick={()=>goStep('meds')}>Next: Medications →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Medications ── */}
      {step === 'meds' && (
        <div className="fade-up">
          {/* Prescription upload */}
          <Card title="Scan doctor's prescription" badge="AI vision" badgeType="live">
            <p className={styles.sectionNote}>
              Upload a photo of a handwritten or printed prescription — AI will read it and extract all drugs, doses, and instructions automatically.
            </p>
            <PrescriptionUpload onMedicationsExtracted={addMedicationsFromPrescription} />
          </Card>

          {/* Drug search */}
          <Card title="Search & add medications" badge="FDA · RxNorm · DailyMed · 100k+ drugs" badgeType="live">
            <DrugSearch onAdd={addMedication} />
          </Card>

          {/* Medication list with dosage editor */}
          {form.medications.length > 0 && (
            <Card title={`Medication list (${form.medications.length})`} badge="Click ✎ Edit dosage to set dose & timing">
              {form.medications.map((med, i) => (
                <MedicationRow
                  key={i}
                  med={med}
                  index={i}
                  onChange={updateMedication}
                  onRemove={removeMedication}
                />
              ))}
            </Card>
          )}

          <Card title="OTC medications & supplements" badge="Optional">
            <FormField label="Over-the-counter drugs, vitamins, herbal supplements">
              <textarea rows={3} value={form.otc} onChange={e=>setField('otc',e.target.value)}
                placeholder="e.g. Aspirin 81mg, Fish oil 1000mg, Vitamin D3 2000IU, Ashwagandha…"/>
            </FormField>
          </Card>

          <div className={styles.navRow}>
            <button className={styles.backBtn} onClick={()=>goStep('patient')}>← Back</button>
            <button className={styles.nextBtn} onClick={()=>goStep('labs')}>Next: Labs & vitals →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Labs ── */}
      {step === 'labs' && (
        <div className="fade-up">
          <Card title="Vitals" badge="Fill what's available">
            <div style={GRID3}>
              {[['BP systolic (mmHg)','bp_sys','120'],['BP diastolic (mmHg)','bp_dia','80'],
                ['Heart rate (bpm)','hr','72'],['Temperature (°C)','temp','37.0'],
                ['SpO2 (%)','spo2','98'],['eGFR (mL/min)','egfr','65']].map(([lbl,key,ph])=>(
                <FormField key={key} label={lbl}>
                  <input type="number" step={key==='temp'?'.1':'1'} value={form.vitals[key]}
                    onChange={e=>setVital(key,e.target.value)} placeholder={ph}/>
                </FormField>
              ))}
            </div>
          </Card>
          <Card title="Lab values" badge="Fill what's available">
            <div style={GRID3}>
              {[['HbA1c (%)','hba1c','7.2','.1'],['Creatinine (mg/dL)','creatinine','1.1','.1'],
                ['Potassium (mEq/L)','potassium','4.2','.1'],['Sodium (mEq/L)','sodium','138','1'],
                ['ALT (U/L)','alt','32','1'],['INR','inr','1.0','.1']].map(([lbl,key,ph,st])=>(
                <FormField key={key} label={lbl}>
                  <input type="number" step={st} value={form.labs[key]}
                    onChange={e=>setLab(key,e.target.value)} placeholder={ph}/>
                </FormField>
              ))}
            </div>
            <div style={{marginTop:12}}>
              <FormField label="Other lab values">
                <textarea rows={2} value={form.labs.other} onChange={e=>setLab('other',e.target.value)}
                  placeholder="e.g. TSH 3.2, LDL 142, WBC 8.4, Hemoglobin 13.5…"/>
              </FormField>
            </div>
          </Card>

          {apiError && <div className={styles.apiError}><strong>Error:</strong> {apiError}</div>}

          <div className={styles.navRow}>
            <button className={styles.backBtn} onClick={()=>goStep('meds')}>← Back</button>
            <button className={styles.analyzeBtn} onClick={handleAnalyze}>Analyze &amp; generate schedule</button>
          </div>
        </div>
      )}
    </div>
  )
}
