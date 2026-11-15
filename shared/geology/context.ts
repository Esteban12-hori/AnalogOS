// Núcleo compartido (M10): lo importan la web (reexport) y la función Node sin depender del paquete ESM de la web.
// Contexto geológico oficial por sector (M9). Carga opcional, validada y de solo lectura: la web NUNCA llama
// a SERNAGEOMIN, MMA ni SIGAM; solo lee el paquete empaquetado por el pipeline. Describe qué unidades están
// cartografiadas y qué parte del sector no tiene cobertura; no expresa aptitud, confianza ni score.
//
// La validación espeja la semántica de pipelines/geology_contract.py (contrato JSON Schema + geometría exacta,
// cierre de áreas, estado recalculado, procedencia por sector). No hay criptografía en el navegador: el SHA-256
// del archivo de candidatos y el request_id (SHA-256 de método+URL) los verifican el pipeline y el empaquetador.
import { type ErrorObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import contextSchema from '../../contracts/geology-context.schema.json'
import exportSchema from '../../contracts/geology-export.schema.json'
import type { CandidateSite } from '../domain/contracts'

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
  schema_version: 1
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

// Misma política que pipelines/geology_policy.py (una prueba comprueba que coincide con el paquete real).
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
  throw new GeologyContractError(`Contexto geológico no válido: ${message}`)
}

function schemaErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? []).slice(0, 3).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`).join('; ')
}

const isFinite_ = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Igualdad estructural estricta: mismos anillos, mismo número de vértices y mismos números exactos. */
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

/** Estado derivado SOLO de las fracciones; nunca de aptitud. Igual que pipelines/geology_policy.availability. */
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

/** Valida la forma exacta de una petición WFS y devuelve su bbox con parse numérico exacto (sin redondeo). */
export function wfsBbox(url: string): number[] {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return fail('petición WFS ilegible.')
  }
  const base = new URL(WFS_BASE)
  if (target.protocol !== base.protocol || target.hostname !== base.hostname || target.pathname !== base.pathname) {
    fail('petición WFS fuera del servicio esperado.')
  }
  const names = [...target.searchParams.keys()]
  const expected = [...Object.keys(WFS_FIXED), 'bbox']
  if (names.length !== expected.length || new Set(names).size !== names.length || !expected.every((name) => names.includes(name))
    || Object.entries(WFS_FIXED).some(([name, value]) => target.searchParams.get(name) !== value)) {
    fail('petición WFS con parámetros distintos de los esperados.')
  }
  const parts = (target.searchParams.get('bbox') ?? '').split(',')
  if (parts.length !== 5 || parts[4] !== 'EPSG:4326') fail('bbox WFS mal formado.')
  const bbox = parts.slice(0, 4).map((part) => (part.trim() === '' ? Number.NaN : Number(part)))
  if (!bbox.every(isFinite_)) fail('bbox WFS no numérico o no finito.')
  return bbox
}

/** Bbox exacta (sin redondeo) del polígono: mismas coordenadas que usó la petición. */
export function aoiBounds(geometry: CandidateSite['geometry']): number[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const xs = polygons.flatMap((rings) => rings.flatMap((ring) => ring.map((point) => point[0])))
  const ys = polygons.flatMap((rings) => rings.flatMap((ring) => ring.map((point) => point[1])))
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function checkGeometryShape(geometry: CandidateSite['geometry'], name: string): void {
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as unknown[]
  for (const rings of polygons) {
    if (!Array.isArray(rings) || rings.length === 0) fail(`${name}: geometría sin anillos.`)
    for (const ring of rings as unknown[]) {
      const closed = Array.isArray(ring) && ring.length >= 4
        && JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1])
      const vertices = closed && (ring as unknown[]).every((point) => Array.isArray(point) && point.length === 2
        && point.every(isFinite_) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)
      if (!vertices) fail(`${name}: anillo malformado, abierto o fuera de lon/lat.`)
    }
  }
}

function checkSourceRequests(source: GeologySource, arSiteIds: string[]): void {
  const name = source.source_id
  const roles = source.requests.map((request) => request.role)
  if (source.country === 'CL') {
    if ([...roles].sort().join() !== 'chile_catalog_metadata,chile_layer') {
      fail(`${name}: la fuente chilena debe declarar exactamente metadata CKAN y la descarga de la capa.`)
    }
    const catalog = source.requests.find((request) => request.role === 'chile_catalog_metadata')!
    const layer = source.requests.find((request) => request.role === 'chile_layer')!
    if (catalog.url !== CKAN_URL) fail(`${name}: la metadata no es la de CKAN esperada.`)
    if (layer.actual_format !== 'geojson' || !layer.member_sha256) fail(`${name}: la capa chilena debe ser el GeoJSON inspeccionado, con hash del miembro.`)
    const declared = source.license.declared_id
    if (!declared || !source.license.name.includes(declared)) fail(`${name}: la licencia no cita el id declarado por el catálogo.`)
    return
  }
  if (roles.some((role) => role !== 'argentina_wfs')) fail(`${name}: la fuente argentina solo admite peticiones WFS.`)
  const found = source.requests.map((request) => request.site_id ?? '')
  if ([...found].sort().join() !== [...arSiteIds].sort().join() || new Set(found).size !== found.length) {
    fail(`${name}: debe haber exactamente una petición WFS por sector, con su site_id.`)
  }
  for (const request of source.requests) {
    wfsBbox(request.url)
    if (request.number_returned === undefined || request.number_matched !== request.number_returned) {
      fail(`${name}: respuesta WFS truncada o inconsistente en ${request.site_id}.`)
    }
  }
}

function checkSources(policy: unknown, sources: GeologySource[], arSiteIds: string[]): Map<string, GeologySource> {
  if (!geometriesEqual(policy, GEOLOGY_POLICY)) fail('policy no coincide con la política vigente (umbrales provisionales aprobados).')
  const bySource = new Map(sources.map((source) => [source.source_id, source]))
  if (bySource.size !== sources.length) fail('source_id repetido.')
  for (const source of sources) {
    const urls = [source.dataset_url, source.license.url, ...source.requests.map((request) => request.url)]
    if (!urls.every(hostAllowed)) fail(`${source.source_id}: URL fuera de las fuentes permitidas (solo https a las dos fuentes oficiales).`)
    const ids = source.requests.map((request) => request.request_id)
    if (new Set(ids).size !== ids.length) fail(`${source.source_id}: request_id repetido.`)
    if (source.map_date !== null) fail(`${source.source_id}: map_date debe ser null mientras la fuente no lo declare.`)
    checkSourceRequests(source, arSiteIds)
  }
  return bySource
}

function checkDiagnostic(name: string, item: GeologyDiagnostic): void {
  const limits = GEOLOGY_POLICY
  if (item.status === 'rejected') {
    if (!item.rejection_reasons?.length) fail(`${name}/${item.feature_id}: entidad rechazada sin razones.`)
    return
  }
  const change = item.total_area_relative_change
  if (!isFinite_(change) || change > limits.repair_total_area_relative_limit) {
    fail(`${name}/${item.feature_id}: reparación aceptada con cambio de área total fuera del límite.`)
  }
  const relative = item.symmetric_difference_relative_to_entity
  const fraction = item.symmetric_difference_fraction_of_aoi
  if (!isFinite_(relative) || relative > limits.repair_entity_relative_limit
    || !isFinite_(fraction) || fraction > limits.repair_aoi_fraction_limit) {
    fail(`${name}/${item.feature_id}: reparación aceptada con diferencia entre métodos fuera de límites.`)
  }
}

function checkSite(site: GeologySite, sources: Map<string, GeologySource>, candidate: CandidateSite | null): void {
  const name = site.site_id
  if (candidate) {
    if (site.country !== candidate.country || site.name !== candidate.name) fail(`${name}: país o nombre distinto del candidato.`)
    if (!geometriesEqual(site.geometry, candidate.geometry)) fail(`${name}: la geometría no es idéntica a la del candidato.`)
  }
  checkGeometryShape(site.geometry, name)
  const source = sources.get(site.source_id)
  if (!source || source.country !== site.country) fail(`${name}: fuente inexistente o de otro país.`)
  const byId = new Map(source.requests.map((request) => [request.request_id, request]))
  const cited = site.request_ids
  if (new Set(cited).size !== cited.length || !cited.every((id) => byId.has(id))) {
    fail(`${name}: request_ids repetidos o no declarados por la fuente.`)
  }
  if (site.country === 'AR') {
    // Adquisición exacta del propio sector: rol, site_id y bbox de la URL contra el AOI, sin redondeo.
    if (cited.length !== 1) fail(`${name}: un sector argentino cita exactamente su petición WFS.`)
    const request = byId.get(cited[0])!
    if (request.role !== 'argentina_wfs' || request.site_id !== name) fail(`${name}: la petición citada no pertenece a este sector.`)
    if (!geometriesEqual(wfsBbox(request.url), aoiBounds(site.geometry))) fail(`${name}: la bbox de la petición WFS no es la del sector.`)
    if (site.feature_counts.bbox_candidates > (request.number_returned ?? -1)) {
      fail(`${name}: más entidades candidatas que las devueltas por la petición.`)
    }
  } else {
    const citedRoles = new Set(cited.map((id) => byId.get(id)!.role))
    if (!citedRoles.has('chile_layer') || [...citedRoles].some((role) => role !== 'chile_layer' && role !== 'chile_catalog_metadata')) {
      fail(`${name}: un sector chileno debe citar la descarga de la capa (la metadata puede ser adicional).`)
    }
  }

  const fractions = site.area_fractions
  if (!Object.values(fractions).every(isFinite_)) fail(`${name}: fracciones no finitas.`)
  const closure = fractions.unmapped + fractions.covered_unambiguous + fractions.covered_ambiguous + fractions.unusable_upper_bound
  if (Math.abs(closure - 1) > SUM_TOLERANCE) fail(`${name}: sin cobertura + sin ambigüedad + ambigua + no utilizable suman ${closure}, no 1.`)
  if (Math.abs(fractions.covered_total - fractions.covered_unambiguous - fractions.covered_ambiguous) > SUM_TOLERANCE) {
    fail(`${name}: covered_total no reconcilia con sus componentes.`)
  }
  if (fractions.covered_by_units_without_description > fractions.covered_total + SUM_TOLERANCE) {
    fail(`${name}: la parte sin descripción excede la cobertura.`)
  }
  if (site.availability !== availabilityOf(fractions)) {
    fail(`${name}: availability no corresponde a las fracciones (solo cobertura completa es available).`)
  }
  const units = site.units
  if (new Set(units.map((unit) => unit.unit_id)).size !== units.length) fail(`${name}: unit_id repetido.`)
  if ((units.length > 0) !== (fractions.covered_total > 0)) fail(`${name}: unidades y cobertura no concuerdan.`)
  let unambiguousSum = 0
  for (const unit of units) {
    const { fraction_including_overlap: included, fraction_unambiguous: clean, fraction_in_ambiguity: shared } = unit
    if (![included, clean, shared].every(isFinite_)) fail(`${name}/${unit.unit_id}: fracciones no finitas.`)
    if (Math.abs(included - clean - shared) > SUM_TOLERANCE || clean > included + SUM_TOLERANCE
      || included > fractions.covered_total + SUM_TOLERANCE) {
      fail(`${name}/${unit.unit_id}: fracciones de unidad incoherentes.`)
    }
    if (unit.description_present !== (unit.description !== null)) fail(`${name}/${unit.unit_id}: description_present no concuerda con description.`)
    unambiguousSum += clean
  }
  if (Math.abs(unambiguousSum - fractions.covered_unambiguous) > SUM_TOLERANCE * Math.max(1, units.length)) {
    fail(`${name}: la suma de unidades sin ambigüedad no reconcilia con el sector.`)
  }
  if (units.length === 1 && fractions.covered_ambiguous > AVAILABLE_TOLERANCE) {
    fail(`${name}: una sola unidad no puede tener ambigüedad entre unidades distintas.`)
  }
  site.geometry_diagnostics.forEach((item) => checkDiagnostic(name, item))
  const rejected = site.geometry_diagnostics.filter((item) => item.status === 'rejected')
  if (site.feature_counts.rejected !== rejected.length) fail(`${name}: feature_counts.rejected no coincide con los diagnósticos.`)
  if (fractions.unusable_upper_bound > 0 && rejected.length === 0) fail(`${name}: hay zona no utilizable sin entidades rechazadas que la expliquen.`)
  if (site.feature_counts.positive_area < units.length) fail(`${name}: hay más unidades que entidades con área positiva.`)
}

/** Valida el paquete completo contra los candidatos del snapshot. Lanza GeologyContractError. */
export function parseGeologyContext(data: unknown, candidates: CandidateSite[]): GeologyContext {
  if (!validateContextSchema(data)) fail(`no cumple el contrato (${schemaErrors(validateContextSchema.errors)}).`)
  const context = data as unknown as GeologyContext
  if (new Set(candidates.map((candidate) => candidate.data_snapshot_version)).size !== 1
    || candidates[0]?.data_snapshot_version !== context.snapshot_version) {
    fail('el paquete corresponde a otra versión de snapshot.')
  }
  if (context.sites.map((site) => site.site_id).join() !== candidates.map((candidate) => candidate.site_id).join()) {
    fail('los sectores no son exactamente los candidatos, en el mismo orden.')
  }
  const arSites = candidates.filter((candidate) => candidate.country === 'AR').map((candidate) => candidate.site_id)
  const sources = checkSources(context.policy, context.sources, arSites)
  context.sites.forEach((site, index) => checkSite(site, sources, candidates[index]))
  return context
}

// --- Exportación independiente (subconjunto de UN sector) -------------------------------------------------

export const GEOLOGY_EXPORT_DESCRIPTION =
  'Contexto geológico cartográfico de un sector de AnalogOS, exportado de forma independiente. Describe qué '
  + 'unidades están cartografiadas en la capa oficial citada y qué parte del sector no tiene cobertura; no mide '
  + 'el terreno ni expresa aptitud, confianza ni compatibilidad planetaria.'
export const GEOLOGY_EXPORT_HOW_TO_READ = [
  'availability describe evidencia cartográfica, nunca aptitud: available = cobertura completa de esta capa sin '
  + 'ambigüedad ni descripciones ausentes; partial = hay huecos, solapes o descripciones ausentes; no_coverage = '
  + 'esta capa no cubre el sector; unavailable = hay evidencia no utilizable.',
  'area_fractions son fracciones del área del sector y suman 1 sin renormalizar: unmapped + covered_unambiguous + '
  + 'covered_ambiguous + unusable_upper_bound. Cobertura no es precisión.',
  'Este archivo es un subconjunto: contiene un solo sector y las peticiones que lo respaldan. '
  + 'full_candidates_file_sha256 es el hash del archivo completo candidate-details.json del que salió el paquete; '
  + 'este subconjunto no es ese archivo.',
  'Las verification_questions son orientación editorial, no mediciones.',
]

export function geologyExportFileName(siteId: string): string {
  return `${siteId}-geology-context.json`
}

/** Valida contrato autocontenido y semántica de un subconjunto exportado; con `candidate` también lo ancla al snapshot. */
export function validateGeologyExport(data: unknown, candidate: CandidateSite | null = null): GeologyExport {
  if (!validateExportSchema(data)) fail(`la exportación no cumple su contrato (${schemaErrors(validateExportSchema.errors)}).`)
  const exported = data as unknown as GeologyExport
  const { site, source } = exported
  if (source.source_id !== site.source_id) fail('la fuente exportada no es la del sector.')
  const sources = checkSources(exported.policy, [source], site.country === 'AR' ? [site.site_id] : [])
  // Con candidato (snapshot confiable) se exigen país, nombre y geometría EXACTOS: un subconjunto con la geometría movida no valida.
  checkSite(site, sources, candidate)
  return exported
}

/** Subconjunto autocontenido de un sector; conserva solo las peticiones que lo respaldan (más la metadata CKAN). */
export function buildGeologyExport(context: GeologyContext, siteId: string): GeologyExport {
  const site = context.sites.find((item) => item.site_id === siteId)
  if (!site) fail(`${siteId}: el sector no está en el paquete.`)
  const source = context.sources.find((item) => item.source_id === site.source_id)
  if (!source) fail(`${siteId}: la fuente no está en el paquete.`)
  const cited = new Set(site.request_ids)
  const requests = source.requests.filter((request) => cited.has(request.request_id) || request.role === 'chile_catalog_metadata')
  const exported = {
    kind: 'analogos-geology-export',
    schema_version: 1,
    status: context.status,
    export_info: {
      description: GEOLOGY_EXPORT_DESCRIPTION,
      how_to_read: GEOLOGY_EXPORT_HOW_TO_READ,
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

// --- Selección y formato ---------------------------------------------------------------------------------------

export type GeologyContextState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; context: GeologyContext }

export type GeologySelection =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; context: GeologyContext; site: GeologySite; source: GeologySource }

/** Un sector solo recibe SU ficha: ningún porcentaje se hereda de otro sector, punto o subpolígono. */
export function selectGeologySite(state: GeologyContextState, candidate: CandidateSite): GeologySelection {
  if (state.status !== 'ready') return state
  if (candidate.status === 'fixture') return { status: 'unavailable', reason: 'Los fixtures sintéticos no tienen contexto geológico.' }
  const site = state.context.sites.find((item) => item.site_id === candidate.site_id)
  const source = site && state.context.sources.find((item) => item.source_id === site.source_id)
  if (!site || !source || !geometriesEqual(site.geometry, candidate.geometry)) {
    return { status: 'unavailable', reason: 'El paquete geológico no trae este sector con su geometría exacta.' }
  }
  return { status: 'ready', context: state.context, site, source }
}

const decimal = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Porcentaje con redondeo honesto de una fracción: nunca muestra 100 % salvo cobertura exacta, y distingue
 * «<0,1 %» y «>99,9 %» en vez de redondear a 0 % o a 100 %.
 */
export function formatCoverage(fraction: number): string {
  const percent = fraction * 100
  if (percent === 0) return '0 %'
  if (percent >= 100 - 1e-6) return '100 %'
  if (percent < 0.1) return '<0,1 %'
  if (percent > 99.9) return '>99,9 %'
  return `${decimal.format(percent)} %`
}

export function formatScaleLabel(denominator: number): string {
  return `1:${new Intl.NumberFormat('es-CL').format(denominator)}`
}

export const AVAILABILITY_LABEL: Record<GeologyAvailability, string> = {
  available: 'Cobertura cartográfica completa',
  partial: 'Cobertura parcial',
  no_coverage: 'Sin cobertura en esta capa',
  unavailable: 'Evidencia no utilizable',
}

export const AVAILABILITY_HINT: Record<GeologyAvailability, string> = {
  available: 'Esta capa cubre todo el sector, sin solapes ni descripciones ausentes. Es cobertura del mapa, no precisión.',
  partial: 'Hay parte sin cobertura, solapes entre unidades o descripciones ausentes. Se muestran por separado.',
  no_coverage: 'Esta capa no cubre el sector. No significa que no haya rocas ni descarta el sector.',
  unavailable: 'Hay geometrías de la fuente que no se pudieron usar; la parte afectada es una cota superior.',
}
