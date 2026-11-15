/**
 * Texts for the place's figures (main chunk). The rest of the rail's texts live in
 * metricText.ts, which only loads the deferred detail. Every function takes an optional `locale` (default: current).
 */
import { formatScore, formatWhole } from '../../domain/formatting'
import { getLocale, type Locale } from '../../i18n/core'
import { withPercent } from '../../i18n/format'
import { tCommon } from '../../i18n/messages/common'
import { tMetrics } from '../../i18n/messages/metrics'
import { scienceText } from '../../i18n/science'
import type { SiteFigures } from './metricContext'

/** % of the place: «75.7» / «75,7» or the honest status if there is no figure. */
export function siteSimilarityText(figures: Pick<SiteFigures, 'similarity' | 'similarityState'>, locale: Locale = getLocale()): string {
  if (figures.similarity !== null) return formatScore(figures.similarity, locale)
  return figures.similarityState === 'pending' ? tCommon.in(locale)('status.notYetCalculated') : tCommon.in(locale)('status.insufficientData')
}

/** «6 of 7 criteria with data · 90% of the weight» / «6 de 7 criterios con dato · 90 % del peso». */
export function coverageText(figures: Pick<SiteFigures, 'validCount' | 'criterionCount' | 'coverage'>, locale: Locale = getLocale()): string {
  const t = tMetrics.in(locale)
  const base = t('coverage', { valid: figures.validCount, total: figures.criterionCount })
  return figures.coverage === null ? base : t('coverage.weight', { text: base, percent: withPercent(formatWhole(figures.coverage * 100, locale), locale) })
}

/** Short name of a sector («Pampa Yungay», without «— screening sector»), in the interface language. */
export function siteShortName(name: string, locale: Locale = getLocale()): string {
  return scienceText(name.replace(' (sintético, ubicación arbitraria)', ''), locale).split(' — ')[0] ?? name
}
