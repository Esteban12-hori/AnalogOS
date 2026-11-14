import { describe, expect, it } from 'vitest'
import type { SensitivityResult } from '../engine'
import { sensitivityInputs, summarizeRobustness, type SiteSensitivity } from './robustness'
import { loadScienceSnapshot, YUNGAY } from './testSupport'

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

describe('sensitivityInputs (misma regla que scoreMission)', () => {
  const snapshot = loadScienceSnapshot()
  const yungay = snapshot.candidates.find((site) => site.site_id === YUNGAY)
  if (!yungay) throw new Error('falta Yungay en el snapshot')

  it('perfil base: pesos y estados del snapshot', () => {
    const inputs = sensitivityInputs(snapshot.profile, null, yungay)
    expect(inputs.criteria.map((criterion) => criterion.weight)).toEqual(snapshot.profile.criteria.map((criterion) => criterion.weight))
    expect(inputs.inputs.geologic_relevance?.status).toBe('needs_calibration')
    expect(inputs.inputs.slope).toEqual({ similarity: 0.694107, quality: 0.93, status: 'valid' })
    expect(inputs.epsilon).toBe(0.01)
    expect(inputs.minimumValidWeight).toBe(0.7)
  })

  it('perfil de misión: Excluir (peso 0) entra como excluded', () => {
    const inputs = sensitivityInputs(snapshot.profile, { slope: 0.5, terrain_roughness: 0.5 }, yungay)
    expect(inputs.criteria.find((criterion) => criterion.id === 'local_relief')?.weight).toBe(0)
    expect(inputs.inputs.local_relief?.status).toBe('excluded')
    expect(inputs.inputs.slope?.status).toBe('valid')
  })
})
