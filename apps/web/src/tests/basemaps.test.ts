import { describe, expect, it } from 'vitest'
import { activeSources, boundsIntersect, parseBasemaps, type Basemap } from '../data/loadBasemaps'

const regional: Basemap = {
  id: 'region', kind: 'regional', label: 'Norte', bounds: [-73, -30, -65, -17], image: 'basemaps/region.webp',
  layers: [], dates: [], resolution_m: 500, gap_fraction: 0, source: 'Blue Marble',
}
const sector: Basemap = {
  id: 'cl-a', kind: 'sector', label: 'A', bounds: [-70.2, -24.3, -69.7, -23.9], image: 'basemaps/cl-a.webp',
  layers: ['HLS_S30'], dates: ['S30:2025-01-02', 'L30:2025-03-17'], resolution_m: 30, gap_fraction: 0, source: 'HLS',
}
const offline = { blueMarble: false, hls: null }

describe('parseBasemaps', () => {
  it('acepta entradas válidas y descarta las mal formadas', () => {
    const parsed = parseBasemaps({ basemaps: [regional, { ...sector, bounds: [1, 2, 0, 3] }, { id: 3 }, null] })
    expect(parsed.map((item) => item.id)).toEqual(['region'])
  })

  it('devuelve vacío si el manifiesto no tiene la forma esperada', () => {
    expect(parseBasemaps(null)).toEqual([])
    expect(parseBasemaps({ basemaps: 'x' })).toEqual([])
  })
})

describe('boundsIntersect', () => {
  it('detecta solapes y separa cajas disjuntas', () => {
    expect(boundsIntersect([-71, -25, -69, -23], sector.bounds)).toBe(true)
    expect(boundsIntersect([0, 0, 1, 1], sector.bounds)).toBe(false)
  })
})

describe('activeSources', () => {
  it('a zoom bajo solo informa la imagen regional', () => {
    expect(activeSources([-72, -28, -66, -20], 6, [regional, sector], offline).map((item) => item.id)).toEqual(['bluemarble-local'])
  })

  it('al acercarse a un sector informa HLS con su rango de fechas', () => {
    const sources = activeSources([-70, -24.2, -69.8, -24], 10, [regional, sector], offline)
    expect(sources[0]?.id).toBe('hls')
    expect(sources[0]?.detail).toContain('2025-01-02 – 2025-03-17')
  })

  it('agrega capas en línea solo si cargaron', () => {
    const ids = activeSources([10, 10, 11, 11], 9, [regional, sector], { blueMarble: true, hls: ['2025-10-01'] }).map((item) => item.id)
    expect(ids).toEqual(['hls-online', 'gibs-online'])
    expect(activeSources([10, 10, 11, 11], 9, [regional], offline)).toEqual([])
  })
})
