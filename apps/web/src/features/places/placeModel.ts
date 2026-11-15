/**
 * Pure model of the places carousel (docs/UX_REDESIGN.md §3.5, §1 #16; ADR-008, ADR-013).
 * No React or DOM.
 *
 * - Explore: first the search candidates at their GLOBAL rank (`splitByRole`; a country filter
 *   keeps that rank), then the known reference (REF, never with a rank) and finally
 *   the ◆ of the world catalog (alphabetical, no %, no ranking).
 * - Mission with evaluation: groups by the state of `MissionEvaluation` (team engine); the
 *   rank is that of the evaluation (prioritized only) and the similarity is that of the v3 snapshot, without
 *   recalculating. Sites that the evaluation did not include are "out of scope".
 * - A ◆ cited as a point that falls inside a sector is a "coincides with" badge on that ●.
 *   That classification (geometry) lives in classify.ts, which is loaded lazily with the catalog.
 */
import type { CandidateSite, CountryCode, ReferenceAnalog } from '../../domain/contracts'
import { availableCountries, filterByCountry, rankMap, splitByRole, type CountryFilter } from '../../domain/discovery'
import { shortCandidateName } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, MISSION_STATUS_ORDER, missionOrder, missionSiteViews, type MissionSiteView, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { getLocale, type Locale } from '../../i18n/core'
import { tCommon } from '../../i18n/messages/common'
import { tPlaces } from '../../i18n/messages/places'
import { scienceText } from '../../i18n/science'

export type ScoreSource = 'snapshot' | 'mission'

export interface EvaluatedPlace {
  kind: 'evaluated'
  id: string
  candidate: CandidateSite
  /** Search candidate or known reference (REF: never with a rank). */
  role: 'candidate' | 'reference'
  country: CountryCode | null
  /** 0–100 similarity from the v3 snapshot, without recalculating; null = no %. */
  similarity: number | null
  status: 'scored' | 'insufficient_data'
  /** Explore: global rank among candidates. Mission: rank in the evaluation (prioritized only). */
  rank: number | null
  /** Snapshot confidence. */
  confidence: number | null
  /** ◆ cited as a point that fall inside the polygon of this sector (§1 #16). */
  coincident: readonly ReferenceAnalog[]
  /** State in the Mission evaluation; null in Explore or without evaluation. */
  mission: MissionSiteView | null
}

export interface ReferencePlace {
  kind: 'reference'
  id: string
  analog: ReferenceAnalog
  /** Sectors with all their vertices inside the cited region (always empty for a point). */
  containsSectorIds: readonly string[]
}

export type Place = EvaluatedPlace | ReferencePlace

export interface PlaceGroup {
  key: string
  label: string
  /** Mission state of the group (for styling); null in Explore. */
  status: SiteMissionStatus | null
  role: 'candidate' | 'reference' | null
  places: readonly EvaluatedPlace[]
}

export interface PlaceModel {
  source: ScoreSource
  /** Evaluated sectors in visual order (the groups, flattened). */
  evaluated: readonly EvaluatedPlace[]
  groups: readonly PlaceGroup[]
  references: readonly ReferencePlace[]
  /** Search candidates with a rank: the "of 6" in "#2 of 6" (never counts the REF). */
  rankedCount: number
  /** ◆ of the catalog that are shown as a badge on a ● instead of their own card. */
  coincidentCount: number
  /** Countries with candidates (filter only if there is more than one). */
  countries: readonly CountryCode[]
  country: CountryFilter
}

/** Result of the rule §1 #16 (classify.ts). */
export interface ReferenceClassification {
  /** site_id → ◆ that coincide with that sector. */
  badges: ReadonlyMap<string, readonly ReferenceAnalog[]>
  /** ◆ with their own card, in alphabetical order. */
  references: readonly ReferencePlace[]
}

/** Without catalog (or while loading): no ◆. */
export const NO_REFERENCES: ReferenceClassification = Object.freeze({ badges: new Map(), references: [] })

export interface PlaceModelInput {
  candidates: readonly CandidateSite[]
  /** ◆ already classified (`classifyReferences`); absent = no ◆. */
  classification?: ReferenceClassification
  /** Mission evaluation; null or absent = Explore (snapshot order). */
  evaluation?: MissionEvaluation | null
  /** Explore country filter (keeps the global rank). */
  country?: CountryFilter
  /** Language of the group labels (UI only: order, ranks and statuses never depend on it). Default: the current one. */
  locale?: Locale
}

export function buildPlaceModel({ candidates, classification = NO_REFERENCES, evaluation = null, country = 'all', locale = getLocale() }: PlaceModelInput): PlaceModel {
  const t = tPlaces.in(locale)
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
      // Without % there is no rank; the REF never has one; in Mission, that of the evaluation.
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
      return list.length ? [{ key: status, label: missionStatusLabel(status, locale), status, role: null, places: list }] : []
    })
  } else {
    const shown = country === 'all' ? ranked : filterByCountry(ranked, country)
    groups = [{ key: 'candidates', label: t('group.candidates'), status: null, role: 'candidate', places: shown.map(place) }]
    if (known.length) groups.push({ key: 'reference', label: t('group.reference'), status: null, role: 'reference', places: known.map(place) })
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

/** Mission status label in a fixed language (the code is never translated). */
function missionStatusLabel(status: SiteMissionStatus, locale: Locale): string {
  return locale === getLocale() ? MISSION_STATUS_LABEL[status] : tCommon.in(locale)(`missionStatus.${status}`)
}

/** Short name of the sector ("Pampa Yungay", without "— screening sector"). */
export function placeName(name: string, locale: Locale = getLocale()): string {
  return shortCandidateName(name, locale).split(' — ')[0] ?? name
}

/** Visible name of an option (also for type-ahead search), in the interface language. */
export function placeLabelOf(place: Place, locale: Locale = getLocale()): string {
  return place.kind === 'evaluated' ? placeName(place.candidate.name, locale) : scienceText(place.analog.name, locale)
}

/** Listbox options in visual order: first the ● (by group), then the ◆. */
export function placeOrder(model: PlaceModel): readonly Place[] {
  return [...model.evaluated, ...model.references]
}

// ---------------------------------------------------------------------------------------------
// Keyboard (APG listbox pattern): arrows, Home/End and search by the first letters.
// ---------------------------------------------------------------------------------------------

/** Next index for a navigation key; null if the key does not navigate. Does not wrap around. */
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
 * Type-ahead search: a single letter jumps to the NEXT option that starts with it;
 * several letters in a row search from the current option. null if nothing matches.
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
 * Options visible at least 60 % within the window [scroll, scroll + viewport].
 * Takes the geometry of each option along the carousel axis; returns null if there are none.
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

/** "1–4 of 11" (or "3 of 11" if only one fits) / "1–4 de 11". */
export function rangeLabel(range: { first: number; last: number } | null, total: number, locale: Locale = getLocale()): string {
  const t = tPlaces.in(locale)
  if (!range || total === 0) return t('count.places', { count: total })
  return range.first === range.last
    ? t('count.one', { position: range.first + 1, total })
    : t('count.range', { first: range.first + 1, last: range.last + 1, total })
}
