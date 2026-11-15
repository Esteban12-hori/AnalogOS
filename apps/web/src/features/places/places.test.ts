// Pure functions of features/places: ◆ catalog, geometry (§1 #16), carousel order with the v3
// snapshot (candidates at their global rank, REF apart and never ranked, country filter that keeps
// the rank) and, in Mission, groups by status of the team's evaluation; APG keyboard.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CandidateSite, PolygonGeometry, ReferenceAnalog } from '../../domain/contracts'
import { parseReferenceAnalogs } from '../../domain/referenceAnalogContract'
import { emptyScope } from '../../mission'
import { evaluateExample, v3Snapshot } from '../../tests/v3Support'
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
import { referenceAnalogsFrom } from './analogCatalog'
import { classifyReferences, loadReferenceAnalogs } from './referenceAnalogs'
import { formatLatLon } from './ReferenceCardView'

const root = resolve(__dirname, '../../../../..')
const readText = (path: string): string => readFileSync(resolve(root, path), 'utf8')
const read = (path: string): unknown => JSON.parse(readText(path))

const catalogText = readText('config/reference_analogs.json')
const analogs = parseReferenceAnalogs(JSON.parse(catalogText))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
// Contract FIXTURE (not real analogs): a region covering northern Chile and a point in Utah.
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

describe('config/reference_analogs.json catalog', () => {
  it('validates against the contract and brings the 8 emblematic sites with a cited source', () => {
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

  it('carries no metrics: no similarity, confidence, ranking or score', () => {
    expect(catalogText).not.toMatch(/"(similarity|confidence|score|rank|stability|feasibility)"/)
  })

  it('weighs ≤3 KB minified (§6.1) and boxes are oriented [west, south, east, north]', () => {
    expect(new TextEncoder().encode(JSON.stringify(JSON.parse(catalogText))).length).toBeLessThanOrEqual(3072)
    for (const analog of analogs) {
      if (analog.location.kind === 'region') {
        const [west, south, east, north] = analog.location.bbox
        expect(west).toBeLessThan(east)
        expect(south).toBeLessThan(north)
      }
    }
  })

  it('loadReferenceAnalogs loads the deferred, validated catalog; always the same result', async () => {
    const first = await loadReferenceAnalogs()
    expect(first.status).toBe('ready')
    expect(first.status === 'ready' ? first.analogs.length : 0).toBe(8)
    expect(await loadReferenceAnalogs()).toBe(first)
    // The geometric classifier arrives in the same deferred step.
    expect(classifyReferences(analogs, candidates)).toEqual(classifyReferenceAnalogs(analogs, candidates))
    expect(classifyReferences([], candidates).references).toEqual([])
  })

  it('an invalid catalog stays “unavailable” with its reason: analogs are never invented', () => {
    const invalid = referenceAnalogsFrom(read('tests/fixtures/contracts/reference-analog/invalid.with-similarity.json'))
    expect(invalid.status).toBe('unavailable')
    const duplicated = referenceAnalogsFrom({ schema: 'reference-analogs/1', analogs: [fixtureAnalogs[0], fixtureAnalogs[0]] })
    expect(duplicated).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('repeated') })
    const flipped: ReferenceAnalog = { ...(fixtureAnalogs[1] as ReferenceAnalog), location: { kind: 'region', bbox: [-68.5, -21.5, -70.6, -27] } }
    expect(referenceAnalogsFrom({ schema: 'reference-analogs/1', analogs: [flipped] })).toMatchObject({ status: 'unavailable' })
  })
})

describe('geometry (point in polygon)', () => {
  const cell = square(-70, -24.2, -69.8, -24)

  it('inside, outside and in holes', () => {
    expect(pointInGeometry(-69.9, -24.1, cell)).toBe(true)
    expect(pointInGeometry(-69.7, -24.1, cell)).toBe(false)
    const ring = cell.coordinates[0] ?? []
    const hole = square(-69.95, -24.15, -69.85, -24.05).coordinates[0] ?? []
    expect(pointInPolygon(-69.9, -24.1, [ring, hole])).toBe(false)
    expect(pointInPolygon(-69.97, -24.18, [ring, hole])).toBe(true)
  })

  it('MultiPolygon: falling in one of its parts is enough', () => {
    const multi = { type: 'MultiPolygon' as const, coordinates: [square(0, 0, 1, 1).coordinates, square(5, 5, 6, 6).coordinates] }
    expect(pointInGeometry(5.5, 5.5, multi)).toBe(true)
    expect(pointInGeometry(3, 3, multi)).toBe(false)
  })

  it('“contains” requires every vertex inside the box, touching it is not enough', () => {
    expect(geometryInsideBbox(cell, [-71, -25, -69, -23])).toBe(true)
    expect(geometryInsideBbox(cell, [-69.9, -25, -69, -23])).toBe(false)
  })
})

describe('rule §1 #16: geometry decides badge or own ◆', () => {
  it('Atacama · Yungay: the cited point falls inside Pampa Yungay → badge, no card of its own', () => {
    const { badges, references } = classifyReferenceAnalogs(analogs, candidates)
    expect([...badges.keys()]).toEqual([YUNGAY])
    expect(badges.get(YUNGAY)?.map((analog) => analog.id)).toEqual(['atacama-yungay'])
    expect(references.map((place) => place.id)).not.toContain('atacama-yungay')
    expect(references).toHaveLength(7)
  })

  it('a region only “contains” the sectors the test backs (MDRS: none)', () => {
    const { references } = classifyReferenceAnalogs(analogs, candidates)
    expect(references.find((place) => place.id === 'mdrs-utah')?.containsSectorIds).toEqual([])
    // FIXTURE: the contract box covers northern Chile and contains the 3 evaluated sectors.
    const fixture = classifyReferenceAnalogs(fixtureAnalogs, candidates).references
    expect(fixture.find((place) => place.id === 'fixture-analogo-region')?.containsSectorIds).toEqual([DOMEYKO, MARIA_ELENA, YUNGAY])
    expect(fixture.find((place) => place.id === 'fixture-analogo-punto')?.containsSectorIds).toEqual([])
  })
})

describe('carousel order (v3 snapshot)', () => {
  const v3 = v3Snapshot.candidates
  const classification = classifyReferenceAnalogs(analogs, v3)

  it('Explore: 6 candidates with their global rank, the REF apart without rank and the ◆ alphabetical', () => {
    const model = buildPlaceModel({ candidates: v3, classification })
    expect(model.source).toBe('snapshot')
    const ranked = model.groups.find((group) => group.role === 'candidate')?.places ?? []
    expect(ranked.map((place) => place.rank)).toEqual([1, 2, 3, 4, 5, 6])
    expect(ranked.every((place) => place.role === 'candidate')).toBe(true)
    const reference = model.groups.find((group) => group.role === 'reference')?.places ?? []
    expect(reference.map((place) => [place.id, place.rank, place.role])).toEqual([[YUNGAY, null, 'reference']])
    expect(model.rankedCount).toBe(6)
    expect(model.countries).toEqual(['CL', 'AR'])
    // The ◆ “Atacama · Yungay” matches the REF polygon: a badge, not a card of its own.
    expect(reference[0]?.coincident.map((analog) => analog.id)).toEqual(['atacama-yungay'])
    expect(model.references.map((place) => place.id)).not.toContain('atacama-yungay')
    expect(placeOrder(model).map((place) => place.kind)).toEqual([...Array(7).fill('evaluated'), ...Array(7).fill('reference')])
  })

  it('filtering by country keeps the global rank (never renumbers) and the REF stays apart', () => {
    const all = buildPlaceModel({ candidates: v3 })
    const argentina = buildPlaceModel({ candidates: v3, country: 'AR' })
    const ranks = new Map(all.evaluated.map((place) => [place.id, place.rank]))
    const shown = argentina.groups.find((group) => group.role === 'candidate')?.places ?? []
    expect(shown.length).toBe(3)
    expect(shown.every((place) => place.country === 'AR' && place.id.startsWith('ar-'))).toBe(true)
    for (const place of shown) expect(place.rank).toBe(ranks.get(place.id))
    expect(shown.map((place) => place.rank)).not.toEqual([1, 2, 3])
    expect(argentina.rankedCount).toBe(6)
    expect(argentina.groups.some((group) => group.role === 'reference')).toBe(true)
  })

  it('◆ have no similarity, confidence or ranking', () => {
    for (const place of buildPlaceModel({ candidates: v3, classification }).references) {
      expect(place).not.toHaveProperty('similarity')
      expect(place).not.toHaveProperty('confidence')
      expect(place).not.toHaveProperty('rank')
    }
  })

  it('stable order among candidates: nulls last, ties by site_id, independent of input order', () => {
    const input = [candidate('cl-c', null), candidate('cl-b', 50), candidate('cl-0', 80), candidate('cl-a', 50)]
    const expected = [['cl-0', 1, 'scored'], ['cl-a', 2, 'scored'], ['cl-b', 3, 'scored'], ['cl-c', null, 'insufficient_data']]
    const view = (list: CandidateSite[]) => buildPlaceModel({ candidates: list }).evaluated.map((place) => [place.id, place.rank, place.status])
    expect(view(input)).toEqual(expected)
    expect(view([...input].reverse())).toEqual(expected)
  })

  it('Mission: groups by status of the team evaluation, rank only for prioritized and v3 similarity not recalculated', () => {
    const { evaluation } = evaluateExample()
    const model = buildPlaceModel({ candidates: v3, classification, evaluation })
    expect(model.source).toBe('mission')
    const order = ['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado', 'fuera_de_alcance']
    const statuses = model.groups.map((group) => group.status)
    expect(statuses).toEqual(order.filter((status) => statuses.includes(status as never)))
    for (const place of model.evaluated) {
      const option = evaluation.options.find((item) => item.site_id === place.id)
      expect(place.mission?.status).toBe(option?.status ?? 'fuera_de_alcance')
      expect(place.rank).toBe(option?.status === 'priorizado_para_reconocimiento' ? option.rank : null)
      expect(place.similarity).toBe(place.candidate.similarity)
    }
    const prioritized = model.groups.find((group) => group.status === 'priorizado_para_reconocimiento')?.places ?? []
    expect(prioritized.map((place) => place.rank)).toEqual(prioritized.map((_, index) => index + 1))
  })

  it('Mission with one sector: the other sites are “out of scope”', () => {
    const { evaluation } = evaluateExample({ ...emptyScope('ar-win-s2580-w06710'), mode: 'sector' })
    const model = buildPlaceModel({ candidates: v3, evaluation })
    const outside = model.groups.find((group) => group.status === 'fuera_de_alcance')?.places ?? []
    expect(outside.length).toBe(v3.length - 1)
    expect(outside.every((place) => place.rank === null && place.mission?.option === null)).toBe(true)
  })
})

describe('keyboard (APG listbox) and counter', () => {
  it('arrows, Home and End; no wrapping at either end', () => {
    expect(nextOptionIndex('ArrowRight', 0, 10)).toBe(1)
    expect(nextOptionIndex('ArrowDown', 9, 10)).toBe(9)
    expect(nextOptionIndex('ArrowLeft', 0, 10)).toBe(0)
    expect(nextOptionIndex('ArrowUp', 4, 10)).toBe(3)
    expect(nextOptionIndex('Home', 7, 10)).toBe(0)
    expect(nextOptionIndex('End', 2, 10)).toBe(9)
    expect(nextOptionIndex('Tab', 2, 10)).toBeNull()
    expect(nextOptionIndex('ArrowRight', 0, 0)).toBeNull()
  })

  it('type-ahead search: one letter moves to the next; several search the prefix; accent-insensitive', () => {
    const labels = ['Pampa Yungay', 'Cordón de Domeyko', 'Pampa María Elena', 'Isla Devon · cráter Haughton', 'Islandia · Holuhraun', 'Río Tinto · nacimiento']
    expect(typeaheadIndex(labels, 'p', 0)).toBe(2)
    expect(typeaheadIndex(labels, 'p', 2)).toBe(0)
    expect(typeaheadIndex(labels, 'isla', 0)).toBe(3)
    expect(typeaheadIndex(labels, 'islan', 3)).toBe(4)
    expect(typeaheadIndex(labels, 'rio', 0)).toBe(5)
    expect(typeaheadIndex(labels, 'z', 0)).toBeNull()
  })

  it('“1–4 of 11”: counts cards at least 60% visible', () => {
    const boxes = [0, 110, 220, 330].map((start) => ({ start, size: 100 }))
    expect(visibleRange(boxes, 0, 250)).toEqual({ first: 0, last: 1 })
    expect(visibleRange(boxes, 100, 250)).toEqual({ first: 1, last: 2 })
    expect(visibleRange([], 0, 250)).toBeNull()
    expect(rangeLabel({ first: 1, last: 2 }, 11)).toBe('2–3 of 11')
    expect(rangeLabel({ first: 2, last: 2 }, 11)).toBe('3 of 11')
    expect(rangeLabel(null, 11)).toBe('11 places')
  })

  it('cited coordinates in display format', () => {
    expect(formatLatLon(-24.0807, -69.9198)).toBe('24.08° S, 69.92° W')
    expect(formatLatLon(75.3667, 13.3072)).toBe('75.37° N, 13.31° E')
  })
})

describe('list view in the mobile sheet', () => {
  // Regression: when sliding the sheet up the list ended up with height 0 (flex 1 1 0 without a height
  // defined on the parent) and clipped by its own scroll: an empty screen. In the sheet the list must
  // take the height of its content; the desktop dock keeps its internal scroll.
  const css = readText('apps/web/src/features/places/places.css').replace(/\s+/g, ' ')
  it('in the sheet, the list track neither collapses nor clips', () => {
    const rule = css.match(/\.places\[data-placement="sheet"\]\[data-view="list"\] \.places-track \{([^}]*)\}/)
    expect(rule, 'the sheet list rule is missing').not.toBeNull()
    expect(rule?.[1]).toMatch(/flex: 0 0 auto/)
    expect(rule?.[1]).toMatch(/overflow-y: visible/)
  })
  it('outside the sheet the list keeps its internal scroll', () => {
    expect(css).toMatch(/\.places\[data-view="list"\] \.places-track \{[^}]*overflow-y: auto/)
  })
})
