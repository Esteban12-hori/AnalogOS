/**
 * Modelo puro del carrusel de lugares (docs/UX_REDESIGN.md §3.5, §1 #16; ADR-008, ADR-013).
 * Sin React ni DOM.
 *
 * - Explorar: primero los candidatos de la búsqueda en su puesto GLOBAL (`splitByRole`; un filtro
 *   por país conserva ese puesto), después la referencia conocida (REF, nunca con puesto) y al
 *   final los ◆ del catálogo mundial (alfabéticos, sin %, sin ranking).
 * - Misión con evaluación: grupos por el estado de `MissionEvaluation` (motor del equipo); el
 *   puesto es el de la evaluación (solo priorizados) y la similitud es la del snapshot v3, sin
 *   recalcular. Los sitios que la evaluación no incluyó quedan «fuera del alcance».
 * - Un ◆ citado como punto que cae dentro de un sector es una insignia «coincide con» sobre ese ●.
 *   Esa clasificación (geometría) vive en classify.ts, que se carga diferida con el catálogo.
 */
import type { CandidateSite, CountryCode, ReferenceAnalog } from '../../domain/contracts'
import { availableCountries, filterByCountry, rankMap, splitByRole, type CountryFilter } from '../../domain/discovery'
import { shortCandidateName } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, MISSION_STATUS_ORDER, missionOrder, missionSiteViews, type MissionSiteView, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'

export type ScoreSource = 'snapshot' | 'mission'

export interface EvaluatedPlace {
  kind: 'evaluated'
  id: string
  candidate: CandidateSite
  /** Candidato de la búsqueda o referencia conocida (REF: nunca con puesto). */
  role: 'candidate' | 'reference'
  country: CountryCode | null
  /** Similitud 0–100 del snapshot v3, sin recalcular; null = sin %. */
  similarity: number | null
  status: 'scored' | 'insufficient_data'
  /** Explorar: puesto global entre candidatos. Misión: puesto de la evaluación (solo priorizados). */
  rank: number | null
  /** Confianza del snapshot. */
  confidence: number | null
  /** ◆ citados como punto que caen dentro del polígono de este sector (§1 #16). */
  coincident: readonly ReferenceAnalog[]
  /** Estado en la evaluación de Misión; null en Explorar o sin evaluación. */
  mission: MissionSiteView | null
}

export interface ReferencePlace {
  kind: 'reference'
  id: string
  analog: ReferenceAnalog
  /** Sectores con todos sus vértices dentro de la región citada (siempre vacío para un punto). */
  containsSectorIds: readonly string[]
}

export type Place = EvaluatedPlace | ReferencePlace

export interface PlaceGroup {
  key: string
  label: string
  /** Estado de Misión del grupo (para el estilo); null en Explorar. */
  status: SiteMissionStatus | null
  role: 'candidate' | 'reference' | null
  places: readonly EvaluatedPlace[]
}

export interface PlaceModel {
  source: ScoreSource
  /** Sectores evaluados en orden visual (los grupos, aplanados). */
  evaluated: readonly EvaluatedPlace[]
  groups: readonly PlaceGroup[]
  references: readonly ReferencePlace[]
  /** Candidatos de la búsqueda con puesto: el «de 6» de «#2 de 6» (nunca cuenta la REF). */
  rankedCount: number
  /** ◆ del catálogo que se muestran como insignia sobre un ● en vez de tarjeta propia. */
  coincidentCount: number
  /** Países con candidatos (filtro solo si hay más de uno). */
  countries: readonly CountryCode[]
  country: CountryFilter
}

/** Resultado de la regla §1 #16 (classify.ts). */
export interface ReferenceClassification {
  /** site_id → ◆ que coinciden con ese sector. */
  badges: ReadonlyMap<string, readonly ReferenceAnalog[]>
  /** ◆ con tarjeta propia, en orden alfabético. */
  references: readonly ReferencePlace[]
}

/** Sin catálogo (o mientras carga): ningún ◆. */
export const NO_REFERENCES: ReferenceClassification = Object.freeze({ badges: new Map(), references: [] })

export interface PlaceModelInput {
  candidates: readonly CandidateSite[]
  /** ◆ ya clasificados (`classifyReferences`); ausente = sin ◆. */
  classification?: ReferenceClassification
  /** Evaluación de Misión; null o ausente = Explorar (orden del snapshot). */
  evaluation?: MissionEvaluation | null
  /** Filtro por país de Explorar (conserva el puesto global). */
  country?: CountryFilter
}

export function buildPlaceModel({ candidates, classification = NO_REFERENCES, evaluation = null, country = 'all' }: PlaceModelInput): PlaceModel {
  const { badges, references } = classification
  const { ranked, references: known } = splitByRole(candidates)
  const ranks = rankMap(ranked)
  const countries = availableCountries(ranked)
  const views = missionSiteViews(evaluation, candidates.map((candidate) => candidate.site_id))

  const place = (candidate: CandidateSite): EvaluatedPlace => {
    const role = candidate.role === 'reference' ? 'reference' : 'candidate'
    const view = views.get(candidate.site_id) ?? null
    return {
      kind: 'evaluated',
      id: candidate.site_id,
      candidate,
      role,
      country: candidate.country ?? null,
      similarity: candidate.similarity,
      status: candidate.similarity === null ? 'insufficient_data' : 'scored',
      // Sin % no hay puesto; la REF nunca lo tiene; en Misión, el de la evaluación.
      rank: view ? view.rank : role === 'reference' || candidate.similarity === null ? null : ranks.get(candidate.site_id) ?? null,
      confidence: candidate.confidence,
      coincident: badges.get(candidate.site_id) ?? [],
      mission: view,
    }
  }

  let groups: PlaceGroup[]
  if (evaluation) {
    const byId = new Map(candidates.map((candidate) => [candidate.site_id, candidate]))
    const ordered = missionOrder(evaluation, candidates.map((candidate) => candidate.site_id)).map((id) => place(byId.get(id)!))
    groups = MISSION_STATUS_ORDER.flatMap((status) => {
      const list = ordered.filter((item) => item.mission?.status === status)
      return list.length ? [{ key: status, label: MISSION_STATUS_LABEL[status], status, role: null, places: list }] : []
    })
  } else {
    const shown = country === 'all' ? ranked : filterByCountry(ranked, country)
    groups = [{ key: 'candidates', label: 'Candidatos de la búsqueda', status: null, role: 'candidate', places: shown.map(place) }]
    if (known.length) groups.push({ key: 'reference', label: 'Referencia conocida · no sale de la búsqueda', status: null, role: 'reference', places: known.map(place) })
  }

  return {
    source: evaluation ? 'mission' : 'snapshot',
    evaluated: groups.flatMap((group) => group.places),
    groups,
    references,
    rankedCount: ranked.length,
    coincidentCount: new Set([...badges.values()].flat().map((analog) => analog.id)).size,
    countries,
    country: evaluation ? 'all' : country,
  }
}

/** Nombre corto del sector («Pampa Yungay», sin «— sector de screening»). */
export function placeName(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}

/** Nombre visible de una opción (también para la búsqueda por escritura). */
export function placeLabelOf(place: Place): string {
  return place.kind === 'evaluated' ? placeName(place.candidate.name) : place.analog.name
}

/** Opciones del listbox en orden visual: primero los ● (por grupo), luego los ◆. */
export function placeOrder(model: PlaceModel): readonly Place[] {
  return [...model.evaluated, ...model.references]
}

// ---------------------------------------------------------------------------------------------
// Teclado (patrón APG de listbox): flechas, Inicio/Fin y búsqueda por las primeras letras.
// ---------------------------------------------------------------------------------------------

/** Índice siguiente para una tecla de navegación; null si la tecla no navega. No da la vuelta. */
export function nextOptionIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(count - 1, index + 1)
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, index - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Búsqueda por escritura: una sola letra salta a la SIGUIENTE opción que empieza con ella;
 * varias letras seguidas buscan desde la opción actual. null si nada coincide.
 */
export function typeaheadIndex(labels: readonly string[], query: string, current: number): number | null {
  const needle = fold(query)
  if (!needle || labels.length === 0) return null
  const start = needle.length === 1 ? current + 1 : current
  for (let step = 0; step < labels.length; step += 1) {
    const index = (((start + step) % labels.length) + labels.length) % labels.length
    if (fold(labels[index] ?? '').startsWith(needle)) return index
  }
  return null
}

/**
 * Opciones visibles al menos en un 60 % dentro de la ventana [scroll, scroll + viewport].
 * Entra la geometría de cada opción a lo largo del eje del carrusel; devuelve null si no hay.
 */
export function visibleRange(
  boxes: ReadonlyArray<{ start: number; size: number }>,
  scroll: number,
  viewport: number,
): { first: number; last: number } | null {
  let first = -1
  let last = -1
  boxes.forEach(({ start, size }, index) => {
    const shown = Math.min(start + size, scroll + viewport) - Math.max(start, scroll)
    if (size > 0 && shown >= size * 0.6) {
      if (first < 0) first = index
      last = index
    }
  })
  return first < 0 ? null : { first, last }
}

/** «1–4 de 11» (o «3 de 11» si solo cabe una). */
export function rangeLabel(range: { first: number; last: number } | null, total: number): string {
  if (!range || total === 0) return `${total} lugares`
  return range.first === range.last ? `${range.first + 1} de ${total}` : `${range.first + 1}–${range.last + 1} de ${total}`
}
