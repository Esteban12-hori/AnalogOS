/**
 * Textos de las cifras del lugar (chunk principal). El resto de textos del riel vive en
 * metricText.ts, que solo carga el detalle diferido.
 */
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import { isCriterionId } from '../../domain/criteria'
import { criterionLabels, formatScore, formatWhole } from '../../domain/formatting'
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

/**
 * Con un perfil de misión la confianza puede SUBIR solo porque un criterio sin dato (p. ej.
 * Geología, calidad 0) quedó en Excluir y deja de restar. Se dice para que no se lea como más
 * evidencia (§0.8). null si no aplica.
 */
export function confidenceRiseNote(
  context: { kind: 'base' | 'mission'; figures: { confidence: number | null }; input: { site: CandidateSite; profile: MissionProfile; weights: Readonly<Partial<Record<CriterionId, number>>> | null } },
): string | null {
  const { site, profile, weights } = context.input
  const mission = context.figures.confidence
  const base = site.confidence
  if (context.kind !== 'mission' || weights === null || mission === null || base === null || !(mission > base)) return null
  const dropped = profile.criteria
    .filter((criterion) => criterion.weight > 0 && isCriterionId(criterion.id) && (weights[criterion.id] ?? 0) <= 0)
    .filter((criterion) => site.score_breakdown.find((item) => item.criterion_id === criterion.id)?.status !== 'valid')
    .map((criterion) => criterionLabels[criterion.id] ?? criterion.id)
  if (dropped.length === 0) return null
  return `Sube frente al perfil base (${formatScore(base)}) porque ${dropped.join(', ')} (sin dato) quedó fuera de tu perfil: no es más evidencia.`
}
