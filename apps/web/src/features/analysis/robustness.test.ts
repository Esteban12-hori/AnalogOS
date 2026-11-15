import { describe, expect, it } from 'vitest'
import { parseSensitivity } from '../../domain/sensitivity'
import { readJson, YUNGAY } from '../../tests/v3Support'
import { summarizeRobustness, type SensitivityResult, type SiteSensitivity } from './robustness'

/** FIXTURE: escenarios con puntajes dados (no salen del motor). */
function result(rows: Array<[string, 'minus' | 'plus', number | null]>, base: number): SensitivityResult {
  const scenarios = rows.map(([criterionId, direction, score]) => ({ criterionId, direction, score, delta: score === null ? null : Math.round((score - base) * 100) / 100 }))
  const deltas = scenarios.flatMap((row) => (row.delta === null ? [] : [Math.abs(row.delta)]))
  const max = deltas.length ? Math.max(...deltas) : 0
  return { stability: 100 - max, maxScoreDelta: max, scenarios }
}

describe('summarizeRobustness', () => {
  it('cuenta escenarios que cambian el orden y los que cambian el #1', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['slope', 'minus', 69], ['slope', 'plus', 71], ['local_relief', 'minus', 66], ['local_relief', 'plus', 72]], 70) },
      { siteId: 'cl-b', baseScore: 68, result: result([['slope', 'minus', 68.5], ['slope', 'plus', 67], ['local_relief', 'minus', 67], ['local_relief', 'plus', 69]], 68) },
      { siteId: 'cl-c', baseScore: 50, result: result([['slope', 'minus', 50], ['slope', 'plus', 50], ['local_relief', 'minus', 50], ['local_relief', 'plus', 50]], 50) },
    ]
    const summary = summarizeRobustness(rows)
    expect(summary.status).toBe('ready')
    expect(summary.scenarios).toBe(4)
    // local_relief minus: a=66 < b=67 → cambia el #1 (y el orden).
    expect(summary.flips).toBe(1)
    expect(summary.topFlips).toBe(1)
    expect(summary.mostSensitive).toBe('local_relief')
    expect(summary.sites.map((site) => site.stability)).toEqual([96, 99, 100])
  })

  it('un empate en un escenario se resuelve por site_id, como rankCandidates', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-b', baseScore: 70, result: result([['slope', 'minus', 69]], 70) },
      { siteId: 'cl-a', baseScore: 68, result: result([['slope', 'minus', 69]], 68) },
    ]
    // 69 = 69 → cl-a antes que cl-b: cambia el orden.
    expect(summarizeRobustness(rows).flips).toBe(1)
  })

  it('con menos de dos lugares con % no hay orden que cambiar', () => {
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

  it('ignora escenarios que no existen para todos los lugares o sin puntaje', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['slope', 'minus', 69], ['aridity_context', 'plus', null]], 70) },
      { siteId: 'cl-b', baseScore: 60, result: result([['slope', 'minus', 61], ['aridity_context', 'plus', 60]], 60) },
    ]
    expect(summarizeRobustness(rows).scenarios).toBe(1)
  })

  it('empate de sensibilidad → el criterio que va antes en el orden canónico', () => {
    const rows: SiteSensitivity[] = [
      { siteId: 'cl-a', baseScore: 70, result: result([['local_relief', 'minus', 69], ['slope', 'minus', 69]], 70) },
      { siteId: 'cl-b', baseScore: 60, result: result([['local_relief', 'minus', 60], ['slope', 'minus', 60]], 60) },
    ]
    expect(summarizeRobustness(rows).mostSensitive).toBe('slope')
  })
})

// La sensibilidad la escribe el pipeline (analysis-summary.json); la web solo la lee y compara
// órdenes. Sin motor propio (ADR-011, sustituido): ningún recálculo en el navegador.
describe('parseSensitivity (analysis-summary.json del pipeline)', () => {
  const summary = readJson('artifacts/science-v3/analysis-summary.json')
  const parsed = parseSensitivity(summary)

  it('lee los siete sitios v3 con su estabilidad y sus 14 escenarios (7 criterios × ±)', () => {
    expect(parsed.size).toBe(7)
    const yungay = parsed.get(YUNGAY)
    expect(yungay?.scenarios).toHaveLength(14)
    expect(yungay?.stability).toBe((summary as { sites: Array<{ site_id: string; sensitivity: { stability: number } }> }).sites.find((site) => site.site_id === YUNGAY)?.sensitivity.stability)
    for (const result of parsed.values()) for (const scenario of result.scenarios) expect(['minus', 'plus']).toContain(scenario.direction)
  })

  it('lo que no tiene la forma esperada se ignora; nunca se inventa', () => {
    expect(parseSensitivity(null).size).toBe(0)
    expect(parseSensitivity({ sites: [{ site_id: 'cl-a' }, { sensitivity: { scenarios: [] } }] }).size).toBe(0)
    const odd = parseSensitivity({ sites: [{ site_id: 'cl-a', sensitivity: { stability: 'x', scenarios: [{ criterion_id: 'slope', direction: 'up', score: 1 }, { criterion_id: 'slope', direction: 'plus', score: null }] } }] })
    expect(odd.get('cl-a')).toEqual({ stability: null, maxScoreDelta: null, scenarios: [{ criterionId: 'slope', direction: 'plus', score: null, delta: null }] })
  })
})
