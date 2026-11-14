/**
 * Textos de las cifras del lugar (chunk principal). El resto de textos del riel vive en
 * metricText.ts, que solo carga el detalle diferido.
 */
import { formatScore, formatWhole } from '../../domain/formatting'
import type { SiteFigures } from './metricContext'

/** % del lugar: «75,7» o el estado honesto si no hay cifra. */
export function siteSimilarityText(figures: Pick<SiteFigures, 'similarity' | 'similarityState'>): string {
  if (figures.similarity !== null) return formatScore(figures.similarity)
  return figures.similarityState === 'pending' ? 'por calcular' : 'Datos insuficientes'
}

/** «6 de 7 criterios con dato · 90 % del peso». */
export function coverageText(figures: Pick<SiteFigures, 'validCount' | 'criterionCount' | 'coverage'>): string {
  const base = `${figures.validCount} de ${figures.criterionCount} criterios con dato`
  return figures.coverage === null ? base : `${base} · ${formatWhole(figures.coverage * 100)} % del peso`
}

/** Nombre corto de un sector («Pampa Yungay», sin «— sector de screening»). */
export function siteShortName(name: string): string {
  return name.replace(' (sintético, ubicación arbitraria)', '').split(' — ')[0] ?? name
}
