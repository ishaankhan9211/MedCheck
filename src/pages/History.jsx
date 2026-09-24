import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory, deleteHistory, clearHistory } from '../services/historyService'
import styles from './History.module.css'

const RISK_STYLE = {
  critical:{ bg:'var(--danger-bg)',  color:'var(--danger)',  border:'var(--danger-border)'  },
  high:    { bg:'var(--warning-bg)', color:'var(--warning)', border:'var(--warning-border)' },
  moderate:{ bg:'var(--info-bg)',    color:'var(--info)',    border:'var(--info-border)'    },
  low:     { bg:'var(--success-bg)', color:'var(--success)', border:'var(--success-border)' },
  unknown: { bg:'var(--surface2)',   color:'var(--text-3)',  border:'var(--border)'         },
}

export default function History() {
  const navigate  = useNavigate()
  const [entries, setEntries] = useState([])
  const [confirm, setConfirm] = useState(false)

  useEffect(() => { setEntries(getHistory()) }, [])

  const remove = (id) => {
    deleteHistory(id)
    setEntries(getHistory())
  }

  const clear = () => {
    clearHistory()
    setEntries([])
    setConfirm(false)
  }

  const open = (entry) => {
    navigate('/results', { state: { result: entry.result, patient: entry.patient } })
  }

  const fmtDate = (iso) => new Date(iso).toLocaleString('en-IN', {
    day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  })

  return (
    <div className={styles.page}>
      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>Analysis history</h1>
          <p className={styles.sub}>{entries.length} saved {entries.length === 1 ? 'analysis' : 'analyses'} — stored locally on this device</p>
        </div>
        <div className={styles.hdrActions}>
          <button className={styles.newBtn} onClick={() => navigate('/checker')}>+ New analysis</button>
          {entries.length > 0 && !confirm && (
            <button className={styles.clearBtn} onClick={() => setConfirm(true)}>Clear all</button>
          )}
          {confirm && (
            <>
              <button className={styles.confirmBtn} onClick={clear}>Confirm clear</button>
              <button className={styles.cancelBtn} onClick={() => setConfirm(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>No history yet</p>
          <p className={styles.emptySub}>Your analyses will appear here automatically after each run.</p>
          <button className={styles.newBtn} onClick={() => navigate('/checker')}>Start first analysis</button>
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map(e => {
            const rs = RISK_STYLE[e.overallRisk] || RISK_STYLE.unknown
            return (
              <div key={e.id} className={styles.card}>
                <div className={styles.cardLeft} onClick={() => open(e)}>
                  <div className={styles.cardTop}>
                    <span className={styles.patName}>{e.patientName}</span>
                    <span className={styles.patInfo}>Age {e.patientAge} · {e.patientSex}</span>
                    <span className={styles.riskBadge} style={{background:rs.bg, color:rs.color, borderColor:rs.border}}>
                      Risk: {e.overallRisk}
                    </span>
                  </div>
                  <div className={styles.cardMids}>
                    <span className={styles.medList}>
                      {e.medications.slice(0,4).join(', ')}{e.medications.length > 4 ? ` +${e.medications.length - 4} more` : ''}
                    </span>
                  </div>
                  <div className={styles.cardBottom}>
                    <div className={styles.summaryChips}>
                      {e.summary?.critical  > 0 && <span className={`${styles.chip} ${styles.chipCrit}`}>{e.summary.critical} Critical</span>}
                      {e.summary?.major     > 0 && <span className={`${styles.chip} ${styles.chipMaj}`}>{e.summary.major} Major</span>}
                      {e.summary?.moderate  > 0 && <span className={`${styles.chip} ${styles.chipMod}`}>{e.summary.moderate} Moderate</span>}
                      {e.medicationCount    > 0 && <span className={`${styles.chip} ${styles.chipNeutral}`}>{e.medicationCount} drugs</span>}
                    </div>
                    <span className={styles.date}>{fmtDate(e.date)}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.viewBtn} onClick={() => open(e)}>View</button>
                  <button className={styles.delBtn} onClick={() => remove(e.id)} title="Delete">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
