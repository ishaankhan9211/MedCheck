import React, { useState, useRef } from 'react'
import { readPrescriptionImage, fileToBase64 } from '../services/prescriptionService'
import styles from './PrescriptionUpload.module.css'

export default function PrescriptionUpload({ onMedicationsExtracted }) {
  const [state,    setState]    = useState('idle') // idle|loading|success|error
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')
  const [preview,  setPreview]  = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const processFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, HEIC, etc.)')
      setState('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20MB')
      setState('error')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setState('loading')
    setError('')
    try {
      const base64 = await fileToBase64(file)
      const data   = await readPrescriptionImage(base64, file.type)
      setResult(data)
      setState('success')
    } catch (err) {
      setError(err.message || 'Failed to read prescription')
      setState('error')
    }
  }

  const handleFile = (e) => processFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const handleImport = () => {
    if (!result?.medications?.length) return
    const count = onMedicationsExtracted(result.medications)
    setState('imported')
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    setError('')
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.wrap}>
      {/* Drop zone */}
      {state === 'idle' && (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className={styles.fileInput} />
          <div className={styles.dropIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p className={styles.dropTitle}>Upload prescription image</p>
          <p className={styles.dropSub}>Drag & drop or click to browse · JPG, PNG, HEIC · Max 20MB</p>
          <p className={styles.dropSub} style={{ marginTop: 4 }}>AI will read the prescription and extract all drugs + dosages automatically</p>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className={styles.loadingBox}>
          {preview && <img src={preview} className={styles.previewThumb} alt="prescription" />}
          <div className={styles.loadingInner}>
            <div className={styles.loadSpinner} />
            <p className={styles.loadText}>Reading prescription with AI vision…</p>
            <p className={styles.loadSub}>Detecting drug names, dosages, and instructions</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryBtn} onClick={reset}>Try again</button>
        </div>
      )}

      {/* Success — show extracted data */}
      {(state === 'success' || state === 'imported') && result && (
        <div className={styles.resultBox}>
          <div className={styles.resultHeader}>
            {preview && <img src={preview} className={styles.previewThumb} alt="prescription" />}
            <div className={styles.resultMeta}>
              <div className={styles.resultTitle}>
                Prescription scanned
                <span className={`${styles.confBadge} ${styles['conf_' + (result.confidence || 'medium')]}`}>
                  {result.confidence || 'medium'} confidence
                </span>
              </div>
              {result.doctor_name && <p className={styles.metaLine}>Dr. {result.doctor_name}</p>}
              {result.patient_name && <p className={styles.metaLine}>Patient: {result.patient_name}</p>}
              {result.date         && <p className={styles.metaLine}>Date: {result.date}</p>}
              {result.diagnosis    && <p className={styles.metaLine}>Diagnosis: {result.diagnosis}</p>}
            </div>
          </div>

          {result.medications?.length > 0 && (
            <div className={styles.medList}>
              <p className={styles.medListTitle}>{result.medications.length} medication{result.medications.length !== 1 ? 's' : ''} detected:</p>
              {result.medications.map((m, i) => (
                <div key={i} className={styles.medItem}>
                  <span className={styles.medName}>{m.drug_name}</span>
                  {m.dosage    && <span className={styles.medTag}>{m.dosage}</span>}
                  {m.frequency && <span className={styles.medTag}>{m.frequency}</span>}
                  {m.timing    && <span className={styles.medTag}>{m.timing}</span>}
                  {m.duration  && <span className={styles.medTag}>{m.duration}</span>}
                </div>
              ))}
            </div>
          )}

          {result.unclear_items?.length > 0 && (
            <div className={styles.unclearBox}>
              <strong>Unclear items:</strong> {result.unclear_items.join(', ')}
            </div>
          )}

          {state === 'success' && (
            <div className={styles.resultActions}>
              <button className={styles.importBtn} onClick={handleImport}>
                Import {result.medications?.length} drug{result.medications?.length !== 1 ? 's' : ''} to list
              </button>
              <button className={styles.resetLink} onClick={reset}>Scan different prescription</button>
            </div>
          )}
          {state === 'imported' && (
            <div className={styles.importedBanner}>
              Medications imported successfully.
              <button className={styles.resetLink} style={{ marginLeft: 12 }} onClick={reset}>Scan another</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
