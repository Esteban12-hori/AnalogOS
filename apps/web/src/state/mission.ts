/**
 * Store `mission`: el planificador del equipo (ADR-009) compartido por toda la interfaz (ADR-013).
 * Archivo del integrador. ESCRIBE solo el controlador de misión (features/composer/missionController,
 * chunk diferido), que usa `plannerReducer`, `evaluateMission`, el cliente de IA y la exportación
 * del equipo sin cambios; LEEN el composer, «Tu misión», places, globe, metrics, leaders y analysis.
 *
 * Solo tipos de `mission/*`: este archivo vive en el chunk principal y no arrastra Ajv.
 * La fase visible vive en `ui.missionPhase`, no aquí.
 */
import type { GeologyCatalog } from '../../../../shared/geology/guidance'
import type { ExplanationView } from '../mission/explanation'
import type { AiProvenance } from '../mission/exportReport'
import type { PlannerState } from '../mission/plannerState'
import type { MissionEvaluation, MissionRequest } from '../mission/types'
import { createStore, useStore } from './store'

/** Procedencia de los requisitos vigentes (nunca de las cifras, que son del cálculo determinista). */
export type MissionSource = 'anthropic' | 'manual' | 'example'

export interface MissionState {
  /** Estado del reductor del equipo, tal cual; null hasta que carga el chunk de misión. */
  planner: PlannerState | null
  /** Solicitud construida (buildRequest) cuando es válida; null si faltan datos. */
  request: MissionRequest | null
  /**
   * Última evaluación aceptada (planner.result). Si el usuario edita brief, requisitos o alcance,
   * el reductor la invalida: aquí se conserva como referencia visual con `stale: true` (resultados
   * a --o-busy hasta reevaluar); la exportación y la IA solo usan la evaluación vigente.
   */
  evaluation: MissionEvaluation | null
  /** true = `evaluation` ya no corresponde a lo que el usuario está editando. */
  stale: boolean
  /** Solicitud con la que se calculó `evaluation` (para repartir sus requisitos por criterio). */
  evaluatedRequest: MissionRequest | null
  /** Motivos destacados: plantilla determinista o selección de la IA validada (§5.2). */
  explanation: ExplanationView | null
  /**
   * Procedencia de la selección de la IA (modelo, fecha, request_id) que generó `explanation`;
   * null con la plantilla. Viaja con la vista: si una edición deja la Lectura atenuada, sigue
   * diciendo de dónde salió.
   */
  explanationProvenance: AiProvenance | null
  source: MissionSource | null
  /** Aumenta con cada evaluación aceptada: punto en la pestaña Misión y un solo anuncio. */
  revision: number
  /**
   * Catálogo geológico cerrado de la evaluación VIGENTE (M10, `buildGeologyCatalog` del equipo); null
   * sin contexto geológico válido o sin resultado vigente. Lo usa el informe imprimible.
   */
  geologyCatalog: GeologyCatalog | null
}

export const INITIAL_MISSION_STATE: MissionState = {
  planner: null,
  request: null,
  evaluation: null,
  stale: false,
  evaluatedRequest: null,
  explanation: null,
  explanationProvenance: null,
  source: null,
  revision: 0,
  geologyCatalog: null,
}

export const missionStore = createStore<MissionState>(INITIAL_MISSION_STATE)

export function useMission<T>(selector: (state: MissionState) => T): T {
  return useStore(missionStore, selector)
}

/**
 * Procedencia de los requisitos (función pura): «anthropic» si alguno sigue siendo la propuesta
 * intacta de la IA; «example» si todos son los del ejemplo editable; «manual» en otro caso.
 */
export function missionSource(planner: Pick<PlannerState, 'requirements'> | null): MissionSource | null {
  const requirements = planner?.requirements ?? []
  if (requirements.length === 0) return null
  if (requirements.some((requirement) => requirement.origin === 'ai')) return 'anthropic'
  if (requirements.every((requirement) => /^ex\d+$/.test(requirement.requirement_id))) return 'example'
  return 'manual'
}
