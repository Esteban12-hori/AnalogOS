/**
 * Solo para tests de features/leaders (nunca lo importa la app). Lee el snapshot real
 * `artifacts/science-v2` y arma `MetricView` con sus cifras tal cual, porque en la base del
 * paralelo `buildMetricViews` (features/metrics, incremento 5) todavía es un stub. No es un
 * fixture sintético: no inventa ni redondea valores; solo copia el desglose del pipeline.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CandidateSite, CriterionId, DataManifest, MissionProfile } from '../../domain/contracts'
import { formatRawValue } from '../../domain/formatting'
import { parseMarsReference } from '../../domain/marsReference'
import type { MetricView } from '../metrics'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

export const scienceCandidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
export const scienceManifest = read('artifacts/science-v2/manifest.json') as DataManifest
export const scienceProfile = read('artifacts/science-v2/mission-profile.json') as MissionProfile
export const scienceMars = parseMarsReference(read('artifacts/science-v2/analysis-summary.json'))

export function scienceSite(siteId: string): CandidateSite {
  const site = scienceCandidates.find((candidate) => candidate.site_id === siteId)
  if (!site) throw new Error(`sin ${siteId} en science-v2`)
  return site
}

/** Vistas del sector con los pesos del snapshot (o los indicados), en el orden del desglose. */
export function snapshotViews(site: CandidateSite, weights?: Readonly<Partial<Record<string, number>>>): MetricView[] {
  const contributing = site.score_breakdown.filter((item) => item.contribution !== null)
  const limiting = contributing.reduce<(typeof contributing)[number] | null>(
    (worst, item) => (worst === null || (item.contribution ?? 0) < (worst.contribution ?? 0) ? item : worst),
    null,
  )
  return site.score_breakdown.map((item) => {
    const criterion = scienceProfile.criteria.find((entry) => entry.id === item.criterion_id)
    const mars = scienceMars?.byCriterion[item.criterion_id]
    const bounded = criterion?.method === 'bounded_preference'
    const saturates = bounded && item.normalized_similarity === 1
    return {
      criterionId: item.criterion_id as CriterionId,
      label: criterion?.label ?? item.criterion_id,
      weight: weights?.[item.criterion_id] ?? item.weight,
      baseWeight: item.weight,
      status: item.status,
      similarity: item.normalized_similarity === null ? null : item.normalized_similarity * 100,
      siteValue: { raw: item.raw_value, unit: item.unit, text: formatRawValue(item) },
      marsValue: mars !== undefined ? { raw: mars, unit: item.unit, text: formatRawValue(mars, item.unit) } : null,
      rule: bounded ? { text: 'Regla del perfil', satisfied: saturates ? true : null } : null,
      vsMars: null,
      isLimiting: limiting !== null && limiting.criterion_id === item.criterion_id,
      contribution: item.contribution,
      saturates,
      sharedRegionalWith: [],
      quality: item.quality,
      datasetId: item.dataset_id,
    }
  })
}
