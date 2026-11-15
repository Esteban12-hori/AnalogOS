import { ANTHROPIC_ENDPOINT, ANTHROPIC_VERSION, type AiConfig } from './config'
import type { AiProvenance } from '../../shared/mission/exportReport'

export type AiErrorCode =
  | 'ai_unavailable'
  | 'ai_timeout'
  | 'ai_rate_limited'
  | 'ai_refused'
  | 'ai_truncated'
  | 'ai_invalid_output'
  | 'ai_upstream_error'

export class AiCallError extends Error {
  constructor(readonly code: AiErrorCode) {
    super(code)
    this.name = 'AiCallError'
  }
}

export interface StructuredCall {
  system: string
  user: string
  schema: Record<string, unknown>
  maxTokens: number
}

export interface StructuredResult {
  data: unknown
  provenance: AiProvenance
}

const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null)

/**
 * Una llamada a /v1/messages con salida JSON por esquema (output_config.format). Sin herramientas,
 * sin streaming, sin URL del cliente. Los cuerpos de error del proveedor jamás se reenvían.
 */
export async function callStructured(
  config: AiConfig,
  call: StructuredCall,
  fetchImpl: typeof fetch,
  now: () => number,
): Promise<StructuredResult> {
  if (!config.apiKey) throw new AiCallError('ai_unavailable')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  // Segunda red: si un fetch/cuerpo ignora la señal, la carrera igualmente corta al vencer el plazo.
  const abortion = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
  })
  const aborted = (error: unknown): boolean => (error as { name?: string } | null)?.name === 'AbortError'
  let response: Response
  let body: Record<string, unknown>
  // El temporizador cubre headers Y lectura completa del cuerpo: se limpia solo al terminar todo.
  try {
    try {
      response = await Promise.race([abortion, fetchImpl(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        body: JSON.stringify({
          model: config.model,
          max_tokens: call.maxTokens,
          system: call.system,
          messages: [{ role: 'user', content: call.user }],
          output_config: { format: { type: 'json_schema', schema: call.schema } },
        }),
      })])
    } catch (error) {
      throw new AiCallError(aborted(error) ? 'ai_timeout' : 'ai_unavailable')
    }
    if (!response.ok) {
      if (response.status === 429) throw new AiCallError('ai_rate_limited')
      if (response.status === 401 || response.status === 403 || response.status === 404) throw new AiCallError('ai_unavailable')
      throw new AiCallError('ai_upstream_error')
    }
    try {
      body = (await Promise.race([abortion, response.json()])) as Record<string, unknown>
    } catch (error) {
      throw new AiCallError(aborted(error) || controller.signal.aborted ? 'ai_timeout' : 'ai_invalid_output')
    }
  } finally {
    clearTimeout(timer)
  }
  if (!body || typeof body !== 'object') throw new AiCallError('ai_invalid_output')
  const stop = typeof body.stop_reason === 'string' ? body.stop_reason : null
  if (stop === 'refusal') throw new AiCallError('ai_refused')
  if (stop === 'max_tokens') throw new AiCallError('ai_truncated')
  const content = Array.isArray(body.content) ? (body.content as Array<{ type?: string; text?: string }>) : []
  const text = content.find((b) => b?.type === 'text' && typeof b.text === 'string')?.text
  if (!text) throw new AiCallError('ai_invalid_output')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new AiCallError('ai_invalid_output')
  }
  const usage = (body.usage ?? {}) as Record<string, unknown>
  const rawId = response.headers.get('request-id')
  return {
    data,
    provenance: {
      provider: 'anthropic',
      model: typeof body.model === 'string' && body.model.length <= 100 ? body.model : config.model,
      request_id: rawId && /^[A-Za-z0-9_-]{1,100}$/.test(rawId) ? rawId : null,
      created_at: new Date(now()).toISOString(),
      usage: { input_tokens: int(usage.input_tokens), output_tokens: int(usage.output_tokens) },
      stop_reason: stop,
    },
  }
}
