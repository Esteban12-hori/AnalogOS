// Roles, filtros y exportación del piloto. Funciones puras: la web no decide candidatos ni scores.
import type {
  CandidateSite, CountryCode, LiteratureStatus, PrecedentCatalog, PrecedentMatch, PrecedentRelation, SearchResults,
} from './contracts'
import { rankCandidates } from './scoring'

export type CountryFilter = 'all' | CountryCode

export const countryLabels: Record<CountryCode, string> = { CL: 'Chile', AR: 'Argentina' }

export const literatureLabels: Record<LiteratureStatus, string> = {
  known_reference: 'Referencia conocida',
  known_analogue_overlap: 'Contiene antecedentes publicados',
  regional_precedent: 'Región con antecedentes publicados',
  literature_review_pending: 'Revisión bibliográfica pendiente',
  no_match_in_reviewed_sources: 'Sin coincidencias en las fuentes revisadas',
}

export const relationLabels: Record<PrecedentRelation, string> = {
  contains_published_sampling_coordinate: 'La ventana contiene coordenadas de muestreo publicadas',
  study_area_overlap: 'Se superpone a un área de estudio publicada',
  proximity_heuristic: 'Cercanía a una coordenada publicada (heurística de 25 km, no perímetro del estudio)',
  regional_precedent: 'Antecedente regional, sin coordenadas en las fuentes revisadas',
}

export const isReference = (candidate: CandidateSite): boolean => candidate.role === 'reference'

/** Candidatos de la búsqueda (ordenados) y referencias conocidas, que nunca entran al ranking. */
export function splitByRole(candidates: readonly CandidateSite[]): { ranked: CandidateSite[]; references: CandidateSite[] } {
  return {
    ranked: rankCandidates(candidates.filter((candidate) => !isReference(candidate))),
    references: candidates.filter(isReference),
  }
}

export function filterByCountry(candidates: readonly CandidateSite[], country: CountryFilter): CandidateSite[] {
  return country === 'all' ? [...candidates] : candidates.filter((candidate) => candidate.country === country)
}

/** Países presentes, para ofrecer el filtro solo cuando el snapshot los declara. */
export function availableCountries(candidates: readonly CandidateSite[]): CountryCode[] {
  return (['CL', 'AR'] as const).filter((code) => candidates.some((candidate) => candidate.country === code))
}

/** El primer seleccionado es un candidato; solo si no hay ninguno se muestra una referencia. */
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

/** Une cada coincidencia con su antecedente del catálogo para mostrar nombre, precisión y fuente. */
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

/** Ficha exportable: conserva rol, origen y revisión bibliográfica, y añade el alcance de la búsqueda. */
export function buildExport(candidate: CandidateSite, search: SearchResults | null) {
  return {
    exported_from: 'AnalogOS',
    notice: 'Screening preliminar: no aprueba el sitio, no autoriza acceso y no declara novedad.',
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
