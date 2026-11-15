// Orientación geológica para una prueba (M10, ADR-011). Capa SEPARADA del resultado determinista de M8:
// no cambia estados, rankings, scores ni requisitos. El catálogo cerrado de referencias (unidad + propósito)
// lo calcula el servidor desde el paquete geológico oficial validado y la evaluación recalculada; la IA solo
// puede ELEGIR referencias de ese catálogo. Las frases las ponen plantillas fijas: orientación editorial,
// nunca mediciones ni litología inferida.
import { evaluationFingerprint } from '../mission/evaluate'
import { fingerprint } from '../mission/fingerprint'
import type { MissionEvaluation, OptionStatus } from '../mission/types'
import {
  AVAILABILITY_LABEL, GEOLOGY_POLICY, buildGeologyExport, formatCoverage, formatScaleLabel, type GeologyAvailability, type GeologyContext, type GeologyExport, type GeologySite, type GeologySource, type GeologyUnit,
} from './context'

export const GEOLOGY_PURPOSES = [
  'verificar_hueco_cartografico',
  'resolver_ambiguedad',
  'confirmar_descripcion_ausente',
  'correspondencia_mapa_terreno',
  'caracterizar_material_superficial',
  'diversidad_litologica_muestreo',
  'contrastar_escala',
] as const
export type GeologyPurpose = (typeof GEOLOGY_PURPOSES)[number]

export const MAX_REFS_PER_SITE = 3
export const MAX_REFS_TOTAL = 12
export const MAX_UNITS_PER_SITE = 12

export const PURPOSE_LABEL: Record<GeologyPurpose, string> = {
  verificar_hueco_cartografico: 'Verificar zona sin polígono',
  resolver_ambiguedad: 'Resolver solape entre unidades',
  confirmar_descripcion_ausente: 'Confirmar descripción ausente',
  correspondencia_mapa_terreno: 'Comprobar correspondencia mapa-terreno',
  caracterizar_material_superficial: 'Caracterizar material superficial (a medir)',
  diversidad_litologica_muestreo: 'Reconocer diversidad litológica',
  contrastar_escala: 'Contrastar la escala del mapa',
}

/** Qué significa cada propósito para la IA (datos para el prompt; no es un hecho geológico). */
export const PURPOSE_DEFINITION: Record<GeologyPurpose, string> = {
  verificar_hueco_cartografico: 'Comprobar qué hay donde la capa no tiene polígono (solo si el sector tiene parte sin cobertura o no utilizable). Sin unidad asociada.',
  resolver_ambiguedad: 'Resolver cuál de las unidades solapadas rige (solo unidades con fracción en solape).',
  confirmar_descripcion_ausente: 'Obtener la descripción de una unidad cuya descripción original falta.',
  correspondencia_mapa_terreno: 'Comprobar en terreno si lo observado coincide con la descripción cartográfica de la unidad (unidad con descripción original).',
  caracterizar_material_superficial: 'Preparar la medición en terreno de granulometría, compactación y fricción del material superficial de la unidad (relevante para movilidad/tracción; el mapa no los informa).',
  diversidad_litologica_muestreo: 'Reconocer la diversidad litológica del sector para planificar muestreo o instrumentación (solo sectores con 2 o más unidades).',
  contrastar_escala: 'Contrastar la cartografía regional con la de mayor detalle disponible. Sin unidad asociada.',
}

const unitLabel = (u: GeologyUnitBrief): string => `«${u.name ?? u.code ?? 'unidad sin nombre'}»${u.code ? ` (código ${u.code})` : ''}`

/** Plantillas editoriales fijas: solo interpolan identidad oficial de la unidad, nunca afirman litología ni aptitud. */
function purposeText(purpose: GeologyPurpose, unit: GeologyUnitBrief | null, site: GeologySiteBrief): string {
  const u = unit ? unitLabel(unit) : ''
  switch (purpose) {
    case 'verificar_hueco_cartografico':
      return `Comprobar qué hay en la parte del sector sin polígono o no utilizable en esta capa (${formatCoverage(site.fractions.unmapped + site.fractions.unusable_upper_bound)} del área). Ausencia de cobertura no es ausencia de geología. Orientación editorial, no medición.`
    case 'resolver_ambiguedad':
      return `Resolver con la fuente oficial qué unidad rige donde ${u} se solapa con otra (${formatCoverage(unit?.fraction_in_ambiguity ?? 0)} del sector es solape de esta unidad con otras). Orientación editorial, no medición.`
    case 'confirmar_descripcion_ausente':
      return `Obtener la descripción de ${u}, que la fuente no trae, antes de usarla para planificar. Orientación editorial, no medición.`
    case 'correspondencia_mapa_terreno':
      return `Comprobar en terreno si lo observado donde se cartografió ${u} coincide con su descripción oficial. Orientación editorial, no medición.`
    case 'caracterizar_material_superficial':
      return `Medir en terreno granulometría, compactación y fricción del material superficial donde se cartografió ${u}; el mapa no los informa y no deben inferirse de su nombre. Orientación editorial, no medición.`
    case 'diversidad_litologica_muestreo':
      return `Reconocer en terreno ${u} entre las ${site.units.length} unidades cartografiadas para planificar muestreo o instrumentación. Orientación editorial, no medición.`
    case 'contrastar_escala':
      return `Contrastar esta cartografía regional (${formatScaleLabel(site.scale_denominator)}) con cartografía de mayor detalle antes de planificar un ensayo. Orientación editorial, no medición.`
  }
}

export interface GeologyUnitBrief {
  unit_id: string
  code: string | null
  name: string | null
  description: string | null
  /** Fracción del sector CON solape (fraction_including_overlap): las zonas compartidas cuentan en cada unidad; no sumar entre unidades. */
  fraction: number
  /** Parte de `fraction` sin solape con otra unidad (sin doble conteo). */
  fraction_unambiguous: number
  fraction_in_ambiguity: number
}

export interface GeologySiteBrief {
  site_id: string
  name: string
  option_status: OptionStatus
  rank: number | null
  role: 'candidate' | 'reference'
  availability: GeologyAvailability
  /** Con punto/bbox la geología es la de la VENTANA completa, nunca de la geometría pedida. */
  applies_to: 'evaluated_window' | 'window_not_requested_geometry'
  fractions: { unmapped: number; covered_total: number; covered_ambiguous: number; unusable_upper_bound: number; without_description: number }
  scale_denominator: number
  source: { source_id: string; authority: string; distributor: string; dataset_name: string; dataset_url: string; map_date: string | null }
  units: GeologyUnitBrief[]
  units_omitted: number
  /** Siempre visibles, aunque la IA no seleccione nada. */
  limits: string[]
}

export interface GeologyRef {
  ref_id: string
  site_id: string
  unit_id: string | null
  purpose: GeologyPurpose
  text: string
}

export interface GeologyExcluded { site_id: string; name: string; reason: string }

export interface GeologyCatalog {
  context_fingerprint: string
  /** SHA-256 del JSON canónico de los subconjuntos exactos (geology-export) de los sectores del catálogo: evidencia completa, reconstruible sin el paquete entero. */
  subset_fingerprint: string
  request_fingerprint: string
  evaluation_fingerprint: string
  scope_mode: MissionEvaluation['resolution']['mode']
  sites: GeologySiteBrief[]
  refs: GeologyRef[]
  excluded: GeologyExcluded[]
  /** Liga contexto, solicitud, evaluación y el conjunto exacto de referencias ofrecidas (y sus textos). */
  catalog_fingerprint: string
}

/** Origen del catálogo: el contexto completo o, al auditar una exportación, solo sus subconjuntos por sector. */
export type GeologyCatalogSource = Pick<GeologyContext, 'sites' | 'sources'> & { exportFor: (siteId: string) => GeologyExport }

export function catalogSourceFromContext(context: GeologyContext): GeologyCatalogSource {
  return { sites: context.sites, sources: context.sources, exportFor: (siteId) => buildGeologyExport(context, siteId) }
}

export function catalogSourceFromExports(exports: GeologyExport[]): GeologyCatalogSource {
  const sources = new Map<string, GeologyExport['source']>()
  for (const e of exports) sources.set(e.source.source_id, e.source)
  return {
    sites: exports.map((e) => e.site) as unknown as GeologyContext['sites'],
    sources: [...sources.values()] as unknown as GeologyContext['sources'],
    exportFor: (siteId) => {
      const found = exports.find((e) => e.site.site_id === siteId)
      if (!found) throw new GeologyGuidanceError(`Falta el subconjunto de ${siteId}.`)
      return found
    },
  }
}

export class GeologyGuidanceError extends Error {}

const EXCLUDED_REASON: Partial<Record<OptionStatus, string>> = {
  no_cumple_requisitos: 'Descartado por requisitos imprescindibles incumplidos: la geología no lo rehabilita y no se le orienta reconocimiento geológico.',
  objetivo_no_soportado: 'El objetivo no corresponde al perfil soportado: no se orienta reconocimiento geológico.',
}

const pct = (f: number): string => formatCoverage(f)
/** Ruido de punto flotante (p. ej. 1e-15 de solape en un sector «available») no cuenta como hueco ni ambigüedad: misma tolerancia que `available`. */
const EPS = GEOLOGY_POLICY.available_tolerance

function siteLimits(site: GeologySite, source: GeologySource, appliesTo: GeologySiteBrief['applies_to']): string[] {
  const f = site.area_fractions
  const out = [
    `Cartografía regional ${formatScaleLabel(source.scale_denominator)} (${source.authority_original}): no es medición de campo ni prueba de tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos.`,
    `Estado de evidencia: ${AVAILABILITY_LABEL[site.availability]}. Cobertura no es precisión ni aptitud.`,
  ]
  if (site.availability === 'no_coverage') out.push('Esta capa no cubre el sector: no hay unidades que citar. No significa que no haya geología ni descarta el sector.')
  if (site.availability !== 'no_coverage' && f.unmapped > EPS) out.push(`${pct(f.unmapped)} del sector no tiene polígono en esta capa; no se localizan unidades dentro de ese hueco ni se completa con otras capas.`)
  if (f.covered_ambiguous > EPS) out.push(`${pct(f.covered_ambiguous)} del sector tiene solape entre unidades distintas; no se afirma cuál rige allí.`)
  if (f.unusable_upper_bound > EPS) out.push(`Hasta ${pct(f.unusable_upper_bound)} del sector corresponde a geometrías de la fuente no utilizables (cota superior).`)
  if (f.covered_by_units_without_description > EPS) out.push(`${pct(f.covered_by_units_without_description)} del sector está cubierto por unidades sin descripción original.`)
  if (source.map_date === null) out.push('La fecha del levantamiento geológico no está informada por la fuente.')
  if (site.units.length > 0) out.push('Las unidades se listan por su fracción del sector; la capa no localiza dónde está cada una dentro de la ventana en esta ficha ni atribuye unidades al hueco. Los porcentajes de unidades no se suman: el solape cuenta en cada una.')
  if (appliesTo === 'window_not_requested_geometry') out.push('Contexto de la ventana completa del snapshot; no describe el punto o área pedidos ni se hereda a esa geometría.')
  return out
}

function toUnitBrief(u: GeologyUnit): GeologyUnitBrief {
  return {
    unit_id: u.unit_id, code: u.code, name: u.name, description: u.description_present ? u.description : null,
    fraction: u.fraction_including_overlap, fraction_unambiguous: u.fraction_unambiguous, fraction_in_ambiguity: u.fraction_in_ambiguity,
  }
}

function refsForSite(brief: GeologySiteBrief): GeologyRef[] {
  if (brief.availability === 'no_coverage' || brief.availability === 'unavailable' && brief.units.length === 0) return []
  const refs: GeologyRef[] = []
  const add = (purpose: GeologyPurpose, unit: GeologyUnitBrief | null): void => {
    refs.push({ ref_id: `${brief.site_id}|geo|${unit?.unit_id ?? 'site'}|${purpose}`, site_id: brief.site_id, unit_id: unit?.unit_id ?? null, purpose, text: purposeText(purpose, unit, brief) })
  }
  const f = brief.fractions
  if (f.unmapped > EPS || f.unusable_upper_bound > EPS) add('verificar_hueco_cartografico', null)
  for (const u of brief.units) {
    if (f.covered_ambiguous > EPS && u.fraction_in_ambiguity > EPS) add('resolver_ambiguedad', u)
    if (u.description === null) add('confirmar_descripcion_ausente', u)
    else add('correspondencia_mapa_terreno', u)
    add('caracterizar_material_superficial', u)
    if (brief.units.length >= 2) add('diversidad_litologica_muestreo', u)
  }
  if (brief.units.length > 0) add('contrastar_escala', null)
  return refs
}

/**
 * Catálogo cerrado para una evaluación. Solo emite unidades de sectores evaluados y no descartados; sin ventana
 * elegida (needs_window_selection) o sin evaluación completa no emite nada. `context` debe venir ya validado.
 */
export function buildGeologyCatalog(evaluation: MissionEvaluation, contextOrSource: GeologyContext | GeologyCatalogSource, contextFingerprint: string): GeologyCatalog {
  const context = 'exportFor' in contextOrSource ? contextOrSource : catalogSourceFromContext(contextOrSource)
  const sites: GeologySiteBrief[] = []
  const excluded: GeologyExcluded[] = []
  const refs: GeologyRef[] = []
  const appliesTo: GeologySiteBrief['applies_to'] = evaluation.resolution.mode === 'point' || evaluation.resolution.mode === 'bbox' ? 'window_not_requested_geometry' : 'evaluated_window'
  if (evaluation.outcome === 'evaluated') {
    for (const option of evaluation.options) {
      const reason = EXCLUDED_REASON[option.status]
      if (reason) {
        excluded.push({ site_id: option.site_id, name: option.name, reason })
        continue
      }
      const site = context.sites.find((s) => s.site_id === option.site_id)
      const source = site && context.sources.find((s) => s.source_id === site.source_id)
      if (!site || !source) {
        excluded.push({ site_id: option.site_id, name: option.name, reason: 'El paquete geológico no trae este sector; no se emite contexto geológico.' })
        continue
      }
      const ordered = [...site.units].sort((a, b) => b.fraction_including_overlap - a.fraction_including_overlap || a.unit_id.localeCompare(b.unit_id))
      const kept = ordered.slice(0, MAX_UNITS_PER_SITE)
      const brief: GeologySiteBrief = {
        site_id: site.site_id, name: option.name, option_status: option.status, rank: option.rank, role: option.role,
        availability: site.availability, applies_to: appliesTo,
        fractions: {
          unmapped: site.area_fractions.unmapped, covered_total: site.area_fractions.covered_total, covered_ambiguous: site.area_fractions.covered_ambiguous,
          unusable_upper_bound: site.area_fractions.unusable_upper_bound, without_description: site.area_fractions.covered_by_units_without_description,
        },
        scale_denominator: source.scale_denominator,
        source: { source_id: source.source_id, authority: source.authority_original, distributor: source.distributor, dataset_name: source.dataset_name, dataset_url: source.dataset_url, map_date: source.map_date },
        units: kept.map(toUnitBrief), units_omitted: ordered.length - kept.length,
        limits: siteLimits(site, source, appliesTo),
      }
      sites.push(brief)
      refs.push(...refsForSite(brief))
    }
  } else {
    for (const option of evaluation.options) excluded.push({ site_id: option.site_id, name: option.name, reason: 'Sin evaluación completa de ventana: no se emiten unidades geológicas.' })
  }
  const base = {
    context_fingerprint: contextFingerprint, subset_fingerprint: fingerprint(sites.map((s) => context.exportFor(s.site_id))), request_fingerprint: evaluation.request_fingerprint, evaluation_fingerprint: evaluationFingerprint(evaluation),
    scope_mode: evaluation.resolution.mode, sites, refs, excluded,
  }
  return { ...base, catalog_fingerprint: fingerprint(base) }
}

export interface GeologySelectionResult { ref_ids: string[] }
/** Motivo tipado del rechazo (controlado: nunca contiene texto del proveedor); `site_id` solo si pertenece al catálogo. */
export type GeologyRejection = 'shape' | 'total_limit' | 'site_limit' | 'foreign_ref' | 'duplicate'
export type GeologySelectionCheck = { ok: true; selection: GeologySelectionResult } | { ok: false; reason: string; code: GeologyRejection; site_id?: string }

/** Validación estricta: forma cerrada, pertenencia, unicidad y topes. Cualquier violación descarta todo, sin reparar. */
export function checkGeologySelection(raw: unknown, catalog: GeologyCatalog): GeologySelectionCheck {
  const bad = (reason: string, code: GeologyRejection, site_id?: string): GeologySelectionCheck => ({ ok: false, reason, code, ...(site_id ? { site_id } : {}) })
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('Selección geológica mal formada.', 'shape')
  const record = raw as Record<string, unknown>
  if (Object.keys(record).some((k) => k !== 'ref_ids')) return bad('Selección geológica con campos no permitidos.', 'shape')
  const ids = record.ref_ids
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return bad('ref_ids debe ser una lista de textos.', 'shape')
  if (ids.length > MAX_REFS_TOTAL) return bad(`Más de ${MAX_REFS_TOTAL} referencias geológicas.`, 'total_limit')
  const known = new Map(catalog.refs.map((r) => [r.ref_id, r]))
  const seen = new Set<string>()
  const perSite = new Map<string, number>()
  for (const id of ids as string[]) {
    const ref = known.get(id)
    if (!ref) return bad(`Referencia geológica ajena al catálogo: ${id.slice(0, 80)}.`, 'foreign_ref')
    if (seen.has(id)) return bad('Referencia geológica repetida.', 'duplicate')
    seen.add(id)
    const n = (perSite.get(ref.site_id) ?? 0) + 1
    if (n > MAX_REFS_PER_SITE) return bad(`Más de ${MAX_REFS_PER_SITE} referencias para un sector.`, 'site_limit', ref.site_id)
    perSite.set(ref.site_id, n)
  }
  return { ok: true, selection: { ref_ids: [...(ids as string[])] } }
}

/** Selección sin IA: no usa el objetivo. Prioriza límites del mapa y luego identidad de la unidad principal. */
export function deterministicGeologyRefs(catalog: GeologyCatalog): GeologySelectionResult {
  const out: string[] = []
  for (const site of catalog.sites) {
    const mine = catalog.refs.filter((r) => r.site_id === site.site_id)
    const pick = (p: GeologyPurpose): GeologyRef | undefined => mine.find((r) => r.purpose === p)
    const chosen = [pick('verificar_hueco_cartografico'), pick('resolver_ambiguedad'), pick('confirmar_descripcion_ausente'), pick('contrastar_escala'), pick('correspondencia_mapa_terreno'), pick('caracterizar_material_superficial')]
      .filter((r): r is GeologyRef => !!r).slice(0, MAX_REFS_PER_SITE)
    for (const r of chosen) if (out.length < MAX_REFS_TOTAL) out.push(r.ref_id)
  }
  return { ref_ids: out }
}

export type GeologyGuidanceSource = 'anthropic' | 'deterministic_template'

export interface GeologyGuidanceItem { ref: GeologyRef; unit: GeologyUnitBrief | null; purpose_label: string }
export interface GeologyGuidanceView {
  source: GeologyGuidanceSource
  notice: string
  scope_note: string | null
  sites: Array<{ brief: GeologySiteBrief; items: GeologyGuidanceItem[] }>
  excluded: GeologyExcluded[]
}

export const GEOLOGY_NOTICE: Record<GeologyGuidanceSource, string> = {
  anthropic: 'Selección asistida por IA (Anthropic) entre referencias que calcula la app a partir de la cartografía oficial y de su objetivo confirmado. La IA no escribe hechos geológicos: cada punto es orientación editorial, no una medición.',
  deterministic_template: 'Orientación general sin IA: prioriza los límites del mapa y la unidad principal; no depende de su objetivo. Es orientación editorial, no una medición.',
}

/** Compone la vista desde el catálogo; los hechos nunca vienen del texto del modelo. Los límites del sector siempre salen. */
export function composeGeologyGuidance(catalog: GeologyCatalog, refIds: string[], source: GeologyGuidanceSource): GeologyGuidanceView {
  const byId = new Map(catalog.refs.map((r) => [r.ref_id, r]))
  return {
    source,
    notice: GEOLOGY_NOTICE[source],
    scope_note: catalog.scope_mode === 'point' || catalog.scope_mode === 'bbox'
      ? 'Su geometría es un punto o área: lo que sigue es geología de la ventana completa elegida, no del punto o área pedidos.'
      : null,
    sites: catalog.sites.map((brief) => ({
      brief,
      items: refIds.map((id) => byId.get(id)).filter((r): r is GeologyRef => !!r && r.site_id === brief.site_id)
        .map((ref) => ({ ref, unit: brief.units.find((u) => u.unit_id === ref.unit_id) ?? null, purpose_label: PURPOSE_LABEL[ref.purpose] })),
    })),
    excluded: catalog.excluded,
  }
}

/** Registro de la UI para una llamada con canal geológico (aparte del registro M8, misma llamada y misma procedencia). */
export interface GeologyAiRecord {
  context_fingerprint: string
  catalog_fingerprint: string
  request_fingerprint: string
  evaluation_fingerprint: string
  selection: GeologySelectionResult
}

/** Presupuesto efectivo de referencias: min(12, 3 × sectores con referencias elegibles). */
export function geologyBudget(catalog: GeologyCatalog): { per_site: number; total: number } {
  const eligible = new Set(catalog.refs.map((r) => r.site_id)).size
  return { per_site: MAX_REFS_PER_SITE, total: Math.min(MAX_REFS_TOTAL, MAX_REFS_PER_SITE * eligible) }
}
