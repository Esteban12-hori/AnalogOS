// Incremento 3 · funciones puras de features/places: catálogo ◆, geometría (§1 #16), orden
// estable con nulos al final, ◆ sin % ni ranking, teclado APG y contador del carrusel.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseReferenceAnalogs, type CandidateSite, type PolygonGeometry, type ReferenceAnalog } from '../../domain/contracts'
import type { MissionScoring } from '../engine'
import { geometryInsideBbox, pointInGeometry, pointInPolygon } from './geometry'
import {
  buildPlaceModel,
  nextOptionIndex,
  placeOrder,
  rangeLabel,
  typeaheadIndex,
  visibleRange,
} from './placeModel'
import { classifyReferenceAnalogs } from './classify'
import { classifyReferences, loadReferenceAnalogs, referenceAnalogsFrom } from './referenceAnalogs'
import { formatLatLon } from './ReferenceCardView'

const root = resolve(__dirname, '../../../../..')
const readText = (path: string): string => readFileSync(resolve(root, path), 'utf8')
const read = (path: string): unknown => JSON.parse(readText(path))

const catalogText = readText('config/reference_analogs.json')
const analogs = parseReferenceAnalogs(JSON.parse(catalogText))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
// FIXTURE de contrato (no son análogos reales): una región que cubre el norte de Chile y un punto en Utah.
const fixtureAnalogs = parseReferenceAnalogs(read('tests/fixtures/contracts/reference-analog/valid.catalog.json'))

const YUNGAY = 'cl-pampa-yungay-screening'
const DOMEYKO = 'cl-domeyko-interior-screening'
const MARIA_ELENA = 'cl-pampa-maria-elena-screening'

function square(west: number, south: number, east: number, north: number): PolygonGeometry {
  return { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] }
}

function candidate(siteId: string, similarity: number | null): CandidateSite {
  const base = candidates[0] as CandidateSite
  return { ...base, site_id: siteId, name: `FIXTURE ${siteId}`, similarity }
}

describe('catálogo config/reference_analogs.json', () => {
  it('valida contra el contrato y trae los 8 emblemáticos con fuente citada', () => {
    expect(analogs.map((analog) => analog.id).sort()).toEqual([
      'atacama-yungay',
      'devon-island',
      'iceland-holuhraun',
      'mcmurdo-dry-valleys',
      'mdrs-utah',
      'pilbara',
      'rio-tinto',
      'svalbard-amase',
    ])
    expect(new Set(analogs.map((analog) => analog.id)).size).toBe(analogs.length)
    for (const analog of analogs) {
      expect(analog.status).toBe('por_calcular')
      expect(analog.sources.length).toBeGreaterThan(0)
      for (const source of analog.sources) expect(source.url).toMatch(/^https:\/\//)
    }
  })

  it('no trae métricas: ni similitud, ni confianza, ni ranking, ni puntaje', () => {
    expect(catalogText).not.toMatch(/"(similarity|confidence|score|rank|stability|feasibility)"/)
  })

  it('pesa ≤3 KB minificado (§6.1) y las cajas están orientadas [oeste, sur, este, norte]', () => {
    expect(new TextEncoder().encode(JSON.stringify(JSON.parse(catalogText))).length).toBeLessThanOrEqual(3072)
    for (const analog of analogs) {
      if (analog.location.kind === 'region') {
        const [west, south, east, north] = analog.location.bbox
        expect(west).toBeLessThan(east)
        expect(south).toBeLessThan(north)
      }
    }
  })

  it('loadReferenceAnalogs carga el catálogo diferido y validado; siempre el mismo resultado', async () => {
    const first = await loadReferenceAnalogs()
    expect(first.status).toBe('ready')
    expect(first.status === 'ready' ? first.analogs.length : 0).toBe(8)
    expect(await loadReferenceAnalogs()).toBe(first)
    // El clasificador geométrico llega en el mismo paso diferido.
    expect(classifyReferences(analogs, candidates)).toEqual(classifyReferenceAnalogs(analogs, candidates))
    expect(classifyReferences([], candidates).references).toEqual([])
  })

  it('un catálogo inválido queda «no disponible» con su motivo: nunca se inventan análogos', () => {
    const invalid = referenceAnalogsFrom(read('tests/fixtures/contracts/reference-analog/invalid.with-similarity.json'))
    expect(invalid.status).toBe('unavailable')
    const duplicated = referenceAnalogsFrom({ schema: 'reference-analogs/1', analogs: [fixtureAnalogs[0], fixtureAnalogs[0]] })
    expect(duplicated).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('repetido') })
    const flipped: ReferenceAnalog = { ...(fixtureAnalogs[1] as ReferenceAnalog), location: { kind: 'region', bbox: [-68.5, -21.5, -70.6, -27] } }
    expect(referenceAnalogsFrom({ schema: 'reference-analogs/1', analogs: [flipped] })).toMatchObject({ status: 'unavailable' })
  })
})

describe('geometría (punto en polígono)', () => {
  const cell = square(-70, -24.2, -69.8, -24)

  it('dentro, fuera y en huecos', () => {
    expect(pointInGeometry(-69.9, -24.1, cell)).toBe(true)
    expect(pointInGeometry(-69.7, -24.1, cell)).toBe(false)
    const ring = cell.coordinates[0] ?? []
    const hole = square(-69.95, -24.15, -69.85, -24.05).coordinates[0] ?? []
    expect(pointInPolygon(-69.9, -24.1, [ring, hole])).toBe(false)
    expect(pointInPolygon(-69.97, -24.18, [ring, hole])).toBe(true)
  })

  it('MultiPolygon: basta con caer en una de sus partes', () => {
    const multi = { type: 'MultiPolygon' as const, coordinates: [square(0, 0, 1, 1).coordinates, square(5, 5, 6, 6).coordinates] }
    expect(pointInGeometry(5.5, 5.5, multi)).toBe(true)
    expect(pointInGeometry(3, 3, multi)).toBe(false)
  })

  it('«contiene» exige todos los vértices dentro de la caja, no basta con tocarla', () => {
    expect(geometryInsideBbox(cell, [-71, -25, -69, -23])).toBe(true)
    expect(geometryInsideBbox(cell, [-69.9, -25, -69, -23])).toBe(false)
  })
})

describe('regla §1 #16: la geometría decide insignia o ◆ propio', () => {
  it('Atacama · Yungay: el punto citado cae dentro de Pampa Yungay → insignia, sin tarjeta propia', () => {
    const { badges, references } = classifyReferenceAnalogs(analogs, candidates)
    expect([...badges.keys()]).toEqual([YUNGAY])
    expect(badges.get(YUNGAY)?.map((analog) => analog.id)).toEqual(['atacama-yungay'])
    expect(references.map((place) => place.id)).not.toContain('atacama-yungay')
    expect(references).toHaveLength(7)
  })

  it('una región solo «contiene» los sectores que la prueba respalda (MDRS: ninguno)', () => {
    const { references } = classifyReferenceAnalogs(analogs, candidates)
    expect(references.find((place) => place.id === 'mdrs-utah')?.containsSectorIds).toEqual([])
    // FIXTURE: la caja de contrato cubre el norte de Chile y contiene los 3 sectores evaluados.
    const fixture = classifyReferenceAnalogs(fixtureAnalogs, candidates).references
    expect(fixture.find((place) => place.id === 'fixture-analogo-region')?.containsSectorIds).toEqual([DOMEYKO, MARIA_ELENA, YUNGAY])
    expect(fixture.find((place) => place.id === 'fixture-analogo-punto')?.containsSectorIds).toEqual([])
  })
})

describe('orden del carrusel', () => {
  it('Explorar: orden del snapshot (rankCandidates) con #n de 3 y los ◆ en orden alfabético', () => {
    const model = buildPlaceModel({ candidates, classification: classifyReferenceAnalogs(analogs, candidates) })
    expect(model.source).toBe('snapshot')
    expect(model.evaluated.map((place) => [place.id, place.rank])).toEqual([[YUNGAY, 1], [DOMEYKO, 2], [MARIA_ELENA, 3]])
    expect(model.rankedCount).toBe(3)
    expect(model.coincidentCount).toBe(1)
    expect(model.references.map((place) => place.id)).toEqual([
      'devon-island',
      'iceland-holuhraun',
      'mdrs-utah',
      'pilbara',
      'rio-tinto',
      'svalbard-amase',
      'mcmurdo-dry-valleys',
    ])
    expect(placeOrder(model).map((place) => place.kind)).toEqual([...Array(3).fill('evaluated'), ...Array(7).fill('reference')])
  })

  it('los ◆ no tienen similitud, confianza ni ranking', () => {
    for (const place of buildPlaceModel({ candidates, classification: classifyReferenceAnalogs(analogs, candidates) }).references) {
      expect(place).not.toHaveProperty('similarity')
      expect(place).not.toHaveProperty('confidence')
      expect(place).not.toHaveProperty('rank')
    }
  })

  it('orden estable: nulos al final, empates por site_id, sin depender del orden de entrada', () => {
    const input = [candidate('cl-c', null), candidate('cl-b', 50), candidate('cl-0', 80), candidate('cl-a', 50)]
    const expected = [['cl-0', 1, 'scored'], ['cl-a', 2, 'scored'], ['cl-b', 3, 'scored'], ['cl-c', null, 'insufficient_data']]
    const view = (list: CandidateSite[]) => buildPlaceModel({ candidates: list }).evaluated.map((place) => [place.id, place.rank, place.status])
    expect(view(input)).toEqual(expected)
    expect(view([...input].reverse())).toEqual(expected)
  })

  it('Misión: el orden y el % son del motor; lo que el motor no puntúa queda «por calcular»', () => {
    // FIXTURE: resultado sintético del motor, solo para probar el orden (no es un resultado científico).
    const scoring: MissionScoring = {
      profileId: 'mission:FIXTURE',
      engineVersion: '0.0.0-fixture',
      sites: [
        { siteId: MARIA_ELENA, similarity: 80, rank: 1, status: 'scored', coverage: 1, confidence: null, contributions: {}, limitingCriterionId: null },
        { siteId: YUNGAY, similarity: null, rank: null, status: 'insufficient_data', coverage: 0.5, confidence: null, contributions: {}, limitingCriterionId: null },
      ],
    }
    const model = buildPlaceModel({ candidates, classification: classifyReferenceAnalogs(analogs, candidates), scoring })
    expect(model.source).toBe('mission')
    expect(model.evaluated.map((place) => [place.id, place.similarity, place.rank, place.status, place.confidence])).toEqual([
      [MARIA_ELENA, 80, 1, 'scored', null],
      [DOMEYKO, null, null, 'por_calcular', null],
      [YUNGAY, null, null, 'insufficient_data', null],
    ])
    expect(model.rankedCount).toBe(1)
  })
})

describe('teclado (APG listbox) y contador', () => {
  it('flechas, Inicio y Fin; sin vuelta al llegar a un extremo', () => {
    expect(nextOptionIndex('ArrowRight', 0, 10)).toBe(1)
    expect(nextOptionIndex('ArrowDown', 9, 10)).toBe(9)
    expect(nextOptionIndex('ArrowLeft', 0, 10)).toBe(0)
    expect(nextOptionIndex('ArrowUp', 4, 10)).toBe(3)
    expect(nextOptionIndex('Home', 7, 10)).toBe(0)
    expect(nextOptionIndex('End', 2, 10)).toBe(9)
    expect(nextOptionIndex('Tab', 2, 10)).toBeNull()
    expect(nextOptionIndex('ArrowRight', 0, 0)).toBeNull()
  })

  it('búsqueda por escritura: una letra avanza a la siguiente; varias buscan el prefijo; sin tildes', () => {
    const labels = ['Pampa Yungay', 'Cordón de Domeyko', 'Pampa María Elena', 'Isla Devon · cráter Haughton', 'Islandia · Holuhraun', 'Río Tinto · nacimiento']
    expect(typeaheadIndex(labels, 'p', 0)).toBe(2)
    expect(typeaheadIndex(labels, 'p', 2)).toBe(0)
    expect(typeaheadIndex(labels, 'isla', 0)).toBe(3)
    expect(typeaheadIndex(labels, 'islan', 3)).toBe(4)
    expect(typeaheadIndex(labels, 'rio', 0)).toBe(5)
    expect(typeaheadIndex(labels, 'z', 0)).toBeNull()
  })

  it('«1–4 de 11»: cuenta las tarjetas visibles al menos en un 60 %', () => {
    const boxes = [0, 110, 220, 330].map((start) => ({ start, size: 100 }))
    expect(visibleRange(boxes, 0, 250)).toEqual({ first: 0, last: 1 })
    expect(visibleRange(boxes, 100, 250)).toEqual({ first: 1, last: 2 })
    expect(visibleRange([], 0, 250)).toBeNull()
    expect(rangeLabel({ first: 1, last: 2 }, 11)).toBe('2–3 de 11')
    expect(rangeLabel({ first: 2, last: 2 }, 11)).toBe('3 de 11')
    expect(rangeLabel(null, 11)).toBe('11 lugares')
  })

  it('coordenadas citadas en formato es-CL', () => {
    expect(formatLatLon(-24.0807, -69.9198)).toBe('24,08° S, 69,92° W')
    expect(formatLatLon(75.3667, 13.3072)).toBe('75,37° N, 13,31° E')
  })
})
