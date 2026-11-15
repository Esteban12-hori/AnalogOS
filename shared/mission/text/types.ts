// Text pack contract for the deterministic mission records. Every human-readable string or number format that
// ends up inside a fingerprinted evaluation/export comes from a pack selected by the record's version
// (evaluation_version / export_version). Logic, thresholds, ordering and IDs never depend on the pack.
import type { MeasurableRequirement, MetricId, Requirement } from '../types'

export type ConditionInput = Pick<MeasurableRequirement, 'operator' | 'value' | 'unit'>

export interface ScopeNotes {
  catalog: string
  sectorMissing: (siteId: string) => string
  sectorCovered: string
  pointOutside: string
  pointWindow: string
  pointChooseMany: string
  pointChooseOne: string
  bboxNone: string
  bboxIdentical: string
  bboxPartial: string
  bboxSelected: string
}

export interface MissionText {
  /** Language of the authored text (source evidence copied from artifacts keeps its own language). */
  lang: 'es' | 'en'
  fmtNumber: (x: number) => string
  fmtQuantity: (value: number, unit: string) => string
  fmtObserved: (value: number | string | null, unit: string | null) => string
  describeCondition: (r: ConditionInput) => string
  describeEffective: (r: Requirement) => string
  scaleLabel: Record<'window' | 'point', string>
  importanceLabel: Record<'critical' | 'preference', string>
  metricScaleNote: Record<MetricId, string>
  topicLabel: Record<string, string>
  unknownTopic: string
  limits: string[]
  orderingRule: string
  statusDefinitions: Record<string, string>
  siteRecordClaim: string
  snapshotScaleNote: (scaleNote: string, explanation: string) => string
  pointScaleReason: string
  noValueReason: string
  percentConversion: string
  observedReason: (shown: string, pass: boolean, condition: string) => string
  unmeasuredReason: (topic: string) => string
  wouldChangeFailed: (label: string, observed: string) => string
  wouldChangeMeasure: (label: string, importance: string, reason: string) => string
  tileProduct: string
  dataRequestNote: string
  scopeNotes: ScopeNotes
  verification: { confirmFailure: (label: string) => string; measure: (label: string) => string }
  explanationNotice: Record<'anthropic' | 'deterministic_template', string>
}
