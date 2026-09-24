import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import Chatbot from './Chatbot'
import styles from './Layout.module.css'

export default function Layout() {
  const navigate = useNavigate()
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.logo} onClick={() => navigate('/')}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="9" y="1" width="4" height="20" rx="2" fill="currentColor" opacity=".9"/>
              <rect x="1" y="9" width="20" height="4" rx="2" fill="currentColor" opacity=".9"/>
            </svg>
            <span>MedCheck</span>
          </button>
          <div className={styles.right}>
            <span className={styles.groqBadge}>
              <span className={styles.groqDot}/>Groq · Llama 3.3 70B
            </span>
            <nav className={styles.nav}>
              <NavLink to="/" end className={({isActive})=>isActive?styles.navActive:styles.navLink}>Home</NavLink>
              <NavLink to="/checker" className={({isActive})=>isActive?styles.navActive:styles.navLink}>Checker</NavLink>
              <NavLink to="/history" className={({isActive})=>isActive?styles.navActive:styles.navLink}>History</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
      <footer className={styles.footer}>
        <p>MedCheck v3 — Clinical decision support only. Verify with a licensed healthcare professional.</p>
      </footer>
      <Chatbot />
    </div>
  )
}
