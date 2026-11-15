/**
 * Tipos de la Lectura (features/analysis). Solo tipos: los importan el chunk principal y el
 * código diferido sin arrastrar código. La Lectura tiene tres capas separadas (ADR-013):
 * resultado (MissionEvaluation), motivos destacados (ExplanationView del equipo) y hechos del
 * snapshot (esta capa de hechos).
 */
import type { CountryCode, CriterionId } from '../../domain/contracts'

/** Un hecho ya resuelto: id estable + texto que formateó el snapshot (es-CL). */
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
  /** «#2 de 6» o «REF · referencia conocida, fuera del ranking». */
  rank: FactRef | null
  similarity: FactRef | null
  /** true = datos insuficientes para el perfil (el % no existe). */
  insufficient: boolean
  confidence: FactRef | null
  stability: FactRef | null
  feasibility: FactRef | null
  coverage: FactRef | null
  directions: readonly DirectionFact[]
  limiting: CriterionFact | null
  saturates: readonly CriterionFact[]
  /** Criterios del perfil (peso > 0) sin dato válido: «por calcular» / «sin dato». */
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
  /** ready = escenarios del pipeline; insufficient = menos de 2 candidatos con %; por_calcular = sin sensibilidad. */
  status: 'ready' | 'insufficient' | 'por_calcular'
  perturbation: FactRef | null
  scenarios: FactRef | null
  flips: FactRef | null
  topFlips: FactRef | null
  mostSensitive: FactRef | null
  /** Estabilidad 0–100 por lugar (barras deterministas). */
  sites: ReadonlyArray<{ siteId: string; name: string; stability: number | null; text: string | null }>
  reason: string | null
}

export interface FactsLayer {
  /** Candidatos de la búsqueda en su orden global. */
  sites: readonly SiteFacts[]
  /** Referencias conocidas (REF), aparte. */
  references: readonly SiteFacts[]
  comparison: ComparisonFacts
  robustness: RobustnessFacts
}
