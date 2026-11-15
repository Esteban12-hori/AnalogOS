import { DEFAULT_AI_LANGUAGE, type AiLanguage } from '../../shared/mission/aiSchemas'
import { METRICS, METRIC_IDS, SUPPORTED_PROFILE_ID, UNMEASURED_TOPICS, detectUnmeasuredMentions } from '../../shared/mission/catalog'
import { evaluateMission, evaluationFingerprint } from '../../shared/mission/evaluate'
import { buildVerificationCatalog, checkSelection, type ExplanationSelection } from '../../shared/mission/explanation'
import type { AiProvenance, DraftProposal } from '../../shared/mission/exportReport'
import { fingerprint } from '../../shared/mission/fingerprint'
import { MissionInputError, type EvidenceBundle, type Importance, type MeasurableRequirement, type Requirement, type UnmeasuredRequirement } from '../../shared/mission/types'
import { validateDraftOutput, validateMissionRequest } from '../../shared/mission/validate'
import { buildGeologyCatalog, checkGeologySelection, type GeologyRejection, type GeologySelectionResult } from '../../shared/geology/guidance'
import { AiCallError, callStructured } from './anthropic'
import type { AiConfig } from './config'
import { DRAFT_TEXT } from './draftText'
import type { ServerGeology } from './geology'
import { DRAFT_SCHEMA, EXPLAIN_GEOLOGY_SCHEMA, EXPLAIN_SCHEMA, EXPLAIN_SYSTEM, GEOLOGY_SYSTEM, draftSystem, explainFacts, geologyFacts, retryReminder } from './prompts'

export interface AiContext {
  config: AiConfig
  fetchImpl: typeof fetch
  now: () => number
  bundle: EvidenceBundle
  /** Trusted server geological package; absent = geological channel unavailable. */
  geology?: ServerGeology
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
export const clean = (s: unknown, max: number): string => (typeof s === 'string' ? s.replace(CONTROL, ' ').trim().slice(0, max) : '')
const norm = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[“”«»"'`]/g, '').replace(/\s+/g, ' ').trim()
export const quoteInBrief = (quote: string, brief: string): boolean => {
  const q = norm(quote)
  return q.length >= 3 && norm(brief).includes(q)
}

export interface DraftResult {
  proposal: DraftProposal
  provenance: AiProvenance
}

const TOPOGRAPHIC: string[] = ['median_slope_degree', 'terrain_roughness_meter', 'local_relief_meter']
const EXPLICIT_WINDOW_SCALE = /median|regional|ventana\s+completa|\bwindow\b/i // Spanish and English briefs
const COUNTRY_WORDS: Record<string, RegExp> = { CL: /chile|\bCL\b/i, AR: /argentin|\bAR\b/i }

/** Numbers that appear literally in the quote (decimal comma allowed). */
function numbersIn(text: string): number[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((t) => Number.parseFloat(t.replace(',', '.')))
}
const allNumbersInQuote = (nums: number[], quote: string): boolean => {
  const found = numbersIn(quote)
  return nums.length > 0 && nums.every((n) => found.some((f) => Math.abs(f - n) < 1e-9))
}

/**
 * Semantic validation of the draft (after validating the provider output with Ajv).
 * Nothing from the brief is silently discarded: whatever does not fit a valid requirement goes to open_questions;
 * whatever the AI cannot anchor in the brief is discarded AND reported. Every requirement is emitted with
 * confirmed=false and origin='ai'. The AI is not trusted for scale or for figures:
 * - a topographic metric without «median/regional/full window» in the quote is kept as a point
 *   scale (not evaluable) with a question about the scale;
 * - proposed figures must appear literally in the quote; otherwise it remains as a clarification question.
 * `language` (ADR-017) only selects the wording of the server's own questions, warnings and fallback labels
 * (./draftText.ts); every check, figure, scale rule and limit is the same in both languages.
 */
export function buildDraft(raw: unknown, brief: string, language: AiLanguage = DEFAULT_AI_LANGUAGE): { draft: Omit<DraftProposal, 'warnings'>; warnings: string[] } {
  if (validateDraftOutput(raw).length) throw new AiCallError('ai_invalid_output')
  const text = DRAFT_TEXT[language]
  const r = raw as {
    activity: string; target_kind: 'mars_rover_terrain' | 'other_or_unclear'
    requirements: Array<Record<string, unknown>>; open_questions: string[]
  }
  const warnings: string[] = []
  const questions: string[] = r.open_questions.map((q) => clean(q, 300)).filter(Boolean)
  const requirements: Requirement[] = []
  let discarded = 0
  let n = 0
  for (const it of r.requirements) {
    const quote = clean(it.source_quote, 300)
    if (!quoteInBrief(quote, brief)) {
      discarded += 1
      continue
    }
    const importance: Importance = it.importance === 'critical' ? 'critical' : 'preference'
    const base = { requirement_id: `ai-${n + 1}`, importance, origin: 'ai' as const, confirmed: false, source_quote: quote }
    const metric = String(it.metric_id)
    const pending = (why: string): void => {
      questions.push(text.quoted(why, quote))
    }
    if ((METRIC_IDS as string[]).includes(metric)) {
      const spec = METRICS[metric as keyof typeof METRICS]
      const nums = it.numbers as number[]
      const op = it.operator as MeasurableRequirement['operator'] | 'none'
      if (op === 'none') { pending(text.threshold); continue }
      if (op === 'in') {
        const wrong = (it.countries as string[]).some((c) => !COUNTRY_WORDS[c]?.test(quote))
        if (metric !== 'country' || wrong || !(it.countries as string[]).length) { pending(text.country); continue }
      } else if (!allNumbersInQuote(nums, quote)) {
        pending(text.figure); continue
      }
      let scale: MeasurableRequirement['scale'] = it.scale === 'point' ? 'point' : 'window'
      if (TOPOGRAPHIC.includes(metric) && scale === 'window' && !EXPLICIT_WINDOW_SCALE.test(quote)) {
        scale = 'point'
        questions.push(text.scaleQuestion(text.metricLabel(spec.id)))
      }
      const value = op === 'in' ? (it.countries as string[]) : op === 'between' ? nums.slice(0, 2) : nums[0]
      const candidate: MeasurableRequirement = {
        ...base, kind: 'measurable', label: clean(it.label, 120) || text.metricLabel(spec.id), metric_id: spec.id, operator: op as MeasurableRequirement['operator'],
        value: value as MeasurableRequirement['value'], unit: String(it.unit), scale,
      }
      const probe = validateMissionRequest({
        schema_version: '1.0.0', brief: '', activity: '', target: { profile_id: SUPPORTED_PROFILE_ID, stated: '' },
        requirements: [candidate], open_questions: [], scope: { mode: 'catalog' }, confirmed: false,
      })
      if (probe.ok) { requirements.push(candidate); n += 1 } else pending(text.requirement)
    } else if (UNMEASURED_TOPICS.some((t) => t.id === metric) || metric === 'other_unmeasured') {
      const candidate: UnmeasuredRequirement = {
        ...base, kind: 'unmeasured', label: clean(it.label, 120) || text.topicLabel(metric) || text.unmeasuredFallback, topic_id: metric, detail: clean(it.detail, 300),
      }
      requirements.push(candidate)
      n += 1
    } else {
      discarded += 1
    }
  }
  if (discarded) warnings.push(text.discarded(discarded))
  if (requirements.length > 20) {
    questions.push(...requirements.splice(20).map((x) => text.pendingSpecify(x.source_quote ?? x.label)))
    warnings.push(text.tooManyRequirements)
  }
  // Deterministic safety net: unmeasured topics cited in the brief that the draft did not capture.
  const covered = new Set(requirements.filter((x): x is UnmeasuredRequirement => x.kind === 'unmeasured').map((x) => x.topic_id))
  if (requirements.some((x) => x.kind === 'measurable' && x.metric_id === 'median_slope_degree' && x.scale === 'point')) covered.add('max_point_slope')
  for (const m of detectUnmeasuredMentions(brief)) {
    if (!covered.has(m.topic_id)) {
      questions.push(text.mention(m.matched_text, text.topicLabel(m.topic_id) ?? m.label))
    }
  }
  const all = [...new Set(questions)]
  const unique = all.slice(0, 20)
  if (all.length > 20) warnings.push(text.tooManyQuestions)
  return {
    draft: {
      activity: clean(r.activity, 200),
      target_kind: r.target_kind,
      target_profile_id: r.target_kind === 'mars_rover_terrain' ? SUPPORTED_PROFILE_ID : 'unsupported',
      requirements,
      open_questions: unique,
    },
    warnings,
  }
}

export async function runDraft(ctx: AiContext, brief: string, language: AiLanguage = DEFAULT_AI_LANGUAGE): Promise<DraftResult> {
  const { data, provenance } = await callStructured(
    ctx.config,
    { system: draftSystem(language), user: `<brief>\n${brief}\n</brief>`, schema: DRAFT_SCHEMA as unknown as Record<string, unknown>, maxTokens: 2000 },
    ctx.fetchImpl,
    ctx.now,
  )
  const built = buildDraft(data, brief, language)
  return { proposal: { ...built.draft, warnings: built.warnings }, provenance }
}

export const GEOLOGY_MAX_TOKENS = 6000
/** Minimum remaining time to attempt the single semantic retry. */
export const MIN_RETRY_MS = 2000

export interface ExplainResult {
  request_fingerprint: string
  evaluation_fingerprint: string
  selection: ExplanationSelection
  provenance: AiProvenance
  /** Only if the client enabled the geological channel; separate from the M8 selection. */
  geology?: { context_fingerprint: string; catalog_fingerprint: string; selection: GeologySelectionResult }
}

export class ExplainInputError extends Error {
  constructor(readonly code: 'invalid_request' | 'stale_request' | 'nothing_to_explain' | 'geology_context_unavailable' | 'geology_context_stale', readonly issues: string[] = []) {
    super(code)
  }
}

/**
 * Preliminary check of the geological channel (before the key and the provider). The client declares the context it
 * believes it has; if the server does not have a valid one or has a different one, a specific error: it is never silently degraded.
 */
export function checkGeologyChannel(state: ServerGeology | undefined, clientContextFingerprint: string): Extract<ServerGeology, { status: 'ready' }> {
  if (!state || state.status !== 'ready') throw new ExplainInputError('geology_context_unavailable')
  if (state.fingerprint !== clientContextFingerprint) throw new ExplainInputError('geology_context_stale')
  return state
}

/** The facts are recomputed here from trusted artifacts; the client only supplies the request. */
export async function runExplain(ctx: AiContext, requestInput: unknown, clientFingerprint: string, geologyFingerprint?: string): Promise<ExplainResult> {
  const channel = geologyFingerprint === undefined ? null : checkGeologyChannel(ctx.geology, geologyFingerprint)
  const checked = validateMissionRequest(requestInput, { requireConfirmed: true })
  if (!checked.ok) throw new ExplainInputError('invalid_request', checked.issues.slice(0, 5))
  const reqFp = fingerprint(checked.request)
  if (reqFp !== clientFingerprint) throw new ExplainInputError('stale_request')
  let evaluation
  try {
    evaluation = evaluateMission(checked.request, ctx.bundle)
  } catch (error) {
    if (error instanceof MissionInputError) throw new ExplainInputError('invalid_request', error.issues.slice(0, 5))
    throw error
  }
  if (!evaluation.options.length) throw new ExplainInputError('nothing_to_explain')
  const verifications = buildVerificationCatalog(evaluation).map((v) => ({ id: v.id, text: v.text }))
  const catalog = channel ? buildGeologyCatalog(evaluation, channel.context, channel.fingerprint) : null
  const facts = `<facts>\n${explainFacts(evaluation, verifications)}\n</facts>`
  const baseUser = catalog ? `${facts}\n<geology>\n${geologyFacts(checked.request, catalog)}\n</geology>` : facts
  const startedAt = Date.now()
  const total = ctx.config.timeoutMs

  type Attempt = { ok: true; selection: ExplanationSelection; geology?: ExplainResult['geology']; provenance: AiProvenance } | { ok: false; code: GeologyRejection | 'm8_selection'; siteId?: string }
  const attempt = async (user: string, timeoutMs: number): Promise<Attempt> => {
    const { data, provenance } = await callStructured(
      ctx.config,
      {
        system: catalog ? EXPLAIN_SYSTEM + GEOLOGY_SYSTEM : EXPLAIN_SYSTEM,
        user,
        schema: (catalog ? EXPLAIN_GEOLOGY_SCHEMA : EXPLAIN_SCHEMA) as unknown as Record<string, unknown>,
        // The geological channel adds up to 12 references with long ids (and the model may reason beforehand): with 2000 tokens it was truncated in the real test.
        maxTokens: catalog ? GEOLOGY_MAX_TOKENS : 2000,
        timeoutMs,
      },
      ctx.fetchImpl,
      ctx.now,
    )
    let m8: unknown = data
    let geology: ExplainResult['geology']
    if (catalog) {
      // The geological field is separated before validating the M8 selection with its contract intact; any failure discards everything.
      const { geology_ref_ids: refIds, ...rest } = (data ?? {}) as Record<string, unknown>
      const picked = checkGeologySelection({ ref_ids: refIds }, catalog)
      if (!picked.ok) return { ok: false, code: picked.code, siteId: picked.site_id }
      m8 = rest
      geology = { context_fingerprint: catalog.context_fingerprint, catalog_fingerprint: catalog.catalog_fingerprint, selection: picked.selection }
    }
    const check = checkSelection(m8, evaluation)
    if (!check.ok) return { ok: false, code: 'm8_selection' }
    return { ok: true, selection: check.selection, geology, provenance }
  }

  let result = await attempt(baseUser, total)
  // Bounded recovery: ONLY with the geological channel and a semantically invalid selection (the call succeeded). A single second
  // call with the same facts and schema + fixed reminder, within the TOTAL deadline. Timeout, refusal, rate limit,
  // truncation and upstream errors come out as before (AiCallError) without retry; M8 is never retried without geology nor trimmed.
  // The returned provenance is that of the response finally accepted; the usage of the first call is not added to it.
  if (!result.ok && catalog) {
    const remaining = total - (Date.now() - startedAt)
    if (remaining >= MIN_RETRY_MS) result = await attempt(`${baseUser}\n${retryReminder(result.code, result.siteId, catalog)}`, remaining)
  }
  if (!result.ok) throw new AiCallError('ai_invalid_output')
  return { request_fingerprint: reqFp, evaluation_fingerprint: evaluationFingerprint(evaluation), selection: result.selection, provenance: result.provenance, ...(result.geology ? { geology: result.geology } : {}) }
}
