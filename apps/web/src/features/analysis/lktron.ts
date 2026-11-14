/**
 * lktron detrás de un flag de build (ADR-010). Sin `VITE_LKTRON_URL` (o con una URL que podría
 * llevar secretos) queda desactivado: toda llamada responde «unavailable» y el composer usa el
 * matcher «DEMO · sin IA». El cliente real se descarga solo si se usa (lktronClient.ts).
 */
import type { MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
import type { LktronResult } from './index'
import { parseLktronUrl } from './lktronConfig'

const CONFIG = parseLktronUrl(import.meta.env.VITE_LKTRON_URL)

/** URL base validada, o null si lktron no está configurado. */
export const LKTRON_URL: string | null = CONFIG.ok ? CONFIG.url : null

/** true solo si el build define un endpoint válido y sin secretos. */
export const LKTRON_ENABLED: boolean = LKTRON_URL !== null

/** POST /interpret → mission-interpretation/1 validado (esquema + reglas de §5.2). */
export async function interpretWithLktron(
  request: MissionInterpretRequest,
  signal?: AbortSignal,
): Promise<LktronResult<MissionInterpretation>> {
  if (!LKTRON_URL) {
    return { ok: false, code: 'unavailable', message: 'lktron no está configurado: se usa la interpretación DEMO · sin IA.' }
  }
  if (signal?.aborted) return { ok: false, code: 'aborted', message: 'Interpretación cancelada.' }
  try {
    const { interpret } = await import('./lktronClient')
    return await interpret(request, { baseUrl: LKTRON_URL, signal })
  } catch {
    return { ok: false, code: 'unavailable', message: 'No se pudo cargar el cliente de lktron.' }
  }
}
