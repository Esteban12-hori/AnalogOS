/**
 * Rótulos de la espera del composer (funciones puras del chunk principal: no importan el motor).
 * Las cifras de aquí (paso «2 de 4», segundos de espera) son del cliente, no resultados.
 */
import type { MissionPhase } from '../../state/ui'

export const DEMO_TAG = 'DEMO · sin IA'

/** Tramo visible de la espera (§2.3 C): 0–300 ms quieto; desde 300 ms órbita y luz; 3 s contador; 10 s lento. */
export type WaitStage = 'quiet' | 'busy' | 'counter' | 'slow'

/** 0–300 ms: nada se mueve, para evitar parpadeo (solo Enviar → Detener). */
export const QUIET_MS = 300

/** Fases en las que el composer espera (Enviar → Detener). En `analysis` los datos ya llegaron. */
export function isWaitingPhase(phase: MissionPhase): boolean {
  return phase === 'interpreting' || phase === 'profile' || phase === 'scoring'
}

const STEP: Partial<Record<MissionPhase, string>> = {
  interpreting: '',
  profile: 'Perfil recibido · validado contra el contrato · paso 2 de 4',
  scoring: 'Motor determinista · calcula y ordena · paso 3 de 4',
  analysis: 'Resultados listos · la Lectura se redacta · paso 4 de 4',
  done: 'Resultados listos',
  error: 'No se pudo completar la misión',
  cancelled: 'Misión cancelada',
}

/** Texto de la fase real (línea de estado, órbita y tarjeta). */
export function phaseLabel(phase: MissionPhase, interpreter: 'lktron' | 'demo' | null): string {
  if (phase === 'interpreting') return interpreter === 'lktron' ? 'La IA interpreta tu misión · paso 1 de 4' : `Interpretación ${DEMO_TAG} · paso 1 de 4`
  return STEP[phase] ?? ''
}

/** Segundos enteros transcurridos para el contador visible desde los 3 s. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}
