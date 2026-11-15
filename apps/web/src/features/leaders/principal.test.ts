import { describe, expect, it } from 'vitest'
import type { CriterionId } from '../../domain/contracts'
import type { MetricView } from '../metrics'
import { leaderLabelModel, leaderLabelModelFor } from './labelModel'
import { pickMissionMetrics, pickPrincipalMetrics } from './principal'
import { scienceSite, snapshotViews } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')

function ids(views: readonly MetricView[]): string[] {
  return views.map((view) => view.criterionId)
}

describe('pickPrincipalMetrics', () => {
  it('takes the 4 highest-weight ones from the snapshot and breaks ties by the canonical order', () => {
    // v2 weights: slope, roughness and bare ground 0.20; local relief 0.15; the rest less.
    expect(ids(pickPrincipalMetrics(snapshotViews(yungay)))).toEqual(['slope', 'terrain_roughness', 'bare_ground_fraction', 'local_relief'])
  })

  it('tie-breaking does not depend on input order', () => {
    const views = snapshotViews(yungay)
    expect(ids(pickPrincipalMetrics([...views].reverse()))).toEqual(ids(pickPrincipalMetrics(views)))
  })

  it('respects `count` (3 at compact height) and never returns more views than there are', () => {
    const views = snapshotViews(yungay)
    expect(ids(pickPrincipalMetrics(views, 3))).toEqual(['slope', 'terrain_roughness', 'bare_ground_fraction'])
    expect(pickPrincipalMetrics(views, 0)).toEqual([])
    expect(pickPrincipalMetrics(views, Number.NaN)).toEqual([])
    expect(pickPrincipalMetrics(views.slice(0, 2), 4)).toHaveLength(2)
  })

  it('orders by the weight of the active mission profile, not by similarity or contribution', () => {
    const weights: Partial<Record<CriterionId, number>> = {
      slope: 3 / 11,
      terrain_roughness: 3 / 11,
      local_relief: 2 / 11,
      bare_ground_fraction: 2 / 11,
      aridity_context: 1 / 11,
      surface_temperature_variability: 0,
      geologic_relevance: 0,
    }
    const picked = pickPrincipalMetrics(snapshotViews(yungay, weights))
    // 3/11 tie (slope before roughness); 2/11 tie (relief before soil).
    expect(ids(picked)).toEqual(['slope', 'terrain_roughness', 'local_relief', 'bare_ground_fraction'])
  })

  it('excludes what is excluded (weight 0) and keeps “to be calculated” if the profile asks for it with weight', () => {
    const weights = { slope: 0, terrain_roughness: 0, local_relief: 0, bare_ground_fraction: 0, aridity_context: 0.4, surface_temperature_variability: 0, geologic_relevance: 0.6 }
    const picked = pickPrincipalMetrics(snapshotViews(yungay, weights))
    expect(ids(picked)).toEqual(['geologic_relevance', 'aridity_context'])
    expect(picked[0]?.similarity).toBeNull()
  })

  it('treats equal weights computed in different ways as a tie', () => {
    const views = snapshotViews(yungay, { local_relief: 0.1 + 0.2, slope: 0.3 })
    expect(ids(pickPrincipalMetrics(views, 2))).toEqual(['slope', 'local_relief'])
  })

  it('does not mutate the input', () => {
    const views = snapshotViews(yungay)
    const before = ids(views)
    pickPrincipalMetrics(views)
    expect(ids(views)).toEqual(before)
  })
})

describe('pickMissionMetrics (Mission, ADR-013)', () => {
  // FIXTURE: requirement results with the shape of RequirementResult (they are not scientific results).
  const result = (id: string, importance: 'critical' | 'preference', status: 'cumple' | 'no_cumple' | 'no_evaluable' = 'cumple') => ({
    requirement_id: id, label: id, importance, kind: 'measurable' as const, status, required: `${id}: ≤ 3°`, observed_value: 2, observed_unit: 'degree',
    reason: 'FIXTURE', evidence_ids: [], scale_note: null, period: null, conversion: null,
  })

  it('first the criteria with a requirement (must-haves before preferences), then the base weight', () => {
    const views = snapshotViews(yungay)
    const requirements = new Map([
      ['aridity_context', [result('a', 'preference')]],
      ['local_relief', [result('b', 'critical')]],
    ])
    expect(ids(pickMissionMetrics(views, requirements, 4))).toEqual(['local_relief', 'aridity_context', 'slope', 'terrain_roughness'])
  })

  it('without requirements it equals the base weight', () => {
    const views = snapshotViews(yungay)
    expect(ids(pickMissionMetrics(views, new Map(), 4))).toEqual(ids(pickPrincipalMetrics(views, 4)))
  })

  it('the label carries ✓/✕/○ and the condition written by the team engine', () => {
    const view = snapshotViews(yungay).find((item) => item.criterionId === 'slope')!
    expect(leaderLabelModel(view).requirement).toBeNull()
    expect(leaderLabelModelFor(view, [result('ex1', 'critical', 'no_cumple')]).requirement).toEqual({ mark: '✕', status: 'no_cumple', text: '≤ 3°' })
    expect(leaderLabelModelFor(view, [result('p', 'preference'), result('c', 'critical')]).requirement?.text).toBe('≤ 3° (+1)')
  })
})
