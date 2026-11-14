// Manejador agnóstico del framework (testeable sin red ni Vercel). POST /api/ai, same-origin.
import { MAX_BRIEF_CHARS } from '../../apps/web/src/mission/catalog'
import type { EvidenceBundle } from '../../apps/web/src/mission/types'
import { AiCallError, type AiErrorCode } from './anthropic'
import type { AiConfig } from './config'
import { header, isOriginAllowed, RateLimiter, type HeaderBag } from './guard'
import { ExplainInputError, runDraft, runExplain } from './operations'

export const MAX_BODY_BYTES = 24 * 1024

export interface AiHttpRequest {
  method: string
  headers: HeaderBag // claves en minúscula
  /** Cuerpo ya leído (string) o parseado por la plataforma (objeto). */
  body: unknown
  clientKey: string
}
export interface AiHttpResponse {
  status: number
  headers: Record<string, string>
  body: Record<string, unknown>
}
export interface AiDeps {
  config: AiConfig
  fetchImpl: typeof fetch
  now: () => number
  limiter: RateLimiter
  bundle: EvidenceBundle
}

type ErrorCode =
  | AiErrorCode
  | 'method_not_allowed'
  | 'origin_not_allowed'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'bad_request'
  | 'rate_limited'
  | 'invalid_request'
  | 'stale_request'
  | 'nothing_to_explain'

// Mensajes fijos: nunca se refleja texto del proveedor, de la clave ni del cuerpo del cliente.
const ERRORS: Record<ErrorCode, [number, string]> = {
  method_not_allowed: [405, 'Solo se admite POST.'],
  origin_not_allowed: [403, 'Origen no permitido.'],
  unsupported_media_type: [415, 'El contenido debe ser application/json.'],
  payload_too_large: [413, 'La solicitud supera el tamaño permitido.'],
  bad_request: [400, 'Solicitud mal formada.'],
  rate_limited: [429, 'Demasiadas solicitudes; espere un minuto.'],
  invalid_request: [422, 'La solicitud no es válida o no está confirmada.'],
  stale_request: [409, 'La solicitud cambió; vuelva a confirmarla.'],
  nothing_to_explain: [422, 'No hay opciones evaluadas que explicar.'],
  ai_unavailable: [503, 'La asistencia de IA no está disponible. El recorrido manual sigue funcionando.'],
  ai_timeout: [504, 'La IA tardó demasiado en responder.'],
  ai_rate_limited: [503, 'El proveedor de IA limitó las solicitudes; reintente más tarde.'],
  ai_refused: [422, 'La IA rechazó procesar este contenido.'],
  ai_truncated: [502, 'La respuesta de la IA quedó incompleta y se descartó.'],
  ai_invalid_output: [502, 'La respuesta de la IA no cumplió el contrato y se descartó.'],
  ai_upstream_error: [502, 'Error del proveedor de IA.'],
}

const BASE_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-type': 'application/json; charset=utf-8' }
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/

function fail(code: ErrorCode, clientId: string | null, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): AiHttpResponse {
  const [status, message] = ERRORS[code]
  return { status, headers: { ...BASE_HEADERS, ...headers }, body: { ok: false, error: { code, message, ...extra }, client_request_id: clientId } }
}

function parseBody(body: unknown): { value: unknown } | { error: ErrorCode } {
  if (typeof body === 'string' || (typeof Buffer !== 'undefined' && Buffer.isBuffer(body))) {
    const text = String(body)
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { error: 'payload_too_large' }
    try {
      return { value: JSON.parse(text) }
    } catch {
      return { error: 'bad_request' }
    }
  }
  if (body && typeof body === 'object') {
    let size: number
    try {
      size = new TextEncoder().encode(JSON.stringify(body)).length
    } catch {
      return { error: 'bad_request' }
    }
    return size > MAX_BODY_BYTES ? { error: 'payload_too_large' } : { value: body }
  }
  return { error: 'bad_request' }
}

const hasOnly = (o: Record<string, unknown>, keys: string[]): boolean => Object.keys(o).every((k) => keys.includes(k))

export async function handleAiRequest(req: AiHttpRequest, deps: AiDeps): Promise<AiHttpResponse> {
  if (req.method !== 'POST') return fail('method_not_allowed', null, {}, { allow: 'POST' })
  if (!isOriginAllowed(header(req.headers, 'origin'), header(req.headers, 'x-forwarded-host') || header(req.headers, 'host'), deps.config)) {
    return fail('origin_not_allowed', null)
  }
  if (!header(req.headers, 'content-type').toLowerCase().startsWith('application/json')) return fail('unsupported_media_type', null)
  const declared = Number.parseInt(header(req.headers, 'content-length'), 10)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail('payload_too_large', null)
  const parsed = parseBody(req.body)
  if ('error' in parsed) return fail(parsed.error, null)
  const b = parsed.value
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail('bad_request', null)
  const body = b as Record<string, unknown>
  const clientId = typeof body.client_request_id === 'string' && CLIENT_ID.test(body.client_request_id) ? body.client_request_id : null
  if (!clientId) return fail('bad_request', null)

  let op: 'draft' | 'explain'
  if (body.operation === 'draft' && hasOnly(body, ['operation', 'client_request_id', 'brief'])) {
    if (typeof body.brief !== 'string' || !body.brief.trim() || body.brief.length > MAX_BRIEF_CHARS) return fail('bad_request', clientId)
    op = 'draft'
  } else if (body.operation === 'explain' && hasOnly(body, ['operation', 'client_request_id', 'request', 'request_fingerprint'])) {
    if (typeof body.request_fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(body.request_fingerprint)) return fail('bad_request', clientId)
    op = 'explain'
  } else {
    return fail('bad_request', clientId)
  }

  if (!deps.config.apiKey) return fail('ai_unavailable', clientId)
  const limit = deps.limiter.check(req.clientKey || 'unknown', deps.now())
  if (!limit.ok) return fail('rate_limited', clientId, {}, { 'retry-after': String(limit.retryAfterSec) })

  const ctx = { config: deps.config, fetchImpl: deps.fetchImpl, now: deps.now, bundle: deps.bundle }
  try {
    if (op === 'draft') {
      const r = await runDraft(ctx, body.brief as string)
      return { status: 200, headers: BASE_HEADERS, body: { ok: true, operation: 'draft', client_request_id: clientId, draft: r.proposal, provenance: r.provenance } }
    }
    const r = await runExplain(ctx, body.request, body.request_fingerprint as string)
    return {
      status: 200,
      headers: BASE_HEADERS,
      body: { ok: true, operation: 'explain', client_request_id: clientId, request_fingerprint: r.request_fingerprint, evaluation_fingerprint: r.evaluation_fingerprint, selection: r.selection, provenance: r.provenance },
    }
  } catch (error) {
    if (error instanceof AiCallError) return fail(error.code, clientId)
    if (error instanceof ExplainInputError) return fail(error.code, clientId, error.issues.length ? { issues: error.issues } : {})
    return fail('ai_upstream_error', clientId) // error inesperado: sin detalle ni stack hacia el cliente
  }
}
