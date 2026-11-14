import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatIndex, parseSurfaceSeries } from '../domain/surfaceSeries'

const root = resolve(__dirname, '../../../..')

describe('series mensuales Sentinel-2', () => {
  it('conserva las doce observaciones de los seis candidatos y la referencia v3', () => {
    const summary = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v3/analysis-summary.json'), 'utf8'))
    const series = parseSurfaceSeries(summary)
    expect(series.size).toBe(7)
    expect([...series.keys()].filter(id => id.startsWith('ar-'))).toHaveLength(3)
    expect(series.get('cl-pampa-yungay-screening')).toHaveLength(12)
    for (const points of series.values()) expect(points).toHaveLength(12)
  })
  it('lee las doce observaciones de cada sector del snapshot científico v2', () => {
    const summary = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v2/analysis-summary.json'), 'utf8')) as unknown
    const series = parseSurfaceSeries(summary)
    expect(series.size).toBe(3)
    for (const points of series.values()) {
      expect(points).toHaveLength(12)
      expect(points.every((point) => Number.isFinite(point.bsi) && Number.isFinite(point.ndvi))).toBe(true)
    }
  })

  it('descarta meses incompletos y ordena cronológicamente sin rellenar', () => {
    const series = parseSurfaceSeries({
      sites: [{
        site_id: 'a',
        sentinel2: {
          monthly: [
            { from: '2025-03-01', ndvi: 0.1, bsi: 0.2, valid_fraction: 1 },
            { from: '2025-01-01', ndvi: 0.3, bsi: 0.1, valid_fraction: 1 },
            { from: '2025-02-01', ndvi: null, bsi: 0.2, valid_fraction: 1 },
          ],
        },
      }],
    })
    expect(series.get('a')?.map((point) => point.from)).toEqual(['2025-01-01', '2025-03-01'])
  })

  it('devuelve vacío ante entradas que no cumplen la forma esperada', () => {
    expect(parseSurfaceSeries(null).size).toBe(0)
    expect(parseSurfaceSeries({ sites: 'x' }).size).toBe(0)
    expect(parseSurfaceSeries({ sites: [{ site_id: 'b', sentinel2: { monthly: [{ from: '2025-01-01', ndvi: 0, bsi: 0, valid_fraction: 1 }] } }] }).size).toBe(0)
  })

  it('formatea índices con coma decimal', () => {
    expect(formatIndex(0.14334)).toBe('0,143')
  })
})

describe('referencia MOLA', () => {
  it('lee las medianas de Jezero por criterio topográfico', async () => {
    const { parseMarsReference } = await import('../domain/marsReference')
    const summary = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v2/analysis-summary.json'), 'utf8')) as unknown
    const reference = parseMarsReference(summary)
    expect(reference?.byCriterion).toEqual({ slope: 2.226, terrain_roughness: 11, local_relief: 47 })
  })

  it('devuelve null si no hay referencia utilizable', async () => {
    const { parseMarsReference } = await import('../domain/marsReference')
    expect(parseMarsReference({})).toBeNull()
    expect(parseMarsReference({ mola_reference: { median_slope_degree: 0 } })).toBeNull()
  })
})
