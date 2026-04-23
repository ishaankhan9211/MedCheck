import React from 'react'
import styles from './FormField.module.css'

export default function FormField({ label, required, error, children, hint }) {
  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.star}> *</span>}
        </label>
      )}
      {children}
      {error && <p className={styles.error}>{error}</p>}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
