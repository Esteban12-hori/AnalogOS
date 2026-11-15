/**
 * Metrics rail texts (pure; en-US / es-CL by the interface language, docs/I18N.md §3.3). Figures are formatted here and
 * nowhere else; no rounding up or interpolation: each text reflects the final value from the snapshot/engine. Every
 * function takes an optional `locale` (default: the current one).
 */
import type { CriterionId } from '../../domain/contracts'
import { CRITERION_IDS } from '../../domain/criteria'
import { formatWhole } from '../../domain/formatting'
import { localizedRecord } from '../../domain/localizedLabels'
import { getLocale, type Locale } from '../../i18n/core'
import { formatNumber, withPercent } from '../../i18n/format'
import { tCommon } from '../../i18n/messages/common'
import { tMetricDetails } from '../../i18n/messages/metricDetails'
import { GLYPH } from '../../shell/public'
import type { MetricView } from './index'

const ONE: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 }
const TWO: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const THREE: Intl.NumberFormatOptions = { maximumFractionDigits: 3 }

/** Topographic criteria: the only ones with direction words relative to Jezero. */
type DirectionCriterion = 'slope' | 'terrain_roughness' | 'local_relief'

function isDirectionCriterion(id: CriterionId): id is DirectionCriterion {
  return id === 'slope' || id === 'terrain_roughness' || id === 'local_relief'
}

/** Abbreviation of 3 letters for the mobile carousel tabs (current language). */
export const METRIC_SHORT: Readonly<Record<CriterionId, string>> = localizedRecord(CRITERION_IDS, (id) => tMetricDetails(`short.${id}`))

/** Criterion similarity as an integer («69»); «—» if no data. */
export function similarityText(view: Pick<MetricView, 'similarity'>, locale: Locale = getLocale()): string {
  return view.similarity === null ? '—' : formatWhole(view.similarity, locale)
}

/** Weight as a whole % («27%» / «27 %»). */
export function weightText(weight: number, locale: Locale = getLocale()): string {
  return withPercent(formatWhole(weight * 100, locale), locale)
}

/** ↑ / ↓ if the active profile changed the base weight; '' if it is the same. */
export function weightChangeGlyph(view: Pick<MetricView, 'weight' | 'baseWeight'>): string {
  const delta = view.weight - view.baseWeight
  if (Math.abs(delta) < 0.005) return ''
  return delta > 0 ? GLYPH.weightUp : GLYPH.weightDown
}

/** Quality assigned per source with 2 fixed decimals («0.91» / «0,91»). */
export function qualityText(quality: number, locale: Locale = getLocale()): string {
  return formatNumber(quality, TWO, locale)
}

/** Contribution to the site's % («−0.091» / «−0,091»), with a typographic minus sign. */
export function contributionText(contribution: number, locale: Locale = getLocale()): string {
  return formatNumber(contribution, THREE, locale).replace('-', '−')
}

/** «1.4× Jezero» / «1,4× Jezero». */
export function ratioText(ratio: number, locale: Locale = getLocale()): string {
  return tMetricDetails.in(locale)('ratio', { ratio: formatNumber(ratio, ONE, locale) })
}

/** «steeper» / «gentler» / «similar to Jezero» (and their Spanish wording). */
export function directionWords(view: Pick<MetricView, 'criterionId' | 'vsMars'>, locale: Locale = getLocale()): string {
  const vs = view.vsMars
  if (!vs) return ''
  const t = tMetricDetails.in(locale)
  if (vs.direction === 'similar') return t('direction.similar')
  const more = vs.direction === 'more_demanding'
  if (!isDirectionCriterion(view.criterionId)) return more ? t('direction.more') : t('direction.less')
  return t(`direction.${view.criterionId}.${more ? 'more' : 'less'}`)
}

/** Direction glyph (↗ more demanding, ↘ less; '' similar). */
export function directionGlyph(view: Pick<MetricView, 'vsMars'>): string {
  if (!view.vsMars || view.vsMars.direction === 'similar') return ''
  return view.vsMars.direction === 'more_demanding' ? GLYPH.moreDemanding : GLYPH.lessDemanding
}

/** Short comparison phrase: «↗ 1,4× Jezero · steeper». */
export function vsMarsText(view: Pick<MetricView, 'criterionId' | 'vsMars'>, locale: Locale = getLocale()): string {
  if (!view.vsMars) return ''
  const glyph = directionGlyph(view)
  return `${glyph ? `${glyph} ` : ''}${ratioText(view.vsMars.ratio, locale)} · ${directionWords(view, locale)}`
}

/** Explanation of how the similarity of a topographic metric is derived (relative to Jezero). */
export function topographicWhy(view: Pick<MetricView, 'criterionId' | 'vsMars'>, locale: Locale = getLocale()): string | null {
  if (!view.vsMars) return null
  return tMetricDetails.in(locale)('why.topographic', { ratio: ratioText(view.vsMars.ratio, locale), direction: directionWords(view, locale) })
}

/** State of a metric that has no valid data or that the active profile excludes. */
export function pendingText(view: Pick<MetricView, 'status' | 'weight' | 'baseWeight'>, locale: Locale = getLocale()): string | null {
  const t = tMetricDetails.in(locale)
  const common = tCommon.in(locale)
  // What has no data is stated first: excluding it from the profile must not hide the fact that it does not exist.
  const outOfProfile = view.weight <= 0 && view.baseWeight > 0
  if (view.status === 'needs_calibration') return outOfProfile ? t('pending.notYetOutside') : common('status.notYetCalculated')
  if (view.status === 'missing') return outOfProfile ? t('pending.noDataOutside') : common('status.noData')
  if (outOfProfile) return t('pending.excludedZero')
  switch (view.status) {
    case 'valid':
      return view.weight <= 0 ? t('pending.outsideScore') : null
    case 'excluded':
      return t('value.excluded')
    default:
      return common('status.noData')
  }
}

export { coverageText, siteShortName, siteSimilarityText } from './summaryText'
