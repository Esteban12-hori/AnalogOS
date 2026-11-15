/**
 * Pure adapters for the Reading in Mission (docs/INTEGRATION_PLAN.md §5.3). They convert the team's explanation view
 * (`composeExplanation`, ADR-009) and the `MissionEvaluation` into the
 * sections drawn by the redesigned Reading.
 *
 * Rule: NO figure comes from the selection (from the AI or from the template). The selection only provides
 * IDs; each text and each value is resolved against `evaluation` (what is required, what is observed with
 * `fmtObserved`, the reason and the evidence written by the deterministic engine).
 */
import { MISSION_STATUS_LABEL, MISSION_STATUS_ORDER, REQUIREMENT_MARK } from '../../domain/missionView'
import type { ExplanationView } from '../../mission/explanation'
import type { AiProvenance } from '../../mission/exportReport'
import { fmtObserved } from '../../mission/format'
import { displaySource, verificationDisplayText } from '../../i18n/sourceText'
import type { MissionEvaluation, OptionStatus, RequirementResult } from '../../mission/types'

export const RESULT_LABEL = (rulesVersion: string) => `Deterministic calculation · rules ${rulesVersion} · v3 similarity not recalculated`
export const TEMPLATE_LABEL = 'Deterministic template without AI'
/** No ✦: the Reading prepends it (aria-hidden) in the AI layer; this way it is not repeated. */
export const AI_LABEL = 'Reasons highlighted with AI (Anthropic) · figures come from the deterministic calculation'
/**
 * Literal notices from the team's `ResultView` › `AiPanel` (M10): just one, conditional on the checkbox of the
 * geological channel (`plannerGeology.test` and `ReadingView.test` verify that they match).
 */
export const AI_SEND_NOTICE = 'When you press the button, the confirmed requirements and the already calculated results are sent to Anthropic (not the full brief text or geological mapping).'
export const AI_SEND_NOTICE_GEOLOGY = 'When you press the button, the confirmed requirements, the already calculated results, the confirmed objective (brief text, activity and requirements) and the official public geological mapping of the evaluated sectors are sent to Anthropic.'
export const GEOLOGY_OPT_LABEL = 'Include geological guidance for the test (the AI only chooses among checks calculated by the app).'
export const geologyUnavailableNotice = (reason: string | null): string =>
  `AI geological guidance not available: ${reason ?? 'the official geology context is missing.'} The requirements explanation works the same without geology.`
export const GEOLOGY_RETRY_NOTICE = 'The geological guidance could not be requested. You can retry the explanation without geology (only the calculated requirements and results will be sent, without the brief text or mapping).'
export const GEOLOGY_RETRY_LABEL = 'Retry without geology'
/** Where the geological guidance sits in the integrated interface (the Reading only has the button). */
export const GEOLOGY_WHERE = 'The geological guidance for the test (general or chosen by the AI) is shown in “Your mission”, below the result.'
export const STALE_AI_MESSAGE = 'The response does not belong to the current calculation: the deterministic template is kept.'

export interface ReadingLine {
  requirementId: string
  mark: string
  status: RequirementResult['status']
  /** «Mediana de pendiente regional: ≤ 3° · Ventana completa (~20 km) · observado 2,1°». */
  text: string
  reason: string
  evidence: ReadonlyArray<{ id: string; link: EvidenceLink }>
}

export interface ReadingOption {
  siteId: string
  name: string
  role: 'candidate' | 'reference'
  status: OptionStatus
  statusLabel: string
  rank: number | null
  lines: readonly ReadingLine[]
}

/** Site with unmet or unevaluated requirements for which the selection highlighted nothing. */
export interface OmittedOption {
  siteId: string
  name: string
  role: 'candidate' | 'reference'
  rank: number | null
  statusLabel: string
}

export interface ReadingModel {
  key: string
  result: {
    label: string
    outcome: MissionEvaluation['outcome']
    orderingRule: string
    groups: ReadonlyArray<{ status: OptionStatus; label: string; options: ReadonlyArray<{ siteId: string; name: string; role: 'candidate' | 'reference'; rank: number | null; blockers: readonly string[]; whatWouldChange: readonly string[] }> }>
    pending: readonly string[]
    openQuestions: readonly string[]
    limits: readonly string[]
    dataRequest: string | null
    nonePrioritized: boolean
  }
  highlights: {
    source: ExplanationView['source']
    /** Visible label: template (without ✦) or AI (with ✦ and provenance). */
    label: string
    notice: string
    /** «claude-… · 2026-11-14 · req_…» only with AI. */
    provenance: string | null
    /** Sites in the order of the evaluation (never in the order the AI returned). */
    options: readonly ReadingOption[]
    /**
     * Sites with some requirement other than «met» without reasons in the selection (can only
     * happen with the AI: the template highlights all of them). They are listed so as not to silence them.
     */
    omitted: readonly OmittedOption[]
    /**
     * Note when there are no reasons to show, decided with the EVALUATION (never with what the AI
     * chose): everything is met, the scope has no per-requirement calculation, or the selection omitted sites.
     */
    emptyNote: string | null
    verifications: ReadonlyArray<{ id: string; text: string }>
  }
}

export type EvidenceLink = { tab: 'fuentes'; anchor: string } | { url: string }

/** Links `evidence_ids` with the Sources tab (artifact with URL) or with the site sheet (`app_derived`). */
export function evidenceHref(evidenceId: string, evaluation: MissionEvaluation): EvidenceLink {
  const ref = evaluation.evidence.find((item) => item.evidence_id === evidenceId)
  if (ref?.kind === 'artifact' && ref.source_url && /^https:\/\//.test(ref.source_url)) return { url: ref.source_url }
  return { tab: 'fuentes', anchor: evidenceId.includes('#') ? evidenceId.slice(evidenceId.indexOf('#') + 1) : evidenceId }
}

/** Key of the Reading: another request or another revision discards the previous one. */
export function readingKey(evaluation: Pick<MissionEvaluation, 'request_fingerprint'>, revision: number): string {
  return `mission:${evaluation.request_fingerprint}:${revision}`
}

/** Line of a requirement with what is required and what is observed (both from the evaluation). */
export function requirementLine(result: RequirementResult, evaluation: MissionEvaluation): ReadingLine {
  const observed = result.kind === 'measurable' ? ` · observed ${fmtObserved(result.observed_value, result.observed_unit)}` : ''
  return {
    requirementId: result.requirement_id,
    mark: REQUIREMENT_MARK[result.status],
    status: result.status,
    text: `${result.required}${observed}`,
    reason: result.reason,
    evidence: result.evidence_ids.map((id) => ({ id, link: evidenceHref(id, evaluation) })),
  }
}

function provenanceText(provenance: AiProvenance | null): string | null {
  if (!provenance) return null
  return [provenance.model, provenance.created_at.slice(0, 10), provenance.request_id].filter(Boolean).join(' · ')
}

/**
 * What to say when reasons are missing. It is decided with the evaluation: «everything is met» only if no
 * result is other than «met»; if the AI left sites without reasons, this is stated and the reader is referred to
 * «Result», where the calculation blocks are.
 */
export function emptyNote(evaluation: MissionEvaluation, shown: number, omitted: number, ai: boolean): string | null {
  if (evaluation.outcome !== 'evaluated') return shown === 0 ? 'No per-requirement results in this scope: the diagnosis is in “Result”.' : null
  if (omitted > 0) {
    const places = omitted === 1 ? '1 place' : `${omitted} places`
    return `${ai ? 'The AI did not highlight' : 'The template did not highlight'} reasons for ${places}; the calculation blockers are in “Result”.`
  }
  if (shown > 0) return null
  if (evaluation.options.every((option) => option.requirement_results.length === 0)) return 'The test has no requirements: there are no reasons to highlight.'
  // No omitted sites or lines: no result is other than «met».
  return 'Every requirement is met where there is evidence: there are no reasons to highlight.'
}

export function explanationToReading(
  view: ExplanationView,
  evaluation: MissionEvaluation,
  revision: number,
  provenance: AiProvenance | null = null,
): ReadingModel {
  const options = new Map(evaluation.options.map((option) => [option.site_id, option]))
  const ai = view.source === 'anthropic'
  // The AI does not order: sites go in the order of the evaluation, whatever the order of the selection.
  const position = new Map(evaluation.options.map((option, index) => [option.site_id, index]))
  const at = (siteId: string) => position.get(siteId) ?? evaluation.options.length
  const highlighted = [...view.options]
    .sort((a, b) => at(a.site_id) - at(b.site_id))
    .map((item) => {
      const option = options.get(item.site_id)
      // Only IDs from the selection: the text and figures are resolved against the evaluation.
      const lines = item.highlighted
        .map((entry) => option?.requirement_results.find((result) => result.requirement_id === entry.requirement_id))
        .filter((result): result is RequirementResult => result !== undefined)
        .map((result) => requirementLine(result, evaluation))
      return {
        siteId: item.site_id,
        name: displaySource(option?.name ?? item.name),
        role: option?.role ?? 'candidate',
        status: option?.status ?? item.status,
        statusLabel: MISSION_STATUS_LABEL[option?.status ?? item.status],
        rank: option?.rank ?? null,
        lines,
      } satisfies ReadingOption
    })
  const withLines = new Set(highlighted.filter((option) => option.lines.length > 0).map((option) => option.siteId))
  const omitted: OmittedOption[] = evaluation.options
    .filter((option) => !withLines.has(option.site_id) && option.requirement_results.some((result) => result.status !== 'cumple'))
    .map((option) => ({ siteId: option.site_id, name: displaySource(option.name), role: option.role, rank: option.rank, statusLabel: MISSION_STATUS_LABEL[option.status] }))
  return {
    key: readingKey(evaluation, revision),
    result: {
      label: RESULT_LABEL(evaluation.rules_version),
      outcome: evaluation.outcome,
      orderingRule: evaluation.ordering_rule,
      groups: MISSION_STATUS_ORDER.flatMap((status) => {
        if (status === 'fuera_de_alcance') return []
        const list = evaluation.options.filter((option) => option.status === status)
        return list.length
          ? [{
              status,
              label: MISSION_STATUS_LABEL[status],
              options: list.map((option) => ({
                siteId: option.site_id,
                name: displaySource(option.name),
                role: option.role,
                rank: option.rank,
                blockers: option.requirement_results.filter((result) => result.importance === 'critical' && result.status !== 'cumple').map((result) => `${result.label}: ${result.reason}`),
                whatWouldChange: option.what_would_change,
              })),
            }]
          : []
      }),
      pending: evaluation.pending_requirements,
      openQuestions: evaluation.open_questions,
      limits: evaluation.limits,
      dataRequest: evaluation.data_request?.note ?? null,
      nonePrioritized: evaluation.none_prioritized,
    },
    highlights: {
      source: view.source,
      label: ai ? AI_LABEL : TEMPLATE_LABEL,
      notice: view.notice,
      provenance: ai ? provenanceText(provenance) : null,
      options: highlighted,
      omitted,
      emptyNote: emptyNote(evaluation, withLines.size, omitted.length, ai),
      verifications: view.verifications.map((item) => ({ id: item.id, text: verificationDisplayText(item) })),
    },
  }
}

/** First highlighted requirement of the site, for the pill on the carousel card. */
export function snippetFor(view: ExplanationView | null, evaluation: MissionEvaluation | null, siteId: string): string | null {
  if (!view || !evaluation) return null
  const option = view.options.find((item) => item.site_id === siteId)
  const first = option?.highlighted[0]
  const result = first ? evaluation.options.find((item) => item.site_id === siteId)?.requirement_results.find((item) => item.requirement_id === first.requirement_id) : undefined
  return result ? `${REQUIREMENT_MARK[result.status]} ${result.label}: ${result.reason}` : null
}
