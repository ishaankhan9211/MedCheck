import React, { useState } from 'react'
import styles from './MedicationRow.module.css'

const FREQUENCIES = [
  'once daily', 'twice daily', 'three times daily', 'four times daily',
  'every 4 hours', 'every 6 hours', 'every 8 hours', 'every 12 hours',
  'once weekly', 'twice weekly', 'as needed (PRN)', 'alternate days',
]

const TIMINGS = [
  { value: 'morning',   label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening',   label: 'Evening' },
  { value: 'night',     label: 'Night / Bedtime' },
  { value: 'morning+evening',             label: 'Morning + Evening' },
  { value: 'morning+afternoon+evening',   label: 'Morning + Afternoon + Evening' },
  { value: 'morning+afternoon+evening+night', label: '4× Daily' },
]

const SOURCE_BADGE = { prescription: { label: 'Rx', cls: styles.srcRx }, manual: { label: 'Manual', cls: styles.srcManual } }

export default function MedicationRow({ med, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(!med.dose) // auto-expand if no dose yet

  const set = (field, val) => onChange(index, field, val)
  const src = SOURCE_BADGE[med.source] || SOURCE_BADGE.manual

  return (
    <div className={`${styles.row} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.rowTop}>
        <div className={styles.drugName}>
          <span className={`${styles.srcBadge} ${src.cls}`}>{src.label}</span>
          <span className={styles.name}>{med.name}</span>
          {med.dose && <span className={styles.doseSummary}>{med.dose}</span>}
          {med.frequency && <span className={styles.freqSummary}>{med.frequency}</span>}
        </div>
        <div className={styles.rowActions}>
          <button
            className={styles.editBtn}
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Edit dosage & timing'}
          >
            {expanded ? '▲ Done' : '✎ Edit dosage'}
          </button>
          <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Remove">×</button>
        </div>
      </div>

      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailGrid}>
            <div className={styles.detailField}>
              <label>Dose</label>
              <input
                type="text" value={med.dose}
                onChange={e => set('dose', e.target.value)}
                placeholder="e.g. 500mg, 10mg, 1 tablet"
              />
            </div>
            <div className={styles.detailField}>
              <label>Frequency</label>
              <select value={med.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className={styles.detailField}>
              <label>Time of day</label>
              <select value={med.timing} onChange={e => set('timing', e.target.value)}>
                {TIMINGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className={styles.detailField}>
              <label>With food?</label>
              <select value={med.withFood ? 'yes' : 'no'} onChange={e => set('withFood', e.target.value === 'yes')}>
                <option value="yes">With food / after meals</option>
                <option value="no">Empty stomach / before meals</option>
              </select>
            </div>
          </div>
          <div className={styles.detailField} style={{ marginTop: 8 }}>
            <label>Special notes (optional)</label>
            <input
              type="text" value={med.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Avoid grapefruit, take with full glass of water…"
            />
          </div>
        </div>
      )}
    </div>
  )
}
