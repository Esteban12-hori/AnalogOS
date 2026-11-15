import { ORDERING_RULE, RULES_VERSION } from './catalog'
import { evaluateMission, evaluationFingerprint } from './evaluate'
import { checkSelection, type ExplanationSelection } from './explanation'
import { canonicalJson, fingerprint } from './fingerprint'
import type { EvidenceBundle, MissionEvaluation, MissionRequest, Requirement } from './types'
import { validateMissionExport, validateMissionRequest } from './validate'

export interface AiProvenance {
  provider: 'anthropic'
  model: string
  request_id: string | null
  created_at: string
  usage: { input_tokens: number | null; output_tokens: number | null }
  stop_reason: string | null
}

/** Borrador devuelto por la IA tal como llegó (antes de que el usuario lo edite). */
export interface DraftProposal {
  activity: string
  target_kind: 'mars_rover_terrain' | 'other_or_unclear'
  target_profile_id: string
  requirements: Requirement[]
  open_questions: string[]
  warnings: string[]
}

/** Lo que la UI conserva de una llamada de borrador: procedencia, brief enviado y propuesta original. */
export interface AiDraftRecord {
  provenance: AiProvenance
  brief_fingerprint: string
  proposal: DraftProposal
}

export interface AiExplanationRecord {
  provenance: AiProvenance
  selection: ExplanationSelection
  request_fingerprint: string
  evaluation_fingerprint: string
}

export const STATUS_DEFINITIONS: Record<string, string> = {
  priorizado_para_reconocimiento: 'Cumple todos los requisitos imprescindibles evaluables; merece reconocimiento. No es aprobación ni autorización.',
  no_cumple_requisitos: 'Incumple al menos un requisito imprescindible con valor observado.',
  evidencia_insuficiente: 'Falta evidencia o escala adecuada para algún requisito imprescindible; no se aprueba.',
  objetivo_no_soportado: 'El objetivo no corresponde al único perfil soportado (rover marciano, Jezero, v3).',
}

/** Cambios del usuario respecto de la propuesta de la IA, calculados (no declarados). */
export function userChangesFrom(proposal: DraftProposal, request: MissionRequest) {
  const proposed = new Map(proposal.requirements.map((r) => [r.requirement_id, r]))
  const current = new Map(request.requirements.map((r) => [r.requirement_id, r]))
  const edited: string[] = []
  const added: string[] = []
  for (const [id, r] of current) {
    const p = proposed.get(id)
    if (!p) added.push(id)
    else if (r.origin !== 'ai' || canonicalJson({ ...r, confirmed: false }) !== canonicalJson({ ...p, confirmed: false })) edited.push(id)
  }
  const removed = [...proposed.keys()].filter((id) => !current.has(id))
  return { edited_requirement_ids: edited.sort(), removed_requirement_ids: removed.sort(), added_requirement_ids: added.sort() }
}

export class MissionExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissionExportError'
  }
}

/**
 * Exportación JSON reproducible y validada. Sin reloj: misma entrada, mismos bytes.
 * Rechaza (lanza MissionExportError) si evaluación, huellas, borrador o selección no corresponden a la
 * solicitud dada: nunca empaqueta resultados de otra solicitud ni atribuye a la IA cambios del usuario.
 */
export function buildMissionExport(
  request: MissionRequest,
  evaluation: MissionEvaluation,
  bundle: EvidenceBundle,
  ai: { draft?: AiDraftRecord | null; explanation?: AiExplanationRecord | null } = {},
): Record<string, unknown> {
  const checked = validateMissionRequest(request, { requireConfirmed: true })
  if (!checked.ok) throw new MissionExportError(`Solicitud no exportable: ${checked.issues.join('; ')}`)
  const reqFp = fingerprint(checked.request)
  if (evaluation.request_fingerprint !== reqFp) throw new MissionExportError('La evaluación pertenece a otra solicitud.')
  // Recalcula con el mismo motor: la evaluación debe ser exactamente la de esta solicitud y este snapshot.
  if (canonicalJson(evaluateMission(checked.request, bundle)) !== canonicalJson(evaluation)) {
    throw new MissionExportError('La evaluación no coincide con la que produce el motor para esta solicitud.')
  }
  const evalFp = evaluationFingerprint(evaluation)

  let draft: Record<string, unknown> | null = null
  if (ai.draft) {
    if (ai.draft.brief_fingerprint !== fingerprint(request.brief)) throw new MissionExportError('El brief cambió después del borrador de IA: no se atribuye a la IA.')
    draft = {
      provenance: ai.draft.provenance,
      brief_fingerprint: ai.draft.brief_fingerprint,
      proposal_fingerprint: fingerprint(ai.draft.proposal),
      proposal: ai.draft.proposal,
      user_changes: userChangesFrom(ai.draft.proposal, request),
    }
  }
  let explanation: AiExplanationRecord | null = null
  if (ai.explanation) {
    if (ai.explanation.request_fingerprint !== reqFp || ai.explanation.evaluation_fingerprint !== evalFp) {
      throw new MissionExportError('La explicación de IA pertenece a otra solicitud o evaluación.')
    }
    const sel = checkSelection(ai.explanation.selection, evaluation)
    if (!sel.ok) throw new MissionExportError(`Selección de IA inválida: ${sel.reason}`)
    explanation = { ...ai.explanation, selection: sel.selection }
  }

  const doc = {
    export_version: '1.0.0',
    request,
    evaluation_fingerprint: evalFp,
    rules: { rules_version: RULES_VERSION, ordering_rule: ORDERING_RULE, status_definitions: STATUS_DEFINITIONS },
    snapshot: {
      snapshot_version: bundle.manifest.snapshot_version,
      profile_id: bundle.profile.id,
      profile_version: bundle.profile.version,
      pipeline_version: bundle.manifest.pipeline_version,
      source_datasets: [...new Set(evaluation.evidence.map((e) => e.dataset_id))].sort(),
    },
    evaluation,
    ai: { draft, explanation },
  }
  const issues = validateMissionExport(doc)
  if (issues.length) throw new MissionExportError(`Exportación inválida: ${issues.join('; ')}`)
  return doc
}
