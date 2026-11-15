import { EN_TEXT } from './text/en'
import type { MetricId, Operator } from './types'

export const RULES_VERSION = 'mission-rules-1.0.0'
export const SUPPORTED_PROFILE_ID = 'mars-rover-screening-v3'
export const MAX_BRIEF_CHARS = 3000

export interface MetricSpec {
  id: MetricId
  label: string
  units: string[]
  canonical_unit: string
  operators: Operator[]
  source: { kind: 'criterion'; criterion_id: string } | { kind: 'site_field'; field: 'area_km2' | 'country' }
  /** Maximum plausible value in the canonical unit; avoids absurd values, does not define fitness. */
  max_canonical?: number
  scale_note: string
}

// Six metrics measured by the v3 snapshot. All are statistics of the full window.
export const METRICS: Record<MetricId, MetricSpec> = {
  median_slope_degree: {
    id: 'median_slope_degree',
    label: 'Regional median slope',
    units: ['degree'],
    canonical_unit: 'degree',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'slope' },
    max_canonical: 90,
    scale_note: EN_TEXT.metricScaleNote.median_slope_degree,
  },
  terrain_roughness_meter: {
    id: 'terrain_roughness_meter',
    label: 'Median roughness',
    units: ['meter'],
    canonical_unit: 'meter',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'terrain_roughness' },
    max_canonical: 10000,
    scale_note: EN_TEXT.metricScaleNote.terrain_roughness_meter,
  },
  local_relief_meter: {
    id: 'local_relief_meter',
    label: 'Median local relief',
    units: ['meter'],
    canonical_unit: 'meter',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'local_relief' },
    max_canonical: 10000,
    scale_note: EN_TEXT.metricScaleNote.local_relief_meter,
  },
  nonvegetated_fraction: {
    id: 'nonvegetated_fraction',
    label: 'Non-vegetated fraction',
    units: ['ratio', 'percent'],
    canonical_unit: 'ratio',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'bare_ground_fraction' },
    max_canonical: 1,
    scale_note: EN_TEXT.metricScaleNote.nonvegetated_fraction,
  },
  polygon_area_km2: {
    id: 'polygon_area_km2',
    label: 'Full polygon area',
    units: ['km2'],
    canonical_unit: 'km2',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'site_field', field: 'area_km2' },
    max_canonical: 1_000_000,
    scale_note: EN_TEXT.metricScaleNote.polygon_area_km2,
  },
  country: {
    id: 'country',
    label: 'Country',
    units: ['iso_alpha2'],
    canonical_unit: 'iso_alpha2',
    operators: ['in'],
    source: { kind: 'site_field', field: 'country' },
    scale_note: EN_TEXT.metricScaleNote.country,
  },
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[]

// Frequent requests the snapshot does NOT measure. They are kept as pending. Patterns recognize Spanish and English
// briefs; labels are the English ones (the frozen 1.0.0 pack keeps its own Spanish labels for historical records).
export const UNMEASURED_TOPICS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: 'max_point_slope', label: EN_TEXT.topicLabel.max_point_slope, pattern: /pendiente\s+(m[aá]xim[ao]|puntual|local|del\s+rover)|max(imum)?\s+(point\s+|local\s+)?slope|point[-\s]scale\s+slope|slope\s+(at|on)\s+(the\s+)?wheel|rover\s+slope/i },
  { id: 'rock_size', label: EN_TEXT.topicLabel.rock_size, pattern: /\broca(s)?\b|\brock(s|y)?\b|pedregos|\bboulders?\b|\bcobbles?\b/i },
  { id: 'traction', label: EN_TEXT.topicLabel.traction, pattern: /tracci[oó]n|traction|wheel\s+slip|\bgrip\b/i },
  { id: 'loose_soil', label: EN_TEXT.topicLabel.loose_soil, pattern: /suelo\s+suelto|arena\s+suelta|loose\s+(soil|sand|regolith)|soft\s+(soil|sand)/i },
  { id: 'road_access', label: EN_TEXT.topicLabel.road_access, pattern: /carretera|camino\b|acceso\s+vial|\broads?\b|vehicle\s+access|access\s+route/i },
  { id: 'cost', label: EN_TEXT.topicLabel.cost, pattern: /\bcost[eo]s?\b|presupuesto|\bcosts?\b|budget/i },
  { id: 'permits', label: EN_TEXT.topicLabel.permits, pattern: /permiso|autorizaci[oó]n|\bpermit|\bpermission|authori[sz]ation/i },
  { id: 'operational_date', label: EN_TEXT.topicLabel.operational_date, pattern: /fecha\s+(operativa|de\s+la\s+campa[nñ]a)|calendario|temporada|operational\s+date|campaign\s+date|field\s+season|\bschedule\b/i },
  { id: 'local_rain', label: EN_TEXT.topicLabel.local_rain, pattern: /lluvia|precipitaci[oó]n\s+local|\brain(fall)?\b|local\s+precipitation/i },
  { id: 'mobile_coverage', label: EN_TEXT.topicLabel.mobile_coverage, pattern: /cobertura\s+m[oó]vil|se[nñ]al\s+(celular|m[oó]vil)|mobile\s+(coverage|signal)|cell(ular)?\s+(coverage|signal)/i },
]
export const UNMEASURED_TOPIC_IDS = [...UNMEASURED_TOPICS.map((t) => t.id), 'other_unmeasured']

/** Deterministic detection of unmeasured topics mentioned in the brief (does not depend on AI). */
export function detectUnmeasuredMentions(brief: string): Array<{ topic_id: string; label: string; matched_text: string }> {
  const found: Array<{ topic_id: string; label: string; matched_text: string }> = []
  for (const topic of UNMEASURED_TOPICS) {
    const m = topic.pattern.exec(brief)
    if (m) found.push({ topic_id: topic.id, label: topic.label, matched_text: m[0] })
  }
  return found
}

// English texts for the UI; each deterministic record uses the pack of its own version (missionText).
export const LIMITS: string[] = EN_TEXT.limits
export const ORDERING_RULE: string = EN_TEXT.orderingRule
