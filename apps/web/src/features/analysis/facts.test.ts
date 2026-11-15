// Snapshot facts layer (what remains of buildEvidencePacket without packet or FNV fingerprint,
// docs/INTEGRATION_PLAN.md §5.3): snapshot figures formatted for display (en-US), direction versus
// Jezero, limiting factor, “does not distinguish”, shared value, best of N and pipeline robustness.
// In v3: sites in Chile and Argentina, and the REF as a separate fact (outside “best of N” and the order).
import { describe, expect, it } from 'vitest'
import type { FactRef, FactsLayer, SiteFacts } from './types'
import { buildFactsLayer, FACT_TEXT_MAX, type FactsInput } from './facts'
import { summarizeRobustness, type RobustnessSummary } from './robustness'
import { buildMetricViews } from '../metrics/buildMetricViews'
import type { MetricView } from '../metrics'
import { DOMEYKO, fixtureViews, loadScienceSnapshot, MARIA_ELENA, YUNGAY } from './testSupport'
import { v3Snapshot } from '../../tests/v3Support'

const snapshot = loadScienceSnapshot()

/** Robustness FIXTURE: no order changes, roughness as the most sensitive criterion. */
const robustness: RobustnessSummary = {
  status: 'ready',
  scenarios: 14,
  flips: 0,
  topFlips: 0,
  mostSensitive: 'terrain_roughness',
  sites: snapshot.candidates.map((site) => ({ siteId: site.site_id, stability: site.stability, maxScoreDelta: 1 })),
}

function input(overrides: Partial<FactsInput> = {}): FactsInput {
  return { base: snapshot.profile, candidates: snapshot.candidates, views: fixtureViews(snapshot), robustness, ...overrides }
}

/** Every citable fact of the layer (to check lengths and absences). */
function allFacts(layer: FactsLayer): FactRef[] {
  const out: FactRef[] = []
  const push = (fact: FactRef | null | undefined) => {
    if (fact) out.push(fact)
  }
  const site = (item: SiteFacts) => {
    for (const fact of [item.rank, item.similarity, item.confidence, item.stability, item.feasibility, item.coverage]) push(fact)
    for (const direction of item.directions) for (const fact of [direction.ratio, direction.phrase, direction.raw, direction.mars]) push(fact)
    for (const fact of [item.limiting?.raw, item.limiting?.mars, item.limiting?.sim]) push(fact)
  }
  layer.sites.forEach(site)
  layer.references.forEach(site)
  layer.comparison.gaps.forEach(push)
  for (const fact of [layer.robustness.perturbation, layer.robustness.scenarios, layer.robustness.flips, layer.robustness.topFlips, layer.robustness.mostSensitive]) push(fact)
  return out
}

describe('facts layer with the v2 snapshot (no roles)', () => {
  const facts = buildFactsLayer(input())
  const yungay = facts.sites[0]!

  it('orders places like the ranking and formats snapshot figures in en-US', () => {
    expect(facts.sites.map((site) => site.siteId)).toEqual([YUNGAY, DOMEYKO, MARIA_ELENA])
    expect(yungay.similarity?.text).toBe('75.7%')
    expect(facts.sites[2]?.similarity?.text).toBe('50.0%')
    expect(yungay.confidence?.text).toBe('77.5')
    expect(yungay.stability?.text).toBe('99.0')
    expect(yungay.feasibility?.text).toBe('Requires review')
    expect(yungay.rank?.text).toBe('#1 of 3')
    expect(yungay.coverage?.text).toBe('90% of the weight')
    expect(facts.comparison.gaps.map((gap) => gap.text)).toEqual(['4.1 points', '21.6 points'])
  })

  it('direction and ratio versus Jezero only for slope, roughness and relief', () => {
    const slope = yungay.directions.find((item) => item.criterionId === 'slope')
    expect(slope?.mars?.text).toBe('2.2°')
    expect(slope?.raw?.text).toBe('3.2°')
    expect(slope?.ratio.text).toBe('1.4× Jezero')
    expect(slope?.phrase.text).toBe('steeper than Jezero')
    expect(yungay.directions.find((item) => item.criterionId === 'terrain_roughness')?.ratio.text).toBe('1.5× Jezero')
    expect(facts.sites[1]?.directions.find((item) => item.criterionId === 'slope')?.phrase.text).toBe('less steep than Jezero')
    expect(yungay.directions.some((item) => item.criterionId === 'aridity_context')).toBe(false)
  })

  it('limiting factor by contribution, “does not distinguish”, shared regional value and best of N', () => {
    expect(yungay.limiting?.criterionId).toBe('terrain_roughness')
    const noDiscrimination = facts.comparison.noDiscrimination.map((item) => item.criterionId)
    expect(noDiscrimination).toContain('surface_temperature_variability')
    expect(noDiscrimination).toContain('bare_ground_fraction')
    expect(facts.comparison.shared).toContainEqual(expect.objectContaining({ criterionId: 'aridity_context', siteIds: [DOMEYKO, MARIA_ELENA] }))
    expect(facts.comparison.bestOfN).toContainEqual(expect.objectContaining({ criterionId: 'slope', siteId: YUNGAY }))
    expect(facts.comparison.bestOfN).toContainEqual(expect.objectContaining({ criterionId: 'local_relief', siteId: DOMEYKO }))
    // Tie in what is shown (100% and 100%): there is no “best”.
    expect(facts.comparison.bestOfN.some((item) => item.criterionId === 'bare_ground_fraction')).toBe(false)
  })

  it('never invents: geology (needs_calibration) stays “to be calculated” without a figure', () => {
    expect(allFacts(facts).some((fact) => fact.id.includes('geologic_relevance'))).toBe(false)
    expect(yungay.missing).toEqual([{ criterionId: 'geologic_relevance', label: 'Geology', status: 'not yet calculated' }])
  })

  it('every fact fits in 80 characters and field checks are cited per place', () => {
    for (const fact of allFacts(facts)) expect(fact.text.length).toBeLessThanOrEqual(FACT_TEXT_MAX)
    expect(yungay.checks[0]?.ref).toBe(`check:${YUNGAY}:1`)
    expect(yungay.checks[0]?.text).toMatch(/^Confirm boundaries/)
    expect(facts.sites.reduce((sum, site) => sum + site.checks.length, 0)).toBe(15)
  })

  it('robustness: citable facts and bars with the snapshot stability', () => {
    expect(facts.robustness.flips?.text).toBe('no scenario changes the order')
    expect(facts.robustness.topFlips?.text).toBe('no scenario changes the first place')
    expect(facts.robustness.mostSensitive?.text).toBe('Roughness')
    expect(facts.robustness.perturbation?.text).toBe('±20% per weight')
    expect(facts.robustness.sites.map((site) => site.text)).toEqual(['99.0', '98.9', '98.4'])
  })

  it('without pipeline sensitivity robustness stays “unavailable”; nothing is filled in', () => {
    const none = buildFactsLayer(input({ robustness: null }))
    expect(none.robustness.status).toBe('por_calcular')
    expect(none.robustness.flips).toBeNull()
    expect(none.robustness.reason).toContain('does not include the pipeline sensitivity')
  })
})

describe('facts layer with the v3 snapshot (candidates and REF)', () => {
  const views = new Map<string, readonly MetricView[]>(v3Snapshot.candidates.map((site) => [site.site_id, buildMetricViews({ site, sites: v3Snapshot.candidates, profile: v3Snapshot.profile, weights: null, contributions: null, marsReference: v3Snapshot.marsReference })]))
  const sensitivity = v3Snapshot.sensitivity ?? new Map()
  const rows = v3Snapshot.candidates.filter((site) => site.role !== 'reference').map((site) => ({ siteId: site.site_id, baseScore: site.similarity, result: sensitivity.get(site.site_id) ?? null }))
  const facts = buildFactsLayer({ base: v3Snapshot.profile, candidates: v3Snapshot.candidates, views, robustness: summarizeRobustness(rows) })

  it('accepts the Argentine sites (without the ^cl- filter of the retired package)', () => {
    expect(facts.sites).toHaveLength(6)
    expect(facts.sites.filter((site) => site.siteId.startsWith('ar-')).map((site) => site.country)).toEqual(['AR', 'AR', 'AR'])
    expect(facts.sites.map((site) => site.rank?.text)).toEqual(['#1 of 6', '#2 of 6', '#3 of 6', '#4 of 6', '#5 of 6', '#6 of 6'])
  })

  it('the REF is a separate fact: no rank, outside “best of N”, the gaps and robustness', () => {
    expect(facts.references.map((site) => [site.siteId, site.reference, site.rank?.text])).toEqual([[YUNGAY, true, 'REF · known reference, outside the ranking']])
    expect(facts.sites.some((site) => site.siteId === YUNGAY)).toBe(false)
    expect(facts.comparison.bestOfN.some((item) => item.siteId === YUNGAY)).toBe(false)
    expect(facts.comparison.gaps).toHaveLength(5)
    expect(facts.robustness.sites.some((site) => site.siteId === YUNGAY)).toBe(false)
  })

  it('robustness comes from the sensitivity written by the pipeline (analysis-summary.json)', () => {
    expect(facts.robustness.status).toBe('ready')
    expect(facts.robustness.scenarios?.text).toBe('14 scenarios')
    expect(facts.robustness.sites[0]?.text).toBe(facts.sites[0]?.stability?.text)
  })

  it('with Mission scope, only the evaluated sites', () => {
    const scoped = buildFactsLayer({ base: v3Snapshot.profile, candidates: v3Snapshot.candidates, views, robustness: null, onlySiteIds: ['ar-win-s2580-w06710'] })
    expect(scoped.sites.map((site) => site.siteId)).toEqual(['ar-win-s2580-w06710'])
    expect(scoped.sites[0]?.rank?.text).toBe('#6 of 6')
    expect(scoped.references).toEqual([])
  })
})
