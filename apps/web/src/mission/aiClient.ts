// Client for the /api/ai endpoint: a single exit point, with a timeout, a validated response, and
// friendly errors. It never leaves a promise hanging: every path ends in {ok:true} or {ok:false}.
// Friendly messages follow the interface language when the result is produced (catalog i18n/messages/ai.ts); the
// error code travels untranslated in `code`. The draft asks the AI to write in the interface language (ADR-017).
import Ajv2020 from 'ajv/dist/2020'
import { getLocale } from '../i18n/core'
import { tAi } from '../i18n/messages/ai'
import aiSchema from '../../../../contracts/mission-ai.schema.json'
import requestSchema from '../../../../contracts/mission-request.schema.json'
import type { AiLanguage } from './aiSchemas'
import type { AiProvenance, DraftProposal } from './exportReport'
import type { ExplanationSelection } from './explanation'
import { validateSelectionShape } from './validate'
import type { MissionRequest } from './types'

const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(requestSchema)
ajv.addSchema(aiSchema)
const proposalOk = ajv.getSchema(`${aiSchema.$id}#/$defs/draftProposal`)!
const provenanceOk = ajv.getSchema(`${aiSchema.$id}#/$defs/provenance`)!

export const CLIENT_TIMEOUT_MS = 45_000

export type AiClientResult<T> = { ok: true; value: T } | { ok: false; message: string; unavailable: boolean; code?: string }

/** Server error codes with their own friendly message (catalog key `error.<code>`). */
const FRIENDLY_CODES = [
  'ai_unavailable', 'ai_timeout', 'ai_rate_limited', 'ai_refused', 'ai_truncated', 'ai_invalid_output', 'ai_upstream_error',
  'rate_limited', 'origin_not_allowed', 'stale_request', 'invalid_request', 'nothing_to_explain',
  'geology_context_unavailable', 'geology_context_stale',
] as const
type FriendlyCode = (typeof FRIENDLY_CODES)[number]
const isFriendly = (code: string): code is FriendlyCode => (FRIENDLY_CODES as readonly string[]).includes(code)
const UNAVAILABLE = new Set(['ai_unavailable', 'ai_upstream_error', 'ai_timeout', 'origin_not_allowed'])
/** Message + the “continue manually” sentence, in the interface language at the moment the result is produced. */
const withNoAi = (message: string): string => `${message} ${tAi('noAi')}`

async function post(body: Record<string, unknown>, fetchImpl: typeof fetch, url: string, signal?: AbortSignal): Promise<AiClientResult<Record<string, unknown>>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await Promise.race([
      fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }),
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('abort')))),
    ])
    let json: unknown
    try {
      json = await Promise.race([res.json(), new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('abort'))))])
    } catch {
      // No JSON body: typical of the static ZIP (404/HTML) or of a network outage.
      return { ok: false, unavailable: true, message: withNoAi(tAi('offline')) }
    }
    if (!json || typeof json !== 'object') return { ok: false, unavailable: true, message: tAi('noAi') }
    const obj = json as Record<string, unknown>
    if (obj.ok === true) return { ok: true, value: obj }
    const code = typeof (obj.error as { code?: unknown } | undefined)?.code === 'string' ? (obj.error as { code: string }).code : 'ai_upstream_error'
    // A Spanish draft rejected as malformed: most likely a server that predates the optional `language` field (ADR-017).
    const friendly = isFriendly(code) ? tAi(`error.${code}`) : code === 'bad_request' && body.language === 'es' ? tAi('error.languageRejected') : tAi('error.generic')
    return { ok: false, code, unavailable: UNAVAILABLE.has(code) || !res.ok && !isFriendly(code), message: withNoAi(friendly) }
  } catch {
    return { ok: false, unavailable: true, message: signal?.aborted ? tAi('canceled') : withNoAi(tAi('noResponse')) }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

const invalid = (): AiClientResult<never> => ({ ok: false, unavailable: false, message: withNoAi(tAi('invalidResponse')) })

/**
 * Body of a draft request. The AI writes the draft in the interface language (ADR-017): `language` is sent ONLY when it
 * is Spanish, so an English interface sends exactly the body it always sent (an older server never sees the field).
 */
export function draftRequestBody(requestId: string, brief: string, language: AiLanguage = getLocale()): Record<string, unknown> {
  const body: Record<string, unknown> = { operation: 'draft', client_request_id: requestId, brief }
  if (language === 'es') body.language = 'es'
  return body
}

export async function requestDraft(args: { requestId: string; brief: string; url: string; language?: AiLanguage; fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<AiClientResult<{ proposal: DraftProposal; provenance: AiProvenance }>> {
  const r = await post(draftRequestBody(args.requestId, args.brief, args.language), args.fetchImpl ?? fetch, args.url, args.signal)
  if (!r.ok) return r
  const v = r.value
  if (v.operation !== 'draft' || v.client_request_id !== args.requestId || !proposalOk(v.draft) || !provenanceOk(v.provenance)) return invalid()
  return { ok: true, value: { proposal: v.draft as DraftProposal, provenance: v.provenance as AiProvenance } }
}

export interface ExplainGeologyValue { contextFp: string; catalogFp: string; selection: { ref_ids: string[] } }
export interface ExplainValue { requestFp: string; evaluationFp: string; selection: ExplanationSelection; provenance: AiProvenance; geology?: ExplainGeologyValue }

/** Message and code of the errors that affect only the geological channel (the UI offers to retry without geology). */
export const GEOLOGY_ERROR_CODES = ['geology_context_unavailable', 'geology_context_stale'] as const

export async function requestExplanation(args: { requestId: string; request: MissionRequest; requestFp: string; url: string; geologyContextFp?: string; fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<AiClientResult<ExplainValue>> {
  const body: Record<string, unknown> = { operation: 'explain', client_request_id: args.requestId, request: args.request, request_fingerprint: args.requestFp }
  if (args.geologyContextFp) body.geology_context_fingerprint = args.geologyContextFp
  const r = await post(body, args.fetchImpl ?? fetch, args.url, args.signal)
  if (!r.ok) return r
  const v = r.value
  const fp = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x)
  if (v.operation !== 'explain' || v.client_request_id !== args.requestId || !fp(v.request_fingerprint) || !fp(v.evaluation_fingerprint)
    || validateSelectionShape(v.selection).length || !provenanceOk(v.provenance)) return invalid()
  let geology: ExplainGeologyValue | undefined
  if (args.geologyContextFp) {
    const g = v.geology as { context_fingerprint?: unknown; catalog_fingerprint?: unknown; selection?: { ref_ids?: unknown } } | undefined
    const ids = g?.selection?.ref_ids
    if (!g || !fp(g.context_fingerprint) || !fp(g.catalog_fingerprint) || !Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return invalid()
    geology = { contextFp: g.context_fingerprint, catalogFp: g.catalog_fingerprint, selection: { ref_ids: ids as string[] } }
  } else if (v.geology !== undefined) {
    return invalid() // geological guidance that the user did not request is never accepted
  }
  return { ok: true, value: { requestFp: v.request_fingerprint, evaluationFp: v.evaluation_fingerprint, selection: v.selection as ExplanationSelection, provenance: v.provenance as AiProvenance, ...(geology ? { geology } : {}) } }
}
