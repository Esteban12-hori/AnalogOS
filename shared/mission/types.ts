// Tipos del motor de decisión M8 (ADR-009). Capa determinista sobre el snapshot v3:
// no cambia fórmulas, pesos, calidad ni perfiles científicos.
import type { CandidateSite, DataManifest, MissionProfile } from '../domain/contracts'

export type Operator = '<=' | '>=' | 'between' | 'in'
export type Importance = 'critical' | 'preference'
export type RequirementScale = 'window' | 'point'
export type RequirementOrigin = 'user' | 'ai'

export type MetricId =
  | 'median_slope_degree'
  | 'terrain_roughness_meter'
  | 'local_relief_meter'
  | 'nonvegetated_fraction'
  | 'polygon_area_km2'
  | 'country'

interface RequirementBase {
  requirement_id: string
  label: string
  importance: Importance
  origin: RequirementOrigin
  confirmed: boolean
  /** Fragmento literal del brief del que procede el requisito (o null si lo escribió el usuario sin brief). */
  source_quote: string | null
}

export interface MeasurableRequirement extends RequirementBase {
  kind: 'measurable'
  metric_id: MetricId
  operator: Operator
  value: number | [number, number] | string[]
  unit: string
  scale: RequirementScale
}

/** Pedido que el snapshot no mide: se conserva como pendiente y nunca se aprueba. */
export interface UnmeasuredRequirement extends RequirementBase {
  kind: 'unmeasured'
  topic_id: string
  detail: string
}

export type Requirement = MeasurableRequirement | UnmeasuredRequirement

export type MissionScope =
  | { mode: 'catalog' }
  | { mode: 'sector'; site_id: string }
  | { mode: 'point'; lon: number; lat: number; window_site_id: string | null }
  | { mode: 'bbox'; bbox: [number, number, number, number]; window_site_id: string | null }

export interface MissionRequest {
  schema_version: '1.0.0'
  brief: string
  activity: string
  target: { profile_id: string; stated: string }
  requirements: Requirement[]
  open_questions: string[]
  scope: MissionScope
  confirmed: boolean
}

export type ScopeState =
  | 'covered'
  | 'window_selected'
  | 'needs_window_selection'
  | 'partial_coverage'
  | 'no_coverage'

export type WindowRelation =
  | 'identical'
  | 'contains_point'
  | 'contains_bbox'
  | 'overlaps_bbox'
  | 'inside_bbox'

export interface WindowMatch {
  site_id: string
  name: string
  relation: WindowRelation
  /** Fracción del área solicitada cubierta por la ventana (null para punto). */
  request_covered_fraction: number | null
  /** Fracción de la ventana contenida en la geometría solicitada (null para punto). */
  window_covered_fraction: number | null
}

export interface ScopeResolution {
  mode: MissionScope['mode']
  state: ScopeState
  requested: {
    bbox: [number, number, number, number] | null
    point: [number, number] | null
    approx_area_km2: number | null
  }
  measured: Array<{ site_id: string; bbox: [number, number, number, number]; area_km2: number }>
  matches: WindowMatch[]
  evaluated_site_ids: string[]
  notes: string[]
}

export type RequirementStatus = 'cumple' | 'no_cumple' | 'no_evaluable'

export interface RequirementResult {
  requirement_id: string
  label: string
  importance: Importance
  kind: Requirement['kind']
  status: RequirementStatus
  required: string
  observed_value: number | string | null
  observed_unit: string | null
  reason: string
  evidence_ids: string[]
  scale_note: string | null
  period: string | null
  conversion: string | null
}

export type OptionStatus =
  | 'priorizado_para_reconocimiento'
  | 'no_cumple_requisitos'
  | 'evidencia_insuficiente'
  | 'objetivo_no_soportado'

export interface OptionEvaluation {
  site_id: string
  name: string
  country: string | null
  role: 'candidate' | 'reference'
  status: OptionStatus
  rank: number | null
  critical_failed: string[]
  critical_unknown: string[]
  preferences: { met: number; unmet: number; unknown: number; total: number }
  requirement_results: RequirementResult[]
  /** Valores originales del snapshot v3, sin recalcular. La similitud no es probabilidad de éxito. */
  snapshot_scores: { similarity: number | null; confidence: number; stability: number | null }
  territorial_feasibility: 'pending'
  what_would_change: string[]
  field_checks: string[]
  limitations: string[]
}

export interface EvidenceRef {
  evidence_id: string
  kind: 'artifact' | 'app_derived'
  site_id: string
  dataset_id: string
  claim: string
  source_url: string | null
}

export interface PlannedSource {
  dataset_id: string
  provider: string
  product: string
  landing_url: string
}

export interface DataRequest {
  acquisition_status: 'no_adquirido_en_M8'
  requested_geometry: ScopeResolution['requested']
  requirements: Requirement[]
  planned_sources: PlannedSource[]
  note: string
}

export type EvaluationOutcome =
  | 'evaluated'
  | 'needs_window_selection'
  | 'insufficient_coverage'
  | 'unsupported_target'

export interface MissionEvaluation {
  evaluation_version: '1.0.0'
  rules_version: string
  snapshot_version: string
  profile: { id: string; version: string; name: string; status: string }
  request_fingerprint: string
  outcome: EvaluationOutcome
  resolution: ScopeResolution
  comparability: 'full' | 'partial' | 'not_applicable'
  ordering_rule: string
  options: OptionEvaluation[]
  recommended_site_ids: string[]
  none_prioritized: boolean
  pending_requirements: string[]
  open_questions: string[]
  data_request: DataRequest | null
  evidence: EvidenceRef[]
  limits: string[]
}

export interface EvidenceBundle {
  candidates: CandidateSite[]
  manifest: DataManifest
  profile: MissionProfile
}

export class MissionInputError extends Error {
  readonly issues: string[]
  constructor(issues: string[]) {
    super(issues.join('; '))
    this.name = 'MissionInputError'
    this.issues = issues
  }
}
