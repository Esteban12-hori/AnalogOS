/**
 * Reading types (features/analysis). Types only: the main chunk and the deferred
 * code import them without pulling in any code. The Reading has three separate layers (ADR-013):
 * result (MissionEvaluation), highlighted reasons (the team's ExplanationView) and snapshot
 * facts (this facts layer).
 */
import type { CountryCode, CriterionId } from '../../domain/contracts'

/** An already-resolved fact: stable id + text formatted by the snapshot (es-CL). */
export interface FactRef {
  id: string
  text: string
}

export interface DirectionFact {
  criterionId: CriterionId
  label: string
  direction: 'more_demanding' | 'less_demanding' | 'similar'
  ratio: FactRef
  phrase: FactRef
  raw: FactRef | null
  mars: FactRef | null
}

export interface CriterionFact {
  criterionId: CriterionId
  label: string
  raw: FactRef | null
  mars: FactRef | null
  sim: FactRef | null
}

export interface SiteFacts {
  siteId: string
  name: string
  /** Referencia conocida (REF): nunca tiene puesto ni entra en «mejor de N». */
  reference: boolean
  country: CountryCode | null
  /** «#2 of 6» or «REF · known reference, outside the ranking». */
  rank: FactRef | null
  similarity: FactRef | null
  /** true = insufficient data for the profile (the % does not exist). */
  insufficient: boolean
  confidence: FactRef | null
  stability: FactRef | null
  feasibility: FactRef | null
  coverage: FactRef | null
  directions: readonly DirectionFact[]
  limiting: CriterionFact | null
  saturates: readonly CriterionFact[]
  /** Profile criteria (weight > 0) without valid data: «to be calculated» / «no data». */
  missing: ReadonlyArray<{ criterionId: CriterionId; label: string; status: string }>
  checks: ReadonlyArray<{ ref: string; text: string }>
}

export interface ComparisonFacts {
  noDiscrimination: ReadonlyArray<{ criterionId: CriterionId; label: string; sims: readonly FactRef[] }>
  shared: ReadonlyArray<{ criterionId: CriterionId; label: string; siteIds: readonly string[]; raw: FactRef | null }>
  bestOfN: ReadonlyArray<{ criterionId: CriterionId; label: string; siteId: string; sim: FactRef | null }>
  gaps: readonly FactRef[]
}

export interface RobustnessFacts {
  /** ready = pipeline scenarios; insufficient = fewer than 2 candidates with %; por_calcular = without sensitivity. */
  status: 'ready' | 'insufficient' | 'por_calcular'
  perturbation: FactRef | null
  scenarios: FactRef | null
  flips: FactRef | null
  topFlips: FactRef | null
  mostSensitive: FactRef | null
  /** Stability 0–100 per place (deterministic bars). */
  sites: ReadonlyArray<{ siteId: string; name: string; stability: number | null; text: string | null }>
  reason: string | null
}

export interface FactsLayer {
  /** Search candidates in their global order. */
  sites: readonly SiteFacts[]
  /** Referencias conocidas (REF), aparte. */
  references: readonly SiteFacts[]
  comparison: ComparisonFacts
  robustness: RobustnessFacts
}
