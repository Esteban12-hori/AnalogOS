import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatIndex, parseSurfaceSeries } from '../domain/surfaceSeries'

const root = resolve(__dirname, '../../../..')

describe('series mensuales Sentinel-2', () => {
  it('keeps the twelve observations of the six candidates and the v3 reference', () => {
    const summary = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v3/analysis-summary.json'), 'utf8'))
    const series = parseSurfaceSeries(summary)
    expect(series.size).toBe(7)
    expect([...series.keys()].filter(id => id.startsWith('ar-'))).toHaveLength(3)
    expect(series.get('cl-pampa-yungay-screening')).toHaveLength(12)
    for (const points of series.values()) expect(points).toHaveLength(12)
  })
  it('reads the twelve observations of each sector of the v2 scientific snapshot', () => {
    const summary = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v2/analysis-summary.json'), 'utf8')) as unknown
    const series = parseSurfaceSeries(summary)
    expect(series.size).toBe(3)
    for (const points of series.values()) {
      expect(points).toHaveLength(12)
      expect(points.every((point) => Number.isFinite(point.bsi) && Number.isFinite(point.ndvi))).toBe(true)
    }
  })

  it('discards incomplete months and sorts chronologically without filling in', () => {
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

  it('returns empty for inputs that do not have the expected shape', () => {
    expect(parseSurfaceSeries(null).size).toBe(0)
    expect(parseSurfaceSeries({ sites: 'x' }).size).toBe(0)
    expect(parseSurfaceSeries({ sites: [{ site_id: 'b', sentinel2: { monthly: [{ from: '2025-01-01', ndvi: 0, bsi: 0, valid_fraction: 1 }] } }] }).size).toBe(0)
  })

  it('formats indices with a decimal point', () => {
    expect(formatIndex(0.14334)).toBe('0.143')
  })
})

describe('referencia MOLA', () => {
  it('reads the Jezero medians per topographic criterion', async () => {
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
