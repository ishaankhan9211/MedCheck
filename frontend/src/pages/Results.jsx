import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchAIProvider, AI_PROVIDER_FALLBACK } from '../services/groqService'
import { saveToHistory } from '../services/historyService'
import { generatePDFReport } from '../services/pdfService'
import styles from './Results.module.css'

const SEV = {
  critical: { cls: styles.sevCritical, badge: styles.bCritical, label: 'Critical' },
  major:    { cls: styles.sevMajor,    badge: styles.bMajor,    label: 'Major'    },
  moderate: { cls: styles.sevModerate, badge: styles.bModerate, label: 'Moderate' },
  minor:    { cls: styles.sevMinor,    badge: styles.bMinor,    label: 'Minor'    },
}
const PRI = { high: styles.sevCritical, medium: styles.sevMajor, low: styles.sevModerate }
const SLOTS = ['morning','afternoon','evening','night']
const SLOT_LABEL = { morning:'Morning', afternoon:'Afternoon', evening:'Evening', night:'Night' }
const SLOT_TIME  = { morning:'6–10 AM', afternoon:'12–2 PM',  evening:'6–8 PM',  night:'9–11 PM' }

function Badge({ text, cls }) { return <span className={`${styles.badge} ${cls}`}>{text}</span> }

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!count) return null
  return (
    <div className={styles.section}>
      <button className={styles.secHdr} onClick={() => setOpen(o => !o)}>
        <span className={styles.secTitle}>{title}</span>
        <span className={styles.secCount}>{count}</span>
        <span className={styles.secChevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className={styles.secBody}>{children}</div>}
    </div>
  )
}

export default function Results() {
  const { state } = useLocation()
  const [pdfBusy, setPdfBusy] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveError, setSaveError] = useState('')
  const [provider, setProvider] = useState(AI_PROVIDER_FALLBACK)
  const navigate  = useNavigate()

  useEffect(() => { fetchAIProvider().then(setProvider) }, [])

  useEffect(() => {
    if (state?.result && state?.patient && !saved) {
      saveToHistory(state.patient, state.result)
        .then(() => setSaved(true))
        .catch(err => setSaveError(err.message))
    }
  }, [state, saved])

  if (!state?.result) return (
    <div className={styles.empty}>
      <p>No results yet. Please complete an analysis first.</p>
      <button className={styles.startBtn} onClick={() => navigate('/checker')}>Start analysis</button>
    </div>
  )

  const { result: r, patient } = state

  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })

  // Build schedule slots
  const slots = { morning:[], afternoon:[], evening:[], night:[] }
  ;(r.schedule || []).forEach(d => {
    const added = new Set()
    ;(d.slots || []).forEach(s => {
      const k = s.toLowerCase()
      if (slots[k] && !added.has(k)) { slots[k].push(d); added.add(k) }
    })
    if (!added.size) slots.morning.push(d)
  })

  const riskCls = { low: styles.riskLow, moderate: styles.riskMod, high: styles.riskHigh, critical: styles.riskCrit }[r.summary?.overall_risk] || styles.riskLow

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>Analysis results</h1>
          <p className={styles.meta}>
            <strong>{patient.name}</strong> · Age {patient.age} · {patient.sex}
            {patient.weight ? ` · ${patient.weight}kg` : ''} · {today}
          </p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/checker')}>+ New analysis</button>
        <button className={styles.pdfBtn} onClick={async () => { setPdfBusy(true); try { await generatePDFReport(patient, r) } catch(e){ alert('PDF failed: '+e.message) } setPdfBusy(false) }} disabled={pdfBusy}>{pdfBusy ? 'Generating…' : '⬇ Download PDF'}</button>
        <button className={styles.histBtn} onClick={() => navigate('/history')}>History</button>
      </div>

      {/* AI + source strip */}
      <div className={styles.strip}>
        <span className={styles.aiChip}><span className={styles.aiDot}/>  {provider.badge}</span>
        {r.data_sources_used?.map((s,i) => <span key={i} className={styles.chip}>{s}</span>)}
      </div>

      {/* Summary pills */}
      <div className={styles.pills}>
        {r.summary?.critical  > 0 && <span className={`${styles.pill} ${styles.pCrit}`}>{r.summary.critical} Critical</span>}
        {r.summary?.major     > 0 && <span className={`${styles.pill} ${styles.pMaj}`}>{r.summary.major} Major</span>}
        {r.summary?.moderate  > 0 && <span className={`${styles.pill} ${styles.pMod}`}>{r.summary.moderate} Moderate</span>}
        {r.summary?.minor     > 0 && <span className={`${styles.pill} ${styles.pMin}`}>{r.summary.minor} Minor</span>}
        {r.summary?.total_drugs_reviewed > 0 && <span className={`${styles.pill} ${styles.pNeutral}`}>{r.summary.total_drugs_reviewed} drugs</span>}
        {r.summary?.overall_risk && <span className={`${styles.pill} ${riskCls}`}>Risk: {r.summary.overall_risk}</span>}
      </div>

      {r.new_drug_note && <div className={styles.newDrugNote}><strong>Note:</strong> {r.new_drug_note}</div>}
      {saveError && <div className={styles.newDrugNote}><strong>Note:</strong> Could not save this to your history ({saveError}). The report itself is unaffected.</div>}

      {/* Allergy alerts */}
      <Section title="Allergy alerts" count={r.allergy_alerts?.length}>
        {r.allergy_alerts?.map((a,i) => (
          <div key={i} className={`${styles.card} ${styles.sevCritical}`}>
            <div className={styles.cardHdr}>
              <span className={styles.cardTitle}>Conflict: {a.drug}</span>
              <Badge text={a.reaction_type || 'Allergy'} cls={styles.bCritical}/>
            </div>
            <p className={styles.cardBody}><strong>{a.allergen}</strong> — {a.note}</p>
          </div>
        ))}
      </Section>

      {/* Interactions */}
      <Section title="Drug interactions" count={r.interactions?.length}>
        {r.interactions?.map((ix,i) => {
          const s = SEV[ix.severity] || SEV.minor
          return (
            <div key={i} className={`${styles.card} ${s.cls}`}>
              <div className={styles.cardHdr}>
                <span className={styles.cardTitle}>{ix.title}</span>
                <Badge text={s.label} cls={s.badge}/>
                {ix.source && <span className={styles.srcTag}>{ix.source}</span>}
              </div>
              <p className={styles.drugLine}>{ix.drugs_involved?.join(' + ')}</p>
              {ix.mechanism && <p className={styles.mech}><em>Mechanism:</em> {ix.mechanism}</p>}
              <p className={styles.cardBody}>{ix.clinical_significance}</p>
              {ix.patient_specific_risk && <div className={styles.patRisk}><strong>Patient-specific:</strong> {ix.patient_specific_risk}</div>}
              <div className={styles.action}><strong>Action:</strong> {ix.action_required}{ix.monitoring && <> · <strong>Monitor:</strong> {ix.monitoring}</>}</div>
            </div>
          )
        })}
      </Section>

      {/* Dosage safety flags — new section */}
      <Section title="Dosage safety review" count={r.dosage_safety_flags?.length}>
        {r.dosage_safety_flags?.map((d,i) => (
          <div key={i} className={`${styles.card} ${styles.sevMajor}`}>
            <div className={styles.cardHdr}>
              <span className={styles.cardTitle}>{d.drug}</span>
              <Badge text={d.concern?.replace('_',' ').toUpperCase()} cls={styles.bMajor}/>
            </div>
            <div className={styles.doseCompare}>
              <span>Patient entered: <strong>{d.patient_dose}</strong></span>
              <span className={styles.doseArrow}>→</span>
              <span>Recommended: <strong>{d.recommended_dose}</strong></span>
            </div>
            <p className={styles.cardBody}>{d.note}</p>
          </div>
        ))}
      </Section>

      {/* Lab flags */}
      <Section title="Lab & vital flags" count={r.lab_flags?.length}>
        {r.lab_flags?.map((lf,i) => (
          <div key={i} className={`${styles.card} ${styles['t_'+lf.type] || styles.sevModerate}`}>
            <div className={styles.cardHdr}>
              <span className={styles.cardTitle}>{lf.parameter}</span>
              <Badge text={(lf.status || lf.type || '').toUpperCase()} cls={lf.type==='danger'?styles.bCritical:lf.type==='warning'?styles.bMajor:styles.bModerate}/>
              <span className={styles.labVal}>Patient: <strong>{lf.patient_value}</strong> · Ref: {lf.reference_range}</span>
            </div>
            <p className={styles.cardBody}>{lf.drug_implications}</p>
            {lf.action && <div className={styles.action}><strong>Action:</strong> {lf.action}</div>}
          </div>
        ))}
      </Section>

      {/* Renal adjustments */}
      <Section title="Renal dose adjustments" count={r.renal_adjustments?.length}>
        {r.renal_adjustments?.map((rd,i) => (
          <div key={i} className={`${styles.card} ${styles.sevMajor}`}>
            <div className={styles.cardHdr}>
              <span className={styles.cardTitle}>Dose review: {rd.drug}</span>
              <Badge text="Renal" cls={styles.bMajor}/>
              {rd.current_egfr && <span className={styles.labVal}>eGFR: {rd.current_egfr}</span>}
            </div>
            <p className={styles.cardBody}>{rd.recommendation}</p>
            {rd.alternative && <p className={styles.cardBody}><strong>Alternative:</strong> {rd.alternative}</p>}
          </div>
        ))}
      </Section>

      {/* Medication schedule */}
      {r.schedule?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.secHdr} style={{cursor:'default'}}>
            <span className={styles.secTitle}>Medication schedule</span>
            <span className={styles.secCount}>{r.schedule.length} drugs</span>
          </div>
          <div className={styles.secBody}>
            <div className={styles.schedGrid}>
              {SLOTS.map(slot => (
                <div key={slot} className={styles.slotCol}>
                  <div className={styles.slotHdr}>
                    <span className={styles.slotName}>{SLOT_LABEL[slot]}</span>
                    <span className={styles.slotTime}>{SLOT_TIME[slot]}</span>
                  </div>
                  {slots[slot].length === 0 && <p className={styles.slotEmpty}>No medications</p>}
                  {slots[slot].map((d,i) => (
                    <div key={i} className={`${styles.schedCard} ${d.patient_specified ? styles.schedPatient : ''}`}>
                      {d.patient_specified && <span className={styles.patBadge}>Your schedule</span>}
                      <p className={styles.schedDrug}>{d.drug}{d.dose && <span className={styles.schedDose}> {d.dose}</span>}</p>
                      {d.times?.length > 0 && <p className={styles.schedDet}>{d.times.join(', ')}</p>}
                      <p className={styles.schedDet}>{d.with_food ? 'With food' : 'Empty stomach'}{d.food_note ? ` — ${d.food_note}` : ''}</p>
                      {d.special_instructions && <p className={styles.schedSpec}>{d.special_instructions}</p>}
                      {d.missed_dose && <p className={styles.schedMissed}><strong>Missed dose:</strong> {d.missed_dose}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <Section title="Clinical recommendations" count={r.recommendations?.length}>
        {r.recommendations?.map((rec,i) => (
          <div key={i} className={`${styles.card} ${PRI[rec.priority] || styles.sevModerate}`}>
            <div className={styles.cardHdr}>
              <Badge text={(rec.priority||'').toUpperCase()+' PRIORITY'} cls={rec.priority==='high'?styles.bCritical:rec.priority==='medium'?styles.bMajor:styles.bModerate}/>
              {rec.category && <span className={styles.srcTag}>{rec.category}</span>}
            </div>
            <p className={styles.cardBody}>{rec.text}</p>
          </div>
        ))}
      </Section>

      {/* All clear */}
      {!r.interactions?.length && !r.lab_flags?.length && !r.allergy_alerts?.length && (
        <div className={`${styles.card} ${styles.allClear}`}>
          <div className={styles.cardHdr}><span className={styles.cardTitle}>No significant issues detected</span></div>
          <p className={styles.cardBody}>No critical interactions, allergy conflicts, or abnormal lab values found. Always review comprehensively with full patient records.</p>
        </div>
      )}

      <div className={styles.disclaimer}>
        <strong>Clinical decision support only.</strong> AI-generated using Groq ({provider.modelLabel}) cross-referenced against FDA, RxNorm, DailyMed, and patient profile. All findings must be verified by a licensed healthcare professional before any clinical decisions.
      </div>
    </div>
  )
}
