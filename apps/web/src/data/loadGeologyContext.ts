// Contexto geológico opcional y offline: lee el paquete local generado por pipelines/build_geology_context.py.
// La web nunca llama a SERNAGEOMIN, MMA ni SIGAM; solo sirve el archivo ya incluido en el build.
import type { CandidateSite } from '../domain/contracts'
import { parseGeologyContext, type GeologyContextState } from '../domain/geologyContext'

/** El paquete geológico v1 está ligado al snapshot v3; otro snapshot no lo reutiliza. */
export const GEOLOGY_CONTEXT_DIR = 'geology-context-v1'
export const GEOLOGY_TIMEOUT_MS = 8000
export const GEOLOGY_MAX_BYTES = 2 * 1024 * 1024

export function geologyContextUrl(baseUrl: string, file = 'index.json'): string {
  return `${baseUrl}${GEOLOGY_CONTEXT_DIR}/${file}`
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

/**
 * Nunca lanza: si el paquete falta, tarda, pesa de más o no valida, devuelve «no disponible» y la ficha, la
 * selección y M8 siguen funcionando. El tiempo máximo cubre la lectura del cuerpo, no solo la cabecera.
 */
export async function loadGeologyContext(
  candidates: CandidateSite[],
  options: { baseUrl?: string; fetcher?: Fetcher; timeoutMs?: number } = {},
): Promise<GeologyContextState> {
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? GEOLOGY_TIMEOUT_MS)
  try {
    const response = await fetcher(geologyContextUrl(baseUrl), { signal: controller.signal })
    if (!response.ok) {
      return { status: 'unavailable', reason: `No se encontró el paquete geológico de esta versión.` }
    }
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > GEOLOGY_MAX_BYTES) {
      return { status: 'unavailable', reason: 'El paquete geológico excede el tamaño permitido.' }
    }
    // El cuerpo se lee bajo el mismo AbortController: un servidor que se cuelga a mitad de la respuesta también expira.
    const text = await readBody(response, controller.signal)
    if (text.length > GEOLOGY_MAX_BYTES) {
      return { status: 'unavailable', reason: 'El paquete geológico excede el tamaño permitido.' }
    }
    return { status: 'ready', context: parseGeologyContext(JSON.parse(text) as unknown, candidates) }
  } catch {
    if (controller.signal.aborted) {
      return { status: 'unavailable', reason: 'El contexto geológico tardó demasiado en cargar.' }
    }
    return {
      status: 'unavailable',
      reason: 'No pudimos verificar los datos geológicos de esta versión.',
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Lee el cuerpo y rechaza si la señal se aborta, aunque el Response simulado no la observe. */
function readBody(response: Response, signal: AbortSignal): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('abortado', 'AbortError'))
    if (signal.aborted) return onAbort()
    signal.addEventListener('abort', onAbort, { once: true })
    response.text().then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}
