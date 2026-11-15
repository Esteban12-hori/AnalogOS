/**
 * Metrics rail texts (pure, en-US). Figures are formatted here and nowhere else; no
 * rounding up or interpolation: each text reflects the final value from the snapshot/engine.
 */
import type { CriterionId } from '../../domain/contracts'
import { formatWhole } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import type { MetricView } from './index'

const one = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const two = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const three = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })

/** Words for the direction relative to Jezero (topographic criteria only). */
const DIRECTION_WORDS: Readonly<Partial<Record<CriterionId, readonly [more: string, less: string]>>> = {
  slope: ['steeper', 'gentler'],
  terrain_roughness: ['rougher', 'smoother'],
  local_relief: ['with more relief', 'with less relief'],
}

/** Abbreviation of 3 letters for the mobile carousel tabs. */
export const METRIC_SHORT: Readonly<Record<CriterionId, string>> = {
  slope: 'Slp',
  terrain_roughness: 'Rgh',
  local_relief: 'Rel',
  bare_ground_fraction: 'Bare',
  aridity_context: 'Ard',
  surface_temperature_variability: 'Thm',
  geologic_relevance: 'Geo',
}

/** Criterion similarity as an integer («69»); «—» if no data. */
export function similarityText(view: Pick<MetricView, 'similarity'>): string {
  return view.similarity === null ? '—' : formatWhole(view.similarity)
}

/** Peso en % entero («27 %»). */
export function weightText(weight: number): string {
  return `${formatWhole(weight * 100)}%`
}

/** ↑ / ↓ if the active profile changed the base weight; '' if it is the same. */
export function weightChangeGlyph(view: Pick<MetricView, 'weight' | 'baseWeight'>): string {
  const delta = view.weight - view.baseWeight
  if (Math.abs(delta) < 0.005) return ''
  return delta > 0 ? GLYPH.weightUp : GLYPH.weightDown
}

/** Quality assigned per source with 2 fixed decimals («0,91»). */
export function qualityText(quality: number): string {
  return two.format(quality)
}

/** Contribution to the site's % («−0,091»), with a typographic minus sign. */
export function contributionText(contribution: number): string {
  return three.format(contribution).replace('-', '−')
}

/** «1,4× Jezero». */
export function ratioText(ratio: number): string {
  return `${one.format(ratio)}× Jezero`
}

/** «steeper» / «gentler» / «similar to Jezero». */
export function directionWords(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string {
  const vs = view.vsMars
  if (!vs) return ''
  if (vs.direction === 'similar') return 'similar to Jezero'
  const words = DIRECTION_WORDS[view.criterionId]
  if (!words) return vs.direction === 'more_demanding' ? 'more demanding' : 'less demanding'
  return vs.direction === 'more_demanding' ? words[0] : words[1]
}

/** Direction glyph (↗ more demanding, ↘ less; '' similar). */
export function directionGlyph(view: Pick<MetricView, 'vsMars'>): string {
  if (!view.vsMars || view.vsMars.direction === 'similar') return ''
  return view.vsMars.direction === 'more_demanding' ? GLYPH.moreDemanding : GLYPH.lessDemanding
}

/** Short comparison phrase: «↗ 1,4× Jezero · steeper». */
export function vsMarsText(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string {
  if (!view.vsMars) return ''
  const glyph = directionGlyph(view)
  return `${glyph ? `${glyph} ` : ''}${ratioText(view.vsMars.ratio)} · ${directionWords(view)}`
}

/** Explanation of how the similarity of a topographic metric is derived (relative to Jezero). */
export function topographicWhy(view: Pick<MetricView, 'criterionId' | 'vsMars'>): string | null {
  if (!view.vsMars) return null
  return `The sector median is ${ratioText(view.vsMars.ratio)} (${directionWords(view)}). Similarity is the ratio between both medians: 100 would be identical.`
}

/** State of a metric that has no valid data or that the active profile excludes. */
export function pendingText(view: Pick<MetricView, 'status' | 'weight' | 'baseWeight'>): string | null {
  // What has no data is stated first: excluding it from the profile must not hide the fact that it does not exist.
  const outOfProfile = view.weight <= 0 && view.baseWeight > 0
  if (view.status === 'needs_calibration') return outOfProfile ? 'not yet calculated · outside your profile' : 'not yet calculated'
  if (view.status === 'missing') return outOfProfile ? 'no data · outside your profile' : 'no data'
  if (outOfProfile) return 'excluded (0%)'
  switch (view.status) {
    case 'valid':
      return view.weight <= 0 ? 'outside the score' : null
    case 'excluded':
      return 'excluded'
    default:
      return 'no data'
  }
}

export { coverageText, siteShortName, siteSimilarityText } from './summaryText'
