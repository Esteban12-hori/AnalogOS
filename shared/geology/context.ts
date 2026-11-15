// Shared core (M10): imported by the web app (re-export) and the Node function without depending on the web's ESM package.
// Official geological context per sector (M9). Optional, validated, read-only loading: the web app NEVER calls
// SERNAGEOMIN, MMA or SIGAM; it only reads the package bundled by the pipeline. It describes which units are
// mapped and which part of the sector has no coverage; it does not express suitability, confidence or score.
//
// Validation mirrors the semantics of pipelines/geology_contract.py (JSON Schema contract + exact geometry,
// area closure, recomputed status, per-sector provenance). There is no cryptography in the browser: the SHA-256
// of the candidates file and the request_id (SHA-256 of method+URL) are verified by the pipeline and the packager.
import { type ErrorObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import contextSchema from '../../contracts/geology-context.schema.json'
import exportSchema from '../../contracts/geology-export.schema.json'
import type { CandidateSite } from '../domain/contracts'
import {
  DEFAULT_GEOLOGY_EXPORT_VERSION, geologyText, isGeologyTextVersion, type GeologyTextVersion,
} from './text'

export type GeologyAvailability = 'available' | 'partial' | 'no_coverage' | 'unavailable'

export interface GeologyFractions {
  unmapped: number
  covered_unambiguous: number
  covered_ambiguous: number
  unusable_upper_bound: number
  covered_total: number
  covered_by_units_without_description: number
}

export interface GeologyUnit {
  unit_id: string
  identity: Record<string, string>
  code: string | null
  name: string | null
  description: string | null
  description_present: boolean
  sheet: string | null
  fraction_including_overlap: number
  fraction_unambiguous: number
  fraction_in_ambiguity: number
  source_features: { feature_id: string; properties: Record<string, unknown> }[]
}

export interface GeologyDiagnostic {
  feature_id: string
  validity_reason: string
  method: string
  status: 'accepted' | 'accepted_no_positive_intersection' | 'rejected'
  rejection_reasons?: string[]
  limitation?: string
  total_area_relative_change?: number | null
  symmetric_difference_relative_to_entity?: number
  symmetric_difference_fraction_of_aoi?: number
}

export interface GeologyRequest {
  request_id: string
  role: 'chile_catalog_metadata' | 'chile_layer' | 'argentina_wfs'
  method: 'GET'
  url: string
  response_sha256: string
  bytes: number
  http_status: 200
  content_type: string | null
  acquired_at: string
  site_id?: string
  number_matched?: number
  number_returned?: number
  actual_format?: string
  member_sha256?: string
}

export interface GeologySource {
  source_id: string
  country: 'CL' | 'AR'
  authority_original: string
  distributor: string
  dataset_name: string
  dataset_url: string
  layer: string
  scale_denominator: number
  crs_declared: string
  license: { name: string; declared_id: string | null; url: string; declared_by: string; scope: string }
  attribution: string
  map_date: string | null
  map_date_note: string
  catalog_modified_at: string | null
  requests: GeologyRequest[]
  transformations: string[]
  limitations: string[]
}

export interface GeologySite {
  site_id: string
  name: string
  country: 'CL' | 'AR'
  geometry: CandidateSite['geometry']
  aoi_area_km2: number
  source_id: string
  request_ids: string[]
  availability: GeologyAvailability
  area_fractions: GeologyFractions
  feature_counts: Record<'bbox_candidates' | 'positive_area' | 'no_positive_intersection' | 'invalid_geometry' | 'repaired_accepted' | 'rejected', number>
  units: GeologyUnit[]
  geometry_diagnostics: GeologyDiagnostic[]
  verification_questions: string[]
}

export interface GeologyPolicy {
  repair_entity_relative_limit: number
  repair_aoi_fraction_limit: number
  repair_total_area_relative_limit: number
  [key: string]: unknown
}

export interface GeologyContext {
  kind: 'analogos-geology-context'
  schema_version: 1
  status: 'preliminary_geological_context'
  snapshot_version: string
  candidates_file: string
  candidates_sha256: string
  pipeline_version: string
  processing: Record<string, string>
  policy: GeologyPolicy
  sources: GeologySource[]
  sites: GeologySite[]
  limitations: string[]
  editorial_note: string
}

export interface GeologyExport {
  kind: 'analogos-geology-export'
  /** 1 = historical Spanish export_info; 2 = English export_info. Same content otherwise (package stays version 1). */
  schema_version: GeologyTextVersion
  status: 'preliminary_geological_context'
  export_info: {
    description: string
    how_to_read: string[]
    subset: true
    package_kind: 'analogos-geology-context'
    package_schema_version: 1
    snapshot_version: string
    pipeline_version: string
    full_candidates_file: string
    full_candidates_file_sha256: string
  }
  site: GeologySite
  source: GeologySource
  processing: Record<string, string>
  policy: GeologyPolicy
  limitations: string[]
  editorial_note: string
}

export class GeologyContractError extends Error {}

// Same policy as pipelines/geology_policy.py (a test checks that it matches the actual package).
export const GEOLOGY_POLICY = {
  area_crs: 'EPSG:6933',
  clip_space: 'Validez y reparación en lon/lat (CRS84); recorte y superposición en el plano EPSG:6933 (aristas rectas en ese plano)',
  repair_entity_relative_limit: 0.001,
  repair_aoi_fraction_limit: 0.0005,
  repair_total_area_relative_limit: 0.001,
  repair_methods_compared: ['make_valid', 'buffer(0)'],
  area_floor_m2: 1e-6,
  available_tolerance: 1e-8,
  sum_tolerance: 1e-9,
  provisional: true,
  note: 'Umbrales de ingeniería provisionales aprobados por Codex; no son un estándar científico.',
} as const

export const GEOLOGY_ALLOWED_HOSTS = ['lineasdebasepublicas.mma.gob.cl', 'sigam.segemar.gov.ar'] as const
const CKAN_URL = 'https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/api/3/action/package_show?id=geologia-base'
const WFS_BASE = 'https://sigam.segemar.gov.ar/geoserver217/ows'
const WFS_FIXED: Record<string, string> = {
  service: 'WFS', version: '1.0.0', request: 'GetFeature', typeName: 'sigam:e250K_UnidadGeologica',
  maxFeatures: '2000', srsName: 'EPSG:4326', outputFormat: 'application/json',
}
const { sum_tolerance: SUM_TOLERANCE, available_tolerance: AVAILABLE_TOLERANCE } = GEOLOGY_POLICY

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validateContextSchema = ajv.compile(contextSchema)
const validateExportSchema = ajv.compile(exportSchema)

function fail(message: string): never {
  throw new GeologyContractError(`Invalid geology context: ${message}`)
}

function schemaErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? []).slice(0, 3).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`).join('; ')
}

const isFinite_ = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Strict structural equality: same rings, same number of vertices and same exact numbers. */
export function geometriesEqual(first: unknown, second: unknown): boolean {
  if (Array.isArray(first) && Array.isArray(second)) {
    return first.length === second.length && first.every((item, index) => geometriesEqual(item, second[index]))
  }
  if (isObject(first) && isObject(second)) {
    const keys = Object.keys(first)
    return keys.length === Object.keys(second).length && keys.every((key) => key in second && geometriesEqual(first[key], second[key]))
  }
  if (typeof first === 'number' && typeof second === 'number') return first === second
  return first === second
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Status derived ONLY from the fractions; never from suitability. Same as pipelines/geology_policy.availability. */
export function availabilityOf(fractions: GeologyFractions): GeologyAvailability {
  const covered = fractions.covered_total
  const unusable = fractions.unusable_upper_bound
  if (covered === 0) return unusable === 0 ? 'no_coverage' : 'unavailable'
  const complete = fractions.unmapped <= AVAILABLE_TOLERANCE
    && fractions.covered_ambiguous <= AVAILABLE_TOLERANCE
    && unusable === 0
    && fractions.covered_by_units_without_description <= AVAILABLE_TOLERANCE
  return complete ? 'available' : 'partial'
}

function hostAllowed(url: string): boolean {
  try {
    const target = new URL(url)
    return target.protocol === 'https:' && (GEOLOGY_ALLOWED_HOSTS as readonly string[]).includes(target.hostname)
  } catch {
    return false
  }
}

/** Validates the exact form of a WFS request and returns its bbox with exact numeric parsing (no rounding). */
export function wfsBbox(url: string): number[] {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return fail('unreadable WFS request.')
  }
  const base = new URL(WFS_BASE)
  if (target.protocol !== base.protocol || target.hostname !== base.hostname || target.pathname !== base.pathname) {
    fail('WFS request outside the expected service.')
  }
  const names = [...target.searchParams.keys()]
  const expected = [...Object.keys(WFS_FIXED), 'bbox']
  if (names.length !== expected.length || new Set(names).size !== names.length || !expected.every((name) => names.includes(name))
    || Object.entries(WFS_FIXED).some(([name, value]) => target.searchParams.get(name) !== value)) {
    fail('WFS request with unexpected parameters.')
  }
  const parts = (target.searchParams.get('bbox') ?? '').split(',')
  if (parts.length !== 5 || parts[4] !== 'EPSG:4326') fail('bbox WFS mal formado.')
  const bbox = parts.slice(0, 4).map((part) => (part.trim() === '' ? Number.NaN : Number(part)))
  if (!bbox.every(isFinite_)) fail('non-numeric or non-finite WFS bbox.')
  return bbox
}

/** Exact bbox (no rounding) of the polygon: same coordinates used by the request. */
export function aoiBounds(geometry: CandidateSite['geometry']): number[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const xs = polygons.flatMap((rings) => rings.flatMap((ring) => ring.map((point) => point[0])))
  const ys = polygons.flatMap((rings) => rings.flatMap((ring) => ring.map((point) => point[1])))
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function checkGeometryShape(geometry: CandidateSite['geometry'], name: string): void {
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as unknown[]
  for (const rings of polygons) {
    if (!Array.isArray(rings) || rings.length === 0) fail(`${name}: geometry without rings.`)
    for (const ring of rings as unknown[]) {
      const closed = Array.isArray(ring) && ring.length >= 4
        && JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1])
      const vertices = closed && (ring as unknown[]).every((point) => Array.isArray(point) && point.length === 2
        && point.every(isFinite_) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)
      if (!vertices) fail(`${name}: malformed, open or out-of-range lon/lat ring.`)
    }
  }
}

function checkSourceRequests(source: GeologySource, arSiteIds: string[]): void {
  const name = source.source_id
  const roles = source.requests.map((request) => request.role)
  if (source.country === 'CL') {
    if ([...roles].sort().join() !== 'chile_catalog_metadata,chile_layer') {
      fail(`${name}: the Chilean source must declare exactly the CKAN metadata and the layer download.`)
    }
    const catalog = source.requests.find((request) => request.role === 'chile_catalog_metadata')!
    const layer = source.requests.find((request) => request.role === 'chile_layer')!
    if (catalog.url !== CKAN_URL) fail(`${name}: the metadata is not the expected CKAN record.`)
    if (layer.actual_format !== 'geojson' || !layer.member_sha256) fail(`${name}: the Chilean layer must be the inspected GeoJSON, with the member hash.`)
    const declared = source.license.declared_id
    if (!declared || !source.license.name.includes(declared)) fail(`${name}: the license does not cite the id declared by the catalog.`)
    return
  }
  if (roles.some((role) => role !== 'argentina_wfs')) fail(`${name}: the Argentine source only allows WFS requests.`)
  const found = source.requests.map((request) => request.site_id ?? '')
  if ([...found].sort().join() !== [...arSiteIds].sort().join() || new Set(found).size !== found.length) {
    fail(`${name}: there must be exactly one WFS request per sector, with its site_id.`)
  }
  for (const request of source.requests) {
    wfsBbox(request.url)
    if (request.number_returned === undefined || request.number_matched !== request.number_returned) {
      fail(`${name}: truncated or inconsistent WFS response in ${request.site_id}.`)
    }
  }
}

function checkSources(policy: unknown, sources: GeologySource[], arSiteIds: string[]): Map<string, GeologySource> {
  if (!geometriesEqual(policy, GEOLOGY_POLICY)) fail('policy does not match the current policy (approved provisional thresholds).')
  const bySource = new Map(sources.map((source) => [source.source_id, source]))
  if (bySource.size !== sources.length) fail('repeated source_id.')
  for (const source of sources) {
    const urls = [source.dataset_url, source.license.url, ...source.requests.map((request) => request.url)]
    if (!urls.every(hostAllowed)) fail(`${source.source_id}: URL outside the allowed sources (only https to the two official sources).`)
    const ids = source.requests.map((request) => request.request_id)
    if (new Set(ids).size !== ids.length) fail(`${source.source_id}: repeated request_id.`)
    if (source.map_date !== null) fail(`${source.source_id}: map_date must be null while the source does not declare it.`)
    checkSourceRequests(source, arSiteIds)
  }
  return bySource
}

function checkDiagnostic(name: string, item: GeologyDiagnostic): void {
  const limits = GEOLOGY_POLICY
  if (item.status === 'rejected') {
    if (!item.rejection_reasons?.length) fail(`${name}/${item.feature_id}: rejected feature without reasons.`)
    return
  }
  const change = item.total_area_relative_change
  if (!isFinite_(change) || change > limits.repair_total_area_relative_limit) {
    fail(`${name}/${item.feature_id}: accepted repair with a total-area change beyond the limit.`)
  }
  const relative = item.symmetric_difference_relative_to_entity
  const fraction = item.symmetric_difference_fraction_of_aoi
  if (!isFinite_(relative) || relative > limits.repair_entity_relative_limit
    || !isFinite_(fraction) || fraction > limits.repair_aoi_fraction_limit) {
    fail(`${name}/${item.feature_id}: accepted repair with a difference between methods beyond the limits.`)
  }
}

function checkSite(site: GeologySite, sources: Map<string, GeologySource>, candidate: CandidateSite | null): void {
  const name = site.site_id
  if (candidate) {
    if (site.country !== candidate.country || site.name !== candidate.name) fail(`${name}: country or name differs from the candidate.`)
    if (!geometriesEqual(site.geometry, candidate.geometry)) fail(`${name}: the geometry is not identical to the candidate's.`)
  }
  checkGeometryShape(site.geometry, name)
  const source = sources.get(site.source_id)
  if (!source || source.country !== site.country) fail(`${name}: missing source or source from another country.`)
  const byId = new Map(source.requests.map((request) => [request.request_id, request]))
  const cited = site.request_ids
  if (new Set(cited).size !== cited.length || !cited.every((id) => byId.has(id))) {
    fail(`${name}: request_ids repeated or not declared by the source.`)
  }
  if (site.country === 'AR') {
    // Exact acquisition of the sector itself: role, site_id and URL bbox against the AOI, without rounding.
    if (cited.length !== 1) fail(`${name}: an Argentine sector cites exactly its own WFS request.`)
    const request = byId.get(cited[0])!
    if (request.role !== 'argentina_wfs' || request.site_id !== name) fail(`${name}: the cited request does not belong to this sector.`)
    if (!geometriesEqual(wfsBbox(request.url), aoiBounds(site.geometry))) fail(`${name}: the WFS request bbox is not the sector's.`)
    if (site.feature_counts.bbox_candidates > (request.number_returned ?? -1)) {
      fail(`${name}: more candidate features than the request returned.`)
    }
  } else {
    const citedRoles = new Set(cited.map((id) => byId.get(id)!.role))
    if (!citedRoles.has('chile_layer') || [...citedRoles].some((role) => role !== 'chile_layer' && role !== 'chile_catalog_metadata')) {
      fail(`${name}: a Chilean sector must cite the layer download (the metadata may be additional).`)
    }
  }

  const fractions = site.area_fractions
  if (!Object.values(fractions).every(isFinite_)) fail(`${name}: non-finite fractions.`)
  const closure = fractions.unmapped + fractions.covered_unambiguous + fractions.covered_ambiguous + fractions.unusable_upper_bound
  if (Math.abs(closure - 1) > SUM_TOLERANCE) fail(`${name}: unmapped + unambiguous + ambiguous + unusable add up to ${closure}, not 1.`)
  if (Math.abs(fractions.covered_total - fractions.covered_unambiguous - fractions.covered_ambiguous) > SUM_TOLERANCE) {
    fail(`${name}: covered_total does not reconcile with its components.`)
  }
  if (fractions.covered_by_units_without_description > fractions.covered_total + SUM_TOLERANCE) {
    fail(`${name}: the part without description exceeds the coverage.`)
  }
  if (site.availability !== availabilityOf(fractions)) {
    fail(`${name}: availability does not match the fractions (only complete coverage is available).`)
  }
  const units = site.units
  if (new Set(units.map((unit) => unit.unit_id)).size !== units.length) fail(`${name}: repeated unit_id.`)
  if ((units.length > 0) !== (fractions.covered_total > 0)) fail(`${name}: units and coverage do not agree.`)
  let unambiguousSum = 0
  for (const unit of units) {
    const { fraction_including_overlap: included, fraction_unambiguous: clean, fraction_in_ambiguity: shared } = unit
    if (![included, clean, shared].every(isFinite_)) fail(`${name}/${unit.unit_id}: non-finite fractions.`)
    if (Math.abs(included - clean - shared) > SUM_TOLERANCE || clean > included + SUM_TOLERANCE
      || included > fractions.covered_total + SUM_TOLERANCE) {
      fail(`${name}/${unit.unit_id}: inconsistent unit fractions.`)
    }
    if (unit.description_present !== (unit.description !== null)) fail(`${name}/${unit.unit_id}: description_present does not agree with description.`)
    unambiguousSum += clean
  }
  if (Math.abs(unambiguousSum - fractions.covered_unambiguous) > SUM_TOLERANCE * Math.max(1, units.length)) {
    fail(`${name}: the sum of unambiguous units does not reconcile with the sector.`)
  }
  if (units.length === 1 && fractions.covered_ambiguous > AVAILABLE_TOLERANCE) {
    fail(`${name}: a single unit cannot have ambiguity between different units.`)
  }
  site.geometry_diagnostics.forEach((item) => checkDiagnostic(name, item))
  const rejected = site.geometry_diagnostics.filter((item) => item.status === 'rejected')
  if (site.feature_counts.rejected !== rejected.length) fail(`${name}: feature_counts.rejected does not match the diagnostics.`)
  if (fractions.unusable_upper_bound > 0 && rejected.length === 0) fail(`${name}: there is an unusable area without rejected features to explain it.`)
  if (site.feature_counts.positive_area < units.length) fail(`${name}: there are more units than features with positive area.`)
}

/** Validates the complete package against the snapshot's candidates. Throws GeologyContractError. */
export function parseGeologyContext(data: unknown, candidates: CandidateSite[]): GeologyContext {
  if (!validateContextSchema(data)) fail(`it does not meet the contract (${schemaErrors(validateContextSchema.errors)}).`)
  const context = data as unknown as GeologyContext
  if (new Set(candidates.map((candidate) => candidate.data_snapshot_version)).size !== 1
    || candidates[0]?.data_snapshot_version !== context.snapshot_version) {
    fail('the package belongs to another snapshot version.')
  }
  if (context.sites.map((site) => site.site_id).join() !== candidates.map((candidate) => candidate.site_id).join()) {
    fail('the sectors are not exactly the candidates, in the same order.')
  }
  const arSites = candidates.filter((candidate) => candidate.country === 'AR').map((candidate) => candidate.site_id)
  const sources = checkSources(context.policy, context.sources, arSites)
  context.sites.forEach((site, index) => checkSite(site, sources, candidates[index]))
  return context
}

// --- Independent export (subset of ONE sector) -------------------------------------------------

// export_info texts per version (shared/geology/text.ts): v1 = frozen Spanish (historical), v2 = English.
// The GEOLOGY_EXPORT_* names carry the default (English v2) text; v1 is only reachable through geologyText(1).
export const GEOLOGY_EXPORT_DESCRIPTION = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION).exportDescription
export const GEOLOGY_EXPORT_HOW_TO_READ = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION).exportHowToRead

export function geologyExportFileName(siteId: string): string {
  return `${siteId}-geology-context.json`
}

/**
 * Validates the self-contained contract and semantics of an exported subset; with `candidate` it also anchors it to the snapshot.
 * export_info wording must be exactly the one of its schema_version (v1 Spanish, v2 English): a mislabeled version is rejected.
 */
export function validateGeologyExport(data: unknown, candidate: CandidateSite | null = null): GeologyExport {
  if (!validateExportSchema(data)) fail(`the export does not meet its contract (${schemaErrors(validateExportSchema.errors)}).`)
  const exported = data as unknown as GeologyExport
  const text = geologyText(exported.schema_version)
  if (exported.export_info.description !== text.exportDescription || JSON.stringify(exported.export_info.how_to_read) !== JSON.stringify(text.exportHowToRead)) {
    fail(`export_info does not match the wording of schema_version ${exported.schema_version}.`)
  }
  const { site, source } = exported
  if (source.source_id !== site.source_id) fail('the exported source is not the sector source.')
  const sources = checkSources(exported.policy, [source], site.country === 'AR' ? [site.site_id] : [])
  // With a candidate (trusted snapshot), the EXACT country, name and geometry are required: a subset with moved geometry does not validate.
  checkSite(site, sources, candidate)
  return exported
}

/**
 * Self-contained subset of a sector; keeps only the requests that support it (plus the CKAN metadata).
 * `version` selects the export_info wording: 2 (English, default for new reports) or 1 (frozen Spanish, historical).
 */
export function buildGeologyExport(context: GeologyContext, siteId: string, version: GeologyTextVersion = DEFAULT_GEOLOGY_EXPORT_VERSION): GeologyExport {
  if (!isGeologyTextVersion(version)) fail(`unsupported geology export version ${String(version).slice(0, 20)}.`)
  const text = geologyText(version)
  const site = context.sites.find((item) => item.site_id === siteId)
  if (!site) fail(`${siteId}: the sector is not in the package.`)
  const source = context.sources.find((item) => item.source_id === site.source_id)
  if (!source) fail(`${siteId}: the source is not in the package.`)
  const cited = new Set(site.request_ids)
  const requests = source.requests.filter((request) => cited.has(request.request_id) || request.role === 'chile_catalog_metadata')
  const exported = {
    kind: 'analogos-geology-export',
    schema_version: version,
    status: context.status,
    export_info: {
      description: text.exportDescription,
      how_to_read: text.exportHowToRead,
      subset: true,
      package_kind: context.kind,
      package_schema_version: context.schema_version,
      snapshot_version: context.snapshot_version,
      pipeline_version: context.pipeline_version,
      full_candidates_file: context.candidates_file,
      full_candidates_file_sha256: context.candidates_sha256,
    },
    site,
    source: { ...source, requests },
    processing: context.processing,
    policy: context.policy,
    limitations: context.limitations,
    editorial_note: context.editorial_note,
  }
  return validateGeologyExport(exported)
}

// --- Selection and format ---------------------------------------------------------------------------------------

export type GeologyContextState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; context: GeologyContext }

export type GeologySelection =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; context: GeologyContext; site: GeologySite; source: GeologySource }

/** A sector only receives ITS own sheet: no percentage is inherited from another sector, point or subpolygon. */
export function selectGeologySite(state: GeologyContextState, candidate: CandidateSite): GeologySelection {
  if (state.status !== 'ready') return state
  if (candidate.status === 'fixture') return { status: 'unavailable', reason: 'Synthetic fixtures have no geological context.' }
  const site = state.context.sites.find((item) => item.site_id === candidate.site_id)
  const source = site && state.context.sources.find((item) => item.source_id === site.source_id)
  if (!site || !source || !geometriesEqual(site.geometry, candidate.geometry)) {
    return { status: 'unavailable', reason: 'The geology package does not include this sector with its exact geometry.' }
  }
  return { status: 'ready', context: state.context, site, source }
}

// English formatting and labels for the UI; records use the pack of their own version (v1 stays frozen Spanish).
const UI_GEOLOGY_TEXT = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION)
export const formatCoverage = UI_GEOLOGY_TEXT.formatCoverage
export const formatScaleLabel = UI_GEOLOGY_TEXT.formatScaleLabel
export const AVAILABILITY_LABEL: Record<GeologyAvailability, string> = UI_GEOLOGY_TEXT.availabilityLabel

export const AVAILABILITY_HINT: Record<GeologyAvailability, string> = {
  available: 'This layer covers the whole sector, with no overlaps or missing descriptions. It is map coverage, not precision.',
  partial: 'Part of the sector has no coverage, units overlap or descriptions are missing. They are shown separately.',
  no_coverage: 'This layer does not cover the sector. It does not mean there is no rock, and it does not rule out the sector.',
  unavailable: 'Some source geometries could not be used; the affected part is an upper bound.',
}
