import React, { useState, useRef, useCallback, useEffect } from 'react'
import { searchDrugs } from '../services/drugDatabaseService'
import { searchIndianMedicines } from '../data/indianMedicines'
import styles from './DrugSearch.module.css'

const SRC_STYLE = {
  'Indian DB': { bg:'#fef3c7',color:'#92400e' },
  FDA:         { bg:'#dbeafe',color:'#1e40af' },
  'RxNorm/NIH':{ bg:'#d1fae5',color:'#065f46' },
  DailyMed:   { bg:'#ede9fe',color:'#5b21b6' },
  NDC:        { bg:'#fce7f3',color:'#9d174d' },
  RxNorm:     { bg:'#d1fae5',color:'#065f46' },
}

function SrcBadge({ source }) {
  const s = SRC_STYLE[source] || {bg:'#f3f4f6',color:'#374151'}
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,background:s.bg,color:s.color}}>{source}</span>
}

export default function DrugSearch({ onAdd }) {
  const [query,  setQuery]  = useState('')
  const [items,  setItems]  = useState([])
  const [busy,   setBusy]   = useState(false)
  const [open,   setOpen]   = useState(false)
  const timer = useRef(null)
  const wrap  = useRef(null)

  const doSearch = useCallback(async (q) => {
    clearTimeout(timer.current)
    if (!q || q.length < 2) { setItems([]); setOpen(false); return }

    // Instant Indian DB
    const indian = searchIndianMedicines(q, 8).map(m => ({
      brand:m.b, generic:m.g, category:m.c, manufacturer:m.m, source:'Indian DB'
    }))
    if (indian.length) { setItems(indian); setOpen(true) }

    setBusy(true)
    timer.current = setTimeout(async () => {
      try {
        const online = await searchDrugs(q)
        const seen = new Set(indian.map(r => r.brand.toLowerCase()))
        const merged = [...indian, ...online.filter(r => !seen.has(r.brand.toLowerCase()))].slice(0,14)
        setItems(merged)
        setOpen(true)
      } catch(_) {}
      setBusy(false)
    }, 420)
  }, [])

  const pick = (name) => { onAdd(name); setQuery(''); setItems([]); setOpen(false) }

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (query.trim()) pick(query.trim()) }
    if (e.key === 'Escape') setOpen(false)
  }

  useEffect(() => {
    const h = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={wrap} className={styles.wrap}>
      <div className={styles.row}>
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); doSearch(e.target.value) }}
          onKeyDown={onKey}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search Indian brands (Dolo, Augmentin, Thyronorm…) or any drug…"
          autoComplete="off" className={styles.input} />
        {busy && <span className={styles.spin} />}
        <button className={styles.addBtn} onClick={() => query.trim() && pick(query.trim())}>+ Add</button>
      </div>

      {open && (
        <div className={styles.drop}>
          {items.length === 0 && !busy && (
            <div className={styles.dropItem} onClick={() => query.trim() && pick(query.trim())}>
              <span className={styles.dName}>{query}</span>
              <span className={styles.dSub}>Add directly</span>
            </div>
          )}
          {items.map((r, i) => (
            <div key={i} className={styles.dropItem} onClick={() => pick(r.brand)}>
              <div className={styles.dLeft}>
                <span className={styles.dName}>{r.brand}</span>
                {r.generic && r.generic !== r.brand && <span className={styles.dSub}>{r.generic}</span>}
              </div>
              <div className={styles.dRight}>
                {r.category && <span className={styles.catTag}>{r.category}</span>}
                {r.manufacturer && <span className={styles.mfgTag}>{r.manufacturer}</span>}
                <SrcBadge source={r.source} />
              </div>
            </div>
          ))}
          <div className={styles.footer}>
            Indian DB (Cipla, Sun, Mankind, Zydus…) · FDA · RxNorm · DailyMed · 500+ Indian brands
          </div>
        </div>
      )}
      <p className={styles.hint}>Indian brands appear instantly. Press Enter to add any drug name directly.</p>
    </div>
  )
}
