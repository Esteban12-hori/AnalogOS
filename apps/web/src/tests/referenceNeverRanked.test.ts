// La referencia conocida (Pampa Yungay, REF) nunca recibe puesto en Explorar (ADR-008): ni en el
// carrusel, ni en el globo, ni en el riel, ni en los hechos de la Lectura, aunque su similitud
// supere a la de varios candidatos. Un `rankCandidates(todos)` olvidado la pondría #4.
import { describe, expect, it } from 'vitest'
import { buildMetricViews } from '../features/metrics/buildMetricViews'
import { resolveMetricContext } from '../features/metrics/metricContext'
import { buildMarkerModels, markerLabelText } from '../features/globe/markers'
import { buildPlaceModel } from '../features/places/placeModel'
import { buildFactsLayer } from '../features/analysis/facts'
import { comparisonRows } from '../components/CandidateComparison'
import { rankMap, splitByRole } from '../domain/discovery'
import { v3Snapshot, YUNGAY } from './v3Support'

const candidates = v3Snapshot.candidates
const yungay = candidates.find((site) => site.site_id === YUNGAY)!

describe('REF fuera del ranking en Explorar', () => {
  it('su similitud v3 supera a candidatos argentinos (por eso importa)', () => {
    expect(candidates.filter((site) => site.role === 'candidate' && (site.similarity ?? 0) < (yungay.similarity ?? 0)).length).toBeGreaterThan(0)
  })

  it('places: sin puesto y en su propio grupo', () => {
    const model = buildPlaceModel({ candidates })
    const place = model.evaluated.find((item) => item.id === YUNGAY)!
    expect(place.rank).toBeNull()
    expect(place.role).toBe('reference')
    expect(model.groups.find((group) => group.role === 'candidate')?.places.some((item) => item.id === YUNGAY)).toBe(false)
  })

  it('globe: «REF» en el rótulo y ningún número de puesto', () => {
    const marker = buildMarkerModels({ candidates, analogs: [], evaluation: null }).find((item) => item.id === YUNGAY)!
    expect(marker.rank).toBeNull()
    expect(markerLabelText(marker).startsWith('REF')).toBe(true)
  })

  it('metrics: sin puesto, rol de referencia y «de 6» que no la cuenta', () => {
    const context = resolveMetricContext({ site: yungay, candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
    expect(context.rank).toBeNull()
    expect(context.role).toBe('reference')
    expect(context.rankedCount).toBe(6)
  })

  it('analysis: hecho aparte, rotulado y fuera de «mejor de N»', () => {
    const views = new Map(candidates.map((site) => [site.site_id, buildMetricViews({ site, sites: candidates, profile: v3Snapshot.profile, weights: null, contributions: null, marsReference: v3Snapshot.marsReference })]))
    const facts = buildFactsLayer({ base: v3Snapshot.profile, candidates, views, robustness: null })
    expect(facts.sites.map((site) => site.siteId)).not.toContain(YUNGAY)
    expect(facts.references[0]?.rank?.text).toContain('REF')
    expect(facts.comparison.bestOfN.every((item) => item.siteId !== YUNGAY)).toBe(true)
  })

  it('Comparar: «REF · Referencia conocida» sin puesto', () => {
    const { ranked, references } = splitByRole(candidates)
    const row = comparisonRows(ranked, references, rankMap(ranked)).find((item) => item.candidate.site_id === YUNGAY)!
    expect(row.rank).toBeNull()
    expect(row.reference).toBe(true)
  })
})
