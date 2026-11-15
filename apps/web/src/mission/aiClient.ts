// Cliente del endpoint /api/ai: un solo punto de salida, con tiempo límite, respuesta validada y
// errores amigables. Nunca deja una promesa colgada: toda vía termina en {ok:true} u {ok:false}.
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
  ai_unavailable: 'La asistencia de IA no está disponible en este momento o en esta versión.',
  ai_timeout: 'La IA tardó demasiado en responder.',
  ai_rate_limited: 'El proveedor de IA limitó las solicitudes; reintente más tarde.',
  ai_refused: 'La IA no pudo procesar este contenido.',
  ai_truncated: 'La respuesta de la IA quedó incompleta y se descartó.',
  ai_invalid_output: 'La respuesta de la IA no cumplió el formato esperado y se descartó.',
  ai_upstream_error: 'El servicio de IA devolvió un error.',
  rate_limited: 'Demasiadas solicitudes seguidas; espere un minuto.',
  origin_not_allowed: 'Esta página no está autorizada para usar la IA.',
  stale_request: 'El contenido cambió; vuelva a confirmar antes de pedir la explicación.',
  invalid_request: 'La solicitud no es válida; revise los requisitos.',
  nothing_to_explain: 'No hay opciones evaluadas que explicar.',
  geology_context_unavailable: 'El servidor no tiene un contexto geológico válido para esta versión, así que no se pidió orientación geológica.',
  geology_context_stale: 'El contexto geológico del servidor es de otra versión que el que muestra esta página, así que no se pidió orientación geológica.',
}
const UNAVAILABLE = new Set(['ai_unavailable', 'ai_upstream_error', 'ai_timeout', 'origin_not_allowed'])
const NO_IA = 'No se pudo usar la IA. Puede continuar manualmente: nada de lo que ya hizo se perdió.'

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
      // Sin cuerpo JSON: típico del ZIP estático (404/HTML) o de un corte de red.
      return { ok: false, unavailable: true, message: `La IA no está disponible en esta versión o sin conexión. ${NO_IA}` }
    }
    if (!json || typeof json !== 'object') return { ok: false, unavailable: true, message: NO_IA }
    const obj = json as Record<string, unknown>
    if (obj.ok === true) return { ok: true, value: obj }
    const code = typeof (obj.error as { code?: unknown } | undefined)?.code === 'string' ? (obj.error as { code: string }).code : 'ai_upstream_error'
    return { ok: false, code, unavailable: UNAVAILABLE.has(code) || !res.ok && !FRIENDLY[code], message: `${FRIENDLY[code] ?? 'La IA devolvió un error.'} ${NO_IA}` }
  } catch {
    return { ok: false, unavailable: true, message: signal?.aborted ? 'Solicitud cancelada.' : `La IA no respondió a tiempo o no hay conexión. ${NO_IA}` }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

const invalid = (): AiClientResult<never> => ({ ok: false, unavailable: false, message: `La respuesta de la IA no tiene el formato esperado y se descartó. ${NO_IA}` })

export async function requestDraft(args: { requestId: string; brief: string; url: string; fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<AiClientResult<{ proposal: DraftProposal; provenance: AiProvenance }>> {
  const r = await post({ operation: 'draft', client_request_id: args.requestId, brief: args.brief }, args.fetchImpl ?? fetch, args.url, args.signal)
  if (!r.ok) return r
  const v = r.value
  if (v.operation !== 'draft' || v.client_request_id !== args.requestId || !proposalOk(v.draft) || !provenanceOk(v.provenance)) return invalid()
  return { ok: true, value: { proposal: v.draft as DraftProposal, provenance: v.provenance as AiProvenance } }
}

export interface ExplainGeologyValue { contextFp: string; catalogFp: string; selection: { ref_ids: string[] } }
export interface ExplainValue { requestFp: string; evaluationFp: string; selection: ExplanationSelection; provenance: AiProvenance; geology?: ExplainGeologyValue }

/** Mensaje y código de los errores que solo afectan al canal geológico (la UI ofrece reintentar sin geología). */
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
    return invalid() // nunca se acepta orientación geológica que el usuario no pidió
  }
  return { ok: true, value: { requestFp: v.request_fingerprint, evaluationFp: v.evaluation_fingerprint, selection: v.selection as ExplanationSelection, provenance: v.provenance as AiProvenance, ...(geology ? { geology } : {}) } }
}
