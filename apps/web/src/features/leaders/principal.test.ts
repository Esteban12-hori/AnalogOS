import { describe, expect, it } from 'vitest'
import type { CriterionId } from '../../domain/contracts'
import type { MetricView } from '../metrics'
import { pickPrincipalMetrics } from './principal'
import { scienceSite, snapshotViews } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')

function ids(views: readonly MetricView[]): string[] {
  return views.map((view) => view.criterionId)
}

describe('pickPrincipalMetrics', () => {
  it('toma las 4 de mayor peso del snapshot y desempata por el orden canónico', () => {
    // Pesos v2: pendiente, rugosidad y suelo expuesto 0,20; relieve 0,15; resto menos.
    expect(ids(pickPrincipalMetrics(snapshotViews(yungay)))).toEqual(['slope', 'terrain_roughness', 'bare_ground_fraction', 'local_relief'])
  })

  it('el desempate no depende del orden de entrada', () => {
    const views = snapshotViews(yungay)
    expect(ids(pickPrincipalMetrics([...views].reverse()))).toEqual(ids(pickPrincipalMetrics(views)))
  })

  it('respeta `count` (3 en alto compacto) y nunca devuelve más vistas de las que hay', () => {
    const views = snapshotViews(yungay)
    expect(ids(pickPrincipalMetrics(views, 3))).toEqual(['slope', 'terrain_roughness', 'bare_ground_fraction'])
    expect(pickPrincipalMetrics(views, 0)).toEqual([])
    expect(pickPrincipalMetrics(views, Number.NaN)).toEqual([])
    expect(pickPrincipalMetrics(views.slice(0, 2), 4)).toHaveLength(2)
  })

  it('ordena por el peso del perfil de misión activo, no por similitud ni contribución', () => {
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
    // 3/11 empatan (pendiente antes que rugosidad); 2/11 empatan (relieve antes que suelo).
    expect(ids(picked)).toEqual(['slope', 'terrain_roughness', 'local_relief', 'bare_ground_fraction'])
  })

  it('excluye lo excluido (peso 0) y deja «por calcular» si el perfil lo pide con peso', () => {
    const weights = { slope: 0, terrain_roughness: 0, local_relief: 0, bare_ground_fraction: 0, aridity_context: 0.4, surface_temperature_variability: 0, geologic_relevance: 0.6 }
    const picked = pickPrincipalMetrics(snapshotViews(yungay, weights))
    expect(ids(picked)).toEqual(['geologic_relevance', 'aridity_context'])
    expect(picked[0]?.similarity).toBeNull()
  })

  it('trata como empate pesos iguales calculados por caminos distintos', () => {
    const views = snapshotViews(yungay, { local_relief: 0.1 + 0.2, slope: 0.3 })
    expect(ids(pickPrincipalMetrics(views, 2))).toEqual(['slope', 'local_relief'])
  })

  it('no muta la entrada', () => {
    const views = snapshotViews(yungay)
    const before = ids(views)
    pickPrincipalMetrics(views)
    expect(ids(views)).toEqual(before)
  })
})
