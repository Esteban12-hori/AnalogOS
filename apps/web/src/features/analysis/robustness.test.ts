import { describe, expect, it } from 'vitest'
import { parseSensitivity } from '../../domain/sensitivity'
import { readJson, YUNGAY } from '../../tests/v3Support'
import { summarizeRobustness, type SensitivityResult, type SiteSensitivity } from './robustness'

/** FIXTURE: scenarios with given scores (they do not come from the engine). */
function result(rows: Array<[string, 'minus' | 'plus', number | null]>, base: number): SensitivityResult {
  const scenarios = rows.map(([criterionId, direction, score]) => ({ criterionId, direction, score, delta: score === null ? null : Math.round((score - base) * 100) / 100 }))
  const deltas = scenarios.flatMap((row) => (row.delta === null ? [] : [Math.abs(row.delta)]))
  const max = deltas.length ? Math.max(...deltas) : 0
  return { stability: 100 - max, maxScoreDelta: max, scenarios }
}

describe('summarizeRobustness', () => {
  it('counts scenarios that change the order and those that change #1', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['slope', 'minus', 69], ['slope', 'plus', 71], ['local_relief', 'minus', 66], ['local_relief', 'plus', 72]], 70) },
      { siteId: 'cl-b', baseScore: 68, result: result([['slope', 'minus', 68.5], ['slope', 'plus', 67], ['local_relief', 'minus', 67], ['local_relief', 'plus', 69]], 68) },
      { siteId: 'cl-c', baseScore: 50, result: result([['slope', 'minus', 50], ['slope', 'plus', 50], ['local_relief', 'minus', 50], ['local_relief', 'plus', 50]], 50) },
    ]
    const summary = summarizeRobustness(rows)
    expect(summary.status).toBe('ready')
    expect(summary.scenarios).toBe(4)
    // local_relief minus: a=66 < b=67 → changes the #1 (and the order).
    expect(summary.flips).toBe(1)
    expect(summary.topFlips).toBe(1)
    expect(summary.mostSensitive).toBe('local_relief')
    expect(summary.sites.map((site) => site.stability)).toEqual([96, 99, 100])
  })

  it('a tie in a scenario is broken by site_id, like rankCandidates', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-b', baseScore: 70, result: result([['slope', 'minus', 69]], 70) },
      { siteId: 'cl-a', baseScore: 68, result: result([['slope', 'minus', 69]], 68) },
    ]
    // 69 = 69 → cl-a before cl-b: the order changes.
    expect(summarizeRobustness(rows).flips).toBe(1)
  })

  it('with fewer than two places with % there is no order to change', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['slope', 'minus', 69]], 70) },
      { siteId: 'cl-b', baseScore: null, result: null },
    ]
    const summary = summarizeRobustness(rows)
    expect(summary.status).toBe('insufficient')
    expect(summary.flips).toBe(0)
    expect(summary.sites).toEqual([
      { siteId: 'cl-a', stability: 99, maxScoreDelta: 1 },
      { siteId: 'cl-b', stability: null, maxScoreDelta: null },
    ])
  })

  it('ignores scenarios that do not exist for all places or have no score', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['slope', 'minus', 69], ['aridity_context', 'plus', null]], 70) },
      { siteId: 'cl-b', baseScore: 60, result: result([['slope', 'minus', 61], ['aridity_context', 'plus', 60]], 60) },
    ]
    expect(summarizeRobustness(rows).scenarios).toBe(1)
  })

  it('sensitivity tie → the criterion that comes first in the canonical order', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['local_relief', 'minus', 69], ['slope', 'minus', 69]], 70) },
      { siteId: 'cl-b', baseScore: 60, result: result([['local_relief', 'minus', 60], ['slope', 'minus', 60]], 60) },
    ]
    expect(summarizeRobustness(rows).mostSensitive).toBe('slope')
  })
})

// The pipeline writes the sensitivity (analysis-summary.json); the web only reads it and compares
// orders. No engine of its own (ADR-015, superseded): no recalculation in the browser.
describe('parseSensitivity (pipeline analysis-summary.json)', () => {
  const summary = readJson('artifacts/science-v3/analysis-summary.json')
  const parsed = parseSensitivity(summary)

  it('reads the seven v3 sites with their stability and their 14 scenarios (7 criteria × ±)', () => {
    expect(parsed.size).toBe(7)
    const yungay = parsed.get(YUNGAY)
    expect(yungay?.scenarios).toHaveLength(14)
    expect(yungay?.stability).toBe((summary as { sites: Array<{ site_id: string; sensitivity: { stability: number } }> }).sites.find((site) => site.site_id === YUNGAY)?.sensitivity.stability)
    for (const result of parsed.values()) for (const scenario of result.scenarios) expect(['minus', 'plus']).toContain(scenario.direction)
  })

  it('anything without the expected shape is ignored; nothing is invented', () => {
    expect(parseSensitivity(null).size).toBe(0)
    expect(parseSensitivity({ sites: [{ site_id: 'cl-a' }, { sensitivity: { scenarios: [] } }] }).size).toBe(0)
    const odd = parseSensitivity({ sites: [{ site_id: 'cl-a', sensitivity: { stability: 'x', scenarios: [{ criterion_id: 'slope', direction: 'up', score: 1 }, { criterion_id: 'slope', direction: 'plus', score: null }] } }] })
    expect(odd.get('cl-a')).toEqual({ stability: null, maxScoreDelta: null, scenarios: [{ criterionId: 'slope', direction: 'plus', score: null, delta: null }] })
  })
})
