// Increment 5 · “Done when”: order by weight, no invented Mars values, limiting factor by
// `contribution`, “saturates” and shared regional value. Data: real science-v2 snapshot.
// Variants marked FIXTURE are copies modified in memory (they are not results).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import { parseMarsReference, type MarsReference } from '../../domain/marsReference'
import { buildMetricViews, limitingView, UNVERIFIED_RULE_TEXT } from './buildMetricViews'
import type { BuildMetricViewsInput, MetricView } from './index'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const profile = read('artifacts/science-v2/mission-profile.json') as MissionProfile
const mars = parseMarsReference(read('artifacts/science-v2/analysis-summary.json'))

function site(id: string): CandidateSite {
  const found = candidates.find((candidate) => candidate.site_id === id)
  if (!found) throw new Error(`${id} missing from the snapshot`)
  return found
}
const YUNGAY = 'cl-pampa-yungay-screening'
const DOMEYKO = 'cl-domeyko-interior-screening'
const MARIA_ELENA = 'cl-pampa-maria-elena-screening'

function views(siteId: string, patch: Partial<BuildMetricViewsInput> = {}): MetricView[] {
  return buildMetricViews({ site: site(siteId), sites: candidates, profile, weights: null, contributions: null, marsReference: mars, ...patch })
}
function byId(list: readonly MetricView[], id: CriterionId): MetricView {
  const view = list.find((item) => item.criterionId === id)
  if (!view) throw new Error(`${id} missing`)
  return view
}
/** FIXTURE: copy of the sector with one criterion modified (only to test edge cases). */
function tamper(siteId: string, id: CriterionId, patch: Partial<CandidateSite['score_breakdown'][number]>): CandidateSite {
  const base = site(siteId)
  return { ...base, score_breakdown: base.score_breakdown.map((item) => (item.criterion_id === id ? { ...item, ...patch } : item)) }
}

describe('buildMetricViews · order by weight', () => {
  it('base profile: descending weight and ties by the canonical order', () => {
    expect(views(YUNGAY).map((view) => view.criterionId)).toEqual([
      'slope', 'terrain_roughness', 'bare_ground_fraction', // 20 %
      'local_relief', // 15 %
      'aridity_context', 'geologic_relevance', // 10 %
      'surface_temperature_variability', // 5 %
    ])
    for (const view of views(YUNGAY)) expect(view.weight).toBe(view.baseWeight)
  })

  it('mission profile: orders by the mission weights and keeps the base weight', () => {
    const weights: Partial<Record<CriterionId, number>> = {
      slope: 3 / 11, terrain_roughness: 3 / 11, local_relief: 2 / 11, bare_ground_fraction: 2 / 11, aridity_context: 1 / 11,
      surface_temperature_variability: 0, geologic_relevance: 0,
    }
    const list = views(YUNGAY, { weights, contributions: {} })
    expect(list.map((view) => view.criterionId)).toEqual([
      'slope', 'terrain_roughness', 'local_relief', 'bare_ground_fraction', 'aridity_context',
      'surface_temperature_variability', 'geologic_relevance',
    ])
    expect(byId(list, 'local_relief').weight).toBeCloseTo(2 / 11, 12)
    expect(byId(list, 'local_relief').baseWeight).toBe(0.15)
  })

  it('a criterion missing from the mission weights is 0 (not mentioned)', () => {
    const list = views(YUNGAY, { weights: { slope: 1 }, contributions: {} })
    expect(list[0]?.criterionId).toBe('slope')
    expect(list.slice(1).every((view) => view.weight === 0)).toBe(true)
  })
})

describe('buildMetricViews · no invented Mars values', () => {
  it('■ Jezero only on slope, roughness and relief, with the snapshot MOLA medians', () => {
    const list = views(YUNGAY)
    expect(byId(list, 'slope').marsValue).toEqual({ raw: 2.226, unit: 'degree', text: '2.2°' })
    expect(byId(list, 'terrain_roughness').marsValue?.text).toBe('11 m')
    expect(byId(list, 'local_relief').marsValue?.text).toBe('47 m')
    for (const id of ['bare_ground_fraction', 'aridity_context', 'surface_temperature_variability', 'geologic_relevance'] as const) {
      expect(byId(list, id).marsValue).toBeNull()
      expect(byId(list, id).vsMars).toBeNull()
    }
  })

  it('even if the reference brought other criteria, they are not shown (FIXTURE)', () => {
    const tampered: MarsReference = { name: 'x', spacingMeter: 1, byCriterion: { ...mars?.byCriterion, aridity_context: 1, surface_temperature_variability: 50 } }
    const list = views(YUNGAY, { marsReference: tampered })
    expect(byId(list, 'aridity_context').marsValue).toBeNull()
    expect(byId(list, 'surface_temperature_variability').marsValue).toBeNull()
  })

  it('without a MOLA reference there is no ■ or comparison', () => {
    for (const view of views(YUNGAY, { marsReference: null })) {
      expect(view.marsValue).toBeNull()
      expect(view.vsMars).toBeNull()
    }
  })

  it('with another unit in the snapshot nothing is compared (FIXTURE)', () => {
    const odd = tamper(YUNGAY, 'slope', { unit: 'radian' })
    const list = buildMetricViews({ site: odd, sites: candidates, profile, weights: null, contributions: null, marsReference: mars })
    expect(byId(list, 'slope').marsValue).toBeNull()
  })

  it('direction and ratio sector ÷ Jezero', () => {
    const yungay = byId(views(YUNGAY), 'slope').vsMars
    expect(yungay?.direction).toBe('more_demanding')
    expect(yungay?.ratio).toBeCloseTo(3.207 / 2.226, 10)
    expect(byId(views(DOMEYKO), 'slope').vsMars?.direction).toBe('less_demanding')
    expect(byId(views(MARIA_ELENA), 'terrain_roughness').vsMars?.direction).toBe('less_demanding')
    const near = tamper(YUNGAY, 'slope', { raw_value: 2.3 })
    const list = buildMetricViews({ site: near, sites: candidates, profile, weights: null, contributions: null, marsReference: mars })
    expect(byId(list, 'slope').vsMars?.direction).toBe('similar')
  })
})

describe('buildMetricViews · limiting factor = most negative contribution', () => {
  it('Yungay: Roughness is limiting even though Relief has the lowest similarity', () => {
    const list = views(YUNGAY)
    expect(limitingView(list)?.criterionId).toBe('terrain_roughness')
    expect(byId(list, 'terrain_roughness').contribution).toBe(-0.091)
    const lowest = [...list].filter((view) => view.similarity !== null).sort((a, b) => (a.similarity ?? 0) - (b.similarity ?? 0))[0]
    expect(lowest?.criterionId).toBe('local_relief')
    expect(list.filter((view) => view.isLimiting)).toHaveLength(1)
  })

  it('María Elena and Domeyko also by their contribution', () => {
    expect(limitingView(views(MARIA_ELENA))?.criterionId).toBe('terrain_roughness')
    expect(limitingView(views(DOMEYKO))?.criterionId).toBe('terrain_roughness')
  })

  it('with a mission profile it uses the engine contributions, not the snapshot ones', () => {
    const list = views(YUNGAY, { weights: { slope: 0.5, terrain_roughness: 0.5 }, contributions: { slope: -0.3, terrain_roughness: -0.1 } })
    expect(limitingView(list)?.criterionId).toBe('slope')
    expect(byId(list, 'local_relief').contribution).toBeNull()
  })

  it('without engine contributions there is no limiting factor (to be calculated)', () => {
    expect(limitingView(views(YUNGAY, { weights: { slope: 1 }, contributions: {} }))).toBeNull()
  })

  it('an excluded criterion (weight 0) is never limiting', () => {
    const list = views(YUNGAY, { weights: { slope: 1, terrain_roughness: 0 }, contributions: { slope: -0.05, terrain_roughness: -0.4 } })
    expect(limitingView(list)?.criterionId).toBe('slope')
  })

  it('exact tie: the first in the canonical order wins', () => {
    const list = views(YUNGAY, { weights: { slope: 0.5, terrain_roughness: 0.5 }, contributions: { slope: -0.2, terrain_roughness: -0.2 } })
    expect(limitingView(list)?.criterionId).toBe('slope')
  })

  it('insufficient data (all contributions null): none (FIXTURE)', () => {
    const base = site(YUNGAY)
    const insufficient: CandidateSite = { ...base, similarity: null, score_breakdown: base.score_breakdown.map((item) => ({ ...item, contribution: null })) }
    const list = buildMetricViews({ site: insufficient, sites: candidates, profile, weights: null, contributions: null, marsReference: mars })
    expect(limitingView(list)).toBeNull()
  })
})

describe('buildMetricViews · profile rules and “saturates”', () => {
  it('thermal range saturates in all three sectors (meets the rule, does not mean equal to Mars)', () => {
    for (const id of [YUNGAY, DOMEYKO, MARIA_ELENA]) {
      const view = byId(views(id), 'surface_temperature_variability')
      expect(view.saturates).toBe(true)
      expect(view.rule).toMatchObject({ satisfied: true, consistent: true })
    }
  })

  it('suelo expuesto: 100 % satura; 99,8 % no', () => {
    expect(byId(views(YUNGAY), 'bare_ground_fraction').saturates).toBe(true)
    expect(byId(views(DOMEYKO), 'bare_ground_fraction').saturates).toBe(true)
    const me = byId(views(MARIA_ELENA), 'bare_ground_fraction')
    expect(me.saturates).toBe(false)
    expect(me.rule?.satisfied).toBe(false)
    expect(me.siteValue.text).toBe('99.8%')
  })

  it('aridity: the rule is checked against the snapshot and does not saturate', () => {
    const view = byId(views(YUNGAY), 'aridity_context')
    expect(view.rule).toMatchObject({ satisfied: false, consistent: true })
    expect(view.rule?.text).toContain('25 mm/year')
    expect(view.saturates).toBe(false)
  })

  it('topographic metrics have no rule and do not saturate', () => {
    for (const id of ['slope', 'terrain_roughness', 'local_relief'] as const) {
      expect(byId(views(YUNGAY), id).rule).toBeNull()
      expect(byId(views(YUNGAY), id).saturates).toBe(false)
    }
  })

  it('if the rule does not reproduce the snapshot similarity, the formula is not shown (FIXTURE)', () => {
    const odd = tamper(YUNGAY, 'aridity_context', { normalized_similarity: 0.9 })
    const view = byId(buildMetricViews({ site: odd, sites: candidates, profile, weights: null, contributions: null, marsReference: mars }), 'aridity_context')
    expect(view.rule).toEqual({ text: UNVERIFIED_RULE_TEXT, satisfied: null, consistent: false })
  })
})

describe('buildMetricViews · valor regional compartido', () => {
  it('Domeyko and María Elena share the POWER aridity (14.61 mm/yr)', () => {
    expect(byId(views(DOMEYKO), 'aridity_context').sharedRegionalWith).toEqual([MARIA_ELENA])
    expect(byId(views(MARIA_ELENA), 'aridity_context').sharedRegionalWith).toEqual([DOMEYKO])
    expect(byId(views(YUNGAY), 'aridity_context').sharedRegionalWith).toEqual([])
  })

  it('two sectors at the rule cap do not “share” a value: they coincide by saturation', () => {
    expect(byId(views(YUNGAY), 'bare_ground_fraction').sharedRegionalWith).toEqual([])
    expect(byId(views(DOMEYKO), 'surface_temperature_variability').sharedRegionalWith).toEqual([])
  })

  it('the same number from another source does not count (FIXTURE)', () => {
    const others = candidates.map((candidate) => (candidate.site_id === MARIA_ELENA
      ? { ...candidate, score_breakdown: candidate.score_breakdown.map((item) => (item.criterion_id === 'aridity_context' ? { ...item, dataset_id: 'otra-fuente' } : item)) }
      : candidate))
    expect(byId(views(DOMEYKO, { sites: others }), 'aridity_context').sharedRegionalWith).toEqual([])
  })
})

describe('buildMetricViews · values and states', () => {
  it('en-US texts in the criterion unit', () => {
    const list = views(YUNGAY)
    expect(byId(list, 'slope').siteValue.text).toBe('3.2°')
    expect(byId(list, 'terrain_roughness').siteValue.text).toBe('16.6 m')
    expect(byId(list, 'bare_ground_fraction').siteValue.text).toBe('100%')
    expect(byId(list, 'aridity_context').siteValue.text).toBe('7.3 mm/year')
    expect(byId(list, 'surface_temperature_variability').siteValue.text).toBe('47.7 K')
  })

  it('criterion similarity 0–100 from normalized_similarity (not recalculated)', () => {
    expect(byId(views(YUNGAY), 'slope').similarity).toBeCloseTo(69.4107, 6)
  })

  it('geology stays “to be calculated”, without similarity or contribution', () => {
    const geology = byId(views(YUNGAY), 'geologic_relevance')
    expect(geology).toMatchObject({ status: 'needs_calibration', similarity: null, contribution: null, isLimiting: false })
    expect(geology.siteValue.text).toBe('not yet calculated')
  })

  it('a profile criterion missing from the breakdown stays “no data” (FIXTURE)', () => {
    const base = site(YUNGAY)
    const partial: CandidateSite = { ...base, score_breakdown: base.score_breakdown.filter((item) => item.criterion_id !== 'local_relief') }
    const view = byId(buildMetricViews({ site: partial, sites: candidates, profile, weights: null, contributions: null, marsReference: mars }), 'local_relief')
    expect(view).toMatchObject({ status: 'missing', similarity: null, contribution: null })
    expect(view.siteValue.text).toBe('no data')
    expect(view.marsValue?.text).toBe('47 m')
  })

  it('is pure: does not mutate the snapshot and gives the same result twice', () => {
    const before = JSON.stringify(candidates)
    expect(views(DOMEYKO)).toEqual(views(DOMEYKO))
    expect(JSON.stringify(candidates)).toBe(before)
  })
})
