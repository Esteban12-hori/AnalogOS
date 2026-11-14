/**
 * Cliente lktron detrás de un flag (ADR-010). STUB: desactivado; toda llamada responde
 * «unavailable» y el composer usa el matcher DEMO · sin IA. Nunca hay red en el flujo central.
 */
import type { MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
import type { LktronResult } from './index'

/** true solo si el build define el endpoint (incremento 10). */
export const LKTRON_ENABLED: boolean = false

/** POST /interpret → mission-interpretation/1 validado. STUB: no disponible. */
export async function interpretWithLktron(
  request: MissionInterpretRequest,
  signal?: AbortSignal,
): Promise<LktronResult<MissionInterpretation>> {
  void request
  void signal
  return { ok: false, code: 'unavailable', message: 'lktron no está configurado: se usa la interpretación DEMO · sin IA.' }
}
