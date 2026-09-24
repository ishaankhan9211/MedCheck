import React from 'react'
import styles from './StepNav.module.css'

const STEPS = [
  { key: 'patient', label: 'Patient info', required: true },
  { key: 'meds',    label: 'Medications',  required: false },
  { key: 'labs',    label: 'Labs & vitals', required: false },
]

export default function StepNav({ current, visited, onSelect }) {
  return (
    <div className={styles.nav}>
      {STEPS.map((s, i) => {
        const isDone    = visited.has(s.key) && s.key !== current
        const isCurrent = s.key === current
        return (
          <button
            key={s.key}
            className={`${styles.step} ${isCurrent ? styles.current : ''} ${isDone ? styles.done : ''}`}
            onClick={() => onSelect(s.key)}
          >
            <span className={styles.num}>{isDone ? '✓' : i + 1}</span>
            <span className={styles.label}>{s.label}</span>
            {!s.required && <span className={styles.opt}>optional</span>}
          </button>
        )
      })}
    </div>
  )
}
