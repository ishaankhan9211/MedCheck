import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAIProvider, AI_PROVIDER_FALLBACK } from '../services/groqService'
import Chatbot from './Chatbot'
import styles from './Layout.module.css'

export default function Layout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [provider, setProvider] = useState(AI_PROVIDER_FALLBACK)

  useEffect(() => {
    fetchAIProvider().then(setProvider)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

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
              <span className={styles.groqDot}/>{provider.badge}
            </span>
            <nav className={styles.nav}>
              <NavLink to="/" end className={({isActive})=>isActive?styles.navActive:styles.navLink}>Home</NavLink>
              {user && <NavLink to="/checker" className={({isActive})=>isActive?styles.navActive:styles.navLink}>Checker</NavLink>}
              {user && <NavLink to="/history" className={({isActive})=>isActive?styles.navActive:styles.navLink}>History</NavLink>}
            </nav>
            {user ? (
              <div className={styles.userArea}>
                <span className={styles.userEmail} title={user.email}>{user.email}</span>
                <button className={styles.logoutBtn} onClick={handleSignOut}>Log out</button>
              </div>
            ) : (
              <div className={styles.userArea}>
                <NavLink to="/login" className={styles.navLink}>Log in</NavLink>
                <NavLink to="/signup" className={styles.signupBtn}>Sign up</NavLink>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
      <footer className={styles.footer}>
        <p>MedCheck v3 — Clinical decision support only. Verify with a licensed healthcare professional.</p>
      </footer>
      {user && <Chatbot />}
    </div>
  )
}
