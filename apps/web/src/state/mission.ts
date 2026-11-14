/**
 * Store `mission`: resultado vigente del modo Misión, compartido entre features.
 * Archivo del integrador. ESCRIBE solo `features/composer` (orquesta interpretar → perfil →
 * motor); LEEN places, metrics, leaders, globe y analysis. La fase visible vive en
 * `ui.missionPhase`, no aquí.
 */
import type { MissionInterpretation } from '../domain/aiContracts'
import type { MissionProfileDraft, MissionScoring } from '../features/engine/types'
import { createStore, useStore } from './store'

export type MissionSource = 'lktron' | 'demo' | 'preset'

export interface MissionError {
  code: 'timeout' | 'invalid' | 'unavailable' | 'insufficient' | 'cancelled' | 'unknown'
  /** Texto neutro para la UI (error = neutro + ✕ + texto). */
  message: string
}

export interface MissionState {
  /** Último texto enviado; null si nunca se envió. */
  text: string | null
  source: MissionSource | null
  /** Interpretación validada contra mission-interpretation/1 (null con perfiles predefinidos). */
  interpretation: MissionInterpretation | null
  profile: MissionProfileDraft | null
  /** % del motor determinista; null hasta que el motor termina. */
  scoring: MissionScoring | null
  error: MissionError | null
  /** Aumenta con cada resultado nuevo: punto en la pestaña Misión y coreografía D. */
  revision: number
}

export const INITIAL_MISSION_STATE: MissionState = {
  text: null,
  source: null,
  interpretation: null,
  profile: null,
  scoring: null,
  error: null,
  revision: 0,
}

export const missionStore = createStore<MissionState>(INITIAL_MISSION_STATE)

export function useMission<T>(selector: (state: MissionState) => T): T {
  return useStore(missionStore, selector)
}
