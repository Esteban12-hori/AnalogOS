// FROZEN legacy text pack: evaluation/export 1.0.0 (Spanish). Do not edit, translate or "improve" anything here:
// every string and formatter is byte-for-byte the one that produced the historical 1.0.0 records, and the audit of
// those records rebuilds them with this pack (tests/fixtures/mission-legacy-1.0.0-hashes.json pins the result).
// The formatters are hand-rolled on purpose (no Intl): identical output in Node and in the browser.
import type { MeasurableRequirement, Requirement } from '../types'
import type { ConditionInput, MissionText } from './types'

export function fmtNumber(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const t = String(x)
  // Conservar el exponente evita convertir umbrales pequeños en cero o truncar cifras.
  if (/e/i.test(t)) return t.replace('.', ',')
  const neg = t.startsWith('-')
  const [int, frac] = (neg ? t.slice(1) : t).split('.')
  const grouped = int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int // es-CL agrupa desde 5 dígitos
  return `${neg ? '-' : ''}${grouped}${frac ? `,${frac}` : ''}`
}

const UNIT_SUFFIX: Record<string, string> = { degree: '°', meter: ' m', percent: ' %', km2: ' km²', ratio: ' (fracción 0–1)', iso_alpha2: '' }

export const fmtQuantity = (value: number, unit: string): string => `${fmtNumber(value)}${UNIT_SUFFIX[unit] ?? ` ${unit}`}`

/** Valor observado (unidad canónica). Una fracción se muestra también como %, conversión exacta de ×100. */
export function fmtObserved(value: number | string | null, unit: string | null): string {
  if (value === null) return '—'
  if (typeof value === 'string') return value
  if (unit === 'ratio') return `${fmtNumber(value)} (fracción 0–1; ${fmtNumber(Number((value * 100).toPrecision(12)))} %)`
  return fmtQuantity(value, unit ?? '')
}

export const SCALE_LABEL: Record<'window' | 'point', string> = {
  window: 'Ventana completa (~20 km)',
  point: 'Puntual (no evaluable con estos datos)',
}

/** «≤ 2,3°», «entre 1 y 5 m», «uno de CL, AR». */
export function describeCondition(r: Pick<MeasurableRequirement, 'operator' | 'value' | 'unit'>): string {
  if (r.operator === 'in') return `uno de ${(r.value as string[]).join(', ')}`
  if (r.operator === 'between') {
    const [lo, hi] = r.value as [number, number]
    return `entre ${fmtNumber(lo)} y ${fmtQuantity(hi, r.unit)}`
  }
  return `${r.operator === '<=' ? '≤' : '≥'} ${fmtQuantity(r.value as number, r.unit)}`
}

export const IMPORTANCE_LABEL = { critical: 'imprescindible', preference: 'preferencia' } as const

/** Condición efectiva con escala: lo que realmente evalúa el motor. */
export function describeEffective(r: Requirement): string {
  return r.kind === 'unmeasured' ? `Sin medición${r.detail ? ` — ${r.detail}` : ''}` : `${describeCondition(r)} · ${SCALE_LABEL[r.scale]}`
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

export const STATUS_DEFINITIONS: Record<string, string> = {
  priorizado_para_reconocimiento: 'Cumple todos los requisitos imprescindibles evaluables; merece reconocimiento. No es aprobación ni autorización.',
  no_cumple_requisitos: 'Incumple al menos un requisito imprescindible con valor observado.',
  evidencia_insuficiente: 'Falta evidencia o escala adecuada para algún requisito imprescindible; no se aprueba.',
  objetivo_no_soportado: 'El objetivo no corresponde al único perfil soportado (rover marciano, Jezero, v3).',
}

export const ES_TEXT: MissionText = {
  lang: 'es',
  fmtNumber,
  fmtQuantity,
  fmtObserved,
  describeCondition: (r: ConditionInput) => describeCondition(r),
  describeEffective,
  scaleLabel: SCALE_LABEL,
  importanceLabel: IMPORTANCE_LABEL,
  metricScaleNote: {
    median_slope_degree: 'Mediana de la ventana completa, NASADEM agregado a ~471 m; no es pendiente puntual.',
    terrain_roughness_meter: 'Diferencia mediana entre celdas vecinas a ~471 m; no describe rocas ni obstáculos a escala de rueda.',
    local_relief_meter: 'Relieve mediano 3×3 sobre NASADEM agregado (~471 m).',
    nonvegetated_fraction: 'Mediana de 12 mosaicos mensuales Sentinel-2 L2A (SCL clase 5); no prueba tracción ni mineralogía.',
    polygon_area_km2: 'Extensión aproximada del polígono evaluado; no es superficie libre ni utilizable.',
    country: 'Atributo del polígono en el snapshot.',
  },
  topicLabel: {
    max_point_slope: 'Pendiente máxima puntual del rover',
    rock_size: 'Tamaño de roca',
    traction: 'Tracción',
    loose_soil: 'Suelo suelto',
    road_access: 'Carretera o acceso vial',
    cost: 'Coste',
    permits: 'Permisos',
    operational_date: 'Fecha operativa',
    local_rain: 'Lluvia local',
    mobile_coverage: 'Cobertura móvil',
  },
  unknownTopic: 'Tema no catalogado',
  limits: LIMITS,
  orderingRule: ORDERING_RULE,
  statusDefinitions: STATUS_DEFINITIONS,
  siteRecordClaim: 'Área y país del polígono tal como figuran en candidate-details.json del snapshot.',
  snapshotScaleNote: (scaleNote, explanation) => `${scaleNote} Snapshot: ${explanation}`,
  pointScaleReason: 'El requisito es de escala puntual; el snapshot solo mide estadísticos de la ventana completa y no se sustituye por una mediana regional.',
  noValueReason: 'Sin valor válido de esta métrica para la ventana en el snapshot.',
  percentConversion: 'Umbral en % convertido a fracción 0–1 dividiendo por 100; el snapshot guarda la fracción.',
  observedReason: (shown, pass, cond) => `Valor observado ${shown} ${pass ? 'cumple' : 'no cumple'} la condición ${cond}.`,
  unmeasuredReason: (topic) => `«${topic}» no está medido en el snapshot v3: queda como pendiente y no se interpreta como otra métrica disponible.`,
  wouldChangeFailed: (label, observed) => `Revisar si «${label}» es realmente necesario o elegir otro sector: observado ${observed}.`,
  wouldChangeMeasure: (label, importance, reason) => `Medir «${label}» a la escala requerida (${importance}): ${reason}`,
  tileProduct: 'NASADEM_HGT.001 (teselas según la geometría)',
  dataRequestNote: 'Solicitud de análisis reproducible. Esta versión no adquiere datos nuevos ni consulta satélites: no hay evidencia suficiente para esta geometría y no se estimó nada con ventanas vecinas.',
  scopeNotes: {
    catalog: 'Comparación entre las ventanas con evidencia del snapshot; cada una con sus propias métricas.',
    sectorMissing: (siteId) => `El sector «${siteId}» no existe en el snapshot.`,
    sectorCovered: 'Geometría pedida y medida coinciden: es la ventana completa del snapshot.',
    pointOutside: 'El punto está fuera de las ventanas con evidencia. No se usa el vecino más cercano.',
    pointWindow: 'Hay evidencia de la ventana que contiene el punto, no del punto exacto: las métricas son medianas de la ventana completa.',
    pointChooseMany: 'El punto cae en varias ventanas: elija explícitamente una antes de evaluar.',
    pointChooseOne: 'Elija explícitamente la ventana antes de evaluar.',
    bboxNone: 'El bbox no se superpone con ninguna ventana con evidencia. No se usa el vecino más cercano.',
    bboxIdentical: 'El bbox coincide con la ventana completa (épsilon numérica 1e-9°).',
    bboxPartial: 'El bbox no coincide con una ventana completa (subárea, cobertura parcial o mayor que la ventana): ninguna métrica agregada se hereda de la ventana.',
    bboxSelected: 'Se evalúa la ventana completa elegida explícitamente; no equivale a la geometría pedida.',
  },
  verification: {
    confirmFailure: (label) => `Confirmar el incumplimiento de «${label}» o revisar si el requisito es indispensable.`,
    measure: (label) => `Obtener una medición de «${label}» a la escala requerida.`,
  },
  explanationNotice: {
    anthropic: 'Interpretación asistida por IA (Anthropic): solo selecciona referencias del cálculo; no modifica estados, valores ni exclusiones.',
    deterministic_template: 'Plantilla determinista sin IA: selecciona los requisitos no cumplidos o no evaluables.',
  },
}
