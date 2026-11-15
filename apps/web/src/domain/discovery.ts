// Roles, filters, and export for the pilot. Pure functions: the web does not decide candidates or scores.
import type {
  CandidateSite, CountryCode, LiteratureStatus, PrecedentCatalog, PrecedentMatch, PrecedentRelation, SearchResults,
} from './contracts'
import { tCommon } from '../i18n/messages/common'
import { localizedRecord } from './localizedLabels'
import { rankCandidates } from './scoring'

export type CountryFilter = 'all' | CountryCode

export const countryLabels: Record<CountryCode, string> = { CL: 'Chile', AR: 'Argentina' }

const LITERATURE_STATUSES: readonly LiteratureStatus[] = [
  'known_reference',
  'known_analogue_overlap',
  'regional_precedent',
  'literature_review_pending',
  'no_match_in_reviewed_sources',
]

/** Labels in the current language (domain/localizedLabels.ts); the exported record keeps the codes. */
export const literatureLabels: Record<LiteratureStatus, string> = localizedRecord(LITERATURE_STATUSES, (code) => tCommon(`literature.${code}`))

const RELATIONS: readonly PrecedentRelation[] = ['contains_published_sampling_coordinate', 'study_area_overlap', 'proximity_heuristic', 'regional_precedent']

export const relationLabels: Record<PrecedentRelation, string> = localizedRecord(RELATIONS, (code) => tCommon(`relation.${code}`))

export const isReference = (candidate: CandidateSite): boolean => candidate.role === 'reference'

/** Search candidates (sorted) and known references, which never enter the ranking. */
export function splitByRole(candidates: readonly CandidateSite[]): { ranked: CandidateSite[]; references: CandidateSite[] } {
  return {
    ranked: rankCandidates(candidates.filter((candidate) => !isReference(candidate))),
    references: candidates.filter(isReference),
  }
}

/** Global rank 1..n of each already-sorted candidate; references have no rank. */
export function rankMap(ranked: readonly CandidateSite[]): Map<string, number> {
  return new Map(ranked.map((candidate, index) => [candidate.site_id, index + 1]))
}

export function filterByCountry(candidates: readonly CandidateSite[], country: CountryFilter): CandidateSite[] {
  return country === 'all' ? [...candidates] : candidates.filter((candidate) => candidate.country === country)
}

/** Countries present, so the filter is offered only when the snapshot declares them. */
export function availableCountries(candidates: readonly CandidateSite[]): CountryCode[] {
  return (['CL', 'AR'] as const).filter((code) => candidates.some((candidate) => candidate.country === code))
}

/** The first selected item is a candidate; a reference is shown only if there are none. */
export function initialSelection(candidates: readonly CandidateSite[]): string {
  const { ranked, references } = splitByRole(candidates)
  return (ranked[0] ?? references[0])?.site_id ?? ''
}

export interface SearchSummary {
  regions: number
  attempted: number
  evaluated: number
  selected: number
  excludedByPrecedent: number
  failed: number
  exploredAreaKm2: number
  minDistanceKm: number
  maxPerCountry: number
}

export function summarizeSearch(search: SearchResults): SearchSummary {
  const count = (key: string) => search.counts[key] ?? 0
  return {
    regions: search.regions.length,
    attempted: count('attempted'),
    evaluated: count('evaluated'),
    selected: count('selected'),
    excludedByPrecedent: count('rejected_precedent_overlap'),
    failed: count('evaluation_failed'),
    exploredAreaKm2: search.explored_area_km2,
    minDistanceKm: search.selection.min_center_distance_km,
    maxPerCountry: search.selection.max_per_country,
  }
}

export interface MatchDetail extends PrecedentMatch {
  name: string
  spatialPrecision: string
  sourceTitle: string
  sourceUrl: string
}

/** Joins each match with its catalog precedent to show name, precision, and source. */
export function matchDetails(candidate: CandidateSite, catalog: PrecedentCatalog | null): MatchDetail[] {
  const byId = new Map((catalog?.precedents ?? []).map((precedent) => [precedent.precedent_id, precedent]))
  return (candidate.literature_review?.matches ?? []).flatMap((match) => {
    const precedent = byId.get(match.precedent_id)
    return precedent
      ? [{ ...match, name: precedent.name, spatialPrecision: precedent.spatial_precision,
           sourceTitle: precedent.sources[0].title, sourceUrl: precedent.sources[0].url }]
      : []
  })
}

/** Exportable record: keeps role, origin, and bibliographic review, and adds the search scope. */
export function buildExport(candidate: CandidateSite, search: SearchResults | null) {
  return {
    exported_from: 'AnalogOS',
    notice: 'Preliminary screening: it does not approve the site, authorize access or declare novelty. The site object is the source record from the snapshot, kept in its original wording (mostly Spanish).',
    site: candidate,
    search_context: search && {
      search_id: search.search_id,
      scope_note: search.scope_note,
      regions: search.regions,
      counts: search.counts,
      explored_area_km2: search.explored_area_km2,
      selection: search.selection,
      shortlist: search.shortlist,
    },
  }
}
