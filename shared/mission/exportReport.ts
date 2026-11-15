import { RULES_VERSION } from './catalog'
import { evaluateMission, evaluationFingerprint } from './evaluate'
import { checkSelection, type ExplanationSelection } from './explanation'
import { canonicalJson, fingerprint } from './fingerprint'
import { EXPORT_LANGUAGE_1_1, isEvaluationVersion, missionText } from './text'
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

/** Draft returned by the AI exactly as it arrived (before the user edits it). */
export interface DraftProposal {
  activity: string
  target_kind: 'mars_rover_terrain' | 'other_or_unclear'
  target_profile_id: string
  requirements: Requirement[]
  open_questions: string[]
  warnings: string[]
}

/** What the UI keeps from a draft call: provenance, submitted brief, and original proposal. */
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

// English definitions for the UI; each export carries the ones of its own version (missionText).
export const STATUS_DEFINITIONS: Record<string, string> = missionText('1.1.0').statusDefinitions

/** User changes relative to the AI's proposal, computed (not declared). */
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
 * Reproducible, validated JSON export. No clock: same input, same bytes.
 * Rejects (throws MissionExportError) if the evaluation, fingerprints, draft, or selection do not correspond to the
 * given request: it never packages results from another request nor attributes user changes to the AI.
 * The export version is the evaluation's version (1.0.0 frozen Spanish, 1.1.0 English with a language block);
 * any other version is rejected, never reinterpreted.
 */
export function buildMissionExport(
  request: MissionRequest,
  evaluation: MissionEvaluation,
  bundle: EvidenceBundle,
  ai: { draft?: AiDraftRecord | null; explanation?: AiExplanationRecord | null } = {},
): Record<string, unknown> {
  const version = evaluation?.evaluation_version
  if (!isEvaluationVersion(version)) throw new MissionExportError(`Unsupported evaluation version: ${String(version).slice(0, 40)}.`)
  const text = missionText(version)
  const checked = validateMissionRequest(request, { requireConfirmed: true })
  if (!checked.ok) throw new MissionExportError(`Request cannot be exported: ${checked.issues.join('; ')}`)
  const reqFp = fingerprint(checked.request)
  if (evaluation.request_fingerprint !== reqFp) throw new MissionExportError('The evaluation belongs to another request.')
  // Recomputes with the same engine: the evaluation must be exactly that of this request and this snapshot.
  if (canonicalJson(evaluateMission(checked.request, bundle, { version })) !== canonicalJson(evaluation)) {
    throw new MissionExportError('The evaluation does not match the one the engine produces for this request.')
  }
  const evalFp = evaluationFingerprint(evaluation)

  let draft: Record<string, unknown> | null = null
  if (ai.draft) {
    if (ai.draft.brief_fingerprint !== fingerprint(request.brief)) throw new MissionExportError('The brief changed after the AI draft: it is not attributed to the AI.')
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
      throw new MissionExportError('The AI explanation belongs to another request or evaluation.')
    }
    const sel = checkSelection(ai.explanation.selection, evaluation)
    if (!sel.ok) throw new MissionExportError(`Invalid AI selection: ${sel.reason}`)
    explanation = { ...ai.explanation, selection: sel.selection }
  }

  const doc = {
    export_version: version,
    request,
    evaluation_fingerprint: evalFp,
    rules: { rules_version: RULES_VERSION, ordering_rule: text.orderingRule, status_definitions: text.statusDefinitions },
    snapshot: {
      snapshot_version: bundle.manifest.snapshot_version,
      profile_id: bundle.profile.id,
      profile_version: bundle.profile.version,
      pipeline_version: bundle.manifest.pipeline_version,
      source_datasets: [...new Set(evaluation.evidence.map((e) => e.dataset_id))].sort(),
    },
    evaluation,
    ai: { draft, explanation },
    ...(version === '1.0.0' ? {} : { language: EXPORT_LANGUAGE_1_1 }),
  }
  const issues = validateMissionExport(doc)
  if (issues.length) throw new MissionExportError(`Invalid export: ${issues.join('; ')}`)
  return doc
}
