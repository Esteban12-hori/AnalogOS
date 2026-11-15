// Rail context (ADR-008/009/013): weights, contributions and figures ALWAYS from the snapshot; in
// Mission, a requirements layer from the team's evaluation (evaluateMission, unchanged).
// Similarity, confidence, stability and feasibility are resolved separately and never mixed.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CandidateSite, MissionProfile } from '../../domain/contracts'
import { parseMarsReference } from '../../domain/marsReference'
import { evaluateExample, v3Snapshot, YUNGAY } from '../../tests/v3Support'
import { requirementLayer, resolveMetricContext, type ResolveMetricContextArgs } from './metricContext'
import { coverageText, siteSimilarityText, weightChangeGlyph, vsMarsText } from './metricText'
import { buildMetricViews } from './buildMetricViews'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const profile = read('artifacts/science-v2/mission-profile.json') as MissionProfile
const mars = parseMarsReference(read('artifacts/science-v2/analysis-summary.json'))
const yungay = candidates.find((candidate) => candidate.site_id === 'cl-pampa-yungay-screening') as CandidateSite
const mariaElena = candidates.find((candidate) => candidate.site_id === 'cl-pampa-maria-elena-screening') as CandidateSite

function args(patch: Partial<ResolveMetricContextArgs> = {}): ResolveMetricContextArgs {
  return { site: yungay, candidates, profile, marsReference: mars, mode: 'explorar', evaluation: null, request: null, ...patch }
}

describe('resolveMetricContext', () => {
  it('Explore: base profile, snapshot figures and rankCandidates order', () => {
    const context = resolveMetricContext(args())
    expect(context.kind).toBe('base')
    expect(context.input.weights).toBeNull()
    expect(context.input.contributions).toBeNull()
    expect(context.figures).toMatchObject({ similarity: 75.67, confidence: 77.45, stability: 99.03, feasibility: 'requires_review', validCount: 6, criterionCount: 7 })
    expect(context.figures.coverage).toBeCloseTo(0.9, 10)
    expect(context.order).toEqual(['cl-pampa-yungay-screening', 'cl-domeyko-interior-screening', 'cl-pampa-maria-elena-screening'])
    expect(context.rank).toBe(1)
    expect(resolveMetricContext(args({ site: mariaElena })).rank).toBe(3)
    expect(context.profileLabel).toBe('base profile v2.0.1-preliminary')
  })

  it('Explore v3: the REF has no rank and goes last; the “of N” counts candidates only', () => {
    const v3 = (site = v3Snapshot.candidates[0]!) => resolveMetricContext({ site, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
    const first = v3()
    expect(first.rank).toBe(1)
    expect(first.rankedCount).toBe(6)
    expect(first.role).toBe('candidate')
    expect(first.order.at(-1)).toBe(YUNGAY)
    const ref = v3(v3Snapshot.candidates.find((site) => site.site_id === YUNGAY))
    expect(ref.rank).toBeNull()
    expect(ref.role).toBe('reference')
    expect(ref.figures.similarity).toBe(75.67)
  })

  it('Explore with a saved evaluation: still no Mission layer', () => {
    const { evaluation, request } = evaluateExample()
    const context = resolveMetricContext({ site: v3Snapshot.candidates[0]!, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: null, mode: 'explorar', evaluation, request })
    expect(context.kind).toBe('base')
    expect(context.mission).toBeNull()
  })

  it('Mission with evaluation: snapshot weights and figures, status and per-criterion requirements from the evaluation', () => {
    const { evaluation, request } = evaluateExample()
    const site = v3Snapshot.candidates[0]!
    const context = resolveMetricContext({ site, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'mision', evaluation, request })
    expect(context.kind).toBe('mission')
    expect(context.rulesVersion).toBe('mission-rules-1.0.0')
    expect(context.input.weights).toBeNull()
    expect(context.input.contributions).toBeNull()
    expect(context.figures).toMatchObject({ similarity: site.similarity, confidence: site.confidence, stability: site.stability })
    const option = evaluation.options.find((item) => item.site_id === site.site_id)!
    expect(context.mission?.status).toBe(option.status)
    // Slope → slope; bare ground → bare_ground_fraction; traction → not measured.
    expect(context.mission?.byCriterion.get('slope')?.map((result) => result.requirement_id)).toEqual(['ex1'])
    expect(context.mission?.byCriterion.get('bare_ground_fraction')?.map((result) => result.requirement_id)).toEqual(['ex2'])
    expect(context.mission?.unmeasured.map((result) => result.requirement_id)).toEqual(['ex3'])
    expect(context.mission?.siteRows).toEqual([])
    // The order is the evaluation's: prioritized first.
    expect(context.order[0]).toBe(evaluation.recommended_site_ids[0])
  })

  it('area and country requirements are site rows, not score criteria', () => {
    const { evaluation, request } = evaluateExample(undefined, [
      { type: 'add_requirement', requirement: { kind: 'measurable', requirement_id: 'u9', label: 'País', importance: 'critical', origin: 'user', source_quote: null, metric_id: 'country', operator: 'in', valueText: ['', ''], countries: ['CL'], unit: 'iso_alpha2', scale: 'window' } },
    ])
    const option = evaluation.options.find((item) => item.site_id.startsWith('ar-'))!
    expect(option.status).toBe('no_cumple_requisitos')
    const layer = requirementLayer(option, request)
    expect(layer.siteRows.map((result) => result.requirement_id)).toEqual(['u9'])
    expect([...layer.byCriterion.keys()].sort()).toEqual(['bare_ground_fraction', 'slope'])
  })

  it('Mission with a site out of scope: “out of scope”, without requirements or rank', () => {
    const { evaluation, request } = evaluateExample({ mode: 'sector', siteId: 'ar-win-s2580-w06710', lon: '', lat: '', west: '', south: '', east: '', north: '', windowSiteId: null })
    const context = resolveMetricContext({ site: v3Snapshot.candidates[0]!, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: null, mode: 'mision', evaluation, request })
    expect(context.mission).toMatchObject({ status: 'fuera_de_alcance', rank: null, option: null })
    expect(context.mission?.byCriterion.size).toBe(0)
  })
})

describe('rail texts', () => {
  it('coverage, place % and direction versus Jezero', () => {
    const context = resolveMetricContext(args())
    expect(coverageText(context.figures)).toBe('6 of 7 criteria with data · 90% of the weight')
    expect(siteSimilarityText(context.figures)).toBe('75.7')
    expect(siteSimilarityText({ similarity: 49.99, similarityState: 'scored' })).toBe('50.0')
    expect(siteSimilarityText({ similarity: null, similarityState: 'insufficient' })).toBe('Insufficient data')
    const slope = buildMetricViews(context.input).find((view) => view.criterionId === 'slope')
    expect(slope && vsMarsText(slope)).toBe('↗ 1.4× Jezero · steeper')
  })

  it('↑ / ↓ only when the active profile changes the base weight', () => {
    expect(weightChangeGlyph({ weight: 0.27, baseWeight: 0.2 })).toBe('↑')
    expect(weightChangeGlyph({ weight: 0, baseWeight: 0.05 })).toBe('↓')
    expect(weightChangeGlyph({ weight: 0.2, baseWeight: 0.2 })).toBe('')
  })
})
