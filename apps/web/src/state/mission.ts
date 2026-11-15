/**
 * `mission` store: the team planner (ADR-009) shared across the entire interface (ADR-013).
 * Integrator file. ONLY the mission controller WRITES to it (features/composer/missionController,
 * deferred chunk), which uses `plannerReducer`, `evaluateMission`, the AI client and the team export
 * unchanged; the composer, "Your mission", places, globe, metrics, leaders and analysis READ from it.
 *
 * `mission/*` types only: this file lives in the main chunk and does not pull in Ajv.
 * The visible phase lives in `ui.missionPhase`, not here.
 */
import type { GeologyCatalog } from '../../../../shared/geology/guidance'
import type { ExplanationView } from '../mission/explanation'
import type { AiProvenance } from '../mission/exportReport'
import type { PlannerState } from '../mission/plannerState'
import type { MissionEvaluation, MissionRequest } from '../mission/types'
import { createStore, useStore } from './store'

/** Provenance of the current requirements (never of the figures, which come from the deterministic calculation). */
export type MissionSource = 'anthropic' | 'manual' | 'example'

export interface MissionState {
  /** State of the team reducer, as is; null until the mission chunk loads. */
  planner: PlannerState | null
  /** Request built (buildRequest) when it is valid; null if data is missing. */
  request: MissionRequest | null
  /**
   * Last accepted evaluation (planner.result). If the user edits the brief, requirements or scope,
   * the reducer invalidates it: here it is kept as a visual reference with `stale: true` (results
   * at --o-busy until re-evaluated); the export and the AI only use the current evaluation.
   */
  evaluation: MissionEvaluation | null
  /** true = `evaluation` no longer corresponds to what the user is editing. */
  stale: boolean
  /** Request with which `evaluation` was calculated (to distribute its requirements by criterion). */
  evaluatedRequest: MissionRequest | null
  /** Highlighted reasons: deterministic template or validated AI selection (§5.2). */
  explanation: ExplanationView | null
  /**
   * Provenance of the AI selection (model, date, request_id) that generated `explanation`;
   * null with the template. It travels with the view: if an edit leaves the Reading dimmed, it keeps
   * stating where it came from.
   */
  explanationProvenance: AiProvenance | null
  source: MissionSource | null
  /** Increases with each accepted evaluation: dot on the Mission tab and a single announcement. */
  revision: number
  /**
   * Closed geological catalog of the CURRENT evaluation (M10, the team's `buildGeologyCatalog`); null
   * without valid geological context or without a current result. Used by the printable report.
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
 * Provenance of the requirements (pure function): "anthropic" if any is still the AI's
 * intact proposal; "example" if all are those of the editable example; "manual" otherwise.
 */
export function missionSource(planner: Pick<PlannerState, 'requirements'> | null): MissionSource | null {
  const requirements = planner?.requirements ?? []
  if (requirements.length === 0) return null
  if (requirements.some((requirement) => requirement.origin === 'ai')) return 'anthropic'
  if (requirements.every((requirement) => /^ex\d+$/.test(requirement.requirement_id))) return 'example'
  return 'manual'
}
