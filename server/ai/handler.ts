// Framework-agnostic handler (testable without network or Vercel). POST /api/ai, same-origin.
import { DEFAULT_AI_LANGUAGE, draftLanguageOf, type AiLanguage } from '../../shared/mission/aiSchemas'
import { MAX_BRIEF_CHARS } from '../../shared/mission/catalog'
import type { EvidenceBundle } from '../../shared/mission/types'
import { AiCallError, type AiErrorCode } from './anthropic'
import type { AiConfig } from './config'
import { header, isOriginAllowed, RateLimiter, type HeaderBag } from './guard'
import type { ServerGeology } from './geology'
import { ExplainInputError, checkGeologyChannel, runDraft, runExplain } from './operations'

export const MAX_BODY_BYTES = 24 * 1024

export interface AiHttpRequest {
  method: string
  headers: HeaderBag // lowercase keys
  /** Body already read (string) or parsed by the platform (object). */
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
  /** Server geological package (lazy so as not to read from disk if the client does not request it). Absent = not available. */
  geology?: () => ServerGeology
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
  | 'geology_context_unavailable'
  | 'geology_context_stale'

// Fixed messages: text from the provider, the key, or the client body is never reflected.
const ERRORS: Record<ErrorCode, [number, string]> = {
  method_not_allowed: [405, 'Only POST is allowed.'],
  origin_not_allowed: [403, 'Origin not allowed.'],
  unsupported_media_type: [415, 'The content must be application/json.'],
  payload_too_large: [413, 'The request exceeds the allowed size.'],
  bad_request: [400, 'Malformed request.'],
  rate_limited: [429, 'Too many requests; wait a minute.'],
  invalid_request: [422, 'The request is invalid or not confirmed.'],
  stale_request: [409, 'The request changed; confirm it again.'],
  nothing_to_explain: [422, 'There are no evaluated options to explain.'],
  geology_context_unavailable: [409, 'The server has no valid geology context for this version. You can retry without geology.'],
  geology_context_stale: [409, 'The server has a different geology context (another version). Reload the page or retry without geology.'],
  ai_unavailable: [503, 'AI assistance is not available. The manual flow still works.'],
  ai_timeout: [504, 'The AI took too long to respond.'],
  ai_rate_limited: [503, 'The AI provider rate-limited the requests; try again later.'],
  ai_refused: [422, 'The AI declined to process this content.'],
  ai_truncated: [502, 'The AI response was incomplete and was discarded.'],
  ai_invalid_output: [502, 'The AI response did not meet the contract and was discarded.'],
  ai_upstream_error: [502, 'AI provider error.'],
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
  // Draft language (ADR-017): optional; absent = 'en' (unchanged behavior). Only 'en' | 'es'; any other value is a 400.
  let language: AiLanguage = DEFAULT_AI_LANGUAGE
  if (body.operation === 'draft' && hasOnly(body, ['operation', 'client_request_id', 'brief', 'language'])) {
    if (typeof body.brief !== 'string' || !body.brief.trim() || body.brief.length > MAX_BRIEF_CHARS) return fail('bad_request', clientId)
    const requested = draftLanguageOf(body.language)
    if (requested === null) return fail('bad_request', clientId)
    language = requested
    op = 'draft'
  } else if (body.operation === 'explain' && hasOnly(body, ['operation', 'client_request_id', 'request', 'request_fingerprint', 'geology_context_fingerprint'])) {
    if (typeof body.request_fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(body.request_fingerprint)) return fail('bad_request', clientId)
    if (body.geology_context_fingerprint !== undefined && (typeof body.geology_context_fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(body.geology_context_fingerprint))) return fail('bad_request', clientId)
    op = 'explain'
  } else {
    return fail('bad_request', clientId)
  }

  // Opt-in geological channel: resolved BEFORE the key and the provider (the package is actually loaded and validated).
  const geologyFp = op === 'explain' && typeof body.geology_context_fingerprint === 'string' ? body.geology_context_fingerprint : undefined
  let geology: ServerGeology | undefined
  if (geologyFp !== undefined) {
    geology = deps.geology?.() ?? { status: 'absent' }
    try {
      checkGeologyChannel(geology, geologyFp)
    } catch (error) {
      if (error instanceof ExplainInputError) return fail(error.code, clientId)
      throw error
    }
  }
  if (!deps.config.apiKey) return fail('ai_unavailable', clientId)
  const limit = deps.limiter.check(req.clientKey || 'unknown', deps.now())
  if (!limit.ok) return fail('rate_limited', clientId, {}, { 'retry-after': String(limit.retryAfterSec) })

  const ctx = { config: deps.config, fetchImpl: deps.fetchImpl, now: deps.now, bundle: deps.bundle, geology }
  try {
    if (op === 'draft') {
      const r = await runDraft(ctx, body.brief as string, language)
      return { status: 200, headers: BASE_HEADERS, body: { ok: true, operation: 'draft', client_request_id: clientId, draft: r.proposal, provenance: r.provenance } }
    }
    const r = await runExplain(ctx, body.request, body.request_fingerprint as string, geologyFp)
    return {
      status: 200,
      headers: BASE_HEADERS,
      body: { ok: true, operation: 'explain', client_request_id: clientId, request_fingerprint: r.request_fingerprint, evaluation_fingerprint: r.evaluation_fingerprint, selection: r.selection, provenance: r.provenance, ...(r.geology ? { geology: r.geology } : {}) },
    }
  } catch (error) {
    if (error instanceof AiCallError) return fail(error.code, clientId)
    if (error instanceof ExplainInputError) return fail(error.code, clientId, error.issues.length ? { issues: error.issues } : {})
    return fail('ai_upstream_error', clientId) // unexpected error: no detail or stack sent to the client
  }
}
