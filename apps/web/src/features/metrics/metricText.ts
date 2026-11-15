/**
 * Textos del riel de métricas (puros, es-CL). Las cifras se formatean aquí y nada más; no se
 * redondea hacia arriba ni se interpola: cada texto refleja el valor final del snapshot/motor.
 */
import type { CriterionId } from '../../domain/contracts'
import { formatWhole } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import type { MetricView } from './index'

const one = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const two = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const three = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 })

/** Palabras para la dirección respecto de Jezero (solo criterios topográficos). */
const DIRECTION_WORDS: Readonly<Partial<Record<CriterionId, readonly [more: string, less: string]>>> = {
  slope: ['más inclinado', 'más suave'],
  terrain_roughness: ['más rugoso', 'más liso'],
  local_relief: ['con más relieve', 'con menos relieve'],
}

/** Abreviatura de 3 letras para las pestañas del carrusel móvil. */
export const METRIC_SHORT: Readonly<Record<CriterionId, string>> = {
  slope: 'Pen',
  terrain_roughness: 'Rug',
  local_relief: 'Rel',
  bare_ground_fraction: 'Sue',
  aridity_context: 'Ari',
  surface_temperature_variability: 'Tér',
  geologic_relevance: 'Geo',
}

/** Similitud del criterio en entero («69»); «—» sin dato. */
export function similarityText(view: Pick<MetricView, 'similarity'>): string {
  return view.similarity === null ? '—' : formatWhole(view.similarity)
}

/** Peso en % entero («27 %»). */
export function weightText(weight: number): string {
  return `${formatWhole(weight * 100)} %`
}

/** ↑ / ↓ si el perfil activo cambió el peso base; '' si es igual. */
export function weightChangeGlyph(view: Pick<MetricView, 'weight' | 'baseWeight'>): string {
  const delta = view.weight - view.baseWeight
  if (Math.abs(delta) < 0.005) return ''
  return delta > 0 ? GLYPH.weightUp : GLYPH.weightDown
}

/** Calidad asignada por fuente con 2 decimales fijos («0,91»). */
export function qualityText(quality: number): string {
  return two.format(quality)
}

/** Contribución al % del lugar («−0,091»), con signo menos tipográfico. */
export function contributionText(contribution: number): string {
  return three.format(contribution).replace('-', '−')
}

/** «1,4× Jezero». */
export function ratioText(ratio: number): string {
  return `${one.format(ratio)}× Jezero`
}

/** «más inclinado» / «más suave» / «parecido a Jezero». */
export function directionWords(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string {
  const vs = view.vsMars
  if (!vs) return ''
  if (vs.direction === 'similar') return 'parecido a Jezero'
  const words = DIRECTION_WORDS[view.criterionId]
  if (!words) return vs.direction === 'more_demanding' ? 'más exigente' : 'menos exigente'
  return vs.direction === 'more_demanding' ? words[0] : words[1]
}

/** Glifo de dirección (↗ más exigente, ↘ menos; '' parecido). */
export function directionGlyph(view: Pick<MetricView, 'vsMars'>): string {
  if (!view.vsMars || view.vsMars.direction === 'similar') return ''
  return view.vsMars.direction === 'more_demanding' ? GLYPH.moreDemanding : GLYPH.lessDemanding
}

/** Frase corta de comparación: «↗ 1,4× Jezero · más inclinado». */
export function vsMarsText(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string {
  if (!view.vsMars) return ''
  const glyph = directionGlyph(view)
  return `${glyph ? `${glyph} ` : ''}${ratioText(view.vsMars.ratio)} · ${directionWords(view)}`
}

/** Explicación de cómo sale la similitud de una métrica topográfica (frente a Jezero). */
export function topographicWhy(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string | null {
  if (!view.vsMars) return null
  return `La mediana del sector es ${ratioText(view.vsMars.ratio)} (${directionWords(view)}). La similitud es la razón entre ambas medianas: 100 sería idéntico.`
}

/** Estado de una métrica que no tiene dato válido o que el perfil activo excluye. */
export function pendingText(view: Pick<MetricView, 'status' | 'weight' | 'baseWeight'>): string | null {
  // Lo que no tiene dato se dice primero: excluirlo del perfil no debe ocultar que no existe.
  const outOfProfile = view.weight <= 0 && view.baseWeight > 0
  if (view.status === 'needs_calibration') return outOfProfile ? 'por calcular · fuera de tu perfil' : 'por calcular'
  if (view.status === 'missing') return outOfProfile ? 'sin dato · fuera de tu perfil' : 'sin dato'
  if (outOfProfile) return 'excluido (0 %)'
  switch (view.status) {
    case 'valid':
      return view.weight <= 0 ? 'fuera del score' : null
    case 'excluded':
      return 'excluido'
    default:
      return 'sin dato'
  }
}

export { coverageText, siteShortName, siteSimilarityText } from './summaryText'
