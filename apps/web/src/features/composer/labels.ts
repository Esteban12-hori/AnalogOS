/**
 * Rótulos y umbrales de espera del composer (funciones puras del chunk principal). Las cifras de
 * aquí (segundos de espera) son del cliente, no resultados.
 *
 * Los umbrales visuales vienen del motor propio retirado (ADR-015, sustituido): contador a los
 * 3 s y aviso de lentitud a los 10 s. Ya no hay tiempo límite propio: el corte lo hace el cliente
 * de IA del equipo a los 45 s (CLIENT_TIMEOUT_MS) o el usuario con «Cancelar» (AbortSignal).
 */
import type { MissionPhase } from '../../state/ui'

/** Tramo visible de la espera: 0–300 ms quieto; desde 300 ms órbita y luz; 3 s contador; 10 s lento. */
export type WaitStage = 'quiet' | 'busy' | 'counter' | 'slow'

export interface PhaseThresholds {
  /** Desde aquí se ve el contador de segundos. */
  counterMs: number
  /** Desde aquí se ofrece «Cancelar» con el aviso de lentitud. */
  slowMs: number
}

export const PHASE_THRESHOLDS: Readonly<PhaseThresholds> = Object.freeze({ counterMs: 3000, slowMs: 10_000 })

/** 0–300 ms: nada se mueve, para evitar parpadeo. */
export const QUIET_MS = 300

/** Tramo de la espera a los `elapsedMs` de iniciada. */
export function waitStage(elapsedMs: number, thresholds: PhaseThresholds = PHASE_THRESHOLDS): WaitStage {
  if (elapsedMs >= thresholds.slowMs) return 'slow'
  if (elapsedMs >= thresholds.counterMs) return 'counter'
  if (elapsedMs >= QUIET_MS) return 'busy'
  return 'quiet'
}

/** El composer espera solo mientras la IA propone requisitos. */
export function isWaitingPhase(phase: MissionPhase): boolean {
  return phase === 'interpreting'
}

const STEP: Partial<Record<MissionPhase, string>> = {
  interpreting: 'La IA propone requisitos editables · usted confirma',
  review: 'Revise los requisitos y confirme en «Tu misión»',
  scoring: 'Cálculo determinista en curso',
  analysis: 'Resultados listos · la IA destaca motivos en la Lectura',
  done: 'Resultados listos',
  error: 'No se pudo completar',
  cancelled: 'Solicitud cancelada',
}

/** Texto de la fase real (línea de estado, órbita y tarjeta). */
export function phaseLabel(phase: MissionPhase): string {
  return STEP[phase] ?? ''
}

/** Segundos enteros transcurridos para el contador visible desde los 3 s. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}
