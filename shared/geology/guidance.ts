// Geological guidance for a test (M10, ADR-011). A SEPARATE layer from the deterministic M8 result:
// it does not change statuses, rankings, scores, or requirements. The closed catalog of references (unit + purpose)
// is computed by the server from the validated official geological package and the recalculated evaluation; the AI can only
// CHOOSE references from that catalog. The phrases are provided by fixed templates: editorial guidance,
// never measurements or inferred lithology.
import { evaluationFingerprint } from '../mission/evaluate'
import { fingerprint } from '../mission/fingerprint'
import type { MissionEvaluation, OptionStatus } from '../mission/types'
import {
  GEOLOGY_POLICY, buildGeologyExport, type GeologyAvailability, type GeologyContext, type GeologyExport, type GeologySite, type GeologySource, type GeologyUnit,
} from './context'
import { DEFAULT_GEOLOGY_EXPORT_VERSION, geologyText, geologyVersionFor, type GeologyText, type GeologyTextVersion } from './text'

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

/** English labels for the UI; the composed guidance uses the pack of its own version. */
export const PURPOSE_LABEL: Record<GeologyPurpose, string> = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION).purposeLabel

/** What each purpose means, for the AI (prompt data; not a geological fact). Purpose IDs are stable codes. */
export const PURPOSE_DEFINITION: Record<GeologyPurpose, string> = {
  verificar_hueco_cartografico: 'Check what is where the layer has no polygon (only if part of the sector is unmapped or unusable). No unit attached.',
  resolver_ambiguedad: 'Resolve which of the overlapping units applies (only units with an overlap fraction).',
  confirmar_descripcion_ausente: 'Obtain the description of a unit whose original description is missing.',
  correspondencia_mapa_terreno: 'Check in the field whether what is observed matches the map description of the unit (unit with an original description).',
  caracterizar_material_superficial: "Prepare field measurement of grain size, compaction and friction of the unit's surface material (relevant for mobility/traction; the map does not report them).",
  diversidad_litologica_muestreo: 'Recognize the lithological diversity of the sector to plan sampling or instrumentation (only sectors with 2 or more units).',
  contrastar_escala: 'Compare the regional mapping with the most detailed mapping available. No unit attached.',
}

export interface GeologyUnitBrief {
  unit_id: string
  code: string | null
  name: string | null
  description: string | null
  /** Fraction of the sector WITH overlap (fraction_including_overlap): shared zones count toward each unit; do not sum across units. */
  fraction: number
  /** Part of `fraction` without overlap with another unit (no double counting). */
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
  /** With a point/bbox, the geology is that of the entire WINDOW, never of the requested geometry. */
  applies_to: 'evaluated_window' | 'window_not_requested_geometry'
  fractions: { unmapped: number; covered_total: number; covered_ambiguous: number; unusable_upper_bound: number; without_description: number }
  scale_denominator: number
  source: { source_id: string; authority: string; distributor: string; dataset_name: string; dataset_url: string; map_date: string | null }
  units: GeologyUnitBrief[]
  units_omitted: number
  /** Always visible, even if the AI selects nothing. */
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
  /** SHA-256 of the canonical JSON of the exact subsets (geology-export) of the catalog's sectors: complete evidence, reconstructible without the entire package. */
  subset_fingerprint: string
  request_fingerprint: string
  evaluation_fingerprint: string
  scope_mode: MissionEvaluation['resolution']['mode']
  sites: GeologySiteBrief[]
  refs: GeologyRef[]
  excluded: GeologyExcluded[]
  /** Links context, request, evaluation, and the exact set of references offered (and their texts). */
  catalog_fingerprint: string
  /** Version of the evaluation the catalog was built from (selects the wording; NOT part of catalog_fingerprint, which already binds the evaluation). */
  evaluation_version: MissionEvaluation['evaluation_version']
}

/** Origin of the catalog: the complete context or, when auditing an export, only its subsets by sector. */
export type GeologyCatalogSource = Pick<GeologyContext, 'sites' | 'sources'> & { exportFor: (siteId: string) => GeologyExport }

/** `version` is the per-site geology export version paired with the evaluation (1 ↔ 1.0.0, 2 ↔ 1.1.0). */
export function catalogSourceFromContext(context: GeologyContext, version: GeologyTextVersion): GeologyCatalogSource {
  return { sites: context.sites, sources: context.sources, exportFor: (siteId) => buildGeologyExport(context, siteId, version) }
}

export function catalogSourceFromExports(exports: GeologyExport[]): GeologyCatalogSource {
  const sources = new Map<string, GeologyExport['source']>()
  for (const e of exports) sources.set(e.source.source_id, e.source)
  return {
    sites: exports.map((e) => e.site) as unknown as GeologyContext['sites'],
    sources: [...sources.values()] as unknown as GeologyContext['sources'],
    exportFor: (siteId) => {
      const found = exports.find((e) => e.site.site_id === siteId)
      if (!found) throw new GeologyGuidanceError(`Missing subset for ${siteId}.`)
      return found
    },
  }
}

export class GeologyGuidanceError extends Error {}

/** Floating-point noise (e.g. 1e-15 of overlap in an “available” sector) counts as neither gap nor ambiguity: same tolerance as `available`. */
const EPS = GEOLOGY_POLICY.available_tolerance

function siteLimits(site: GeologySite, source: GeologySource, appliesTo: GeologySiteBrief['applies_to'], text: GeologyText): string[] {
  const f = site.area_fractions
  const pct = text.formatCoverage
  const t = text.limits
  const out = [
    t.regional(text.formatScaleLabel(source.scale_denominator), source.authority_original),
    t.status(text.availabilityLabel[site.availability]),
  ]
  if (site.availability === 'no_coverage') out.push(t.noCoverage)
  if (site.availability !== 'no_coverage' && f.unmapped > EPS) out.push(t.unmapped(pct(f.unmapped)))
  if (f.covered_ambiguous > EPS) out.push(t.ambiguous(pct(f.covered_ambiguous)))
  if (f.unusable_upper_bound > EPS) out.push(t.unusable(pct(f.unusable_upper_bound)))
  if (f.covered_by_units_without_description > EPS) out.push(t.withoutDescription(pct(f.covered_by_units_without_description)))
  if (source.map_date === null) out.push(t.mapDateUnknown)
  if (site.units.length > 0) out.push(t.unitsNote)
  if (appliesTo === 'window_not_requested_geometry') out.push(t.windowContext)
  return out
}

function toUnitBrief(u: GeologyUnit): GeologyUnitBrief {
  return {
    unit_id: u.unit_id, code: u.code, name: u.name, description: u.description_present ? u.description : null,
    fraction: u.fraction_including_overlap, fraction_unambiguous: u.fraction_unambiguous, fraction_in_ambiguity: u.fraction_in_ambiguity,
  }
}

function refsForSite(brief: GeologySiteBrief, text: GeologyText): GeologyRef[] {
  if (brief.availability === 'no_coverage' || brief.availability === 'unavailable' && brief.units.length === 0) return []
  const refs: GeologyRef[] = []
  const add = (purpose: GeologyPurpose, unit: GeologyUnitBrief | null): void => {
    const ctx = { gapFraction: brief.fractions.unmapped + brief.fractions.unusable_upper_bound, unitCount: brief.units.length, scaleDenominator: brief.scale_denominator }
    refs.push({ ref_id: `${brief.site_id}|geo|${unit?.unit_id ?? 'site'}|${purpose}`, site_id: brief.site_id, unit_id: unit?.unit_id ?? null, purpose, text: text.purposeText(purpose, unit, ctx) })
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
 * Closed catalog for an evaluation. It only emits units from evaluated, non-discarded sectors; without a chosen window
 * (needs_window_selection) or without a complete evaluation, it emits nothing. `context` must already be validated.
 * The wording (limits, reference texts) and the per-site export version follow the evaluation's version
 * (1.0.0 → frozen Spanish / geology v1; 1.1.0 → English / v2); an unknown version throws.
 */
export function buildGeologyCatalog(evaluation: MissionEvaluation, contextOrSource: GeologyContext | GeologyCatalogSource, contextFingerprint: string): GeologyCatalog {
  const version = geologyVersionFor(evaluation.evaluation_version)
  const text = geologyText(version)
  const context = 'exportFor' in contextOrSource ? contextOrSource : catalogSourceFromContext(contextOrSource, version)
  const sites: GeologySiteBrief[] = []
  const excluded: GeologyExcluded[] = []
  const refs: GeologyRef[] = []
  const appliesTo: GeologySiteBrief['applies_to'] = evaluation.resolution.mode === 'point' || evaluation.resolution.mode === 'bbox' ? 'window_not_requested_geometry' : 'evaluated_window'
  if (evaluation.outcome === 'evaluated') {
    for (const option of evaluation.options) {
      const reason = text.excludedReason[option.status]
      if (reason) {
        excluded.push({ site_id: option.site_id, name: option.name, reason })
        continue
      }
      const site = context.sites.find((s) => s.site_id === option.site_id)
      const source = site && context.sources.find((s) => s.source_id === site.source_id)
      if (!site || !source) {
        excluded.push({ site_id: option.site_id, name: option.name, reason: text.missingSite })
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
        limits: siteLimits(site, source, appliesTo, text),
      }
      sites.push(brief)
      refs.push(...refsForSite(brief, text))
    }
  } else {
    for (const option of evaluation.options) excluded.push({ site_id: option.site_id, name: option.name, reason: text.noFullEvaluation })
  }
  const base = {
    context_fingerprint: contextFingerprint, subset_fingerprint: fingerprint(sites.map((s) => context.exportFor(s.site_id))), request_fingerprint: evaluation.request_fingerprint, evaluation_fingerprint: evaluationFingerprint(evaluation),
    scope_mode: evaluation.resolution.mode, sites, refs, excluded,
  }
  return { ...base, catalog_fingerprint: fingerprint(base), evaluation_version: evaluation.evaluation_version }
}

export interface GeologySelectionResult { ref_ids: string[] }
/** Typed reason for rejection (controlled: never contains provider text); `site_id` only if it belongs to the catalog. */
export type GeologyRejection = 'shape' | 'total_limit' | 'site_limit' | 'foreign_ref' | 'duplicate'
export type GeologySelectionCheck = { ok: true; selection: GeologySelectionResult } | { ok: false; reason: string; code: GeologyRejection; site_id?: string }

/** Strict validation: closed shape, membership, uniqueness, and caps. Any violation discards everything, without repair. */
export function checkGeologySelection(raw: unknown, catalog: GeologyCatalog): GeologySelectionCheck {
  const bad = (reason: string, code: GeologyRejection, site_id?: string): GeologySelectionCheck => ({ ok: false, reason, code, ...(site_id ? { site_id } : {}) })
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('Malformed geology selection.', 'shape')
  const record = raw as Record<string, unknown>
  if (Object.keys(record).some((k) => k !== 'ref_ids')) return bad('Geology selection with fields that are not allowed.', 'shape')
  const ids = record.ref_ids
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return bad('ref_ids must be a list of strings.', 'shape')
  if (ids.length > MAX_REFS_TOTAL) return bad(`More than ${MAX_REFS_TOTAL} geology references.`, 'total_limit')
  const known = new Map(catalog.refs.map((r) => [r.ref_id, r]))
  const seen = new Set<string>()
  const perSite = new Map<string, number>()
  for (const id of ids as string[]) {
    const ref = known.get(id)
    if (!ref) return bad(`Geology reference not in the catalog: ${id.slice(0, 80)}.`, 'foreign_ref')
    if (seen.has(id)) return bad('Repeated geology reference.', 'duplicate')
    seen.add(id)
    const n = (perSite.get(ref.site_id) ?? 0) + 1
    if (n > MAX_REFS_PER_SITE) return bad(`More than ${MAX_REFS_PER_SITE} references for one sector.`, 'site_limit', ref.site_id)
    perSite.set(ref.site_id, n)
  }
  return { ok: true, selection: { ref_ids: [...(ids as string[])] } }
}

/** Selection without AI: does not use the objective. Prioritizes map boundaries and then the identity of the main unit. */
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

/** English notices for importers; the composed view uses the pack of its own version. */
export const GEOLOGY_NOTICE: Record<GeologyGuidanceSource, string> = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION).notice

/** Composes the view from the catalog; the facts never come from the model's text. The sector's limits are always included. */
export function composeGeologyGuidance(catalog: GeologyCatalog, refIds: string[], source: GeologyGuidanceSource): GeologyGuidanceView {
  const text = geologyText(geologyVersionFor(catalog.evaluation_version))
  const byId = new Map(catalog.refs.map((r) => [r.ref_id, r]))
  return {
    source,
    notice: text.notice[source],
    scope_note: catalog.scope_mode === 'point' || catalog.scope_mode === 'bbox' ? text.scopeNote : null,
    sites: catalog.sites.map((brief) => ({
      brief,
      items: refIds.map((id) => byId.get(id)).filter((r): r is GeologyRef => !!r && r.site_id === brief.site_id)
        .map((ref) => ({ ref, unit: brief.units.find((u) => u.unit_id === ref.unit_id) ?? null, purpose_label: text.purposeLabel[ref.purpose] })),
    })),
    excluded: catalog.excluded,
  }
}

/** UI record for a call with a geological channel (separate from the M8 record, same call and same provenance). */
export interface GeologyAiRecord {
  context_fingerprint: string
  catalog_fingerprint: string
  request_fingerprint: string
  evaluation_fingerprint: string
  selection: GeologySelectionResult
}

/** Effective reference budget: min(12, 3 × sectors with eligible references). */
export function geologyBudget(catalog: GeologyCatalog): { per_site: number; total: number } {
  const eligible = new Set(catalog.refs.map((r) => r.site_id)).size
  return { per_site: MAX_REFS_PER_SITE, total: Math.min(MAX_REFS_TOTAL, MAX_REFS_PER_SITE * eligible) }
}
