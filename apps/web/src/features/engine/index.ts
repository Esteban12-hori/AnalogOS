/**
 * features/engine — motor de misión determinista (incremento 8, ADR-009). Sin UI ni slot.
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB.
 * Consumidores: composer (orquesta), analysis (robustez y hechos), places/metrics (leen
 * `MissionScoring` desde state/mission). Impórtalo de forma diferida (`import()`) desde UI del
 * chunk principal: el motor va en el chunk de misión (≤8 KB gz, §6.1).
 */
import type { CandidateSite, CriterionId } from '../../domain/contracts'
import type { MissionPhase } from '../../state/ui'
import type {
  AggregateCriterion,
  AggregateInput,
  AggregateResult,
  CriterionLevel,
  DemoMatch,
  MissionPhaseEvent,
  MissionPreset,
  MissionProfileDraft,
  MissionScoring,
  PhaseThresholds,
  ScoreMissionInput,
  SensitivityResult,
} from './types'

export type * from './types'

/** Versión del motor que se muestra junto a cada % de misión. */
export const ENGINE_VERSION = '0.0.0-stub'

/** Umbrales de la espera de IA (§2.3 C). */
export const PHASE_THRESHOLDS: PhaseThresholds = { counterMs: 3000, slowMs: 10000, timeoutMs: 20000 }

/** Perfiles predefinidos. STUB: vacío hasta el incremento 8. */
export const MISSION_PRESETS: readonly MissionPreset[] = []

class EngineNotImplemented extends Error {
  constructor(name: string) {
    super(`features/engine: ${name} por implementar (incremento 8)`)
    this.name = 'EngineNotImplemented'
  }
}

/** Nivel ÷ suma de niveles (0 si se excluye). STUB: lanza. */
export function levelsToWeights(levels: Readonly<Record<CriterionId, CriterionLevel>>): Record<CriterionId, number> {
  void levels
  throw new EngineNotImplemented('levelsToWeights')
}

/** Port de pipelines/scoring.py::aggregate con paridad ≤1e-6. STUB: lanza. */
export function aggregate(
  criteria: readonly AggregateCriterion[],
  inputs: Readonly<Record<string, AggregateInput>>,
  epsilon: number,
  minimumValidWeight: number,
): AggregateResult {
  void criteria
  void inputs
  void epsilon
  void minimumValidWeight
  throw new EngineNotImplemented('aggregate')
}

/** Port de pipelines/scoring.py::sensitivity (±20 % por peso). STUB: lanza. */
export function sensitivity(
  criteria: readonly AggregateCriterion[],
  inputs: Readonly<Record<string, AggregateInput>>,
  epsilon: number,
  minimumValidWeight: number,
  perturbation = 0.2,
): SensitivityResult {
  void criteria
  void inputs
  void epsilon
  void minimumValidWeight
  void perturbation
  throw new EngineNotImplemented('sensitivity')
}

/**
 * Puntúa todos los sectores con un perfil de misión y los ordena.
 * STUB honesto: devuelve cada sector «por calcular» (sin cifras inventadas).
 */
export function scoreMission({ profile, candidates }: ScoreMissionInput): MissionScoring {
  return {
    profileId: profile.id,
    engineVersion: ENGINE_VERSION,
    sites: [...candidates]
      .map((candidate: CandidateSite) => candidate.site_id)
      .sort()
      .map((siteId) => ({
        siteId,
        similarity: null,
        rank: null,
        status: 'por_calcular' as const,
        coverage: 0,
        confidence: null,
        contributions: {},
        limitingCriterionId: null,
      })),
  }
}

/** Interpretación sin red por palabras clave. STUB: null = no disponible. */
export function matchMissionDemo(text: string): DemoMatch | null {
  void text
  return null
}

/** Máquina de estados de la misión. STUB: no cambia de fase. */
export function nextMissionPhase(phase: MissionPhase, event: MissionPhaseEvent): MissionPhase {
  void event
  return phase
}

/** Perfil de misión desde niveles (id `mission:<fnv>`). STUB: lanza. */
export function profileFromLevels(
  levels: Readonly<Record<CriterionId, CriterionLevel>>,
  base: { id: string; version: string },
  label?: string,
): MissionProfileDraft {
  void levels
  void base
  void label
  throw new EngineNotImplemented('profileFromLevels')
}
