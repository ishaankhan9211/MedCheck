import React from 'react'
import styles from './Card.module.css'

export default function Card({ title, badge, badgeType = 'optional', children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || badge) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {badge && (
            <span className={`${styles.badge} ${styles[badgeType]}`}>{badge}</span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
