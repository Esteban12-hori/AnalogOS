/**
 * Apoyo de tests de features/analysis (solo lo importan archivos *.test.ts; nunca la app).
 *
 * `fixtureViews` es un DOBLE DE PRUEBA (FIXTURE) de `buildMetricViews`: imita sus campos con una
 * regla simple para probar el paquete sin depender de la implementación de features/metrics. Las
 * pruebas de integración con la implementación real viven aparte y se saltan si metrics o el
 * motor siguen siendo stubs.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CandidateSite, CriterionId, DataManifest, MissionProfile } from '../../domain/contracts'
import { isCriterionId } from '../../domain/contracts'
import { criterionLabels, formatRawValue } from '../../domain/formatting'
import { parseMarsReference } from '../../domain/marsReference'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { MetricView } from '../metrics'

export const REPO_ROOT = resolve(__dirname, '../../../../..')

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'))
}

/** Snapshot científico v2 real, tal como lo entrega loadDemoSnapshot (sin series ni contorno). */
export function loadScienceSnapshot(): DemoSnapshot {
  return {
    candidates: readJson('artifacts/science-v2/candidate-details.json') as CandidateSite[],
    manifest: readJson('artifacts/science-v2/manifest.json') as DataManifest,
    profile: readJson('artifacts/science-v2/mission-profile.json') as MissionProfile,
    chileOutline: { type: 'FeatureCollection', features: [] },
    surfaceSeries: new Map(),
    marsReference: parseMarsReference(readJson('artifacts/science-v2/analysis-summary.json')),
  }
}

export const YUNGAY = 'cl-pampa-yungay-screening'
export const DOMEYKO = 'cl-domeyko-interior-screening'
export const MARIA_ELENA = 'cl-pampa-maria-elena-screening'

const MARS: Readonly<Partial<Record<CriterionId, true>>> = { slope: true, terrain_roughness: true, local_relief: true }

/** FIXTURE: vistas mínimas con la misma forma que MetricView (no es la implementación real). */
export function fixtureViews(
  snapshot: DemoSnapshot,
  weights: Readonly<Partial<Record<CriterionId, number>>> | null = null,
  contributions: ReadonlyMap<string, Readonly<Partial<Record<CriterionId, number | null>>>> | null = null,
): Map<string, MetricView[]> {
  const result = new Map<string, MetricView[]>()
  for (const site of snapshot.candidates) {
    const views: MetricView[] = snapshot.profile.criteria.flatMap((criterion) => {
      const id = criterion.id
      if (!isCriterionId(id)) return []
      const item = site.score_breakdown.find((row) => row.criterion_id === id)
      const valid = item?.status === 'valid'
      const weight = weights ? (weights[id] ?? 0) : criterion.weight
      const raw = item?.raw_value ?? null
      const marsRaw = MARS[id] ? snapshot.marsReference?.byCriterion[id] : undefined
      const marsValue = typeof marsRaw === 'number' ? { raw: marsRaw, unit: criterion.unit, text: formatRawValue(marsRaw, criterion.unit) } : null
      const ratio = marsValue && valid && typeof raw === 'number' ? raw / marsValue.raw : null
      const contribution = contributions ? (contributions.get(site.site_id)?.[id] ?? null) : (item?.contribution ?? null)
      const ns = valid ? (item?.normalized_similarity ?? null) : null
      const shared = valid && typeof raw === 'number' && ns !== null && ns < 1 && ns > 0
        ? snapshot.candidates.filter((other) => other.site_id !== site.site_id && other.score_breakdown.some((row) => row.criterion_id === id && row.status === 'valid' && row.raw_value === raw && row.dataset_id === item?.dataset_id)).map((other) => other.site_id).sort()
        : []
      return [{
        criterionId: id,
        label: criterionLabels[id] ?? id,
        weight,
        baseWeight: criterion.weight,
        status: item?.status ?? 'missing',
        similarity: ns === null ? null : ns * 100,
        siteValue: { raw, unit: criterion.unit, text: typeof raw === 'number' ? formatRawValue(raw, criterion.unit) : 'por calcular' },
        marsValue,
        rule: criterion.method === 'bounded_preference' ? { text: 'FIXTURE', satisfied: ns === null ? null : ns >= 1 } : null,
        vsMars: ratio === null ? null : { direction: ratio > 1.05 ? 'more_demanding' : ratio < 0.95 ? 'less_demanding' : 'similar', ratio },
        isLimiting: false,
        contribution: typeof contribution === 'number' ? contribution : null,
        saturates: criterion.method === 'bounded_preference' && ns !== null && ns >= 1,
        sharedRegionalWith: shared,
        quality: item?.quality ?? 0,
        datasetId: item?.dataset_id ?? 'none',
      }]
    })
    let limiting: MetricView | null = null
    for (const view of views) {
      if (view.weight <= 0 || view.contribution === null || view.contribution >= 0) continue
      if (!limiting || (limiting.contribution !== null && view.contribution < limiting.contribution)) limiting = view
    }
    if (limiting) limiting.isLimiting = true
    result.set(site.site_id, views)
  }
  return result
}

/** Espera a que se vacíe la cola de microtareas/promesas (controlador asíncrono). */
export async function flush(times = 8): Promise<void> {
  for (let index = 0; index < times; index += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}
