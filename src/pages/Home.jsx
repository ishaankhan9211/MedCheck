import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Home.module.css'

const FEATURES = [
  { icon: '⬡', title: 'Indian medicine database', desc: '500+ Indian brands from Cipla, Sun Pharma, Mankind, Zydus, Alkem, Abbott — with instant local search. No internet needed for Indian drug lookup.' },
  { icon: '⬡', title: 'Multi-source drug search', desc: 'Simultaneously searches Indian DB, FDA, RxNorm/NIH (100k+ drugs), DailyMed, and NDC. Results show source badge for each drug.' },
  { icon: '⬡', title: 'AI prescription scanner', desc: 'Upload a photo of any handwritten or printed prescription. AI reads drug names, doses, frequency, and timing automatically.' },
  { icon: '⬡', title: 'Manual dose & timing editor', desc: 'Set exact dose, frequency, time of day, and food instructions per drug. AI flags if your entered dose is outside recommended range.' },
  { icon: '⬡', title: 'PDF report download', desc: 'One-click download of a full clinical PDF report with interactions, schedule, lab flags, and recommendations — ready to share with doctors.' },
  { icon: '⬡', title: 'Analysis history', desc: 'Every analysis is automatically saved to your device. Browse, revisit, and re-download past reports anytime.' },
  { icon: '⬡', title: 'MedBot chatbot', desc: 'Built-in AI pharmacist chatbot. Ask any question about medicines, interactions, side effects, or Indian drug brand equivalents.' },
  { icon: '⬡', title: 'Ultra-fast Groq inference', desc: 'Full drug interaction analysis typically completes in 3–6 seconds, powered by Groq hardware running Llama 3.3 70B.' },
]

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTag}>Clinical Decision Support · v3</div>
        <h1 className={styles.heroTitle}>Drug Interaction<br />Checker</h1>
        <p className={styles.heroSub}>
          AI-powered analysis with Indian medicine database, prescription scanning,
          PDF reports, history, and a built-in MedBot chatbot — running on Groq.
        </p>
        <div className={styles.heroBtns}>
          <button className={styles.btnPrimary} onClick={() => navigate('/checker')}>Start new analysis</button>
          <button className={styles.btnSecondary} onClick={() => navigate('/history')}>View history</button>
        </div>
        <div className={styles.sources}>
          <span>Powered by:</span>
          <span className={styles.srcChip} style={{color:'#f55036',borderColor:'rgba(245,80,54,0.3)'}}>Groq · Llama 3.3 70B</span>
          <span className={styles.srcChip}>Indian DB (500+ brands)</span>
          <span className={styles.srcChip}>FDA OpenFDA</span>
          <span className={styles.srcChip}>RxNorm/NIH</span>
          <span className={styles.srcChip}>DailyMed</span>
        </div>
      </section>

      <div className={styles.groqCallout}>
        <div className={styles.groqCalloutInner}>
          <span className={styles.groqDot} />
          <div>
            <strong>What's new in v3:</strong> Indian medicine database with 500+ brands (Dolo, Augmentin, Thyronorm, Montair, Becosules and more), instant local search with no internet required, PDF report download, analysis history saved on your device, and a MedBot chatbot for any medication questions.
          </div>
        </div>
      </div>

      <section className={styles.features}>
        {FEATURES.map((f, i) => (
          <div key={i} className={styles.featureCard} style={{animationDelay:`${i*0.05}s`}}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      <section className={styles.disclaimer}>
        <strong>Important:</strong> MedCheck is a clinical decision support tool. All outputs must be reviewed and verified by a licensed healthcare professional before any prescribing or dispensing decisions. Not a substitute for clinical judgment.
      </section>
    </div>
  )
}
