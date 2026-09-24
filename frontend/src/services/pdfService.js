// PDF Report Generator — uses jsPDF loaded from CDN
// Generates a comprehensive clinical report from analysis results

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload  = () => resolve(window.jspdf.jsPDF)
    s.onerror = () => reject(new Error('Failed to load jsPDF'))
    document.head.appendChild(s)
  })
}

const SEV_COLOR = { critical: [220,38,38], major: [217,119,6], moderate: [37,99,235], minor: [22,163,74] }
const SLOT_TIME = { morning:'6–10 AM', afternoon:'12–2 PM', evening:'6–8 PM', night:'9–11 PM' }

export async function generatePDFReport(patient, result) {
  const jsPDF = await loadJsPDF()
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 16, contentW = W - margin * 2
  let y = 0

  // ── helpers ──────────────────────────────────────────────────────────────
  const newPage = () => { doc.addPage(); y = 20 }
  const checkPage = (need = 20) => { if (y + need > 275) newPage() }

  const txt = (text, x, yy, opts = {}) => {
    doc.setFontSize(opts.size || 10)
    doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal')
    doc.setTextColor(...(opts.color || [30, 30, 30]))
    doc.text(String(text), x, yy, { maxWidth: opts.maxWidth })
  }

  const hline = (yy, color = [220, 220, 220]) => {
    doc.setDrawColor(...color); doc.setLineWidth(0.3)
    doc.line(margin, yy, W - margin, yy)
  }

  const sectionHeader = (title, yy) => {
    doc.setFillColor(245, 247, 250)
    doc.rect(margin, yy - 4, contentW, 8, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80); doc.text(title.toUpperCase(), margin + 3, yy + 1)
    return yy + 8
  }

  const chip = (text, x, yy, color = [220, 38, 38]) => {
    doc.setFillColor(...color.map(c => Math.min(255, c + 180)))
    doc.roundedRect(x, yy - 3.5, doc.getTextWidth(text) + 6, 5, 1, 1, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color); doc.text(text, x + 3, yy)
    return x + doc.getTextWidth(text) + 10
  }

  const wrap = (text, x, yy, maxW, lineH = 4.5, size = 9) => {
    doc.setFontSize(size); doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(String(text || ''), maxW)
    lines.forEach((l, i) => doc.text(l, x, yy + i * lineH))
    return yy + lines.length * lineH
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(26, 92, 58)
  doc.rect(0, 0, W, 28, 'F')
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('MedCheck', margin, 13)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('Drug Interaction Analysis Report', margin, 20)
  doc.setFontSize(9); doc.setTextColor(200, 235, 215)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, W - margin, 20, { align: 'right' })
  y = 36

  // ── PATIENT INFO ──────────────────────────────────────────────────────────
  y = sectionHeader('Patient Information', y)
  y += 2
  const patFields = [
    ['Name', patient.name], ['Age', `${patient.age} years`], ['Sex', patient.sex],
    patient.weight && ['Weight', `${patient.weight} kg`],
    patient.allergies && ['Allergies', patient.allergies],
  ].filter(Boolean)

  const colW = contentW / 3
  patFields.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    const px = margin + col * colW
    const py = y + row * 8
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100)
    doc.text(f[0], px, py)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30); doc.setFontSize(10)
    doc.text(String(f[1]), px, py + 4)
  })
  y += Math.ceil(patFields.length / 3) * 8 + 4

  // Medications list
  if (patient.medications?.length) {
    hline(y); y += 4
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60)
    doc.text('Medications:', margin, y); y += 5
    patient.medications.forEach((m, i) => {
      checkPage(8)
      const name  = m.name  || m
      const dose  = m.dose  ? ` — ${m.dose}` : ''
      const freq  = m.frequency ? `, ${m.frequency}` : ''
      const src   = m.source === 'prescription' ? ' [Rx]' : ''
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
      doc.text(`${i + 1}. ${name}${dose}${freq}${src}`, margin + 4, y); y += 5
    })
  }
  y += 4; hline(y); y += 6

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  y = sectionHeader('Analysis Summary', y); y += 4
  const s = result.summary || {}
  const riskColor = { critical:[220,38,38], high:[217,119,6], moderate:[37,99,235], low:[22,163,74] }
  const rc = riskColor[s.overall_risk] || [100,100,100]

  doc.setFillColor(...rc.map(c => Math.min(255, c + 185)))
  doc.roundedRect(margin, y - 4, contentW, 16, 2, 2, 'F')
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...rc)
  doc.text(`Overall Risk: ${(s.overall_risk || 'unknown').toUpperCase()}`, margin + 6, y + 4)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
  const sumParts = [`${s.total_drugs_reviewed || 0} drugs reviewed`, `${s.critical || 0} critical`, `${s.major || 0} major`, `${s.moderate || 0} moderate`]
  doc.text(sumParts.join('   ·   '), margin + 6, y + 10)
  y += 22

  // ── INTERACTIONS ──────────────────────────────────────────────────────────
  if (result.interactions?.length) {
    checkPage(20); y = sectionHeader('Drug Interactions', y); y += 4
    result.interactions.forEach((ix, i) => {
      checkPage(36)
      const sc = SEV_COLOR[ix.severity] || [100,100,100]
      doc.setDrawColor(...sc); doc.setLineWidth(0.8)
      doc.line(margin, y, margin, y + 28)
      const xo = margin + 4
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...sc)
      doc.text(`${i + 1}. ${ix.title || ''}`, xo, y + 4)
      chip((ix.severity || '').toUpperCase(), xo + doc.getTextWidth((ix.title || '') + '  '), y + 4, sc)
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60)
      doc.text(ix.drugs_involved?.join(' + ') || '', xo, y + 9)
      if (ix.mechanism) {
        doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100)
        doc.text(`Mechanism: ${ix.mechanism}`, xo, y + 14)
      }
      y = wrap(ix.clinical_significance || '', xo, y + 19, contentW - 8)
      if (ix.action_required) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30)
        doc.text('Action: ', xo, y + 2)
        y = wrap(ix.action_required, xo + 14, y + 2, contentW - 22)
      }
      y += 5; hline(y, [230,230,230]); y += 4
    })
  }

  // ── DOSAGE SAFETY FLAGS ───────────────────────────────────────────────────
  if (result.dosage_safety_flags?.length) {
    checkPage(20); y = sectionHeader('Dosage Safety Review', y); y += 4
    result.dosage_safety_flags.forEach(d => {
      checkPage(18)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(d.drug, margin, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(`Patient: ${d.patient_dose}  →  Recommended: ${d.recommended_dose}`, margin + 40, y)
      y = wrap(d.note || '', margin, y + 5, contentW, 4.5, 8.5)
      y += 4
    })
  }

  // ── LAB FLAGS ─────────────────────────────────────────────────────────────
  if (result.lab_flags?.length) {
    checkPage(20); y = sectionHeader('Lab & Vital Flags', y); y += 4
    result.lab_flags.forEach(lf => {
      checkPage(14)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.setTextColor(lf.type === 'danger' ? 180 : lf.type === 'warning' ? 150 : 30, 30, 30)
      doc.text(`${lf.parameter}: ${lf.patient_value} (ref: ${lf.reference_range})`, margin, y)
      y = wrap(lf.drug_implications || '', margin, y + 5, contentW, 4.5, 8.5)
      y += 3
    })
  }

  // ── MEDICATION SCHEDULE ───────────────────────────────────────────────────
  if (result.schedule?.length) {
    checkPage(40); y = sectionHeader('Medication Schedule', y); y += 4
    const slots = { morning:[], afternoon:[], evening:[], night:[] }
    result.schedule.forEach(d => {
      (d.slots || ['morning']).forEach(s => { if (slots[s]) slots[s].push(d) })
    })
    const slotW = contentW / 4
    Object.entries(slots).forEach(([slot, drugs], ci) => {
      const sx = margin + ci * slotW
      doc.setFillColor(240, 248, 244)
      doc.rect(sx, y - 4, slotW - 2, 10, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 92, 58)
      doc.text(slot.charAt(0).toUpperCase() + slot.slice(1), sx + 2, y)
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(SLOT_TIME[slot], sx + 2, y + 4)
    })
    y += 10
    const maxRows = Math.max(...Object.values(slots).map(a => a.length))
    for (let r = 0; r < maxRows; r++) {
      checkPage(12)
      Object.entries(slots).forEach(([slot, drugs], ci) => {
        const d = drugs[r]
        if (!d) return
        const sx = margin + ci * slotW
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
        doc.text(`${d.drug}${d.dose ? ' ' + d.dose : ''}`, sx + 2, y + 3, { maxWidth: slotW - 4 })
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.setFontSize(7)
        doc.text(d.with_food ? 'With food' : 'Empty stomach', sx + 2, y + 7)
      })
      y += 12
    }
    y += 4
  }

  // ── RECOMMENDATIONS ───────────────────────────────────────────────────────
  if (result.recommendations?.length) {
    checkPage(20); y = sectionHeader('Clinical Recommendations', y); y += 4
    result.recommendations.forEach((rec, i) => {
      checkPage(12)
      const pc = rec.priority === 'high' ? [220,38,38] : rec.priority === 'medium' ? [217,119,6] : [37,99,235]
      chip((rec.priority || 'low').toUpperCase(), margin, y + 1, pc)
      y = wrap(rec.text || '', margin + 26, y, contentW - 28, 4.5, 9)
      y += 2
    })
  }

  // ── FOOTER DISCLAIMER ─────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'italic')
    doc.text('MedCheck — Clinical Decision Support Only. Verify all findings with a licensed healthcare professional before any prescribing decisions.', margin, 290, { maxWidth: contentW - 20 })
    doc.text(`Page ${p} of ${pages}`, W - margin, 290, { align: 'right' })
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const filename = `MedCheck_${patient.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(filename)
  return filename
}
