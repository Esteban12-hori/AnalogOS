// La referencia conocida (Pampa Yungay, REF) nunca recibe puesto en Explorar (ADR-008): ni en el
// carrusel, ni en el globo, ni en el riel, ni en los hechos de la Lectura, aunque su similitud
// supere a la de varios candidatos. Un `rankCandidates(todos)` olvidado la pondría #4.
// En Misión el motor del equipo (shared/mission/evaluate.ts) ordena todos los priorizados, REF
// incluida: decisión aceptada en ADR-013 conforme a ADR-009 §5. La UI muestra ese puesto SIEMPRE
// con «REF» al lado y la REF no cuenta entre los candidatos de «N priorizados de M».
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { buildMetricViews } from '../features/metrics/buildMetricViews'
import { resolveMetricContext } from '../features/metrics/metricContext'
import { buildMarkerModels, markerLabelText } from '../features/globe/markers'
import { buildPlaceModel } from '../features/places/placeModel'
import { buildFactsLayer } from '../features/analysis/facts'
import { comparisonRows } from '../components/CandidateComparison'
import { rankMap, splitByRole } from '../domain/discovery'
import { prioritizedCount } from '../domain/missionView'
import { explanationToReading } from '../features/analysis/explanationToReading'
import { resultLineText } from '../features/composer/model'
import { markerAriaLabel, markerBadgeText } from '../features/globe/markers'
import { MetricRail } from '../features/metrics/MetricRail'
import { composeExplanation, deterministicSelection } from '../mission'
import { missionStore } from '../state/mission'
import { uiStore } from '../state/ui'
import { evaluateExample, readyData, v3Snapshot, YUNGAY } from './v3Support'

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

describe('REF en Misión: el puesto del motor siempre va rotulado «REF» y no cuenta como priorizado', () => {
  // Pendiente ≤ 10° en vez de ≤ 3°: la REF cumple lo imprescindible y el motor la prioriza.
  const { evaluation, request } = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['10', ''] } }])
  const ref = evaluation.options.find((option) => option.site_id === YUNGAY)!

  afterEach(() => {
    missionStore.reset()
    uiStore.reset()
  })

  it('el motor del equipo la prioriza con puesto (por eso importa rotularla)', () => {
    expect(ref.status).toBe('priorizado_para_reconocimiento')
    expect(ref.role).toBe('reference')
    expect(ref.rank).not.toBeNull()
  })

  it('places: «#n · REF · Priorizado…» en la tarjeta', () => {
    const place = buildPlaceModel({ candidates, evaluation }).evaluated.find((item) => item.id === YUNGAY)!
    expect(place.mission?.rank).toBe(ref.rank)
    expect(place.role).toBe('reference')
  })

  it('globe: el distintivo y el nombre accesible dicen REF / referencia conocida', () => {
    const marker = buildMarkerModels({ candidates, analogs: [], evaluation }).find((item) => item.id === YUNGAY)!
    expect(markerBadgeText(marker)).toBe(`#${ref.rank} · REF`)
    expect(markerAriaLabel(marker)).toContain('referencia conocida')
  })

  it('metrics: el resumen de la hoja (S1) y el del riel muestran «REF» junto al puesto', () => {
    missionStore.setState({ evaluation, evaluatedRequest: request, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const sheet = renderToStaticMarkup(createElement(MetricRail, { data: readyData, site: yungay, variant: 'sheet' }))
    expect(sheet.replace(/<[^>]+>/g, '')).toContain(`#${ref.rank} · REF · `)
    const rail = renderToStaticMarkup(createElement(MetricRail, { data: readyData, site: yungay, variant: 'rail' }))
    expect(rail.replace(/<[^>]+>/g, '')).toContain(`#${ref.rank} · REF · Priorizado para reconocimiento`)
  })

  it('composer y carrusel: «N priorizados de M» no cuenta la REF y la nombra aparte', () => {
    const count = prioritizedCount(evaluation)
    const all = evaluation.options.filter((option) => option.status === 'priorizado_para_reconocimiento').length
    expect(count.candidates).toBe(all - 1)
    expect(count.of).toBe(evaluation.options.length - 1)
    expect(count.reference).toBe(true)
    const line = resultLineText(evaluation, candidates)
    expect(line).toContain(`${count.candidates} de ${count.of} candidatos priorizados · REF también priorizada`)
    expect(line).not.toContain(`de ${evaluation.options.length}`)
  })

  it('analysis: el resultado de la Lectura rotula la REF', () => {
    const model = explanationToReading(composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template'), evaluation, 1)
    const option = model.result.groups.flatMap((group) => group.options).find((item) => item.siteId === YUNGAY)!
    expect(option.role).toBe('reference')
    expect(option.rank).toBe(ref.rank)
  })
})
