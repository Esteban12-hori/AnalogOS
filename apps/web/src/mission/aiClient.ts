// Client for the /api/ai endpoint: a single exit point, with a timeout, a validated response, and
// friendly errors. It never leaves a promise hanging: every path ends in {ok:true} or {ok:false}.
import Ajv2020 from 'ajv/dist/2020'
import aiSchema from '../../../../contracts/mission-ai.schema.json'
import requestSchema from '../../../../contracts/mission-request.schema.json'
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

const FRIENDLY: Record<string, string> = {
  ai_unavailable: 'AI assistance is not available right now or in this version.',
  ai_timeout: 'The AI took too long to respond.',
  ai_rate_limited: 'The AI provider rate-limited the requests; try again later.',
  ai_refused: 'The AI could not process this content.',
  ai_truncated: 'The AI response was incomplete and was discarded.',
  ai_invalid_output: 'The AI response did not have the expected format and was discarded.',
  ai_upstream_error: 'The AI service returned an error.',
  rate_limited: 'Too many requests in a row; wait a minute.',
  origin_not_allowed: 'This page is not authorized to use the AI.',
  stale_request: 'The content changed; confirm again before asking for the explanation.',
  invalid_request: 'The request is not valid; check the requirements.',
  nothing_to_explain: 'There are no evaluated options to explain.',
  geology_context_unavailable: 'The server has no valid geology context for this version, so no geological guidance was requested.',
  geology_context_stale: 'The server geology context is a different version from the one this page shows, so no geological guidance was requested.',
}
const UNAVAILABLE = new Set(['ai_unavailable', 'ai_upstream_error', 'ai_timeout', 'origin_not_allowed'])
const NO_IA = 'The AI could not be used. You can continue manually: nothing you already did was lost.'

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
      return { ok: false, unavailable: true, message: `The AI is not available in this version or offline. ${NO_IA}` }
    }
    if (!json || typeof json !== 'object') return { ok: false, unavailable: true, message: NO_IA }
    const obj = json as Record<string, unknown>
    if (obj.ok === true) return { ok: true, value: obj }
    const code = typeof (obj.error as { code?: unknown } | undefined)?.code === 'string' ? (obj.error as { code: string }).code : 'ai_upstream_error'
    return { ok: false, code, unavailable: UNAVAILABLE.has(code) || !res.ok && !FRIENDLY[code], message: `${FRIENDLY[code] ?? 'The AI returned an error.'} ${NO_IA}` }
  } catch {
    return { ok: false, unavailable: true, message: signal?.aborted ? 'Request canceled.' : `The AI did not respond in time or there is no connection. ${NO_IA}` }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

const invalid = (): AiClientResult<never> => ({ ok: false, unavailable: false, message: `The AI response does not have the expected format and was discarded. ${NO_IA}` })

export async function requestDraft(args: { requestId: string; brief: string; url: string; fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<AiClientResult<{ proposal: DraftProposal; provenance: AiProvenance }>> {
  const r = await post({ operation: 'draft', client_request_id: args.requestId, brief: args.brief }, args.fetchImpl ?? fetch, args.url, args.signal)
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
