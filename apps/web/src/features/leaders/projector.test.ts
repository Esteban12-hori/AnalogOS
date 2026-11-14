import { describe, expect, it } from 'vitest'
import type { CandidateGeometry } from '../../domain/contracts'
import type { StageAnchor, StageProjection } from '../globe'
import { computeLeaderFrame, FRESH_MEMORY, nextMemory, type LeaderScene } from './frame'
import { anchorFromBounds, MIN_DERIVED_RADIUS, polygonWidthFraction, projectSector, resolveAnchor, safeAreaFor, sheetEdge, toRects } from './projector'
import { scienceSite } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')
// Sector real: −70,05…−69,85 de longitud, −24,18…−23,98 de latitud (0,2° × 0,2°).

/** Proyección 2D lineal (como MapLibre a un zoom fijo): px por grado y origen. */
function flat(pxPerDegree: number, center: [number, number], screen: [number, number]): StageProjection {
  return {
    mode: 'flat',
    project(lon, lat) {
      return { x: screen[0] + (lon - center[0]) * pxPerDegree, y: screen[1] - (lat - center[1]) * pxPerDegree, visible: 1 }
    },
  }
}

/** Globo: los puntos al oeste de `horizonLon` quedan detrás (null). */
function globe(horizonLon: number, base: StageProjection): StageProjection {
  return {
    mode: 'globe',
    project(lon, lat) {
      return lon < horizonLon ? null : base.project(lon, lat)
    },
  }
}

describe('proyector globo/2D', () => {
  it('proyecta el polígono del sector a una caja en pantalla (2D)', () => {
    const bounds = projectSector(flat(1000, [-69.95, -24.08], [500, 400]), yungay.geometry)
    expect(bounds).not.toBeNull()
    expect(bounds?.minX).toBeCloseTo(400)
    expect(bounds?.maxX).toBeCloseTo(600)
    expect(bounds?.minY).toBeCloseTo(300)
    expect(bounds?.maxY).toBeCloseTo(500)
    expect(bounds?.visible).toBe(1)
  })

  it('en el globo, los vértices detrás del horizonte bajan la visibilidad; todos detrás → null', () => {
    const base = flat(1000, [-69.95, -24.08], [500, 400])
    const half = projectSector(globe(-69.9, base), yungay.geometry)
    expect(half).not.toBeNull()
    expect(half?.visible).toBeLessThan(1)
    expect(projectSector(globe(0, base), yungay.geometry)).toBeNull()
  })

  it('MultiPolygon: usa los anillos exteriores de cada parte', () => {
    const multi: CandidateGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[5, 0], [6, 0], [6, 1], [5, 0]]],
      ],
    }
    const bounds = projectSector(flat(10, [0, 0], [0, 0]), multi)
    expect(bounds?.minX).toBe(0)
    expect(bounds?.maxX).toBe(60)
  })

  it('el ancla derivada circunscribe la caja, con un radio mínimo para la escala global', () => {
    expect(anchorFromBounds({ minX: 100, maxX: 106, minY: 50, maxY: 54, visible: 1 }).radius).toBe(MIN_DERIVED_RADIUS)
    const big = anchorFromBounds({ minX: 0, maxX: 300, minY: 0, maxY: 400, visible: 0.8 })
    expect(big).toEqual({ x: 150, y: 200, radius: 250, visible: 0.8 })
  })

  it('usa el anillo que publica el globo si es del sector; si no, lo deriva de la proyección', () => {
    const projection = flat(1000, [-69.95, -24.08], [500, 400])
    const published: StageAnchor = { siteId: yungay.site_id, x: 510, y: 402, radius: 18, visible: 1, mode: 'globe' }
    expect(resolveAnchor(yungay.site_id, yungay.geometry, { projection, anchor: published }).anchor).toEqual({ x: 510, y: 402, radius: 18, visible: 1 })
    const other = resolveAnchor(yungay.site_id, yungay.geometry, { projection, anchor: { ...published, siteId: 'otro' } }).anchor
    expect(other?.x).toBeCloseTo(500)
    expect(other?.y).toBeCloseTo(400)
    expect(resolveAnchor(yungay.site_id, yungay.geometry, { projection: null, anchor: null }).anchor).toBeNull()
  })

  it('ancho del polígono / ancho libre decide el modo acoplado', () => {
    const safe = { x: 0, y: 0, width: 1000, height: 600 }
    expect(polygonWidthFraction({ minX: 100, maxX: 600, minY: 0, maxY: 1, visible: 1 }, null, safe)).toBe(0.5)
    expect(polygonWidthFraction(null, { x: 0, y: 0, radius: 50, visible: 1 }, safe)).toBe(0.1)
    expect(polygonWidthFraction(null, null, { ...safe, width: 0 })).toBe(0)
  })

  it('área segura = viewport menos stageInsets; rects vacíos o no finitos se descartan', () => {
    expect(safeAreaFor({ width: 1440, height: 900 }, { top: 78, right: 404, bottom: 280, left: 384 })).toEqual({ x: 384, y: 78, width: 652, height: 542 })
    expect(toRects([{ x: 0, y: 0, width: 0, height: 10 }, { x: Number.NaN, y: 0, width: 5, height: 5 }, { x: 1, y: 2, width: 3, height: 4 }])).toEqual([{ x: 1, y: 2, width: 3, height: 4 }])
  })

  it('borde de la hoja: centrado en su borde superior; la hoja medida manda (S2 queda arriba)', () => {
    const viewport = { width: 390, height: 844 }
    const insets = { top: 74, right: 0, bottom: 456, left: 0 }
    expect(sheetEdge(viewport, insets, [], false, 200)).toEqual({ x: 195, y: 388 })
    expect(sheetEdge(viewport, insets, [{ x: 0, y: 74, width: 390, height: 770 }], false, 200)).toEqual({ x: 195, y: 74 })
    expect(sheetEdge({ width: 844, height: 390 }, { top: 74, right: 360, bottom: 0, left: 0 }, [], true, 500)).toEqual({ x: 484, y: 378 })
  })
})

describe('computeLeaderFrame', () => {
  const labels = [
    { id: 'slope', width: 168, height: 62 },
    { id: 'terrain_roughness', width: 176, height: 62 },
    { id: 'bare_ground_fraction', width: 190, height: 74 },
    { id: 'local_relief', width: 164, height: 62 },
  ]
  const scene: LeaderScene = {
    siteId: yungay.site_id,
    geometry: yungay.geometry,
    narrow: false,
    sideSheet: false,
    compact: false,
    viewport: { width: 1440, height: 900 },
    insets: { top: 78, right: 404, bottom: 280, left: 0 },
    obstacles: [],
    labels,
    header: { width: 232, height: 30 },
    chip: { width: 170, height: 28 },
  }
  // Escala global: el sector mide ~6 px en pantalla.
  const globalView = flat(30, [-69.95, -24.08], [420, 340])

  it("sin proyección ni ancla el escenario no publica: 'off'", () => {
    expect(computeLeaderFrame(scene, { projection: null, anchor: null }, FRESH_MEMORY).mode).toBe('off')
  })

  it('a escala global dibuja líneas desde el anillo derivado', () => {
    const frame = computeLeaderFrame(scene, { projection: globalView, anchor: null }, FRESH_MEMORY)
    expect(frame.mode).toBe('lines')
    expect(frame.count).toBe(4)
    expect(frame.paths).toHaveLength(4)
    expect(frame.origin?.x).toBeCloseTo(420 + MIN_DERIVED_RADIUS)
  })

  it('con el sector detrás del globo muestra el chip', () => {
    const frame = computeLeaderFrame(scene, { projection: globe(0, globalView), anchor: null }, FRESH_MEMORY)
    expect(frame.mode).toBe('chip')
    expect(frame.chip).not.toBeNull()
  })

  it('en 2D muy cerca (polígono ancho) acopla las etiquetas sin líneas', () => {
    const frame = computeLeaderFrame(scene, { projection: flat(4000, [-69.95, -24.08], [520, 340]), anchor: null }, FRESH_MEMORY)
    expect(frame.mode).toBe('docked')
    expect(frame.paths).toHaveLength(0)
  })

  it('en móvil, una sola línea a la hoja y ninguna etiqueta', () => {
    const narrow: LeaderScene = { ...scene, narrow: true, labels: [], header: null, chip: null, viewport: { width: 390, height: 844 }, insets: { top: 74, right: 0, bottom: 456, left: 0 } }
    const frame = computeLeaderFrame(narrow, { projection: flat(30, [-69.95, -24.08], [195, 230]), anchor: null }, FRESH_MEMORY)
    expect(frame.mode).toBe('mobile')
    expect(frame.placements).toHaveLength(0)
    expect(frame.mobile?.to.y).toBeCloseTo(388)
  })

  it('la memoria de histéresis guarda lado y cantidad; off y móvil no la borran', () => {
    const frame = computeLeaderFrame(scene, { projection: globalView, anchor: null }, FRESH_MEMORY)
    const memory = nextMemory(FRESH_MEMORY, frame)
    expect(memory).toEqual({ side: frame.side, count: 4 })
    expect(nextMemory(memory, computeLeaderFrame(scene, { projection: null, anchor: null }, memory))).toBe(memory)
  })
})
