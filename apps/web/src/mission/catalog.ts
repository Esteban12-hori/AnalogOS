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
  /** Máximo plausible en la unidad canónica; evita valores absurdos, no define aptitud. */
  max_canonical?: number
  scale_note: string
}

// Seis métricas medidas por el snapshot v3. Todas son estadísticos de la ventana completa.
export const METRICS: Record<MetricId, MetricSpec> = {
  median_slope_degree: {
    id: 'median_slope_degree',
    label: 'Mediana de pendiente regional',
    units: ['degree'],
    canonical_unit: 'degree',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'slope' },
    max_canonical: 90,
    scale_note: 'Mediana de la ventana completa, NASADEM agregado a ~471 m; no es pendiente puntual.',
  },
  terrain_roughness_meter: {
    id: 'terrain_roughness_meter',
    label: 'Rugosidad mediana',
    units: ['meter'],
    canonical_unit: 'meter',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'terrain_roughness' },
    max_canonical: 10000,
    scale_note: 'Diferencia mediana entre celdas vecinas a ~471 m; no describe rocas ni obstáculos a escala de rueda.',
  },
  local_relief_meter: {
    id: 'local_relief_meter',
    label: 'Relieve local mediano',
    units: ['meter'],
    canonical_unit: 'meter',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'local_relief' },
    max_canonical: 10000,
    scale_note: 'Relieve mediano 3×3 sobre NASADEM agregado (~471 m).',
  },
  nonvegetated_fraction: {
    id: 'nonvegetated_fraction',
    label: 'Fracción no vegetada',
    units: ['ratio', 'percent'],
    canonical_unit: 'ratio',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'criterion', criterion_id: 'bare_ground_fraction' },
    max_canonical: 1,
    scale_note: 'Mediana de 12 mosaicos mensuales Sentinel-2 L2A (SCL clase 5); no prueba tracción ni mineralogía.',
  },
  polygon_area_km2: {
    id: 'polygon_area_km2',
    label: 'Área del polígono completo',
    units: ['km2'],
    canonical_unit: 'km2',
    operators: ['<=', '>=', 'between'],
    source: { kind: 'site_field', field: 'area_km2' },
    max_canonical: 1_000_000,
    scale_note: 'Extensión aproximada del polígono evaluado; no es superficie libre ni utilizable.',
  },
  country: {
    id: 'country',
    label: 'País',
    units: ['iso_alpha2'],
    canonical_unit: 'iso_alpha2',
    operators: ['in'],
    source: { kind: 'site_field', field: 'country' },
    scale_note: 'Atributo del polígono en el snapshot.',
  },
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[]

// Pedidos frecuentes que el snapshot NO mide. Se conservan como pendientes.
export const UNMEASURED_TOPICS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: 'max_point_slope', label: 'Pendiente máxima puntual del rover', pattern: /pendiente\s+(m[aá]xim[ao]|puntual|local|del\s+rover)|max(imum)?\s+(point\s+|local\s+)?slope/i },
  { id: 'rock_size', label: 'Tamaño de roca', pattern: /\broca(s)?\b|\brock(s)?\b|pedregos/i },
  { id: 'traction', label: 'Tracción', pattern: /tracci[oó]n|traction/i },
  { id: 'loose_soil', label: 'Suelo suelto', pattern: /suelo\s+suelto|arena\s+suelta|loose\s+(soil|sand)/i },
  { id: 'road_access', label: 'Carretera o acceso vial', pattern: /carretera|camino\b|acceso\s+vial|\broad\b/i },
  { id: 'cost', label: 'Coste', pattern: /\bcost[eo]s?\b|presupuesto|\bcost\b|budget/i },
  { id: 'permits', label: 'Permisos', pattern: /permiso|autorizaci[oó]n|\bpermit/i },
  { id: 'operational_date', label: 'Fecha operativa', pattern: /fecha\s+(operativa|de\s+la\s+campa[nñ]a)|calendario|temporada|operational\s+date/i },
  { id: 'local_rain', label: 'Lluvia local', pattern: /lluvia|precipitaci[oó]n\s+local|\brain\b/i },
  { id: 'mobile_coverage', label: 'Cobertura móvil', pattern: /cobertura\s+m[oó]vil|se[nñ]al\s+(celular|m[oó]vil)|mobile\s+coverage/i },
]
export const UNMEASURED_TOPIC_IDS = [...UNMEASURED_TOPICS.map((t) => t.id), 'other_unmeasured']

/** Detección determinista de temas no medidos mencionados en el brief (no depende de IA). */
export function detectUnmeasuredMentions(brief: string): Array<{ topic_id: string; label: string; matched_text: string }> {
  const found: Array<{ topic_id: string; label: string; matched_text: string }> = []
  for (const topic of UNMEASURED_TOPICS) {
    const m = topic.pattern.exec(brief)
    if (m) found.push({ topic_id: topic.id, label: topic.label, matched_text: m[0] })
  }
  return found
}

export const LIMITS: string[] = [
  'Screening de escritorio sobre el snapshot science-screening-v3: prioriza reconocimiento; no aprueba, autoriza ni garantiza la seguridad de un sector.',
  'Los requisitos son condiciones del ensayo definidas por el usuario, no estándares de NASA ni de otra agencia.',
  'Las métricas son estadísticos de la ventana completa (análisis a ~471 m); no describen pendiente puntual, rocas, tracción ni suelo suelto.',
  'El área es la extensión del polígono evaluado, no superficie libre ni utilizable.',
  'SCL clase 5 mide superficie no vegetada; no prueba tracción ni mineralogía. NASA POWER es contexto regional: no aprueba lluvia local ni pronósticos.',
  'La factibilidad territorial (permisos, acceso, áreas protegidas, propiedad) está pendiente y es independiente de este resultado.',
  'Similitud y confianza son las del snapshot v3, sin recalcular; la similitud no es probabilidad de éxito. Es válido que ninguna opción resulte priorizada.',
]

export const ORDERING_RULE =
  'Primero se aplican los requisitos imprescindibles: un incumplimiento observado excluye la opción y un valor ausente o a escala inadecuada la deja con evidencia insuficiente. ' +
  'Entre las opciones con todos los imprescindibles cumplidos se ordena por (1) preferencias satisfechas, descendente; (2) similitud v3, descendente; (3) identificador del sector, ascendente. ' +
  'Las preferencias desconocidas no cuentan como cumplidas ni como incumplidas; se informan aparte y la comparación se rotula parcial. No existe un porcentaje de aptitud nuevo.'
