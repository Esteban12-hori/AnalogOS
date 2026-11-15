// Exportación M10: wrapper con kind/versión propios que embebe SIN cambios la exportación M8 1.0 y agrega la
// orientación geológica efectivamente usada (subconjunto autocontenido y validable por sector, identidad del
// contexto, selección y procedencia). Las exportaciones M8 1.0 existentes no cambian ni se reescriben.
import Ajv2020 from 'ajv/dist/2020'
import wrapperSchema from '../../contracts/mission-geology-export.schema.json'
import { evaluationFingerprint } from '../mission/evaluate'
import { canonicalJson, fingerprint } from '../mission/fingerprint'
import { MissionExportError, buildMissionExport, userChangesFrom, type AiProvenance } from '../mission/exportReport'
import { checkSelection } from '../mission/explanation'
import type { EvidenceBundle, MissionEvaluation } from '../mission/types'
import { evaluateMission } from '../mission/evaluate'
import { validateMissionExport, validateMissionRequest } from '../mission/validate'
import { GeologyContractError, buildGeologyExport, parseGeologyContext, validateGeologyExport, type GeologyContext, type GeologyExport } from './context'
import {
  buildGeologyCatalog, catalogSourceFromExports, checkGeologySelection, composeGeologyGuidance, deterministicGeologyRefs, type GeologyAiRecord,
} from './guidance'

export const GEOLOGY_WRAPPER_KIND = 'analogos-mission-geology-export'
export const FINGERPRINT_METHOD = 'SHA-256 del JSON canónico COMPLETO del contexto geológico validado (shared/mission/fingerprint.ts); no es el hash de los bytes del archivo.'
export const SUBSET_FINGERPRINT_METHOD = 'SHA-256 del JSON canónico de la lista de subconjuntos geology-export incluidos en este archivo (cubre geometría, unidades, fuentes, citas, peticiones y metadatos de cada sector usado). Se recalcula aquí.'
export const IDENTITY_NOTE = 'Este archivo trae solo los sectores usados (cada uno validable por sí solo); la identidad del paquete completo está DECLARADA y no puede recalcularse aquí, porque se omiten los demás sectores.'

export class GeologyExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeologyExportError'
  }
}

export interface WrapperGuidanceInput {
  mode: 'ai' | 'deterministic'
  ref_ids: string[]
  /** Registro del canal geológico de la llamada (solo modo ai) y procedencia de esa MISMA llamada. */
  ai?: { record: GeologyAiRecord; provenance: AiProvenance }
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validateShape = ajv.compile(wrapperSchema)

export const WRAPPER_DESCRIPTION =
  'Recomendación de AnalogOS con orientación geológica para la prueba. Contiene, sin cambios, la exportación de recomendación M8 1.0 '
  + '(resultado determinista) y, aparte, la orientación geológica efectivamente usada con sus fuentes y límites.'
export const WRAPPER_HOW_TO_READ = [
  'mission_export es la exportación M8 1.0 íntegra: el resultado determinista de requisitos no cambia por la geología.',
  'geology_guidance es una capa separada: cartografía regional oficial (no medición de campo) y orientación editorial para reconocimiento y validación; no prueba tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos, y un sector descartado no se rehabilita por su geología.',
  'mode = ai: la IA solo eligió referencias (unidad + propósito) de un catálogo calculado a partir de la cartografía; no escribió hechos. mode = deterministic: orientación general sin IA que no depende del objetivo.',
  'context_identity declara la identidad del paquete geológico completo (no verificable desde este archivo) y la huella exacta de los subconjuntos incluidos (subset_fingerprint, recalculable). geology_exports son subconjuntos validables por sector; con el snapshot confiable también se contrasta su geometría. El catálogo y la guía se recalculan al validar.',
]

/** Identidad declarada del paquete completo, a partir del contexto validado. */
function identityOf(context: GeologyContext, contextFp: string, subsetFp: string) {
  return {
    context_fingerprint: contextFp, subset_fingerprint: subsetFp, subset_fingerprint_method: SUBSET_FINGERPRINT_METHOD, fingerprint_method: FINGERPRINT_METHOD, verifiable_from_this_file: false as const,
    package_kind: context.kind, package_schema_version: context.schema_version, snapshot_version: context.snapshot_version,
    pipeline_version: context.pipeline_version, candidates_file: context.candidates_file, candidates_sha256: context.candidates_sha256, note: IDENTITY_NOTE,
  }
}

/**
 * Auditoría de una exportación M8 1.0 (embebida o suelta). Con `bundle` la RECONSTRUYE con `buildMissionExport`
 * (solicitud + snapshot + registros de IA) y exige igualdad completa; sin bundle comprueba lo que no necesita el
 * snapshot: contrato, huellas, selección de IA contra la evaluación embebida, huella del brief/propuesta y cambios del usuario.
 */
export function auditMissionExport(m8: unknown, bundle?: EvidenceBundle): string[] {
  const shape = validateMissionExport(m8)
  if (shape.length) return [`La exportación M8 no cumple su contrato 1.0: ${shape[0]}`]
  const doc = m8 as Record<string, unknown> & {
    request: never; evaluation: MissionEvaluation; evaluation_fingerprint: string
    ai: { draft: { provenance: AiProvenance; brief_fingerprint: string; proposal_fingerprint: string; proposal: never; user_changes: unknown } | null; explanation: { provenance: AiProvenance; selection: unknown; request_fingerprint: string; evaluation_fingerprint: string } | null }
  }
  const issues: string[] = []
  const checked = validateMissionRequest(doc.request, { requireConfirmed: true })
  if (!checked.ok) return [`La solicitud embebida no es válida o no está confirmada: ${checked.issues[0]}`]
  const reqFp = fingerprint(checked.request)
  const evalFp = evaluationFingerprint(doc.evaluation)
  if (doc.evaluation.request_fingerprint !== reqFp) issues.push('La evaluación embebida no corresponde a la solicitud embebida.')
  if (doc.evaluation_fingerprint !== evalFp) issues.push('La huella de evaluación M8 no coincide.')
  const ex = doc.ai.explanation
  if (ex) {
    if (ex.request_fingerprint !== reqFp || ex.evaluation_fingerprint !== evalFp) issues.push('La explicación de IA pertenece a otra solicitud o evaluación.')
    const sel = checkSelection(ex.selection, doc.evaluation)
    if (!sel.ok) issues.push(`Selección de IA inválida: ${sel.reason}`)
  }
  const dr = doc.ai.draft
  if (dr) {
    if (dr.brief_fingerprint !== fingerprint(checked.request.brief)) issues.push('El brief cambió después del borrador de IA.')
    if (dr.proposal_fingerprint !== fingerprint(dr.proposal)) issues.push('La huella de la propuesta de IA no coincide.')
    if (canonicalJson(dr.user_changes) !== canonicalJson(userChangesFrom(dr.proposal, checked.request))) issues.push('Los cambios del usuario declarados no coinciden con los calculados.')
  }
  if (issues.length) return issues
  if (bundle) {
    try {
      const rebuilt = buildMissionExport(checked.request, doc.evaluation, bundle, {
        draft: dr ? { provenance: dr.provenance, brief_fingerprint: dr.brief_fingerprint, proposal: dr.proposal } : null,
        explanation: ex ? { provenance: ex.provenance, selection: ex.selection as never, request_fingerprint: ex.request_fingerprint, evaluation_fingerprint: ex.evaluation_fingerprint } : null,
      })
      if (canonicalJson(rebuilt) !== canonicalJson(m8)) issues.push('La exportación M8 no coincide con la reconstruida desde la solicitud, el snapshot y los registros de IA.')
    } catch (error) {
      issues.push(error instanceof MissionExportError ? error.message : 'No se pudo reconstruir la exportación M8.')
    }
  }
  return issues
}

/**
 * Construye el wrapper. El contexto se valida contra los candidatos del snapshot (`bundle`): la procedencia no se asume.
 * Rechaza (GeologyExportError) si algo no corresponde: M8 incoherente, contexto/huella ajenos, selección o procedencia ajenas.
 */
export function buildMissionGeologyExport(
  missionExport: Record<string, unknown>,
  evaluation: MissionEvaluation,
  context: GeologyContext,
  contextFingerprint: string,
  input: WrapperGuidanceInput,
  opts: { bundle: EvidenceBundle },
): Record<string, unknown> {
  const m8Issues = auditMissionExport(missionExport, opts.bundle)
  if (m8Issues.length) throw new GeologyExportError(`La exportación M8 embebida no es coherente: ${m8Issues[0]}`)
  try {
    parseGeologyContext(context, opts.bundle.candidates)
  } catch (error) {
    throw new GeologyExportError(error instanceof GeologyContractError ? error.message : 'El contexto geológico no corresponde al snapshot.')
  }
  if (fingerprint(context) !== contextFingerprint) throw new GeologyExportError('La huella no corresponde al contexto geológico dado.')
  if (canonicalJson(missionExport.evaluation) !== canonicalJson(evaluation)) throw new GeologyExportError('La evaluación no es la de la exportación M8 embebida.')
  const catalog = buildGeologyCatalog(evaluation, context, contextFingerprint)
  const checked = checkGeologySelection({ ref_ids: input.ref_ids }, catalog)
  if (!checked.ok) throw new GeologyExportError(`Selección geológica inválida: ${checked.reason}`)
  let ai: Record<string, unknown> | null = null
  if (input.mode === 'ai') {
    const a = input.ai
    if (!a) throw new GeologyExportError('El modo ai exige el registro y la procedencia de la llamada.')
    const g = a.record
    if (g.context_fingerprint !== contextFingerprint || g.catalog_fingerprint !== catalog.catalog_fingerprint
      || g.request_fingerprint !== catalog.request_fingerprint || g.evaluation_fingerprint !== catalog.evaluation_fingerprint
      || canonicalJson(g.selection.ref_ids) !== canonicalJson(checked.selection.ref_ids)) {
      throw new GeologyExportError('El registro de IA geológica pertenece a otro contexto, solicitud, evaluación o selección.')
    }
    const explanation = (missionExport.ai as { explanation?: { provenance?: unknown; request_fingerprint?: unknown; evaluation_fingerprint?: unknown } | null } | undefined)?.explanation
    if (!explanation || canonicalJson(explanation.provenance) !== canonicalJson(a.provenance)
      || explanation.request_fingerprint !== g.request_fingerprint || explanation.evaluation_fingerprint !== g.evaluation_fingerprint) {
      throw new GeologyExportError('La selección geológica no proviene de la misma llamada que la explicación M8 embebida.')
    }
    ai = { provenance: a.provenance, request_fingerprint: g.request_fingerprint, evaluation_fingerprint: g.evaluation_fingerprint, catalog_fingerprint: g.catalog_fingerprint }
  } else if (canonicalJson(checked.selection.ref_ids) !== canonicalJson(deterministicGeologyRefs(catalog).ref_ids)) {
    throw new GeologyExportError('La orientación determinista no coincide con la que calcula la app.')
  }
  const doc = {
    kind: GEOLOGY_WRAPPER_KIND, schema_version: 1, status: 'preliminary_geological_guidance',
    export_info: { description: WRAPPER_DESCRIPTION, how_to_read: WRAPPER_HOW_TO_READ, embedded_mission_export_version: '1.0.0' },
    mission_export: missionExport,
    geology_guidance: {
      mode: input.mode,
      context_identity: identityOf(context, contextFingerprint, catalog.subset_fingerprint),
      geology_exports: catalog.sites.map((s) => buildGeologyExport(context, s.site_id)),
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
  if (issues.length) throw new GeologyExportError(`Exportación geológica inválida: ${issues.join('; ')}`)
  return doc
}

/**
 * Valida un wrapper de forma independiente: contrato, exportación M8 embebida (auditada; reconstruida con `bundle`),
 * subconjuntos por sector (anclados a los candidatos con `bundle`: geometría exacta), catálogo y guía recalculados,
 * huella de subconjuntos, selección, huellas y procedencia. Sin `bundle` NO se puede anclar la geometría al snapshot:
 * solo se detecta incoherencia interna (la identidad del paquete completo es declarada).
 */
export function validateMissionGeologyExport(doc: unknown, opts: { bundle?: EvidenceBundle } = {}): string[] {
  if (!validateShape(doc)) return (validateShape.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
  const d = doc as unknown as {
    mission_export: Record<string, unknown>
    geology_guidance: {
      mode: 'ai' | 'deterministic'; context_identity: ReturnType<typeof identityOf>; geology_exports: unknown[]
      catalog: { catalog_fingerprint: string; subset_fingerprint: string; request_fingerprint: string; evaluation_fingerprint: string; scope_mode: string; ref_ids: string[]; excluded: unknown[] }
      selection: { ref_ids: string[] }; ai: { provenance: unknown; request_fingerprint: string; evaluation_fingerprint: string; catalog_fingerprint: string } | null; guidance: unknown
    }
  }
  const m8 = d.mission_export
  const m8Issues = auditMissionExport(m8, opts.bundle)
  if (m8Issues.length) return m8Issues.map((i) => `mission_export: ${i}`)
  const evaluation = m8.evaluation as MissionEvaluation
  const g = d.geology_guidance
  const issues: string[] = []
  const exportsOk: GeologyExport[] = []
  for (const raw of g.geology_exports) {
    try {
      const siteId = (raw as { site?: { site_id?: string } }).site?.site_id
      const candidate = opts.bundle ? opts.bundle.candidates.find((c) => c.site_id === siteId) ?? null : null
      if (opts.bundle && !candidate) throw new GeologyContractError(`${siteId}: el sector no está en el snapshot.`)
      exportsOk.push(validateGeologyExport(raw, candidate))
    } catch (error) {
      issues.push(`Subconjunto geológico inválido: ${error instanceof Error ? error.message : 'error'}`)
    }
  }
  if (issues.length) return issues
  const id = g.context_identity
  for (const e of exportsOk) {
    const info = e.export_info
    if (info.snapshot_version !== id.snapshot_version || info.snapshot_version !== evaluation.snapshot_version) issues.push(`${e.site.site_id}: snapshot distinto del declarado o del evaluado.`)
    if (info.pipeline_version !== id.pipeline_version || info.full_candidates_file_sha256 !== id.candidates_sha256 || info.full_candidates_file !== id.candidates_file) issues.push(`${e.site.site_id}: identidad del paquete distinta de la declarada.`)
  }
  if (new Set(exportsOk.map((e) => e.site.site_id)).size !== exportsOk.length) issues.push('Sectores geológicos repetidos.')
  if (issues.length) return issues
  // Todo se recalcula desde los subconjuntos y la evaluación embebida: nada de lo declarado se acepta por fe.
  const catalog = buildGeologyCatalog(evaluation, catalogSourceFromExports(exportsOk), id.context_fingerprint)
  const usedIds = catalog.sites.map((s) => s.site_id)
  if (canonicalJson(exportsOk.map((e) => e.site.site_id)) !== canonicalJson(usedIds)) issues.push('Los subconjuntos geológicos no son exactamente los sectores del catálogo, en su orden.')
  if (id.subset_fingerprint !== fingerprint(exportsOk)) issues.push('La huella de subconjuntos declarada no coincide con los subconjuntos incluidos (geometría, unidades, fuentes o citas alteradas).')
  if (g.catalog.subset_fingerprint !== catalog.subset_fingerprint) issues.push('La huella de subconjuntos del catálogo no coincide.')
  if (g.catalog.catalog_fingerprint !== catalog.catalog_fingerprint || g.catalog.request_fingerprint !== catalog.request_fingerprint
    || g.catalog.evaluation_fingerprint !== catalog.evaluation_fingerprint || g.catalog.scope_mode !== catalog.scope_mode
    || canonicalJson(g.catalog.ref_ids) !== canonicalJson(catalog.refs.map((r) => r.ref_id)) || canonicalJson(g.catalog.excluded) !== canonicalJson(catalog.excluded)) {
    issues.push('El catálogo declarado no coincide con el recalculado (contexto, subconjuntos, solicitud, evaluación o referencias).')
  }
  const picked = checkGeologySelection(g.selection, catalog)
  if (!picked.ok) issues.push(`Selección geológica inválida: ${picked.reason}`)
  if (g.mode === 'ai') {
    const a = g.ai
    const ex = (m8.ai as { explanation?: { provenance?: unknown; request_fingerprint?: string; evaluation_fingerprint?: string } | null }).explanation
    if (!a) issues.push('El modo ai exige el bloque ai.')
    else if (a.catalog_fingerprint !== catalog.catalog_fingerprint || a.request_fingerprint !== catalog.request_fingerprint || a.evaluation_fingerprint !== catalog.evaluation_fingerprint) issues.push('La IA geológica pertenece a otro catálogo, solicitud o evaluación.')
    else if (!ex || canonicalJson(ex.provenance) !== canonicalJson(a.provenance) || ex.request_fingerprint !== a.request_fingerprint || ex.evaluation_fingerprint !== a.evaluation_fingerprint) issues.push('La selección geológica no proviene de la misma llamada que la explicación M8 embebida.')
  } else {
    if (g.ai !== null) issues.push('El modo determinista no admite bloque ai.')
    if (picked.ok && canonicalJson(picked.selection.ref_ids) !== canonicalJson(deterministicGeologyRefs(catalog).ref_ids)) issues.push('La orientación determinista no coincide con la que calcula la app.')
  }
  if (picked.ok) {
    const expected = composeGeologyGuidance(catalog, picked.selection.ref_ids, g.mode === 'ai' ? 'anthropic' : 'deterministic_template')
    if (canonicalJson(g.guidance) !== canonicalJson(expected)) issues.push('La guía declarada no coincide con la recalculada.')
  }
  return issues
}

export type ExportFormat = 'mission-export-1.0' | 'mission-geology-export-1' | 'unknown'

/** Aceptación explícita de formatos: 1.0 de M8 y el wrapper; nada más. */
export function detectMissionExportFormat(doc: unknown): ExportFormat {
  if (!doc || typeof doc !== 'object') return 'unknown'
  const r = doc as Record<string, unknown>
  if (r.kind === GEOLOGY_WRAPPER_KIND && r.schema_version === 1) return 'mission-geology-export-1'
  if (r.export_version === '1.0.0' && r.kind === undefined) return 'mission-export-1.0'
  return 'unknown'
}

/** Valida cualquiera de los dos formatos aceptados. */
export function validateAnyMissionExport(doc: unknown, opts: { bundle?: EvidenceBundle } = {}): { format: ExportFormat; issues: string[] } {
  const format = detectMissionExportFormat(doc)
  if (format === 'mission-geology-export-1') return { format, issues: validateMissionGeologyExport(doc, opts) }
  if (format === 'mission-export-1.0') return { format, issues: auditMissionExport(doc, opts.bundle) }
  return { format, issues: ['Formato de exportación no reconocido.'] }
}
