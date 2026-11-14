/**
 * Análisis pregenerado (ADR-010 §4): `artifacts/analysis/ai-analysis.default.json`, servido como
 * `analysis/ai-analysis.default.json` (publicDir) y cargado en diferido. Es texto redactado de
 * antemano, rotulado «no científico», que cita hechos del motor con marcadores `{{id}}`.
 *
 * Solo se usa si su huella coincide con la del paquete de evidencia actual; si no, la lectura
 * muestra solo los hechos. Cada evento pasa por la misma validación que un stream de lktron.
 */

export const PREGENERATED_PATH = 'analysis/ai-analysis.default.json'
export const PREGENERATED_SCHEMA = 'ai-analysis-pregenerated/1'

export interface PregeneratedAnalysis {
  packet_hash: string
  /** Eventos ai-analysis/1 en orden (el primero, `meta` con engine «pregenerated»). */
  events: unknown[]
}

export interface PregeneratedFile {
  schema: typeof PREGENERATED_SCHEMA
  label: string
  analyses: PregeneratedAnalysis[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Forma del archivo (los eventos se validan uno a uno después). null si no es utilizable. */
export function parsePregenerated(data: unknown): PregeneratedFile | null {
  if (!isRecord(data) || data.schema !== PREGENERATED_SCHEMA || typeof data.label !== 'string' || !Array.isArray(data.analyses)) return null
  const analyses: PregeneratedAnalysis[] = []
  for (const item of data.analyses) {
    if (!isRecord(item) || typeof item.packet_hash !== 'string' || !Array.isArray(item.events)) return null
    analyses.push({ packet_hash: item.packet_hash, events: item.events })
  }
  return { schema: PREGENERATED_SCHEMA, label: data.label, analyses }
}

/** Eventos del análisis cuya huella coincide con el paquete actual; null si ninguno. */
export function pickPregenerated(file: PregeneratedFile | null, packetHash: string): unknown[] | null {
  return file?.analyses.find((analysis) => analysis.packet_hash === packetHash)?.events ?? null
}

let cached: Promise<PregeneratedFile | null> | null = null

/** Carga (una vez) el archivo pregenerado. Nunca lanza: sin archivo, null (solo hechos). */
export function loadPregenerated(fetchJson: () => Promise<unknown> = defaultFetch): Promise<PregeneratedFile | null> {
  cached ??= fetchJson().then(parsePregenerated, () => null)
  return cached
}

/** Solo tests: olvida el archivo cargado. */
export function resetPregeneratedCache(): void {
  cached = null
}

async function defaultFetch(): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${PREGENERATED_PATH}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<unknown>
}
