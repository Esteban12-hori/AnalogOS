// Shared formatting for the confirmation summary, results and printed report (UI).
// Presentation only: JSON values keep their canonical unit and exact number. Nothing is rounded or given extra
// precision (the shortest representation of each number is used), and the output is identical in Node and in the
// browser (no Intl). The UI uses the English pack; deterministic records use the pack of their own version
// (shared/mission/text), so the frozen 1.0.0 Spanish formatters stay bound to historical reconstruction.
//
// Interface language (ADR-017): the functions take an optional language or pack (English by default, byte-identical
// to the English output above). With the frozen Spanish pack (or 'es') the Spanish interface SHOWS the same structured
// data with the Spanish formatters and the wording the product used before ADR-016 (git 273e5f8). The Spanish pack is
// passed by the caller (apps/web/src/mission/pack.ts) so that this module, which the main chunk loads, does not carry
// it. Never use the Spanish variants to build a record.
import type { Requirement, ScopeResolution, WindowRelation } from './types'
import { EN_TEXT } from './text/en'
import type { MissionText } from './text/types'
export { IMPORTANCE_LABEL, SCALE_LABEL, describeCondition, describeEffective, fmtNumber, fmtObserved, fmtQuantity } from './text/en'

/** Interface language of the UI formatting (records never depend on it). */
export type UiLang = 'en' | 'es'

interface FormatWords {
  notMeasured: string
  relation: Record<WindowRelation, string>
  scopeState: Record<string, string>
  box: (w: string, s: string, e: string, n: string) => string
  catalog: string
  point: (lon: string, lat: string) => string
  bbox: (box: string, area: string) => string
  bboxArea: (area: string) => string
  none: string
  measured: (name: string, box: string, area: string) => string
  noMeasured: string
  covers: (percent: number) => string
}

const WORDS: Record<UiLang, FormatWords> = {
  en: {
    notMeasured: 'not measured',
    relation: {
      identical: 'matches the window',
      contains_point: 'contains the point',
      contains_bbox: 'contains your rectangle',
      overlaps_bbox: 'partially overlaps',
      inside_bbox: 'lies inside your rectangle',
    },
    scopeState: {
      covered: 'Geometry with evidence',
      window_selected: 'Full window chosen by you (different from the request)',
      needs_window_selection: 'Window not chosen yet',
      partial_coverage: 'Partial coverage',
      no_coverage: 'No coverage',
    },
    box: (w, s, e, n) => `west ${w}, south ${s}, east ${e}, north ${n}`,
    catalog: 'The seven snapshot windows with evidence (comparison).',
    point: (lon, lat) => `Point: longitude ${lon}, latitude ${lat} (decimal degrees, WGS84).`,
    bbox: (box, area) => `Rectangle: ${box} (degrees, WGS84)${area}.`,
    bboxArea: (area) => `; approximate area ${area} km²`,
    none: 'No geometry.',
    measured: (name, box, area) => `${name}: ${box}; polygon extent ≈ ${area} km² (not free surface).`,
    noMeasured: 'No measured geometry: no metric was assigned to the request.',
    covers: (percent) => ` · covers ${percent}% of the request`,
  },
  es: {
    notMeasured: 'sin medición',
    relation: {
      identical: 'coincide con la ventana',
      contains_point: 'contiene el punto',
      contains_bbox: 'contiene su rectángulo',
      overlaps_bbox: 'se superpone parcialmente',
      inside_bbox: 'está dentro de su rectángulo',
    },
    scopeState: {
      covered: 'Geometría con evidencia',
      window_selected: 'Ventana completa elegida por usted (distinta de lo pedido)',
      needs_window_selection: 'Falta elegir la ventana',
      partial_coverage: 'Cobertura parcial',
      no_coverage: 'Sin cobertura',
    },
    box: (w, s, e, n) => `oeste ${w}, sur ${s}, este ${e}, norte ${n}`,
    catalog: 'Las siete ventanas con evidencia del snapshot (comparación).',
    point: (lon, lat) => `Punto: longitud ${lon}, latitud ${lat} (grados decimales, WGS84).`,
    bbox: (box, area) => `Rectángulo: ${box} (grados, WGS84)${area}.`,
    bboxArea: (area) => `; área aproximada ${area} km²`,
    none: 'Sin geometría.',
    measured: (name, box, area) => `${name}: ${box}; extensión del polígono ≈ ${area} km² (no es superficie libre).`,
    noMeasured: 'Sin geometría medida: no se asignó ninguna métrica a lo pedido.',
    covers: (percent) => ` · cubre ${percent} % de lo pedido`,
  },
}

/** “Label: effective condition (importance)” with the pack of the interface language. */
export const describeRequirementLine = (r: Requirement, pack: MissionText = EN_TEXT): string => {
  const words = WORDS[pack.lang]
  return `${r.label}: ${r.kind === 'unmeasured' ? `${words.notMeasured}${r.detail ? ` — ${r.detail}` : ''}` : pack.describeEffective(r)} (${pack.importanceLabel[r.importance]})`
}

export const RELATION_LABEL: Record<WindowRelation, string> = WORDS.en.relation

/** Relation between a window and the requested geometry, in the language of the interface. */
export const relationLabel = (relation: WindowRelation, lang: UiLang = 'en'): string => WORDS[lang].relation[relation]

export const SCOPE_STATE_LABEL: Record<string, string> = WORDS.en.scopeState

/** Scope state label in the language of the interface (unknown states are shown as their code). */
export const scopeStateLabel = (state: string, lang: UiLang = 'en'): string => WORDS[lang].scopeState[state] ?? state

export interface ScopeLines {
  requested: string
  state: string
  measured: string[]
  matches: string[]
}

/** Requested vs measured geometry as explicit text (self-contained as an analysis request), with the pack of the language. */
export function describeScope(res: ScopeResolution, nameOf: (siteId: string) => string, pack: MissionText = EN_TEXT): ScopeLines {
  const words = WORDS[pack.lang]
  const num = pack.fmtNumber
  const coord = (x: number): string => num(Number(x.toFixed(6)))
  const boxText = (b: [number, number, number, number]): string => words.box(coord(b[0]), coord(b[1]), coord(b[2]), coord(b[3]))
  const r = res.requested
  const requested =
    res.mode === 'catalog' ? words.catalog
    : r.point ? words.point(coord(r.point[0]), coord(r.point[1]))
    : r.bbox ? words.bbox(boxText(r.bbox), r.approx_area_km2 !== null ? words.bboxArea(num(r.approx_area_km2)) : '')
    : words.none
  const measured = res.measured.length
    ? res.measured.map((m) => words.measured(nameOf(m.site_id), boxText(m.bbox), num(m.area_km2)))
    : [words.noMeasured]
  const matches = res.matches.map((m) => `${nameOf(m.site_id)} · ${words.relation[m.relation]}${m.request_covered_fraction !== null ? words.covers(Math.round(m.request_covered_fraction * 100)) : ''}`)
  return { requested, state: words.scopeState[res.state] ?? res.state, measured, matches }
}
