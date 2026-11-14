/**
 * Cliente lktron (ADR-010, docs/UX_REDESIGN.md §5.1). Código diferido: solo se descarga si el
 * build define `VITE_LKTRON_URL`. Dos llamadas separadas:
 *  - `POST <url>/interpret` → `mission-interpretation/1` (un objeto JSON);
 *  - `POST <url>/analyze` (cuerpo: `evidence-packet/1`) → `ai-analysis/1` en NDJSON.
 * Sin credenciales, cookies ni referrer; tiempo agotado a los 20 s (sin respuesta o sin una línea
 * nueva). Toda respuesta se valida antes de entregarla: nunca pasa texto sin validar.
 */
import {
  checkMissionInterpretation,
  type EvidencePacket,
  type MissionInterpretation,
  type MissionInterpretRequest,
} from '../../domain/aiContracts'
import { PHASE_THRESHOLDS } from '../engine'
import { scanPlainText, type TextIssue } from './analysisTokens'
import type { LktronResult } from './index'
import { readNdjson, type NdjsonEnd } from './ndjson'

export interface LktronCall {
  /** URL base ya validada por parseLktronUrl. */
  baseUrl: string
  signal?: AbortSignal
  /** Inyectable en tests. */
  fetch?: typeof fetch
  timeoutMs?: number
}

const MAX_JSON_CHARS = 65_536

const REQUEST: RequestInit = {
  method: 'POST',
  mode: 'cors',
  credentials: 'omit',
  cache: 'no-store',
  redirect: 'error',
  referrerPolicy: 'no-referrer',
}

interface Link {
  signal: AbortSignal
  /** Rearma el tiempo agotado (cada línea recibida). */
  arm(): void
  timedOut(): boolean
  dispose(): void
}

function link(outer: AbortSignal | undefined, timeoutMs: number): Link {
  const controller = new AbortController()
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const onAbort = () => controller.abort()
  if (outer?.aborted) controller.abort()
  else outer?.addEventListener('abort', onAbort, { once: true })
  const arm = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  }
  arm()
  return {
    signal: controller.signal,
    arm,
    timedOut: () => timedOut,
    dispose: () => {
      if (timer !== undefined) clearTimeout(timer)
      outer?.removeEventListener('abort', onAbort)
    },
  }
}

function issueText(issue: TextIssue): string {
  switch (issue.code) {
    case 'digit':
    case 'percent':
    case 'numeric_symbol':
      return 'traía cifras'
    case 'number_word':
      return 'traía números escritos'
    case 'vocabulary':
      return 'traía un veredicto que solo fija el motor'
    default:
      return 'traía texto no admitido'
  }
}

/**
 * Reglas de §5.2 que el esquema no expresa: motor lktron, mismo perfil base, criterios sin
 * repetir y del catálogo, y textos sin números escritos ni vocabulario de veredicto.
 */
export function validateInterpretation(data: unknown, request: MissionInterpretRequest): LktronResult<MissionInterpretation> {
  const checked = checkMissionInterpretation(data)
  if (!checked.ok) return { ok: false, code: 'invalid', message: `La interpretación no cumple el contrato (${checked.error}).` }
  const value = checked.value
  if (value.engine !== 'lktron') return { ok: false, code: 'invalid', message: 'La interpretación no viene de lktron.' }
  if (value.base_profile.id !== request.base_profile_id) return { ok: false, code: 'invalid', message: 'La interpretación usa otro perfil base.' }
  const ids = value.criteria.map((criterion) => criterion.id)
  if (new Set(ids).size !== ids.length) return { ok: false, code: 'invalid', message: 'La interpretación repite un criterio.' }
  const catalog = new Set(request.catalog.map((item) => item.id))
  if (catalog.size > 0 && ids.some((id) => !catalog.has(id))) return { ok: false, code: 'invalid', message: 'La interpretación usa un criterio fuera del catálogo.' }
  for (const text of [value.mission_summary, ...value.criteria.map((criterion) => criterion.rationale), ...value.assumptions]) {
    // Puede repetir lo que pidió el usuario (hielo, radiación…): eso va a «no medido», no se filtra aquí.
    const issue = scanPlainText(text, { unmeasured: false })
    if (issue) return { ok: false, code: 'invalid', message: `La interpretación ${issueText(issue)}.` }
  }
  for (const item of value.unsupported) {
    const issue = scanPlainText(item.phrase, { unmeasured: false, vocabulary: false })
    if (issue) return { ok: false, code: 'invalid', message: `La interpretación ${issueText(issue)}.` }
  }
  return { ok: true, value }
}

/** POST /interpret → mission-interpretation/1 validado. */
export async function interpret(request: MissionInterpretRequest, call: LktronCall): Promise<LktronResult<MissionInterpretation>> {
  const guard = link(call.signal, call.timeoutMs ?? PHASE_THRESHOLDS.timeoutMs)
  try {
    const response = await (call.fetch ?? fetch)(`${call.baseUrl}/interpret`, {
      ...REQUEST,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(request),
      signal: guard.signal,
    })
    if (!response.ok) return { ok: false, code: 'unavailable', message: `lktron no está disponible (HTTP ${response.status}).` }
    const text = await response.text()
    if (text.length > MAX_JSON_CHARS) return { ok: false, code: 'invalid', message: 'La respuesta de lktron es demasiado grande.' }
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, code: 'invalid', message: 'La respuesta de lktron no es JSON.' }
    }
    return validateInterpretation(data, request)
  } catch {
    if (guard.timedOut()) return { ok: false, code: 'timeout', message: 'lktron no respondió a tiempo.' }
    if (call.signal?.aborted) return { ok: false, code: 'aborted', message: 'Interpretación cancelada.' }
    return { ok: false, code: 'unavailable', message: 'No se pudo contactar a lktron.' }
  } finally {
    guard.dispose()
  }
}

export type AnalyzeEnd =
  | { ok: true; end: NdjsonEnd }
  | { ok: false; code: 'timeout' | 'unavailable' | 'invalid' | 'aborted'; message: string }

/**
 * POST /analyze con el paquete de evidencia; entrega cada línea NDJSON a `onLine` (que la valida
 * y decide si seguir). Devuelve cómo terminó el stream.
 */
export async function analyze(packet: EvidencePacket, call: LktronCall & { onLine: (line: string) => boolean }): Promise<AnalyzeEnd> {
  const guard = link(call.signal, call.timeoutMs ?? PHASE_THRESHOLDS.timeoutMs)
  try {
    const response = await (call.fetch ?? fetch)(`${call.baseUrl}/analyze`, {
      ...REQUEST,
      headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
      body: JSON.stringify(packet),
      signal: guard.signal,
    })
    if (!response.ok || !response.body) return { ok: false, code: 'unavailable', message: `lktron no está disponible${response.ok ? '' : ` (HTTP ${response.status})`}.` }
    const end = await readNdjson(response.body, (line) => {
      guard.arm()
      return call.onLine(line)
    })
    if (end === 'too_large') return { ok: false, code: 'invalid', message: 'El análisis superó el tamaño permitido.' }
    return { ok: true, end }
  } catch {
    if (guard.timedOut()) return { ok: false, code: 'timeout', message: 'lktron dejó de responder.' }
    if (call.signal?.aborted) return { ok: false, code: 'aborted', message: 'Análisis cancelado.' }
    return { ok: false, code: 'unavailable', message: 'No se pudo contactar a lktron.' }
  } finally {
    guard.dispose()
  }
}
