// M10 export: wrapper with its own kind/version that embeds the M8 export WITHOUT changes and adds the
// geological guidance actually used (self-contained subset, validatable per sector, context identity,
// selection and provenance). Existing M8 1.0 exports are neither changed nor rewritten.
// Versions (explicit pairing, never reinterpreted): wrapper 1 ↔ mission export 1.0.0 ↔ geology exports v1 (frozen
// Spanish wording); wrapper 2 ↔ mission export 1.1.0 ↔ geology exports v2 (English wording).
import Ajv2020 from 'ajv/dist/2020'
import wrapperSchema from '../../contracts/mission-geology-export.schema.json'
import { RULES_VERSION } from '../mission/catalog'
import { evaluationFingerprint } from '../mission/evaluate'
import { canonicalJson, fingerprint } from '../mission/fingerprint'
import { MissionExportError, buildMissionExport, userChangesFrom, type AiProvenance } from '../mission/exportReport'
import { checkSelection } from '../mission/explanation'
import type { EvidenceBundle, MissionEvaluation } from '../mission/types'
import { evaluateMission } from '../mission/evaluate'
import { EXPORT_LANGUAGE_1_1, isEvaluationVersion, missionText } from '../mission/text'
import { validateMissionExport, validateMissionRequest } from '../mission/validate'
import { GeologyContractError, buildGeologyExport, parseGeologyContext, validateGeologyExport, type GeologyContext, type GeologyExport } from './context'
import {
  buildGeologyCatalog, catalogSourceFromExports, checkGeologySelection, composeGeologyGuidance, deterministicGeologyRefs, type GeologyAiRecord,
} from './guidance'
import { DEFAULT_GEOLOGY_EXPORT_VERSION, evaluationVersionFor, geologyText, geologyVersionFor, isGeologyTextVersion, type GeologyText, type GeologyTextVersion } from './text'

export const GEOLOGY_WRAPPER_KIND = 'analogos-mission-geology-export'
// Wrapper texts of the default (English) version for importers; each wrapper uses the texts of its own version,
// so legacy v1 reconstruction stays bound to the frozen Spanish pack (geologyText(1)).
const DEFAULT_WRAPPER = geologyText(DEFAULT_GEOLOGY_EXPORT_VERSION).wrapper
export const FINGERPRINT_METHOD = DEFAULT_WRAPPER.fingerprintMethod
export const SUBSET_FINGERPRINT_METHOD = DEFAULT_WRAPPER.subsetFingerprintMethod
export const IDENTITY_NOTE = DEFAULT_WRAPPER.identityNote

export class GeologyExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeologyExportError'
  }
}

export interface WrapperGuidanceInput {
  mode: 'ai' | 'deterministic'
  ref_ids: string[]
  /** Record of the call's geological channel (ai mode only) and provenance of that SAME call. */
  ai?: { record: GeologyAiRecord; provenance: AiProvenance }
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validateShape = ajv.compile(wrapperSchema)

export const WRAPPER_DESCRIPTION = DEFAULT_WRAPPER.description
export const WRAPPER_HOW_TO_READ = DEFAULT_WRAPPER.howToRead

/** Declared identity of the complete package, based on the validated context. */
function identityOf(context: GeologyContext, contextFp: string, subsetFp: string, text: GeologyText) {
  return {
    context_fingerprint: contextFp, subset_fingerprint: subsetFp, subset_fingerprint_method: text.wrapper.subsetFingerprintMethod, fingerprint_method: text.wrapper.fingerprintMethod, verifiable_from_this_file: false as const,
    package_kind: context.kind, package_schema_version: context.schema_version, snapshot_version: context.snapshot_version,
    pipeline_version: context.pipeline_version, candidates_file: context.candidates_file, candidates_sha256: context.candidates_sha256, note: text.wrapper.identityNote,
  }
}

/**
 * Version coherence of a mission export (1.0.0 or 1.1.0) that needs no snapshot: export/evaluation versions match
 * and every authored text (rules, ordering rule, limits, language block) is exactly the one of that version. A
 * 1.1.0 file with Spanish rules, or a 1.0.0 file relabeled 1.1.0, is rejected instead of reinterpreted.
 */
function versionIssues(doc: Record<string, unknown> & { evaluation: MissionEvaluation }): string[] {
  const version = doc.export_version
  if (!isEvaluationVersion(version)) return [`Unsupported export version: ${String(version).slice(0, 40)}.`]
  if (doc.evaluation.evaluation_version !== version) return ['Export version and evaluation version do not match.']
  const text = missionText(version)
  const issues: string[] = []
  const rules = doc.rules as { rules_version: string; ordering_rule: string; status_definitions: unknown }
  if (rules.rules_version !== RULES_VERSION || doc.evaluation.rules_version !== RULES_VERSION) issues.push('Unknown rules version.')
  if (rules.ordering_rule !== text.orderingRule || doc.evaluation.ordering_rule !== text.orderingRule
    || canonicalJson(rules.status_definitions) !== canonicalJson(text.statusDefinitions) || canonicalJson(doc.evaluation.limits) !== canonicalJson(text.limits)) {
    issues.push(`Rules, status definitions or limits do not match the wording of version ${version}.`)
  }
  if (version === '1.0.0' ? doc.language !== undefined : canonicalJson(doc.language) !== canonicalJson(EXPORT_LANGUAGE_1_1)) {
    issues.push(`Language block does not match version ${version}.`)
  }
  return issues
}

/**
 * Audit of an M8 1.0 export (embedded or standalone). With `bundle` it RECONSTRUCTS it with `buildMissionExport`
 * (request + snapshot + AI records) and requires full equality; without a bundle it checks what does not need the
 * snapshot: contract, fingerprints, AI selection against the embedded evaluation, brief/proposal fingerprint and user changes.
 */
export function auditMissionExport(m8: unknown, bundle?: EvidenceBundle): string[] {
  const shape = validateMissionExport(m8)
  if (shape.length) return [`The mission export does not meet its contract (supported versions 1.0.0 and 1.1.0): ${shape[0]}`]
  const doc = m8 as Record<string, unknown> & {
    request: never; evaluation: MissionEvaluation; evaluation_fingerprint: string
    ai: { draft: { provenance: AiProvenance; brief_fingerprint: string; proposal_fingerprint: string; proposal: never; user_changes: unknown } | null; explanation: { provenance: AiProvenance; selection: unknown; request_fingerprint: string; evaluation_fingerprint: string } | null }
  }
  const issues: string[] = versionIssues(doc)
  if (issues.length) return issues
  const checked = validateMissionRequest(doc.request, { requireConfirmed: true })
  if (!checked.ok) return [`The embedded request is invalid or not confirmed: ${checked.issues[0]}`]
  const reqFp = fingerprint(checked.request)
  const evalFp = evaluationFingerprint(doc.evaluation)
  if (doc.evaluation.request_fingerprint !== reqFp) issues.push('The embedded evaluation does not belong to the embedded request.')
  if (doc.evaluation_fingerprint !== evalFp) issues.push('The mission evaluation fingerprint does not match.')
  const ex = doc.ai.explanation
  if (ex) {
    if (ex.request_fingerprint !== reqFp || ex.evaluation_fingerprint !== evalFp) issues.push('The AI explanation belongs to another request or evaluation.')
    const sel = checkSelection(ex.selection, doc.evaluation)
    if (!sel.ok) issues.push(`Invalid AI selection: ${sel.reason}`)
  }
  const dr = doc.ai.draft
  if (dr) {
    if (dr.brief_fingerprint !== fingerprint(checked.request.brief)) issues.push('The brief changed after the AI draft.')
    if (dr.proposal_fingerprint !== fingerprint(dr.proposal)) issues.push('The AI proposal fingerprint does not match.')
    if (canonicalJson(dr.user_changes) !== canonicalJson(userChangesFrom(dr.proposal, checked.request))) issues.push('The declared user changes do not match the computed ones.')
  }
  if (issues.length) return issues
  if (bundle) {
    try {
      const rebuilt = buildMissionExport(checked.request, doc.evaluation, bundle, {
        draft: dr ? { provenance: dr.provenance, brief_fingerprint: dr.brief_fingerprint, proposal: dr.proposal } : null,
        explanation: ex ? { provenance: ex.provenance, selection: ex.selection as never, request_fingerprint: ex.request_fingerprint, evaluation_fingerprint: ex.evaluation_fingerprint } : null,
      })
      if (canonicalJson(rebuilt) !== canonicalJson(m8)) issues.push('The mission export does not match the one rebuilt from the request, the snapshot and the AI records.')
    } catch (error) {
      issues.push(error instanceof MissionExportError ? error.message : 'The mission export could not be rebuilt.')
    }
  }
  return issues
}

/**
 * Builds the wrapper. The context is validated against the snapshot candidates (`bundle`): provenance is not assumed.
 * Rejects (GeologyExportError) if anything does not match: inconsistent M8, foreign context/fingerprint, foreign selection or provenance.
 * The wrapper version follows the embedded mission export (1.0.0 → wrapper 1, 1.1.0 → wrapper 2); any other is rejected.
 */
export function buildMissionGeologyExport(
  missionExport: Record<string, unknown>,
  evaluation: MissionEvaluation,
  context: GeologyContext,
  contextFingerprint: string,
  input: WrapperGuidanceInput,
  opts: { bundle: EvidenceBundle },
): Record<string, unknown> {
  const embeddedVersion = missionExport?.export_version
  if (!isEvaluationVersion(embeddedVersion)) throw new GeologyExportError(`Unsupported embedded mission export version: ${String(embeddedVersion).slice(0, 40)}.`)
  const version = geologyVersionFor(embeddedVersion)
  const text = geologyText(version)
  const m8Issues = auditMissionExport(missionExport, opts.bundle)
  if (m8Issues.length) throw new GeologyExportError(`The embedded mission export is not consistent: ${m8Issues[0]}`)
  try {
    parseGeologyContext(context, opts.bundle.candidates)
  } catch (error) {
    throw new GeologyExportError(error instanceof GeologyContractError ? error.message : 'The geology context does not belong to the snapshot.')
  }
  if (fingerprint(context) !== contextFingerprint) throw new GeologyExportError('The fingerprint does not belong to the given geology context.')
  if (canonicalJson(missionExport.evaluation) !== canonicalJson(evaluation)) throw new GeologyExportError('The evaluation is not the one in the embedded mission export.')
  const catalog = buildGeologyCatalog(evaluation, context, contextFingerprint)
  const checked = checkGeologySelection({ ref_ids: input.ref_ids }, catalog)
  if (!checked.ok) throw new GeologyExportError(`Invalid geology selection: ${checked.reason}`)
  let ai: Record<string, unknown> | null = null
  if (input.mode === 'ai') {
    const a = input.ai
    if (!a) throw new GeologyExportError('Mode ai requires the record and the provenance of the call.')
    const g = a.record
    if (g.context_fingerprint !== contextFingerprint || g.catalog_fingerprint !== catalog.catalog_fingerprint
      || g.request_fingerprint !== catalog.request_fingerprint || g.evaluation_fingerprint !== catalog.evaluation_fingerprint
      || canonicalJson(g.selection.ref_ids) !== canonicalJson(checked.selection.ref_ids)) {
      throw new GeologyExportError('The geology AI record belongs to another context, request, evaluation or selection.')
    }
    const explanation = (missionExport.ai as { explanation?: { provenance?: unknown; request_fingerprint?: unknown; evaluation_fingerprint?: unknown } | null } | undefined)?.explanation
    if (!explanation || canonicalJson(explanation.provenance) !== canonicalJson(a.provenance)
      || explanation.request_fingerprint !== g.request_fingerprint || explanation.evaluation_fingerprint !== g.evaluation_fingerprint) {
      throw new GeologyExportError('The geology selection does not come from the same call as the embedded mission explanation.')
    }
    ai = { provenance: a.provenance, request_fingerprint: g.request_fingerprint, evaluation_fingerprint: g.evaluation_fingerprint, catalog_fingerprint: g.catalog_fingerprint }
  } else if (canonicalJson(checked.selection.ref_ids) !== canonicalJson(deterministicGeologyRefs(catalog).ref_ids)) {
    throw new GeologyExportError('The deterministic guidance does not match the one the app computes.')
  }
  const doc = {
    kind: GEOLOGY_WRAPPER_KIND, schema_version: version, status: 'preliminary_geological_guidance',
    export_info: { description: text.wrapper.description, how_to_read: text.wrapper.howToRead, embedded_mission_export_version: embeddedVersion },
    mission_export: missionExport,
    geology_guidance: {
      mode: input.mode,
      context_identity: identityOf(context, contextFingerprint, catalog.subset_fingerprint, text),
      geology_exports: catalog.sites.map((s) => buildGeologyExport(context, s.site_id, version)),
      catalog: {
        catalog_fingerprint: catalog.catalog_fingerprint, subset_fingerprint: catalog.subset_fingerprint, request_fingerprint: catalog.request_fingerprint,
        evaluation_fingerprint: catalog.evaluation_fingerprint, scope_mode: catalog.scope_mode, ref_ids: catalog.refs.map((r) => r.ref_id), excluded: catalog.excluded,
      },
      selection: checked.selection,
      ai,
      guidance: composeGeologyGuidance(catalog, checked.selection.ref_ids, input.mode === 'ai' ? 'anthropic' : 'deterministic_template'),
    },
  }
  const issues = validateMissionGeologyExport(JSON.parse(JSON.stringify(doc)), { bundle: opts.bundle })
  if (issues.length) throw new GeologyExportError(`Invalid geology export: ${issues.join('; ')}`)
  return doc
}

/**
 * Validates a wrapper independently: contract, embedded M8 export (audited; reconstructed with `bundle`),
 * per-sector subsets (anchored to the candidates with `bundle`: exact geometry), recalculated catalog and guide,
 * subset fingerprint, selection, fingerprints and provenance. Without `bundle` the geometry CANNOT be anchored to the snapshot:
 * only internal inconsistency is detected (the identity of the complete package is declared).
 */
export function validateMissionGeologyExport(doc: unknown, opts: { bundle?: EvidenceBundle } = {}): string[] {
  if (!validateShape(doc)) return (validateShape.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
  const d = doc as unknown as {
    schema_version: GeologyTextVersion
    export_info: { description: string; how_to_read: string[]; embedded_mission_export_version: string }
    mission_export: Record<string, unknown>
    geology_guidance: {
      mode: 'ai' | 'deterministic'; context_identity: ReturnType<typeof identityOf>; geology_exports: unknown[]
      catalog: { catalog_fingerprint: string; subset_fingerprint: string; request_fingerprint: string; evaluation_fingerprint: string; scope_mode: string; ref_ids: string[]; excluded: unknown[] }
      selection: { ref_ids: string[] }; ai: { provenance: unknown; request_fingerprint: string; evaluation_fingerprint: string; catalog_fingerprint: string } | null; guidance: unknown
    }
  }
  if (!isGeologyTextVersion(d.schema_version)) return ['Unsupported wrapper version.']
  const version = d.schema_version
  const text = geologyText(version)
  const m8 = d.mission_export
  // Explicit pairing, also semantically: wrapper 1 ↔ 1.0.0 ↔ geology exports v1; wrapper 2 ↔ 1.1.0 ↔ v2.
  if (m8.export_version !== evaluationVersionFor(version) || d.export_info.embedded_mission_export_version !== evaluationVersionFor(version)) {
    return [`Wrapper version ${version} must embed mission export ${evaluationVersionFor(version)}.`]
  }
  const m8Issues = auditMissionExport(m8, opts.bundle)
  if (m8Issues.length) return m8Issues.map((i) => `mission_export: ${i}`)
  const evaluation = m8.evaluation as MissionEvaluation
  const g = d.geology_guidance
  const issues: string[] = []
  if (d.export_info.description !== text.wrapper.description || canonicalJson(d.export_info.how_to_read) !== canonicalJson(text.wrapper.howToRead)) {
    issues.push(`export_info does not match the wording of wrapper version ${version}.`)
  }
  const idText = g.context_identity
  if (idText.fingerprint_method !== text.wrapper.fingerprintMethod || idText.subset_fingerprint_method !== text.wrapper.subsetFingerprintMethod || idText.note !== text.wrapper.identityNote) {
    issues.push(`context_identity wording does not match wrapper version ${version}.`)
  }
  if (g.geology_exports.some((e) => (e as { schema_version?: unknown })?.schema_version !== version)) issues.push(`Geology exports must be version ${version} in wrapper version ${version}.`)
  if (issues.length) return issues
  const exportsOk: GeologyExport[] = []
  for (const raw of g.geology_exports) {
    try {
      const siteId = (raw as { site?: { site_id?: string } }).site?.site_id
      const candidate = opts.bundle ? opts.bundle.candidates.find((c) => c.site_id === siteId) ?? null : null
      if (opts.bundle && !candidate) throw new GeologyContractError(`${siteId}: the sector is not in the snapshot.`)
      exportsOk.push(validateGeologyExport(raw, candidate))
    } catch (error) {
      issues.push(`Invalid geology subset: ${error instanceof Error ? error.message : 'error'}`)
    }
  }
  if (issues.length) return issues
  const id = g.context_identity
  for (const e of exportsOk) {
    const info = e.export_info
    if (info.snapshot_version !== id.snapshot_version || info.snapshot_version !== evaluation.snapshot_version) issues.push(`${e.site.site_id}: snapshot differs from the declared or evaluated one.`)
    if (info.pipeline_version !== id.pipeline_version || info.full_candidates_file_sha256 !== id.candidates_sha256 || info.full_candidates_file !== id.candidates_file) issues.push(`${e.site.site_id}: package identity differs from the declared one.`)
  }
  if (new Set(exportsOk.map((e) => e.site.site_id)).size !== exportsOk.length) issues.push('Repeated geology sectors.')
  if (issues.length) return issues
  // Everything is recalculated from the subsets and the embedded evaluation: nothing declared is accepted on faith.
  const catalog = buildGeologyCatalog(evaluation, catalogSourceFromExports(exportsOk), id.context_fingerprint)
  const usedIds = catalog.sites.map((s) => s.site_id)
  if (canonicalJson(exportsOk.map((e) => e.site.site_id)) !== canonicalJson(usedIds)) issues.push('The geology subsets are not exactly the catalog sectors, in order.')
  if (id.subset_fingerprint !== fingerprint(exportsOk)) issues.push('The declared subset fingerprint does not match the included subsets (geometry, units, sources or citations altered).')
  if (g.catalog.subset_fingerprint !== catalog.subset_fingerprint) issues.push('The catalog subset fingerprint does not match.')
  if (g.catalog.catalog_fingerprint !== catalog.catalog_fingerprint || g.catalog.request_fingerprint !== catalog.request_fingerprint
    || g.catalog.evaluation_fingerprint !== catalog.evaluation_fingerprint || g.catalog.scope_mode !== catalog.scope_mode
    || canonicalJson(g.catalog.ref_ids) !== canonicalJson(catalog.refs.map((r) => r.ref_id)) || canonicalJson(g.catalog.excluded) !== canonicalJson(catalog.excluded)) {
    issues.push('The declared catalog does not match the recomputed one (context, subsets, request, evaluation or references).')
  }
  const picked = checkGeologySelection(g.selection, catalog)
  if (!picked.ok) issues.push(`Invalid geology selection: ${picked.reason}`)
  if (g.mode === 'ai') {
    const a = g.ai
    const ex = (m8.ai as { explanation?: { provenance?: unknown; request_fingerprint?: string; evaluation_fingerprint?: string } | null }).explanation
    if (!a) issues.push('Mode ai requires the ai block.')
    else if (a.catalog_fingerprint !== catalog.catalog_fingerprint || a.request_fingerprint !== catalog.request_fingerprint || a.evaluation_fingerprint !== catalog.evaluation_fingerprint) issues.push('The geology AI belongs to another catalog, request or evaluation.')
    else if (!ex || canonicalJson(ex.provenance) !== canonicalJson(a.provenance) || ex.request_fingerprint !== a.request_fingerprint || ex.evaluation_fingerprint !== a.evaluation_fingerprint) issues.push('The geology selection does not come from the same call as the embedded mission explanation.')
  } else {
    if (g.ai !== null) issues.push('Deterministic mode does not allow an ai block.')
    if (picked.ok && canonicalJson(picked.selection.ref_ids) !== canonicalJson(deterministicGeologyRefs(catalog).ref_ids)) issues.push('The deterministic guidance does not match the one the app computes.')
  }
  if (picked.ok) {
    const expected = composeGeologyGuidance(catalog, picked.selection.ref_ids, g.mode === 'ai' ? 'anthropic' : 'deterministic_template')
    if (canonicalJson(g.guidance) !== canonicalJson(expected)) issues.push('The declared guidance does not match the recomputed one.')
  }
  return issues
}

export type ExportFormat = 'mission-export-1.0' | 'mission-export-1.1' | 'mission-geology-export-1' | 'mission-geology-export-2' | 'unknown'

/** Explicit acceptance of formats: M8 1.0/1.1 and wrapper 1/2; nothing else (no other version is reinterpreted). */
export function detectMissionExportFormat(doc: unknown): ExportFormat {
  if (!doc || typeof doc !== 'object') return 'unknown'
  const r = doc as Record<string, unknown>
  if (r.kind === GEOLOGY_WRAPPER_KIND && r.schema_version === 1) return 'mission-geology-export-1'
  if (r.kind === GEOLOGY_WRAPPER_KIND && r.schema_version === 2) return 'mission-geology-export-2'
  if (r.export_version === '1.0.0' && r.kind === undefined) return 'mission-export-1.0'
  if (r.export_version === '1.1.0' && r.kind === undefined) return 'mission-export-1.1'
  return 'unknown'
}

/** Validates any of the accepted formats. */
export function validateAnyMissionExport(doc: unknown, opts: { bundle?: EvidenceBundle } = {}): { format: ExportFormat; issues: string[] } {
  const format = detectMissionExportFormat(doc)
  if (format === 'mission-geology-export-1' || format === 'mission-geology-export-2') return { format, issues: validateMissionGeologyExport(doc, opts) }
  if (format === 'mission-export-1.0' || format === 'mission-export-1.1') return { format, issues: auditMissionExport(doc, opts.bundle) }
  return { format, issues: ['Unrecognized export format (accepted: mission export 1.0.0/1.1.0 and geology wrapper 1/2).'] }
}
