/**
 * features/engine — motor de misión determinista (incremento 8, ADR-009). Sin UI ni slot.
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo (docs/BUILD_CONTRACTS.md §2.6).
 * Consumidores: composer (orquesta), analysis (robustez y hechos), places/metrics (leen
 * `MissionScoring` desde state/mission). Impórtalo de forma diferida (`import()`) desde UI del
 * chunk principal: el motor va en el chunk de misión (≤8 KB gz, §6.1). No lee stores.
 *
 * - `aggregate` y `sensitivity`: port de pipelines/scoring.py con paridad ≤1e-6, verificada por
 *   parity.test.ts contra tests/fixtures/engine/parity.json (lo genera tests/test_engine_parity.py).
 * - Niveles → pesos (`levelsToWeights`), perfiles (`profileFromLevels`, `profileFromPreset`,
 *   `MISSION_PRESETS`) y puntuación (`scoreMission`, `buildMissionInputs`).
 * - `matchMissionDemo`: interpretación sin red ni IA, rotulada «DEMO · sin IA» (`DEMO_LABEL`).
 * - `nextMissionPhase`, `PHASE_THRESHOLDS` (3/10/20 s), `waitStage` y
 *   `createMissionRunController` (cancelar y reemplazar).
 */
export type * from './types'

export { ENGINE_VERSION } from './version'
export { aggregate, sensitivity } from './aggregate'
export { pyRound, pySum } from './pyMath'
export {
  LEVEL_LABELS,
  MISSION_PRESETS,
  fnv1a32,
  hasAnyCriterion,
  levelsFromInterpretation,
  levelsToWeights,
  normalizeLevels,
  profileFromLevels,
  profileFromPreset,
} from './profiles'
export type { BaseProfileRef, Levels } from './profiles'
export { buildMissionInputs, isUsableBase, limitingCriterion, scoreMission } from './scoreMission'
export { DEFAULT_BASE_PROFILE, DEMO_LABEL, DEMO_MATCHER_VERSION, matchMissionDemo } from './demoMatcher'
export {
  PHASE_THRESHOLDS,
  createMissionRunController,
  isBusyPhase,
  missionPhaseStep,
  msUntilNextWaitStage,
  nextMissionPhase,
  waitStage,
} from './missionPhase'
