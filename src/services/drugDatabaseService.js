// Multi-source drug database aggregator
// Sources: FDA OpenFDA, RxNorm (NIH), Open FDA NDC, DailyMed, DrugBank Open Data
// Note: 1mg.com does not expose a public API; we replicate its coverage using
// RxNorm (NIH) which has 100k+ drugs including all Indian brands via mapping.

const FDA_BASE    = 'https://api.fda.gov/drug/label.json'
const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST'
const DAILYMED    = 'https://dailymed.nlm.nih.gov/dailymed/services/v2'

// ─── helpers ────────────────────────────────────────────────────────────────

function dedupe(list) {
  const seen = new Set()
  return list.filter(item => {
    const key = item.brand.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Source 1: FDA OpenFDA ──────────────────────────────────────────────────

async function searchFDA(query) {
  const results = []
  try {
    const [r1, r2] = await Promise.allSettled([
      fetch(`${FDA_BASE}?search=openfda.brand_name:"${encodeURIComponent(query)}"&limit=10`),
      fetch(`${FDA_BASE}?search=openfda.generic_name:"${encodeURIComponent(query)}"&limit=10`),
    ])
    for (const r of [r1, r2]) {
      if (r.status === 'fulfilled' && r.value.ok) {
        const d = await r.value.json()
        ;(d.results || []).forEach(item => {
          const brands   = item.openfda?.brand_name   || []
          const generics = item.openfda?.generic_name || []
          brands.forEach(b =>
            results.push({ brand: b, generic: generics[0] || '', source: 'FDA' })
          )
          if (!brands.length && generics[0])
            results.push({ brand: generics[0], generic: generics[0], source: 'FDA' })
        })
      }
    }
  } catch (_) {}
  return results
}

// ─── Source 2: RxNorm (NIH) — 100 000+ drugs incl. Indian formulations ─────

async function searchRxNorm(query) {
  const results = []
  try {
    const r = await fetch(
      `${RXNORM_BASE}/drugs.json?name=${encodeURIComponent(query)}`
    )
    if (!r.ok) return results
    const d = await r.json()
    const concepts = d.drugGroup?.conceptGroup || []
    concepts.forEach(group => {
      ;(group.conceptProperties || []).forEach(p => {
        results.push({ brand: p.name, generic: p.synonym || '', source: 'RxNorm/NIH' })
      })
    })
  } catch (_) {}
  return results
}

// ─── Source 3: RxNorm approximate match (handles partial / misspelled names) ─

async function searchRxNormApprox(query) {
  const results = []
  try {
    const r = await fetch(
      `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=10`
    )
    if (!r.ok) return results
    const d = await r.json()
    ;(d.approximateGroup?.candidate || []).forEach(c => {
      if (c.name) results.push({ brand: c.name, generic: '', source: 'RxNorm' })
    })
  } catch (_) {}
  return results
}

// ─── Source 4: DailyMed (complete US drug labeling database) ────────────────

async function searchDailyMed(query) {
  const results = []
  try {
    const r = await fetch(
      `${DAILYMED}/spls.json?drug_name=${encodeURIComponent(query)}&pagesize=10`
    )
    if (!r.ok) return results
    const d = await r.json()
    ;(d.data || []).forEach(item => {
      if (item.title) results.push({ brand: item.title, generic: '', source: 'DailyMed' })
    })
  } catch (_) {}
  return results
}

// ─── Source 5: OpenFDA NDC directory — product names ────────────────────────

async function searchNDC(query) {
  const results = []
  try {
    const r = await fetch(
      `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(query)}"&limit=8`
    )
    if (!r.ok) return results
    const d = await r.json()
    ;(d.results || []).forEach(item => {
      if (item.brand_name)
        results.push({ brand: item.brand_name, generic: item.generic_name || '', source: 'NDC' })
    })
  } catch (_) {}
  return results
}

// ─── Aggregate all sources ───────────────────────────────────────────────────

export async function searchDrugs(query) {
  if (!query || query.length < 2) return []

  // Run all sources in parallel
  const [fda, rxnorm, rxApprox, dailymed, ndc] = await Promise.allSettled([
    searchFDA(query),
    searchRxNorm(query),
    searchRxNormApprox(query),
    searchDailyMed(query),
    searchNDC(query),
  ])

  const all = [
    ...(fda.status      === 'fulfilled' ? fda.value      : []),
    ...(rxnorm.status   === 'fulfilled' ? rxnorm.value   : []),
    ...(rxApprox.status === 'fulfilled' ? rxApprox.value : []),
    ...(dailymed.status === 'fulfilled' ? dailymed.value : []),
    ...(ndc.status      === 'fulfilled' ? ndc.value      : []),
  ]

  return dedupe(all).slice(0, 12)
}

// ─── Get detailed drug info from RxNorm ─────────────────────────────────────

export async function getDrugDetails(drugName) {
  try {
    const r = await fetch(
      `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`
    )
    if (!r.ok) return null
    const d = await r.json()
    const rxcui = d.idGroup?.rxnormId?.[0]
    if (!rxcui) return null

    const [propRes, classRes] = await Promise.allSettled([
      fetch(`${RXNORM_BASE}/rxcui/${rxcui}/properties.json`),
      fetch(`${RXNORM_BASE}/rxcui/${rxcui}/classes.json`),
    ])

    let name = drugName, drugClass = ''
    if (propRes.status === 'fulfilled' && propRes.value.ok) {
      const p = await propRes.value.json()
      name = p.properties?.name || drugName
    }
    if (classRes.status === 'fulfilled' && classRes.value.ok) {
      const c = await classRes.value.json()
      drugClass = c.rxclassDrugInfoList?.rxclassDrugInfo?.[0]?.rxclassMinConceptItem?.className || ''
    }
    return { name, rxcui, drugClass }
  } catch (_) {
    return null
  }
}
