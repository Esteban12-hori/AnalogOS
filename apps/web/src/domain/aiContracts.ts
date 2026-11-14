/**
 * Tipos y validación en el límite de los contratos de misión e IA (docs/UX_REDESIGN.md §5):
 * mission-interpretation/1, evidence-packet/1 y ai-analysis/1.
 *
 * Este módulo importa los validadores pesados: impórtalo solo desde chunks diferidos
 * (motor, composer, análisis). Para los tipos, usa `import type`, que no arrastra código.
 *
 * La IA nunca produce cifras: estos tipos no tienen campos de similitud, confianza ni ranking.
 */
import type { CriterionId } from './contracts'
import { errorSummary } from './contracts'
import {
  validateAiAnalysisEvent,
  validateEvidencePacket,
  validateMissionInterpretation,
} from './validators.mission.generated.js'

export type CriterionLevel = 0 | 1 | 2 | 3
export type UnsupportedReason = 'not_measured' | 'out_of_scope' | 'ambiguous'

export interface UnsupportedRequest {
  phrase: string
  reason: UnsupportedReason
}

// ---------------------------------------------------------------------------
// mission-interpretation/1 (lktron o matcher DEMO → cliente)
// ---------------------------------------------------------------------------

export interface MissionInterpretation {
  schema: 'mission-interpretation/1'
  engine: 'lktron' | 'demo'
  model: string
  prompt_version: string
  base_profile: { id: string; version: string }
  status: 'ok' | 'no_terrain_criteria'
  mission_summary: string
  criteria: Array<{ id: CriterionId; level: CriterionLevel; rationale: string }>
  assumptions: string[]
  unsupported: UnsupportedRequest[]
}

/** Petición a lktron (mission-interpret-request/1). No tiene esquema: el cliente la arma. */
export interface MissionInterpretRequest {
  text: string
  locale: 'es-CL'
  catalog: Array<{ id: CriterionId; label: string; has_data: boolean; status: string }>
  base_profile_id: string
  current_profile: Readonly<Partial<Record<CriterionId, CriterionLevel>>> | null
}

// ---------------------------------------------------------------------------
// evidence-packet/1 (cliente → lktron): única fuente citable
// ---------------------------------------------------------------------------

export type EvidenceFactKind =
  | { kind: 'limiting_factor' | 'best_of_n' | 'saturates_rule'; site_id: string; criterion_id: CriterionId }
  | { kind: 'no_discrimination'; criterion_id: CriterionId }
  | { kind: 'shared_regional_value'; criterion_id: CriterionId; site_ids: string[] }
  | {
      kind: 'direction_vs_mars'
      site_id: string
      criterion_id: 'slope' | 'terrain_roughness' | 'local_relief'
      direction: 'more_demanding' | 'less_demanding' | 'similar'
    }

export interface EvidencePacket {
  schema: 'evidence-packet/1'
  /** `fnv1a64:<16 hex>` sobre la forma canónica del paquete. */
  packet_hash: string
  snapshot: string
  profile: {
    id: string
    origin: 'snapshot' | 'preset' | 'mission'
    status: 'needs_calibration' | 'validated'
    weights: Partial<Record<CriterionId, number>>
  }
  mission_summary: string | null
  sites: string[]
  /** id de hecho → texto ya formateado (es-CL) por el motor. Las cifras viven solo aquí. */
  facts: Record<string, string>
  fact_kinds: EvidenceFactKind[]
  checks: Record<string, string>
  unsupported: UnsupportedRequest[]
}

// ---------------------------------------------------------------------------
// ai-analysis/1 (lktron → cliente, NDJSON: un evento por línea)
// ---------------------------------------------------------------------------

export type AiAnalysisEvent =
  | { type: 'meta'; schema: 'ai-analysis/1'; engine: 'lktron' | 'pregenerated'; model: string; prompt_version: string; packet_hash: string }
  | { type: 'stage'; stage: 'selecting_facts' | 'writing' }
  | { type: 'summary'; site_id: string | null; text: string; refs: string[] }
  | {
      type: 'insight'
      id: string
      site_id: string
      criterion_id: CriterionId
      fact_kind: EvidenceFactKind['kind']
      text: string
      refs: string[]
    }
  | { type: 'test_suggestion'; site_id: string; text: string; refs: string[] }
  | { type: 'tradeoff'; site_ids: string[]; text: string; refs: string[] }
  | { type: 'robustness_note'; text: string; refs: string[] }
  | { type: 'uncertainty'; text: string; refs: string[]; resolves_check?: string }
  | { type: 'field_priority'; site_id: string; check_ref: string; why: string; refs: string[] }
  | { type: 'analog_note'; analog_id: string; status: 'por_calcular'; text: string }
  | { type: 'done'; counts: Partial<Record<string, number>> }
  | { type: 'error'; code: 'timeout' | 'invalid' | 'unavailable'; message: string }

// ---------------------------------------------------------------------------
// Validación (solo forma: las reglas semánticas de §5.5 viven en features/analysis)
// ---------------------------------------------------------------------------

export type ContractCheck<T> = { ok: true; value: T } | { ok: false; error: string }

function check<T>(validator: typeof validateMissionInterpretation, data: unknown, label: string): ContractCheck<T> {
  if (validator(data)) return { ok: true, value: data as T }
  return { ok: false, error: `${label}: ${errorSummary(validator.errors)}` }
}

export function checkMissionInterpretation(data: unknown): ContractCheck<MissionInterpretation> {
  return check<MissionInterpretation>(validateMissionInterpretation, data, 'mission-interpretation/1')
}

export function checkEvidencePacket(data: unknown): ContractCheck<EvidencePacket> {
  return check<EvidencePacket>(validateEvidencePacket, data, 'evidence-packet/1')
}

export function checkAiAnalysisEvent(data: unknown): ContractCheck<AiAnalysisEvent> {
  return check<AiAnalysisEvent>(validateAiAnalysisEvent, data, 'ai-analysis/1')
}
