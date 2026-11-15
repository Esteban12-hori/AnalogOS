// The known reference (Pampa Yungay, REF) never receives a rank in Explorar (ADR-008): not in the
// carousel, nor on the globe, nor in the rail, nor in the facts of the Reading, even if its similarity
// exceeds that of several candidates. A forgotten `rankCandidates(todos)` would place it at #4.
// In Mission, the team's engine (shared/mission/evaluate.ts) ranks all the prioritized sites, REF
// included: a decision accepted in ADR-013 in accordance with ADR-009 §5. The UI ALWAYS shows that rank
// with «REF» next to it, and the REF does not count among the candidates in «N prioritized of M».
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { buildMetricViews } from '../features/metrics/buildMetricViews'
import { resolveMetricContext } from '../features/metrics/metricContext'
import { buildMarkerModels, markerLabelText } from '../features/globe/markers'
import { buildPlaceModel } from '../features/places/placeModel'
import { buildFactsLayer } from '../features/analysis/facts'
import { comparisonRows } from '../components/CandidateComparison'
import { rankMap, splitByRole } from '../domain/discovery'
import { prioritizedCount } from '../domain/missionView'
import { explanationToReading } from '../features/analysis/explanationToReading'
import { resultLineText } from '../features/composer/model'
import { markerAriaLabel, markerBadgeText } from '../features/globe/markers'
import { MetricRail } from '../features/metrics/MetricRail'
import { composeExplanation, deterministicSelection } from '../mission'
import { missionStore } from '../state/mission'
import { uiStore } from '../state/ui'
import { evaluateExample, readyData, v3Snapshot, YUNGAY } from './v3Support'

const candidates = v3Snapshot.candidates
const yungay = candidates.find((site) => site.site_id === YUNGAY)!

describe('REF out of the ranking in Explore', () => {
  it('its v3 similarity exceeds Argentine candidates (that is why it matters)', () => {
    expect(candidates.filter((site) => site.role === 'candidate' && (site.similarity ?? 0) < (yungay.similarity ?? 0)).length).toBeGreaterThan(0)
  })

  it('places: no rank and in its own group', () => {
    const model = buildPlaceModel({ candidates })
    const place = model.evaluated.find((item) => item.id === YUNGAY)!
    expect(place.rank).toBeNull()
    expect(place.role).toBe('reference')
    expect(model.groups.find((group) => group.role === 'candidate')?.places.some((item) => item.id === YUNGAY)).toBe(false)
  })

  it('globe: “REF” in the label and no rank number', () => {
    const marker = buildMarkerModels({ candidates, analogs: [], evaluation: null }).find((item) => item.id === YUNGAY)!
    expect(marker.rank).toBeNull()
    expect(markerLabelText(marker).startsWith('REF')).toBe(true)
  })

  it('metrics: no rank, reference role and an “of 6” that does not count it', () => {
    const context = resolveMetricContext({ site: yungay, candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
    expect(context.rank).toBeNull()
    expect(context.role).toBe('reference')
    expect(context.rankedCount).toBe(6)
  })

  it('analysis: separate fact, labeled and outside “best of N”', () => {
    const views = new Map(candidates.map((site) => [site.site_id, buildMetricViews({ site, sites: candidates, profile: v3Snapshot.profile, weights: null, contributions: null, marsReference: v3Snapshot.marsReference })]))
    const facts = buildFactsLayer({ base: v3Snapshot.profile, candidates, views, robustness: null })
    expect(facts.sites.map((site) => site.siteId)).not.toContain(YUNGAY)
    expect(facts.references[0]?.rank?.text).toContain('REF')
    expect(facts.comparison.bestOfN.every((item) => item.siteId !== YUNGAY)).toBe(true)
  })

  it('Compare: “REF · Known reference” without rank', () => {
    const { ranked, references } = splitByRole(candidates)
    const row = comparisonRows(ranked, references, rankMap(ranked)).find((item) => item.candidate.site_id === YUNGAY)!
    expect(row.rank).toBeNull()
    expect(row.reference).toBe(true)
  })
})

describe('REF in Mission: the engine rank is always labeled “REF” and does not count as prioritized', () => {
  // Slope ≤ 10° instead of ≤ 3°: the REF meets the essential requirements and the engine prioritizes it.
  const { evaluation, request } = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['10', ''] } }])
  const ref = evaluation.options.find((option) => option.site_id === YUNGAY)!

  afterEach(() => {
    missionStore.reset()
    uiStore.reset()
  })

  it('the team engine prioritizes it with a rank (that is why labeling it matters)', () => {
    expect(ref.status).toBe('priorizado_para_reconocimiento')
    expect(ref.role).toBe('reference')
    expect(ref.rank).not.toBeNull()
  })

  it('places: “#n · REF · Prioritized…” on the card', () => {
    const place = buildPlaceModel({ candidates, evaluation }).evaluated.find((item) => item.id === YUNGAY)!
    expect(place.mission?.rank).toBe(ref.rank)
    expect(place.role).toBe('reference')
  })

  it('globe: the badge and the accessible name say REF / known reference', () => {
    const marker = buildMarkerModels({ candidates, analogs: [], evaluation }).find((item) => item.id === YUNGAY)!
    expect(markerBadgeText(marker)).toBe(`#${ref.rank} · REF`)
    expect(markerAriaLabel(marker)).toContain('known reference')
  })

  it('metrics: the sheet summary (S1) and the rail summary show “REF” next to the rank', () => {
    missionStore.setState({ evaluation, evaluatedRequest: request, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const sheet = renderToStaticMarkup(createElement(MetricRail, { data: readyData, site: yungay, variant: 'sheet' }))
    expect(sheet.replace(/<[^>]+>/g, '')).toContain(`#${ref.rank} · REF · `)
    const rail = renderToStaticMarkup(createElement(MetricRail, { data: readyData, site: yungay, variant: 'rail' }))
    expect(rail.replace(/<[^>]+>/g, '')).toContain(`#${ref.rank} · REF · Prioritized for reconnaissance`)
  })

  it('composer and carousel: “N prioritized of M” does not count the REF and names it separately', () => {
    const count = prioritizedCount(evaluation)
    const all = evaluation.options.filter((option) => option.status === 'priorizado_para_reconocimiento').length
    expect(count.candidates).toBe(all - 1)
    expect(count.of).toBe(evaluation.options.length - 1)
    expect(count.reference).toBe(true)
    const line = resultLineText(evaluation, candidates)
    expect(line).toContain(`${count.candidates} of ${count.of} candidates prioritized · REF also prioritized`)
    expect(line).not.toContain(`de ${evaluation.options.length}`)
  })

  it('analysis: the Reading result labels the REF', () => {
    const model = explanationToReading(composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template'), evaluation, 1)
    const option = model.result.groups.flatMap((group) => group.options).find((item) => item.siteId === YUNGAY)!
    expect(option.role).toBe('reference')
    expect(option.rank).toBe(ref.rank)
  })
})
