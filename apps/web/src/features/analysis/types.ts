/**
 * Tipos del modelo de lectura (features/analysis). Solo tipos: los importan el chunk principal
 * (store, píldora, fragmentos) y el código diferido (paquete, validación, vista) sin arrastrar
 * código.
 */
import type { AiAnalysisEvent, EvidencePacket, UnsupportedRequest } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'

export type ReadingContext = 'base' | 'mission'

/** Un hecho del paquete ya resuelto: id citable + texto que formateó el motor. */
export interface FactRef {
  id: string
  text: string
}

/** Tramo de texto validado: texto de la IA o ficha con la cifra del motor. */
export type ResolvedSegment =
  | { kind: 'text'; text: string }
  | { kind: 'fact'; id: string; text: string; criterionId: CriterionId | null; siteId: string | null }

export type ReadingBlockType = Exclude<AiAnalysisEvent['type'], 'meta' | 'stage' | 'done' | 'error'>

/** Un evento ai-analysis/1 que pasó TODAS las validaciones de §5.5, listo para dibujar. */
export interface ReadingBlock {
  key: string
  type: ReadingBlockType
  /** Orden de llegada (escalonado de entrada, cola de 6 como máximo). */
  order: number
  siteId: string | null
  siteIds: readonly string[]
  criterionId: CriterionId | null
  factKind: string | null
  /** `check:<sitio>:<n>` de field_priority o de uncertainty.resolves_check. */
  checkRef: string | null
  analogId: string | null
  segments: readonly ResolvedSegment[]
}

export type DiscardReason =
  | 'schema'
  | 'unknown_ref'
  | 'undeclared_ref'
  | 'digits'
  | 'number_word'
  | 'vocabulary'
  | 'rank'
  | 'rank_fact'
  | 'unmeasured'
  | 'unsafe_text'
  | 'malformed_marker'
  | 'fact_kind'
  | 'own_criterion'
  | 'unknown_site'
  | 'unknown_check'
  | 'unknown_analog'
  | 'duplicate'
  | 'cap'
  | 'out_of_order'

export interface DiscardNote {
  reason: DiscardReason
  /** Motivo neutro para el aviso («citaba un dato que no existe»). */
  message: string
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
  /** ready = escenarios calculados; insufficient = menos de 2 lugares con %; por_calcular = sin motor. */
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
  /** En el orden del ranking (#1 primero; sin % al final). */
  sites: readonly SiteFacts[]
  comparison: ComparisonFacts
  robustness: RobustnessFacts
  unsupported: readonly UnsupportedRequest[]
  missionSummary: string | null
}

export type AiStatus = 'idle' | 'waiting' | 'streaming' | 'done' | 'stale' | 'error' | 'facts_only'

export interface AiLayer {
  source: 'lktron' | 'pregenerated' | 'none'
  status: AiStatus
  stage: 'selecting_facts' | 'writing' | null
  model: string | null
  blocks: readonly ReadingBlock[]
  discards: readonly DiscardNote[]
  /** Texto neutro para «solo hechos», «Desactualizado» o el error. */
  message: string | null
}

export interface ReadingProfile {
  id: string
  label: string
  origin: 'snapshot' | 'preset' | 'mission'
  status: 'needs_calibration' | 'validated'
}

export interface Reading {
  /** `base` o `mission:<perfil>:<revisión>`: con otra clave la lectura está desactualizada. */
  key: string
  context: ReadingContext
  revision: number
  profile: ReadingProfile
  packet: EvidencePacket
  /** false si el paquete no pasó evidence-packet/1: la IA no se usa, los hechos sí. */
  packetValid: boolean
  facts: FactsLayer
  ai: AiLayer
}

export interface ReadingSlot {
  status: 'idle' | 'building' | 'ready' | 'error'
  /** Última lectura completa (se conserva durante una reconstrucción, a --o-busy). */
  reading: Reading | null
  error: string | null
}
