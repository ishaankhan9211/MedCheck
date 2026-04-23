import React, { useState, useRef, useEffect } from 'react'
import styles from './Chatbot.module.css'

const API_KEY = () => import.meta.env.VITE_GROQ_API_KEY
const MODEL   = 'llama-3.3-70b-versatile'

const SYSTEM = `You are MedBot, a friendly and knowledgeable clinical pharmacist assistant built into the MedCheck drug interaction checker. You help users understand:
- Drug interactions and what they mean
- How to take medications correctly (timing, food, storage)
- Side effects and what to expect
- General medication questions
- Indian brand names and their generic equivalents
- When to consult a doctor

Keep responses clear, concise, and practical. Use simple language. Always remind users to verify with their doctor for personal medical decisions. Never diagnose or replace professional medical advice.`

const SUGGESTIONS = [
  'What is a drug interaction?',
  'How do I take Metformin correctly?',
  'What are common Augmentin side effects?',
  'What does "take on empty stomach" mean?',
  'Is it safe to take Paracetamol and Ibuprofen together?',
  'What is the Indian brand of Atorvastatin?',
]

export default function Chatbot() {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([
    { role: 'assistant', content: 'Hi! I\'m MedBot 👋 I can answer questions about medications, drug interactions, and dosing. What would you like to know?' }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    setError('')
    const newMsgs = [...msgs, { role: 'user', content: q }]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      const key = API_KEY()
      if (!key || key === 'your_groq_api_key_here') throw new Error('API key not set')

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            { role: 'system', content: SYSTEM },
            ...newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }))
          ]
        })
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const d = await res.json()
      const reply = d.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <>
      {/* Floating button */}
      <button className={`${styles.fab} ${open ? styles.fabOpen : ''}`} onClick={() => setOpen(o => !o)} title="Open MedBot">
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        }
      </button>

      {/* Chat window */}
      {open && (
        <div className={styles.window}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>M</div>
              <div>
                <div className={styles.botName}>MedBot</div>
                <div className={styles.botSub}>Powered by Groq · Llama 3.3 70B</div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>×</button>
          </div>

          <div className={styles.messages}>
            {msgs.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgBot}`}>
                <div className={styles.bubble}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.msgBot}`}>
                <div className={styles.bubble}><span className={styles.dots}><span/><span/><span/></span></div>
              </div>
            )}
            {error && (
              <div className={styles.errorMsg}>Error: {error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {msgs.length === 1 && (
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className={styles.sugBtn} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about any medicine, interaction, or dosing…"
              rows={1}
              className={styles.chatInput}
            />
            <button className={styles.sendBtn} onClick={() => send()} disabled={!input.trim() || loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
