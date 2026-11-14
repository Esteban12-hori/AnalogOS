/**
 * Lector NDJSON (un objeto JSON completo por línea) sobre un ReadableStream de bytes, con topes
 * para que un servidor que no cumple el contrato no pueda inundar la UI. Puro: sin red.
 */

export interface NdjsonLimits {
  /** Caracteres por línea (un evento ai-analysis/1 cabe holgado en 4 KB). */
  maxLineChars: number
  /** Líneas no vacías por respuesta. */
  maxLines: number
  /** Caracteres totales por respuesta. */
  maxChars: number
}

export const NDJSON_LIMITS: NdjsonLimits = { maxLineChars: 4096, maxLines: 160, maxChars: 262_144 }

export type NdjsonEnd =
  /** El servidor cerró el stream. */
  | 'ended'
  /** `onLine` pidió parar (done, error, desactualizado…). */
  | 'stopped'
  /** Se superó un tope: el resto se ignora. */
  | 'too_large'

/**
 * Llama `onLine` con cada línea no vacía (sin el `\r` final). Si `onLine` devuelve false, cancela
 * el stream y termina con 'stopped'. Una línea partida entre dos trozos se reconstruye.
 */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => boolean,
  limits: NdjsonLimits = NDJSON_LIMITS,
): Promise<NdjsonEnd> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let total = 0
  let lines = 0

  const emit = (raw: string): NdjsonEnd | null => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (line.trim().length === 0) return null
    if (line.length > limits.maxLineChars || (lines += 1) > limits.maxLines) return 'too_large'
    return onLine(line) ? null : 'stopped'
  }

  const stop = async (end: NdjsonEnd): Promise<NdjsonEnd> => {
    await reader.cancel().catch(() => undefined)
    return end
  }

  for (;;) {
    const { done, value } = await reader.read()
    const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true })
    total += chunk.length
    if (total > limits.maxChars) return stop('too_large')
    buffer += chunk
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const end = emit(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      if (end) return stop(end)
      newline = buffer.indexOf('\n')
    }
    if (buffer.length > limits.maxLineChars) return stop('too_large')
    if (done) {
      const end = emit(buffer)
      return end ?? 'ended'
    }
  }
}
