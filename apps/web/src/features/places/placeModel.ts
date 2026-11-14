/**
 * Modelo puro del carrusel de lugares (docs/UX_REDESIGN.md §3.5 y §1 #16). Sin React ni DOM.
 *
 * - Sectores evaluados (●): orden de `rankCandidates` (similitud descendente, nulos al final,
 *   empate por site_id). En Misión, con `MissionScoring`, la similitud es la del motor.
 * - Emblemáticos (◆): orden alfabético, sin %, sin ranking y sin confianza: el contrato no los trae.
 * - Un ◆ citado como punto que cae dentro de un sector es una insignia «coincide con» sobre ese ●.
 *   Esa clasificación (geometría) vive en classify.ts, que se carga diferida con el catálogo.
 */
import type { CandidateSite, ReferenceAnalog } from '../../domain/contracts'
import { shortCandidateName } from '../../domain/formatting'
import { rankCandidates } from '../../domain/scoring'
import type { MissionScoring, ScoredSite } from '../engine'

export type ScoreSource = 'snapshot' | 'mission'

export interface EvaluatedPlace {
  kind: 'evaluated'
  id: string
  candidate: CandidateSite
  /** 0–100 del snapshot (perfil base) o del motor (perfil de misión); null = sin %. */
  similarity: number | null
  status: ScoredSite['status']
  /** Posición 1..n entre los que tienen similitud; null sin similitud. */
  rank: number | null
  /** Confianza del snapshot; con perfil de misión, la del motor (null = por calcular). */
  confidence: number | null
  /** ◆ citados como punto que caen dentro del polígono de este sector (§1 #16). */
  coincident: readonly ReferenceAnalog[]
}

export interface ReferencePlace {
  kind: 'reference'
  id: string
  analog: ReferenceAnalog
  /** Sectores con todos sus vértices dentro de la región citada (siempre vacío para un punto). */
  containsSectorIds: readonly string[]
}

export type Place = EvaluatedPlace | ReferencePlace

export interface PlaceModel {
  source: ScoreSource
  evaluated: readonly EvaluatedPlace[]
  references: readonly ReferencePlace[]
  /** Sectores con similitud: el «de 3» de «#1 de 3». */
  rankedCount: number
  /** ◆ del catálogo que se muestran como insignia sobre un ● en vez de tarjeta propia. */
  coincidentCount: number
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
  /** Resultado del motor de misión; null o ausente = % del snapshot. */
  scoring?: MissionScoring | null
}

export function buildPlaceModel({ candidates, classification = NO_REFERENCES, scoring = null }: PlaceModelInput): PlaceModel {
  const scored = scoring ? new Map(scoring.sites.map((site) => [site.siteId, site])) : null
  const original = new Map(candidates.map((candidate) => [candidate.site_id, candidate]))
  // rankCandidates sobre la similitud efectiva: el mismo orden estable en Explorar y en Misión.
  const ordered = rankCandidates(scored ? candidates.map((candidate) => ({ ...candidate, similarity: scored.get(candidate.site_id)?.similarity ?? null })) : candidates)
  const { badges, references } = classification
  let rank = 0
  const evaluated = ordered.map((effective): EvaluatedPlace => {
    const site = scored?.get(effective.site_id)
    const similarity = effective.similarity
    const declared: ScoredSite['status'] = scored ? site?.status ?? 'por_calcular' : 'scored'
    return {
      kind: 'evaluated',
      id: effective.site_id,
      candidate: original.get(effective.site_id) ?? effective,
      similarity,
      status: similarity === null && declared === 'scored' ? 'insufficient_data' : declared,
      rank: similarity === null ? null : ++rank,
      confidence: scored ? site?.confidence ?? null : effective.confidence,
      coincident: badges.get(effective.site_id) ?? [],
    }
  })
  return {
    source: scored ? 'mission' : 'snapshot',
    evaluated,
    references,
    rankedCount: rank,
    coincidentCount: new Set([...badges.values()].flat().map((analog) => analog.id)).size,
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

/** Opciones del listbox en orden visual: primero los ●, luego los ◆. */
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
