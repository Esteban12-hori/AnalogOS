/**
 * Tipos del motor de misión (incremento 8, ADR-009). Parte de la interfaz estable de
 * `features/engine`: se pueden AÑADIR campos opcionales, no cambiar ni quitar los existentes
 * sin pasar por el integrador (docs/BUILD_CONTRACTS.md).
 */
import type { CriterionLevel, MissionInterpretation, UnsupportedReason } from '../../domain/aiContracts'
import type { CandidateSite, CriterionId, CriterionStatus, MissionProfile } from '../../domain/contracts'
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
  /** Estado efectivo de cada criterio tras las reglas del pipeline (valid sin similitud → missing). */
  statuses?: Readonly<Record<string, CriterionStatus>>
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
  /**
   * Estabilidad 0–100 del motor con este perfil (`sensitivity`, ±20 % por peso); null = datos
   * insuficientes o por calcular. Opcional para quien construye un ScoredSite a mano (tests).
   */
  stability?: number | null
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
  /** Cobertura mínima (minimum_valid_weight del perfil base); bajo ella: «Datos insuficientes». */
  minimumValidWeight?: number
  /**
   * Por qué TODOS los sectores quedaron «por calcular» (sin cifras):
   * `empty_profile` = todos los niveles en Excluir; `base_unavailable` = el perfil base no trae
   * criterios ni agregación válidos; `base_mismatch` = el perfil de misión es de otro perfil base.
   */
  reason?: 'empty_profile' | 'base_unavailable' | 'base_mismatch'
}

/** Perfil predefinido (Movilidad + parciales needs_calibration). */
export interface MissionPreset {
  id: string
  label: string
  description: string
  levels: Readonly<Record<CriterionId, CriterionLevel>>
  /** Todos los predefinidos son needs_calibration: el mapeo a niveles no tiene validación experta. */
  status?: 'needs_calibration'
  /** true = cubre solo una parte de los criterios del perfil base. */
  partial?: boolean
}

/** Tramo [start, end) del texto original (índices de String, UTF-16). */
export interface TextSpan {
  start: number
  end: number
}

/** Resultado del matcher DEMO por palabras clave («DEMO · sin IA»). */
export interface DemoMatch {
  interpretation: MissionInterpretation
  /** Tramos del texto que activaron cada criterio, para resaltarlos. */
  highlights: ReadonlyArray<{ start: number; end: number; criterionId: CriterionId }>
  /** Rótulo obligatorio junto a la interpretación: «DEMO · sin IA». */
  label?: string
  /** Palabras de contexto de movilidad («rover», «navegación»…) que aplican el perfil Movilidad. */
  contextHighlights?: readonly TextSpan[]
  /** Lo pedido que el snapshot no mide (hielo, radiación, regolito…). */
  unsupportedHighlights?: ReadonlyArray<TextSpan & { reason: UnsupportedReason }>
  /** Marcas de exclusión explícita («excluir», «no importa»…) que llevaron un criterio a 0. */
  exclusionHighlights?: readonly TextSpan[]
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
  /** 0–300 ms: nada se mueve, para evitar parpadeo (solo Enviar → Detener). */
  quietMs?: number
}

/** Tramo visible de la espera de la IA según el tiempo transcurrido (§2.3 C). */
export type WaitStage = 'quiet' | 'busy' | 'counter' | 'slow' | 'timeout'

/** Por qué se abortó una corrida: la reemplazó otro envío, se canceló o se agotó el tiempo. */
export type MissionAbortReason = 'replaced' | 'cancelled' | 'timeout'

/** Una corrida de misión (interpretar → perfil → motor → análisis) con su AbortSignal. */
export interface MissionRun {
  readonly id: number
  readonly signal: AbortSignal
  readonly startedAt: number
}

/** Coordina «cancelar y reemplazar»: una sola corrida vigente; las anteriores quedan abortadas. */
export interface MissionRunController {
  /** Empieza una corrida nueva; aborta la vigente con 'replaced' y arma el tiempo agotado. */
  start(): MissionRun
  /** Aborta la corrida vigente con 'cancelled'. Devuelve false si no había ninguna. */
  cancel(): boolean
  /** La corrida terminó (done o error): desarma su temporizador. Ignora corridas no vigentes. */
  finish(run: MissionRun): void
  /** ¿Sus eventos todavía cuentan? false si fue reemplazada, cancelada, agotada o terminada. */
  isCurrent(run: MissionRun): boolean
  current(): MissionRun | null
  /** Motivo del aborto de una corrida; null si sigue vigente o terminó sin abortarse. */
  abortReason(run: MissionRun): MissionAbortReason | null
  /** Aborta y desarma todo (al desmontar). */
  dispose(): void
}

export interface MissionRunControllerOptions {
  thresholds?: PhaseThresholds
  now?: () => number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
  /** Se llama una vez cuando una corrida vigente supera `timeoutMs` (ya abortada con 'timeout'). */
  onTimeout?: (run: MissionRun) => void
}

export interface ScoreMissionInput {
  profile: MissionProfileDraft
  candidates: readonly CandidateSite[]
  base: MissionProfile
}

/** Insumos exactos de `aggregate`/`sensitivity` para un sector con un perfil de misión. */
export interface MissionInputs {
  criteria: readonly AggregateCriterion[]
  inputs: Readonly<Record<string, AggregateInput>>
  epsilon: number
  minimumValidWeight: number
}
