/**
 * Texts for the place's figures (main chunk). The rest of the rail's texts live in
 * metricText.ts, which only loads the deferred detail.
 */
import { formatScore, formatWhole } from '../../domain/formatting'
import { displaySource } from '../../i18n/sourceText'
import type { SiteFigures } from './metricContext'

/** % of the place: «75,7» or the honest status if there is no figure. */
export function siteSimilarityText(figures: Pick<SiteFigures, 'similarity' | 'similarityState'>): string {
  if (figures.similarity !== null) return formatScore(figures.similarity)
  return figures.similarityState === 'pending' ? 'not yet calculated' : 'Insufficient data'
}

/** «6 of 7 criteria with data · 90 % of the weight». */
export function coverageText(figures: Pick<SiteFigures, 'validCount' | 'criterionCount' | 'coverage'>): string {
  const base = `${figures.validCount} of ${figures.criterionCount} criteria with data`
  return figures.coverage === null ? base : `${base} · ${formatWhole(figures.coverage * 100)}% of the weight`
}

/** Short name of a sector («Pampa Yungay», without «— screening sector»). */
export function siteShortName(name: string): string {
  return displaySource(name.replace(' (sintético, ubicación arbitraria)', '')).split(' — ')[0] ?? name
}
