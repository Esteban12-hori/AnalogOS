/**
 * Tipos del motor de misión (incremento 8, ADR-009). Parte de la interfaz estable de
 * `features/engine`: se pueden AÑADIR campos opcionales, no cambiar ni quitar los existentes
 * sin pasar por el integrador (docs/BUILD_CONTRACTS.md).
 */
import type { CriterionLevel, MissionInterpretation } from '../../domain/aiContracts'
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import type { MissionPhase } from '../../state/ui'

export type { CriterionLevel, CriterionId, MissionPhase }

/** Perfil activo según el cliente (niveles → pesos). Nunca lo produce la IA con cifras. */
export interface MissionProfileDraft {
  /** `mission:<fnv hex>` para perfiles del usuario; id del preset o del snapshot en los demás. */
  id: string
  origin: 'snapshot' | 'preset' | 'mission'
  label: string
  /** Un perfil de misión siempre es needs_calibration (ADR-009). */
  status: 'needs_calibration' | 'validated'
  levels: Readonly<Record<CriterionId, CriterionLevel>>
  /** nivel ÷ suma de niveles; 0 si se excluye. Suma 1 (o todo 0 si no hay criterios). */
  weights: Readonly<Record<CriterionId, number>>
  baseProfileId: string
  baseProfileVersion: string
}

/** Entrada de `aggregate`, criterio a criterio (espejo de pipelines/scoring.py). */
export interface AggregateCriterion {
  id: string
  weight: number
  unit: string
}

export interface AggregateInput {
  /** 0–1 o null. */
  similarity: number | null
  /** 0–1. */
  quality: number
  status?: 'valid' | 'missing' | 'needs_calibration' | 'excluded'
}

export interface AggregateResult {
  /** 0–100 redondeado a 2 decimales; null si el peso válido < mínimo. */
  similarity: number | null
  confidence: number
  validWeight: number
  /** Contribución w'_i·ln(max(s_i, ε)) por criterio, redondeada a 4 decimales; null si no aporta. */
  contributions: Readonly<Record<string, number | null>>
}

export interface SensitivityScenario {
  criterionId: string
  direction: 'minus' | 'plus'
  score: number | null
  delta: number | null
}

export interface SensitivityResult {
  stability: number | null
  maxScoreDelta: number | null
  scenarios: readonly SensitivityScenario[]
}

/** Un sector puntuado con el perfil de misión. */
export interface ScoredSite {
  siteId: string
  /** 0–100 del motor TS; null = datos insuficientes o por calcular. */
  similarity: number | null
  /** Posición 1..n según rankCandidates; null si no tiene similitud. */
  rank: number | null
  status: 'scored' | 'insufficient_data' | 'por_calcular'
  /** Fracción del peso del perfil con datos válidos (cobertura). */
  coverage: number
  /** Confianza recalculada si ADR-009 lo cubre; null = «por calcular con tu perfil». */
  confidence: number | null
  contributions: Readonly<Partial<Record<CriterionId, number | null>>>
  /** Criterio con la contribución más negativa (limitante); null si no aplica. */
  limitingCriterionId: CriterionId | null
}

export interface MissionScoring {
  profileId: string
  /** Versión del motor que rotula los % («% del motor determinista vX»). */
  engineVersion: string
  /** Ordenados como rankCandidates: similitud descendente, nulos al final, empate por site_id. */
  sites: readonly ScoredSite[]
}

/** Perfil predefinido (Movilidad + parciales needs_calibration). */
export interface MissionPreset {
  id: string
  label: string
  description: string
  levels: Readonly<Record<CriterionId, CriterionLevel>>
}

/** Resultado del matcher DEMO por palabras clave («DEMO · sin IA»). */
export interface DemoMatch {
  interpretation: MissionInterpretation
  /** Tramos del texto que activaron cada criterio, para resaltarlos. */
  highlights: ReadonlyArray<{ start: number; end: number; criterionId: CriterionId }>
}

/** Eventos de la máquina de estados de la misión (domain/missionPhase en la spec). */
export type MissionPhaseEvent =
  | { type: 'submit' }
  | { type: 'interpreted' }
  | { type: 'profile_valid' }
  | { type: 'scored' }
  | { type: 'analysis_done' }
  | { type: 'fail' }
  | { type: 'cancel' }
  | { type: 'reset' }

/** Umbrales de la espera (§2.3 C): contador, «tardando más de lo normal», tiempo agotado. */
export interface PhaseThresholds {
  counterMs: number
  slowMs: number
  timeoutMs: number
}

export interface ScoreMissionInput {
  profile: MissionProfileDraft
  candidates: readonly CandidateSite[]
  base: MissionProfile
}
