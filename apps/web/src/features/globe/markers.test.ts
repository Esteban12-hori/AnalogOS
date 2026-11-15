import { describe, expect, it } from 'vitest'
import type { CandidateSite, Position, ReferenceAnalog } from '../../domain/contracts'
import { latLngToVec3 } from '../../domain/globe'
import type { MissionEvaluation, OptionEvaluation } from '../../mission/types'
import {
  assignLabels,
  buildMarkerModels,
  clusterAriaLabel,
  clusterMarkers,
  clusterSignature,
  clusterStack,
  clusterText,
  CLUSTER_MIN_VISIBLE,
  CLUSTER_RADIUS_PX,
  estimateLabelWidth,
  HIDDEN_BELOW,
  horizonFacing,
  markerAriaLabel,
  markerBadgeText,
  markerLabelText,
  markerVisibility,
  NEAR_SELECTION_PX,
  pinOccluded,
  pinUnfocusable,
  placeNearSelection,
  ringRadius,
  RING_MIN_PX,
  smoothstep,
  type ScreenMarker,
} from './markers'

// FIXTURE: synthetic sectors with the geometry of the three sectors in the v2 snapshot and test figures
// They are not scientific results.
function box(west: number, south: number, size = 0.2): Position[] {
  return [[west, south], [west + size, south], [west + size, south + size], [west, south + size], [west, south]]
}

function site(id: string, name: string, similarity: number | null, ring: Position[]): CandidateSite {
  return {
    site_id: id,
    name,
    similarity,
    status: similarity === null ? 'insufficient_data' : 'candidate',
    geometry: { type: 'Polygon', coordinates: [ring] },
  } as unknown as CandidateSite
}

const FIXTURE_CANDIDATES: CandidateSite[] = [
  site('cl-maria-elena', 'Pampa María Elena — sector de screening', 49.99, box(-69.75, -22.45)),
  site('cl-yungay', 'Pampa Yungay — sector de screening', 75.67, box(-70.05, -24.18)),
  site('cl-sin-datos', 'Sector sin datos — sector de screening', null, box(-70.6, -26)),
  site('cl-domeyko', 'Cordón de Domeyko — sector interior', 71.6, box(-68.95, -23.4)),
]

// FIXTURE v3: an Argentine candidate and the known reference (REF), with country and role from the v3 contract.
const V3_CANDIDATES: CandidateSite[] = [
  { ...site('cl-win-a', 'Interior de Antofagasta · A', 94.9, box(-69.8, -25.1)), country: 'CL', role: 'candidate' } as CandidateSite,
  { ...site('ar-win-b', 'Puna de Catamarca y Salta · B', 63.9, box(-67.6, -26.3)), country: 'AR', role: 'candidate' } as CandidateSite,
  { ...site('cl-pampa-yungay-screening', 'Pampa Yungay — sector de screening', 75.67, box(-70.05, -24.18)), country: 'CL', role: 'reference', status: 'reference' } as CandidateSite,
]

/** FIXTURE: synthetic evaluation with the shape of MissionEvaluation (not a scientific result). */
function fixtureEvaluation(options: Array<Pick<OptionEvaluation, 'site_id' | 'status' | 'rank'>>): MissionEvaluation {
  return { options: options.map((option) => ({ ...option, name: option.site_id, role: 'candidate', requirement_results: [], critical_failed: [], critical_unknown: [], preferences: { met: 0, unmet: 0, unknown: 0, total: 0 } })) } as unknown as MissionEvaluation
}

function analog(id: string, name: string, country: string, location: ReferenceAnalog['location']): ReferenceAnalog {
  return { id, name, country, status: 'por_calcular', location, sources: [{ title: 'FIXTURE', url: 'https://example.org/fixture' }] }
}

const FIXTURE_ANALOGS: ReferenceAnalog[] = [
  analog('utah-mdrs', 'MDRS Utah', 'Estados Unidos', { kind: 'approximate_point', lon: -110.79, lat: 38.41, radius_km: 10 }),
  analog('atacama-yungay', 'Atacama (Yungay)', 'Chile', { kind: 'approximate_point', lon: -69.95, lat: -24.08, radius_km: 5 }),
  analog('atacama-desierto', 'Desierto de Atacama', 'Chile', { kind: 'region', bbox: [-71, -25, -68.5, -22] }),
  analog('devon', 'Devon Island', 'Canadá', { kind: 'region', bbox: [-95, 74.5, -80, 77] }),
]

describe('smoothstep and continuous visibility', () => {
  it('is 0 below the first edge, 1 above the second and smooth in between', () => {
    expect(smoothstep(0.05, 0.25, 0)).toBe(0)
    expect(smoothstep(0.05, 0.25, 0.05)).toBe(0)
    expect(smoothstep(0.05, 0.25, 0.15)).toBeCloseTo(0.5, 12)
    expect(smoothstep(0.05, 0.25, 0.25)).toBe(1)
    expect(smoothstep(0.05, 0.25, 1)).toBe(1)
    let previous = 0
    for (let x = 0; x <= 0.3; x += 0.01) {
      expect(smoothstep(0.05, 0.25, x)).toBeGreaterThanOrEqual(previous)
      previous = smoothstep(0.05, 0.25, x)
    }
    expect(smoothstep(0.2, 0.2, 0.1)).toBe(0)
    expect(smoothstep(0.2, 0.2, 0.3)).toBe(1)
  })

  it('markerVisibility usa smoothstep(.05, .25)', () => {
    expect(markerVisibility(0.04)).toBe(0)
    expect(markerVisibility(0.15)).toBeCloseTo(0.5, 12)
    expect(markerVisibility(0.3)).toBe(1)
  })

  it('horizonFacing is 1 under the camera, 0 at the limb and negative behind', () => {
    const radius = 2
    const camera = latLngToVec3(-24, -69.5, 10)
    expect(horizonFacing(latLngToVec3(-24, -69.5, radius), camera, radius)).toBeCloseTo(1, 9)
    // Limb: central angle with cos = r/d.
    const limbAngle = (Math.acos(radius / 10) * 180) / Math.PI
    expect(horizonFacing(latLngToVec3(-24 + limbAngle, -69.5, radius), camera, radius)).toBeCloseTo(0, 6)
    expect(horizonFacing(latLngToVec3(24, 110.5, radius), camera, radius)).toBeLessThan(0)
    expect(markerVisibility(horizonFacing(latLngToVec3(24, 110.5, radius), camera, radius))).toBe(0)
  })
})

describe('buildMarkerModels', () => {
  const models = buildMarkerModels({ candidates: FIXTURE_CANDIDATES, analogs: FIXTURE_ANALOGS, evaluation: null })
  const byId = new Map(models.map((model) => [model.id, model]))

  it('orders ● by rank, ○ at the end of the sectors and ◆ alphabetically', () => {
    expect(models.map((model) => model.id)).toEqual(['cl-yungay', 'cl-domeyko', 'cl-maria-elena', 'cl-sin-datos', 'atacama-desierto', 'devon', 'utah-mdrs'])
    expect(models.map((model) => model.order)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(models.slice(0, 3).map((model) => model.rank)).toEqual([1, 2, 3])
  })

  it('○ = insufficient data: no rank or %', () => {
    expect(byId.get('cl-sin-datos')).toMatchObject({ kind: 'insufficient', rank: null, score: null, scoreSource: null })
  })

  it('a ◆ never carries %, rank or ranking', () => {
    for (const model of models.filter((item) => item.kind === 'reference')) {
      expect(model).toMatchObject({ rank: null, score: null, scoreSource: null, selectionKind: 'reference' })
      expect(markerAriaLabel(model)).not.toMatch(/%|\d+,\d/)
      expect(markerAriaLabel(model)).toContain('not yet calculated')
    }
  })

  it('a cited point inside a sector is a “matches” badge, not its own ◆', () => {
    expect(byId.has('atacama-yungay')).toBe(false)
    expect(byId.get('cl-yungay')?.coincides).toEqual(['Atacama (Yungay)'])
    expect(markerAriaLabel(byId.get('cl-yungay')!)).toContain('matches Atacama (Yungay)')
  })

  it('“contains N sectors” only if the point-in-polygon test backs it', () => {
    // The region covers Yungay, Domeyko and María Elena; the sector without data is left out (−70.6; −26).
    expect(byId.get('atacama-desierto')?.contains).toBe(3)
    expect(markerAriaLabel(byId.get('atacama-desierto')!)).toContain('contains 3 evaluated sectors')
    expect(byId.get('devon')?.contains).toBeNull()
    expect(byId.get('utah-mdrs')?.contains).toBeNull()
  })

  it('v3: candidates with their global rank and country; the REF carries “REF”, never a number', () => {
    const v3 = buildMarkerModels({ candidates: V3_CANDIDATES, analogs: [], evaluation: null })
    expect(v3.map((model) => [model.id, model.rank, model.role, model.group])).toEqual([
      ['cl-win-a', 1, 'candidate', 'Chile'],
      ['ar-win-b', 2, 'candidate', 'Argentina'],
      ['cl-pampa-yungay-screening', null, 'reference', 'Chile'],
    ])
    expect(markerBadgeText(v3[2]!)).toBe('REF')
    expect(markerLabelText(v3[2]!)).toContain('REF')
    expect(markerLabelText(v3[2]!)).not.toMatch(/#\d/)
    expect(markerAriaLabel(v3[2]!)).toContain('known reference, outside the ranking')
    expect(markerAriaLabel(v3[1]!)).toContain('Argentina')
  })

  it('Mission: the marker encodes the evaluation status and its rank, never a %', () => {
    const evaluation = fixtureEvaluation([
      { site_id: 'ar-win-b', status: 'priorizado_para_reconocimiento', rank: 1 },
      { site_id: 'cl-win-a', status: 'no_cumple_requisitos', rank: null },
      { site_id: 'cl-pampa-yungay-screening', status: 'evidencia_insuficiente', rank: null },
    ])
    const mission = buildMarkerModels({ candidates: V3_CANDIDATES, analogs: [], evaluation })
    expect(mission.map((model) => [model.id, model.kind, model.rank, model.score, model.missionStatus])).toEqual([
      ['ar-win-b', 'evaluated', 1, null, 'priorizado_para_reconocimiento'],
      ['cl-win-a', 'evaluated', null, null, 'no_cumple_requisitos'],
      ['cl-pampa-yungay-screening', 'insufficient', null, null, 'evidencia_insuficiente'],
    ])
    for (const model of mission) expect(markerLabelText(model)).not.toMatch(/\d+,\d\s*%/)
    expect(markerAriaLabel(mission[0]!)).toBe('Puna de Catamarca y Salta · B, rank 1, prioritized for reconnaissance, Argentina')
    expect(markerBadgeText(mission[2]!)).toBe('REF')
    // A site that the evaluation did not include is "out of scope".
    const scoped = buildMarkerModels({ candidates: V3_CANDIDATES, analogs: [], evaluation: fixtureEvaluation([{ site_id: 'ar-win-b', status: 'priorizado_para_reconocimiento', rank: 1 }]) })
    expect(scoped.filter((model) => model.missionStatus === 'fuera_de_alcance').map((model) => model.id).sort()).toEqual(['cl-pampa-yungay-screening', 'cl-win-a'])
  })
})

describe('grouping under 36 px', () => {
  const at = (id: string, x: number, y: number, order: number, kind: ScreenMarker['kind'] = 'evaluated', visible = 1, group = 'Chile'): ScreenMarker => ({ id, kind, x, y, visible, order, group })

  it('groups at 35 px and not at 36 px', () => {
    expect(CLUSTER_RADIUS_PX).toBe(36)
    expect(clusterMarkers([at('a', 0, 0, 0), at('b', 35, 0, 1)]).clusters).toHaveLength(1)
    expect(clusterMarkers([at('a', 0, 0, 0), at('b', 36, 0, 1)]).clusters).toHaveLength(0)
  })

  it('counts per type, never averages, and places the group at the centroid', () => {
    const result = clusterMarkers([at('a', 0, 0, 0), at('b', 10, 0, 1), at('c', 0, 20, 2, 'reference', 1, 'Chile'), at('d', 5, 5, 3, 'insufficient')])
    expect(result.clusters).toHaveLength(1)
    const [cluster] = result.clusters
    expect(cluster).toMatchObject({ key: 'a|b|c|d', members: ['a', 'b', 'c', 'd'], counts: { evaluated: 2, insufficient: 1, reference: 1 }, group: 'Chile' })
    expect(cluster?.x).toBeCloseTo(3.75)
    expect(cluster?.y).toBeCloseTo(6.25)
    expect(Object.keys(cluster ?? {})).not.toContain('similarity')
    expect(clusterText(cluster!.counts, cluster!.group)).toBe('Chile · 2 ● · 1 ○ · 1 ◆')
    expect(clusterText(cluster!.counts, cluster!.group)).not.toMatch(/%|\d+,\d/)
  })

  it('the group loses the country if the members do not share it', () => {
    const [cluster] = clusterMarkers([at('a', 0, 0, 0), at('b', 10, 0, 1, 'reference', 1, 'Perú')]).clusters
    expect(cluster?.group).toBe('')
    expect(clusterText(cluster!.counts, '')).toBe('1 ● · 1 ◆')
  })

  it('selection and hover are never grouped; neither is what is hidden behind the globe', () => {
    expect(CLUSTER_MIN_VISIBLE).toBe(HIDDEN_BELOW)
    const markers = [at('a', 0, 0, 0), at('b', 10, 0, 1), at('c', 20, 0, 2), at('d', 5, 0, 3, 'evaluated', 0.01)]
    const result = clusterMarkers(markers, { exclude: ['a', null] })
    expect(result.clusters.map((cluster) => cluster.key)).toEqual(['b|c'])
    expect(result.clustered.has('a')).toBe(false)
    expect(result.clustered.has('d')).toBe(false)
  })

  it('is deterministic: input order does not change the partition', () => {
    const markers = [at('a', 0, 0, 0), at('b', 30, 0, 1), at('c', 60, 0, 2), at('d', 200, 0, 3), at('e', 220, 0, 4)]
    const forward = clusterMarkers(markers)
    const backward = clusterMarkers([...markers].reverse())
    expect(clusterSignature(forward)).toBe(clusterSignature(backward))
    // Seeding by priority: “a” takes “b”; “c” stays alone (60 px from “a”).
    expect(clusterSignature(forward)).toBe('a|b;d|e')
  })

  it('stacks up to 4 glyphs in priority order', () => {
    expect(clusterStack(['evaluated', 'evaluated', 'reference'])).toBe('●●◆')
    expect(clusterStack(['evaluated', 'evaluated', 'evaluated', 'insufficient', 'reference'])).toBe('●●●○')
  })

  it('the accessible label of the group lists the types', () => {
    expect(clusterAriaLabel({ evaluated: 3, insufficient: 0, reference: 1 }, 'Chile', false)).toBe(
      'Group of 4 places in Chile: 3 evaluated, 1 analog not yet calculated. Show list',
    )
  })
})

describe('non-overlapping labels', () => {
  it('a label that would collide with one already placed keeps only its glyph', () => {
    const near: ScreenMarker[] = [
      { id: 'a', kind: 'evaluated', x: 100, y: 100, visible: 1, order: 0, group: '', labelWidth: 160 },
      { id: 'b', kind: 'evaluated', x: 120, y: 110, visible: 1, order: 1, group: '', labelWidth: 160 },
      { id: 'c', kind: 'evaluated', x: 100, y: 140, visible: 1, order: 2, group: '', labelWidth: 160 },
    ]
    expect([...assignLabels(near, { budget: 5, clustered: new Set(), selectedId: null, hoverId: null })]).toEqual(['a', 'c'])
    // The selection is placed first: it is "a" that yields; "c" stays further down and does not collide.
    expect([...assignLabels(near, { budget: 5, clustered: new Set(), selectedId: 'b', hoverId: null })]).toEqual(['b', 'c'])
    expect(estimateLabelWidth('#1  Pampa Yungay  75,7 %')).toBeGreaterThan(150)
  })
})

describe('label budget', () => {
  const marker = (id: string, order: number, visible = 1): ScreenMarker => ({ id, kind: 'reference', x: order * 200, y: 0, visible, order, group: '' })
  const markers = [marker('a', 0), marker('b', 1), marker('c', 2), marker('d', 3, 0.2), marker('e', 4)]

  it('respects the budget, prioritizes selection and hover and skips grouped or nearly hidden items', () => {
    expect([...assignLabels(markers, { budget: 2, clustered: new Set(), selectedId: null, hoverId: null })]).toEqual(['a', 'b'])
    expect([...assignLabels(markers, { budget: 2, clustered: new Set(), selectedId: 'e', hoverId: 'c' })]).toEqual(['e', 'c'])
    expect([...assignLabels(markers, { budget: 5, clustered: new Set(['a']), selectedId: null, hoverId: null })]).toEqual(['b', 'c', 'e'])
  })
})

describe('place ring', () => {
  it('covers the projected polygon and never goes below 14 px', () => {
    expect(ringRadius({ x: 0, y: 0 }, [{ x: 1, y: 1 }])).toBe(RING_MIN_PX)
    expect(ringRadius({ x: 0, y: 0 }, [{ x: 30, y: 40 }, { x: -10, y: 0 }])).toBe(54)
  })
})

describe('group next to the selected place', () => {
  const selected = { x: 500, y: 300, radius: 14 }

  it('within 44 px it moves under the ring and stays compact', () => {
    expect(placeNearSelection({ x: 505, y: 296 }, selected)).toEqual({ x: 500, y: 330, compact: true })
    expect(placeNearSelection({ x: 500 + NEAR_SELECTION_PX - 1, y: 300 }, selected).compact).toBe(true)
  })

  it('far away or without a selection it does not move', () => {
    expect(placeNearSelection({ x: 500 + NEAR_SELECTION_PX, y: 300 }, selected)).toEqual({ x: 544, y: 300, compact: false })
    expect(placeNearSelection({ x: 505, y: 296 }, null)).toEqual({ x: 505, y: 296, compact: false })
  })
})

describe('focus: a covered marker or one nearly on the horizon is not focused (WCAG 2.4.11)', () => {
  const sheet = { left: 0, top: 389, right: 390, bottom: 844 }
  const hud = { left: 8, top: 560, right: 784, bottom: 600 }
  it('the anchor under the sheet or the HUD strip is out of the focus order', () => {
    expect(pinOccluded(153, 400, [sheet])).toBe(true)
    expect(pinOccluded(466, 575, [hud])).toBe(true)
    expect(pinOccluded(195, 245, [sheet, hud])).toBe(false)
  })
  it('visibility < 0.25: out of the focus order even inside the free area', () => {
    expect(pinUnfocusable(195, 245, 0.11, [])).toBe(true)
    expect(pinUnfocusable(195, 245, 0.6, [])).toBe(false)
    expect(pinUnfocusable(195, 400, 0.9, [sheet])).toBe(true)
  })
})
