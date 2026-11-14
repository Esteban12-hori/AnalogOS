// Formateo compartido (motor, resumen de confirmación, resultado e informe impreso).
// Solo presentación: los valores del JSON conservan unidad canónica y número exacto. Aquí no se
// redondea ni se añade precisión (se usa la representación más corta del número), y el resultado
// es idéntico en Node y en el navegador (sin depender de Intl).
import type { MeasurableRequirement, Requirement, ScopeResolution, WindowRelation } from './types'

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

export const describeRequirementLine = (r: Requirement): string =>
  `${r.label}: ${r.kind === 'unmeasured' ? `sin medición${r.detail ? ` — ${r.detail}` : ''}` : describeEffective(r)} (${IMPORTANCE_LABEL[r.importance]})`

export const RELATION_LABEL: Record<WindowRelation, string> = {
  identical: 'coincide con la ventana',
  contains_point: 'contiene el punto',
  contains_bbox: 'contiene su rectángulo',
  overlaps_bbox: 'se superpone parcialmente',
  inside_bbox: 'está dentro de su rectángulo',
}

export const SCOPE_STATE_LABEL: Record<string, string> = {
  covered: 'Geometría con evidencia',
  window_selected: 'Ventana completa elegida por usted (distinta de lo pedido)',
  needs_window_selection: 'Falta elegir la ventana',
  partial_coverage: 'Cobertura parcial',
  no_coverage: 'Sin cobertura',
}

const coord = (x: number): string => fmtNumber(Number(x.toFixed(6)))
const boxText = (b: [number, number, number, number]): string => `oeste ${coord(b[0])}, sur ${coord(b[1])}, este ${coord(b[2])}, norte ${coord(b[3])}`

export interface ScopeLines {
  requested: string
  state: string
  measured: string[]
  matches: string[]
}

/** Geometría pedida vs medida en texto explícito (autosuficiente como solicitud de análisis). */
export function describeScope(res: ScopeResolution, nameOf: (siteId: string) => string): ScopeLines {
  const r = res.requested
  const requested =
    res.mode === 'catalog' ? 'Las siete ventanas con evidencia del snapshot (comparación).'
    : r.point ? `Punto: longitud ${coord(r.point[0])}, latitud ${coord(r.point[1])} (grados decimales, WGS84).`
    : r.bbox ? `Rectángulo: ${boxText(r.bbox)} (grados, WGS84)${r.approx_area_km2 !== null ? `; área aproximada ${fmtNumber(r.approx_area_km2)} km²` : ''}.`
    : 'Sin geometría.'
  const measured = res.measured.length
    ? res.measured.map((m) => `${nameOf(m.site_id)}: ${boxText(m.bbox)}; extensión del polígono ≈ ${fmtNumber(m.area_km2)} km² (no es superficie libre).`)
    : ['Sin geometría medida: no se asignó ninguna métrica a lo pedido.']
  const matches = res.matches.map((m) => `${nameOf(m.site_id)} · ${RELATION_LABEL[m.relation]}${m.request_covered_fraction !== null ? ` · cubre ${Math.round(m.request_covered_fraction * 100)} % de lo pedido` : ''}`)
  return { requested, state: SCOPE_STATE_LABEL[res.state] ?? res.state, measured, matches }
}
