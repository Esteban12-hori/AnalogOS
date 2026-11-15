/**
 * Pure adapters for the Reading in Mission (docs/INTEGRATION_PLAN.md §5.3). They convert the team's explanation view
 * (`composeExplanation`, ADR-009) and the `MissionEvaluation` into the
 * sections drawn by the redesigned Reading.
 *
 * Rule: NO figure comes from the selection (from the AI or from the template). The selection only provides
 * IDs; each text and each value is resolved against `evaluation` (what is required, what is observed with
 * `fmtObserved`, the reason and the evidence written by the deterministic engine).
 */
import { MISSION_STATUS_ORDER, REQUIREMENT_MARK } from '../../domain/missionView'
import { getLocale, type Locale } from '../../i18n/core'
import { tMission } from '../../i18n/messages/mission'
import { tReading } from '../../i18n/messages/reading'
import { displayRecordText, displayRecordTexts, displayVerificationText } from '../../i18n/recordText'
import { scienceText } from '../../i18n/science'
import type { ExplanationView } from '../../mission/explanation'
import type { AiProvenance } from '../../mission/exportReport'
import { uiPack } from '../../mission/pack'
import { displayMissionMessage, displayMissionMessages } from '../../mission/messages'
import type { MissionEvaluation, OptionStatus, RequirementResult } from '../../mission/types'

/*
 * Language (ADR-017): every builder takes the interface language (`locale`, the current one by default). Labels come
 * from the `reading` catalog; record text (required, reasons, ordering rule, limits, notes, notices, verification
 * instructions) is shown with displayRecordText; site names and field checks (source evidence) with scienceText;
 * observed values with the pack of the language. The exported constants are the English texts (tests, tooling).
 */
const EN = tReading.in('en')
export const RESULT_LABEL = (rulesVersion: string, locale: Locale = getLocale()) => tReading.in(locale)('result.label', { rules: rulesVersion })
export const TEMPLATE_LABEL = EN('highlights.template')
/** No ✦: the Reading prepends it (aria-hidden) in the AI layer; this way it is not repeated. */
export const AI_LABEL = EN('highlights.ai')
/**
 * Literal notices from the team's `ResultView` › `AiPanel` (M10): just one, conditional on the checkbox of the
 * geological channel (`plannerGeology.test` and `ReadingView.test` verify that they match).
 */
export const AI_SEND_NOTICE = EN('ai.sendNotice')
export const AI_SEND_NOTICE_GEOLOGY = EN('ai.sendNoticeGeology')
export const GEOLOGY_OPT_LABEL = EN('ai.geologyOption')
export const geologyUnavailableNotice = (reason: string | null, locale: Locale = getLocale()): string => {
  const t = tReading.in(locale)
  return t('ai.geologyUnavailable', { reason: reason === null ? t('ai.geologyMissing') : displayMissionMessage(reason, locale) })
}
export const GEOLOGY_RETRY_NOTICE = EN('ai.geologyRetryNotice')
export const GEOLOGY_RETRY_LABEL = EN('ai.geologyRetry')
/** Where the geological guidance sits in the integrated interface (the Reading only has the button). */
export const GEOLOGY_WHERE = EN('ai.geologyWhere')
export const STALE_AI_MESSAGE = EN('ai.stale')

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
export function requirementLine(result: RequirementResult, evaluation: MissionEvaluation, locale: Locale = getLocale()): ReadingLine {
  const observed = result.kind === 'measurable' ? tReading.in(locale)('highlights.observed', { value: uiPack(locale).fmtObserved(result.observed_value, result.observed_unit) }) : ''
  return {
    requirementId: result.requirement_id,
    mark: REQUIREMENT_MARK[result.status],
    status: result.status,
    text: `${displayRecordText(result.required, locale)}${observed}`,
    reason: displayRecordText(result.reason, locale),
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
export function emptyNote(evaluation: MissionEvaluation, shown: number, omitted: number, ai: boolean, locale: Locale = getLocale()): string | null {
  const t = tReading.in(locale)
  if (evaluation.outcome !== 'evaluated') return shown === 0 ? t('empty.noResults') : null
  if (omitted > 0) return t(ai ? 'empty.omittedAi' : 'empty.omittedTemplate', { count: omitted })
  if (shown > 0) return null
  if (evaluation.options.every((option) => option.requirement_results.length === 0)) return t('empty.noRequirements')
  // No omitted sites or lines: no result is other than «met».
  return t('empty.allMet')
}

export function explanationToReading(
  view: ExplanationView,
  evaluation: MissionEvaluation,
  revision: number,
  provenance: AiProvenance | null = null,
  locale: Locale = getLocale(),
): ReadingModel {
  const t = tReading.in(locale)
  const statusLabel = (status: OptionStatus): string => tMission.in(locale)(`status.${status}`)
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
        .map((result) => requirementLine(result, evaluation, locale))
      return {
        siteId: item.site_id,
        name: scienceText(option?.name ?? item.name, locale),
        role: option?.role ?? 'candidate',
        status: option?.status ?? item.status,
        statusLabel: statusLabel(option?.status ?? item.status),
        rank: option?.rank ?? null,
        lines,
      } satisfies ReadingOption
    })
  const withLines = new Set(highlighted.filter((option) => option.lines.length > 0).map((option) => option.siteId))
  const omitted: OmittedOption[] = evaluation.options
    .filter((option) => !withLines.has(option.site_id) && option.requirement_results.some((result) => result.status !== 'cumple'))
    .map((option) => ({ siteId: option.site_id, name: scienceText(option.name, locale), role: option.role, rank: option.rank, statusLabel: statusLabel(option.status) }))
  return {
    key: readingKey(evaluation, revision),
    result: {
      label: RESULT_LABEL(evaluation.rules_version, locale),
      outcome: evaluation.outcome,
      orderingRule: displayRecordText(evaluation.ordering_rule, locale),
      groups: MISSION_STATUS_ORDER.flatMap((status) => {
        if (status === 'fuera_de_alcance') return []
        const list = evaluation.options.filter((option) => option.status === status)
        return list.length
          ? [{
              status,
              label: statusLabel(status),
              options: list.map((option) => ({
                siteId: option.site_id,
                name: scienceText(option.name, locale),
                role: option.role,
                rank: option.rank,
                blockers: option.requirement_results.filter((result) => result.importance === 'critical' && result.status !== 'cumple').map((result) => `${result.label}: ${displayRecordText(result.reason, locale)}`),
                whatWouldChange: displayRecordTexts(option.what_would_change, locale),
              })),
            }]
          : []
      }),
      pending: evaluation.pending_requirements,
      openQuestions: displayMissionMessages(evaluation.open_questions, locale),
      limits: displayRecordTexts(evaluation.limits, locale),
      dataRequest: evaluation.data_request ? displayRecordText(evaluation.data_request.note, locale) : null,
      nonePrioritized: evaluation.none_prioritized,
    },
    highlights: {
      source: view.source,
      label: ai ? t('highlights.ai') : t('highlights.template'),
      notice: displayRecordText(view.notice, locale),
      provenance: ai ? provenanceText(provenance) : null,
      options: highlighted,
      omitted,
      emptyNote: emptyNote(evaluation, withLines.size, omitted.length, ai, locale),
      verifications: view.verifications.map((item) => ({ id: item.id, text: displayVerificationText(item, locale) })),
    },
  }
}

/** First highlighted requirement of the site, for the pill on the carousel card. */
export function snippetFor(view: ExplanationView | null, evaluation: MissionEvaluation | null, siteId: string, locale: Locale = getLocale()): string | null {
  if (!view || !evaluation) return null
  const option = view.options.find((item) => item.site_id === siteId)
  const first = option?.highlighted[0]
  const result = first ? evaluation.options.find((item) => item.site_id === siteId)?.requirement_results.find((item) => item.requirement_id === first.requirement_id) : undefined
  return result ? `${REQUIREMENT_MARK[result.status]} ${result.label}: ${displayRecordText(result.reason, locale)}` : null
}
