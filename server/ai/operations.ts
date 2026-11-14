import { METRICS, METRIC_IDS, SUPPORTED_PROFILE_ID, UNMEASURED_TOPICS, detectUnmeasuredMentions } from '../../apps/web/src/mission/catalog'
import { evaluateMission, evaluationFingerprint } from '../../apps/web/src/mission/evaluate'
import { buildVerificationCatalog, checkSelection, type ExplanationSelection } from '../../apps/web/src/mission/explanation'
import type { AiProvenance, DraftProposal } from '../../apps/web/src/mission/exportReport'
import { fingerprint } from '../../apps/web/src/mission/fingerprint'
import { MissionInputError, type EvidenceBundle, type Importance, type MeasurableRequirement, type Requirement, type UnmeasuredRequirement } from '../../apps/web/src/mission/types'
import { validateDraftOutput, validateMissionRequest } from '../../apps/web/src/mission/validate'
import { AiCallError, callStructured } from './anthropic'
import type { AiConfig } from './config'
import { DRAFT_SCHEMA, DRAFT_SYSTEM, EXPLAIN_SCHEMA, EXPLAIN_SYSTEM, explainFacts } from './prompts'

export interface AiContext {
  config: AiConfig
  fetchImpl: typeof fetch
  now: () => number
  bundle: EvidenceBundle
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
const EXPLICIT_WINDOW_SCALE = /median|regional|ventana\s+completa|\bwindow\b/i
const COUNTRY_WORDS: Record<string, RegExp> = { CL: /chile|\bCL\b/i, AR: /argentin|\bAR\b/i }

/** Números que aparecen literalmente en la cita (admite coma decimal). */
function numbersIn(text: string): number[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((t) => Number.parseFloat(t.replace(',', '.')))
}
const allNumbersInQuote = (nums: number[], quote: string): boolean => {
  const found = numbersIn(quote)
  return nums.length > 0 && nums.every((n) => found.some((f) => Math.abs(f - n) < 1e-9))
}

/**
 * Validación semántica del borrador (después de validar la salida del proveedor con Ajv).
 * Nada del brief se descarta en silencio: lo que no encaja en un requisito válido pasa a open_questions;
 * lo que la IA no puede anclar en el brief se descarta Y se informa. Todo requisito sale con
 * confirmed=false y origin='ai'. No se confía en la IA para la escala ni para las cifras:
 * - una métrica topográfica sin «mediana/regional/ventana completa» en la cita se conserva como escala
 *   puntual (no evaluable) con una pregunta sobre la escala;
 * - las cifras propuestas deben aparecer literalmente en la cita; si no, queda como pregunta de aclaración.
 */
export function buildDraft(raw: unknown, brief: string): { draft: Omit<DraftProposal, 'warnings'>; warnings: string[] } {
  if (validateDraftOutput(raw).length) throw new AiCallError('ai_invalid_output')
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
      questions.push(`${why}: «${quote}»`)
    }
    if ((METRIC_IDS as string[]).includes(metric)) {
      const spec = METRICS[metric as keyof typeof METRICS]
      const nums = it.numbers as number[]
      const op = it.operator as MeasurableRequirement['operator'] | 'none'
      if (op === 'none') { pending('Pendiente de precisar el umbral'); continue }
      if (op === 'in') {
        const wrong = (it.countries as string[]).some((c) => !COUNTRY_WORDS[c]?.test(quote))
        if (metric !== 'country' || wrong || !(it.countries as string[]).length) { pending('Pendiente de precisar el país'); continue }
      } else if (!allNumbersInQuote(nums, quote)) {
        pending('Pendiente de aclarar la cifra (no aparece en el texto citado)'); continue
      }
      let scale: MeasurableRequirement['scale'] = it.scale === 'point' ? 'point' : 'window'
      if (TOPOGRAPHIC.includes(metric) && scale === 'window' && !EXPLICIT_WINDOW_SCALE.test(quote)) {
        scale = 'point'
        questions.push(`¿«${spec.label}» se refiere a la mediana regional de la ventana completa o a un valor puntual? El texto no lo dice; se dejó como escala puntual (no evaluable) hasta que lo precise.`)
      }
      const value = op === 'in' ? (it.countries as string[]) : op === 'between' ? nums.slice(0, 2) : nums[0]
      const candidate: MeasurableRequirement = {
        ...base, kind: 'measurable', label: clean(it.label, 120) || spec.label, metric_id: spec.id, operator: op as MeasurableRequirement['operator'],
        value: value as MeasurableRequirement['value'], unit: String(it.unit), scale,
      }
      const probe = validateMissionRequest({
        schema_version: '1.0.0', brief: '', activity: '', target: { profile_id: SUPPORTED_PROFILE_ID, stated: '' },
        requirements: [candidate], open_questions: [], scope: { mode: 'catalog' }, confirmed: false,
      })
      if (probe.ok) { requirements.push(candidate); n += 1 } else pending('Pendiente de precisar el requisito')
    } else if (UNMEASURED_TOPICS.some((t) => t.id === metric) || metric === 'other_unmeasured') {
      const topic = UNMEASURED_TOPICS.find((t) => t.id === metric)
      const candidate: UnmeasuredRequirement = {
        ...base, kind: 'unmeasured', label: clean(it.label, 120) || topic?.label || 'Pedido no medido', topic_id: metric, detail: clean(it.detail, 300),
      }
      requirements.push(candidate)
      n += 1
    } else {
      discarded += 1
    }
  }
  if (discarded) warnings.push(`La IA propuso ${discarded} elemento(s) que no se pudieron anclar en el texto o no corresponden al catálogo; se descartaron y no forman parte del borrador.`)
  if (requirements.length > 20) {
    questions.push(...requirements.splice(20).map((x) => `Pendiente de precisar: «${x.source_quote ?? x.label}»`))
    warnings.push('Se superó el máximo de 20 requisitos; el resto quedó como preguntas abiertas.')
  }
  // Red de seguridad determinista: temas no medidos citados en el brief que el borrador no recogió.
  const covered = new Set(requirements.filter((x): x is UnmeasuredRequirement => x.kind === 'unmeasured').map((x) => x.topic_id))
  if (requirements.some((x) => x.kind === 'measurable' && x.metric_id === 'median_slope_degree' && x.scale === 'point')) covered.add('max_point_slope')
  for (const m of detectUnmeasuredMentions(brief)) {
    if (!covered.has(m.topic_id)) {
      questions.push(`El brief menciona «${m.matched_text}»: «${m.label}» no está medido en el snapshot v3; si es relevante, agréguelo como requisito pendiente.`)
    }
  }
  const all = [...new Set(questions)]
  const unique = all.slice(0, 20)
  if (all.length > 20) warnings.push('Hay más de 20 preguntas abiertas; se muestran las primeras 20.')
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

export async function runDraft(ctx: AiContext, brief: string): Promise<DraftResult> {
  const { data, provenance } = await callStructured(
    ctx.config,
    { system: DRAFT_SYSTEM, user: `<brief>\n${brief}\n</brief>`, schema: DRAFT_SCHEMA as unknown as Record<string, unknown>, maxTokens: 2000 },
    ctx.fetchImpl,
    ctx.now,
  )
  const built = buildDraft(data, brief)
  return { proposal: { ...built.draft, warnings: built.warnings }, provenance }
}

export interface ExplainResult {
  request_fingerprint: string
  evaluation_fingerprint: string
  selection: ExplanationSelection
  provenance: AiProvenance
}

export class ExplainInputError extends Error {
  constructor(readonly code: 'invalid_request' | 'stale_request' | 'nothing_to_explain', readonly issues: string[] = []) {
    super(code)
  }
}

/** Los hechos se recalculan aquí desde artefactos confiables; el cliente solo aporta la solicitud. */
export async function runExplain(ctx: AiContext, requestInput: unknown, clientFingerprint: string): Promise<ExplainResult> {
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
  const { data, provenance } = await callStructured(
    ctx.config,
    { system: EXPLAIN_SYSTEM, user: `<facts>\n${explainFacts(evaluation, verifications)}\n</facts>`, schema: EXPLAIN_SCHEMA as unknown as Record<string, unknown>, maxTokens: 2000 },
    ctx.fetchImpl,
    ctx.now,
  )
  const check = checkSelection(data, evaluation)
  if (!check.ok) throw new AiCallError('ai_invalid_output')
  return { request_fingerprint: reqFp, evaluation_fingerprint: evaluationFingerprint(evaluation), selection: check.selection, provenance }
}
