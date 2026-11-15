// Capa de hechos del snapshot (lo que queda de buildEvidencePacket sin paquete ni huella FNV,
// docs/INTEGRATION_PLAN.md §5.3): cifras del snapshot formateadas en es-CL, dirección frente a
// Jezero, limitante, «no distingue», valor compartido, mejor de N y robustez del pipeline.
// En v3: sitios de Chile y Argentina, y la REF como hecho aparte (fuera de «mejor de N» y del orden).
import { describe, expect, it } from 'vitest'
import type { FactRef, FactsLayer, SiteFacts } from './types'
import { buildFactsLayer, FACT_TEXT_MAX, type FactsInput } from './facts'
import { summarizeRobustness, type RobustnessSummary } from './robustness'
import { buildMetricViews } from '../metrics/buildMetricViews'
import type { MetricView } from '../metrics'
import { DOMEYKO, fixtureViews, loadScienceSnapshot, MARIA_ELENA, YUNGAY } from './testSupport'
import { v3Snapshot } from '../../tests/v3Support'

const snapshot = loadScienceSnapshot()

/** FIXTURE de robustez: sin cambios de orden, rugosidad como criterio más sensible. */
const robustness: RobustnessSummary = {
  status: 'ready',
  scenarios: 14,
  flips: 0,
  topFlips: 0,
  mostSensitive: 'terrain_roughness',
  sites: snapshot.candidates.map((site) => ({ siteId: site.site_id, stability: site.stability, maxScoreDelta: 1 })),
}

function input(overrides: Partial<FactsInput> = {}): FactsInput {
  return { base: snapshot.profile, candidates: snapshot.candidates, views: fixtureViews(snapshot), robustness, ...overrides }
}

/** Todos los hechos citables de la capa (para comprobar longitudes y ausencias). */
function allFacts(layer: FactsLayer): FactRef[] {
  const out: FactRef[] = []
  const push = (fact: FactRef | null | undefined) => {
    if (fact) out.push(fact)
  }
  const site = (item: SiteFacts) => {
    for (const fact of [item.rank, item.similarity, item.confidence, item.stability, item.feasibility, item.coverage]) push(fact)
    for (const direction of item.directions) for (const fact of [direction.ratio, direction.phrase, direction.raw, direction.mars]) push(fact)
    for (const fact of [item.limiting?.raw, item.limiting?.mars, item.limiting?.sim]) push(fact)
  }
  layer.sites.forEach(site)
  layer.references.forEach(site)
  layer.comparison.gaps.forEach(push)
  for (const fact of [layer.robustness.perturbation, layer.robustness.scenarios, layer.robustness.flips, layer.robustness.topFlips, layer.robustness.mostSensitive]) push(fact)
  return out
}

describe('capa de hechos con el snapshot v2 (sin roles)', () => {
  const facts = buildFactsLayer(input())
  const yungay = facts.sites[0]!

  it('ordena los lugares como el ranking y formatea las cifras del snapshot en es-CL', () => {
    expect(facts.sites.map((site) => site.siteId)).toEqual([YUNGAY, DOMEYKO, MARIA_ELENA])
    expect(yungay.similarity?.text).toBe('75,7 %')
    expect(facts.sites[2]?.similarity?.text).toBe('50,0 %')
    expect(yungay.confidence?.text).toBe('77,5')
    expect(yungay.stability?.text).toBe('99,0')
    expect(yungay.feasibility?.text).toBe('Requiere revisión')
    expect(yungay.rank?.text).toBe('#1 de 3')
    expect(yungay.coverage?.text).toBe('90 % del peso')
    expect(facts.comparison.gaps.map((gap) => gap.text)).toEqual(['4,1 puntos', '21,6 puntos'])
  })

  it('dirección y razón respecto de Jezero solo en pendiente, rugosidad y relieve', () => {
    const slope = yungay.directions.find((item) => item.criterionId === 'slope')
    expect(slope?.mars?.text).toBe('2,2°')
    expect(slope?.raw?.text).toBe('3,2°')
    expect(slope?.ratio.text).toBe('1,4× Jezero')
    expect(slope?.phrase.text).toBe('más inclinado que Jezero')
    expect(yungay.directions.find((item) => item.criterionId === 'terrain_roughness')?.ratio.text).toBe('1,5× Jezero')
    expect(facts.sites[1]?.directions.find((item) => item.criterionId === 'slope')?.phrase.text).toBe('menos inclinado que Jezero')
    expect(yungay.directions.some((item) => item.criterionId === 'aridity_context')).toBe(false)
  })

  it('limitante por contribución, «no distingue», valor regional compartido y mejor de N', () => {
    expect(yungay.limiting?.criterionId).toBe('terrain_roughness')
    const noDiscrimination = facts.comparison.noDiscrimination.map((item) => item.criterionId)
    expect(noDiscrimination).toContain('surface_temperature_variability')
    expect(noDiscrimination).toContain('bare_ground_fraction')
    expect(facts.comparison.shared).toContainEqual(expect.objectContaining({ criterionId: 'aridity_context', siteIds: [DOMEYKO, MARIA_ELENA] }))
    expect(facts.comparison.bestOfN).toContainEqual(expect.objectContaining({ criterionId: 'slope', siteId: YUNGAY }))
    expect(facts.comparison.bestOfN).toContainEqual(expect.objectContaining({ criterionId: 'local_relief', siteId: DOMEYKO }))
    // Empate en lo que se muestra (100 % y 100 %): no hay «mejor».
    expect(facts.comparison.bestOfN.some((item) => item.criterionId === 'bare_ground_fraction')).toBe(false)
  })

  it('nunca inventa: geología (needs_calibration) queda «por calcular» sin cifra', () => {
    expect(allFacts(facts).some((fact) => fact.id.includes('geologic_relevance'))).toBe(false)
    expect(yungay.missing).toEqual([{ criterionId: 'geologic_relevance', label: 'Geología', status: 'por calcular' }])
  })

  it('todo hecho cabe en 80 caracteres y las verificaciones de terreno se citan por lugar', () => {
    for (const fact of allFacts(facts)) expect(fact.text.length).toBeLessThanOrEqual(FACT_TEXT_MAX)
    expect(yungay.checks[0]?.ref).toBe(`check:${YUNGAY}:1`)
    expect(yungay.checks[0]?.text).toMatch(/^Confirmar límites/)
    expect(facts.sites.reduce((sum, site) => sum + site.checks.length, 0)).toBe(15)
  })

  it('robustez: hechos citables y barras con la estabilidad del snapshot', () => {
    expect(facts.robustness.flips?.text).toBe('ningún escenario cambia el orden')
    expect(facts.robustness.topFlips?.text).toBe('ningún escenario cambia el primer lugar')
    expect(facts.robustness.mostSensitive?.text).toBe('Rugosidad')
    expect(facts.robustness.perturbation?.text).toBe('±20 % por peso')
    expect(facts.robustness.sites.map((site) => site.text)).toEqual(['99,0', '98,9', '98,4'])
  })

  it('sin sensibilidad del pipeline la robustez queda «no disponible»; nada se rellena', () => {
    const none = buildFactsLayer(input({ robustness: null }))
    expect(none.robustness.status).toBe('por_calcular')
    expect(none.robustness.flips).toBeNull()
    expect(none.robustness.reason).toContain('no trae la sensibilidad')
  })
})

describe('capa de hechos con el snapshot v3 (candidatos y REF)', () => {
  const views = new Map<string, readonly MetricView[]>(v3Snapshot.candidates.map((site) => [site.site_id, buildMetricViews({ site, sites: v3Snapshot.candidates, profile: v3Snapshot.profile, weights: null, contributions: null, marsReference: v3Snapshot.marsReference })]))
  const sensitivity = v3Snapshot.sensitivity ?? new Map()
  const rows = v3Snapshot.candidates.filter((site) => site.role !== 'reference').map((site) => ({ siteId: site.site_id, baseScore: site.similarity, result: sensitivity.get(site.site_id) ?? null }))
  const facts = buildFactsLayer({ base: v3Snapshot.profile, candidates: v3Snapshot.candidates, views, robustness: summarizeRobustness(rows) })

  it('acepta los sitios argentinos (sin el filtro ^cl- del paquete retirado)', () => {
    expect(facts.sites).toHaveLength(6)
    expect(facts.sites.filter((site) => site.siteId.startsWith('ar-')).map((site) => site.country)).toEqual(['AR', 'AR', 'AR'])
    expect(facts.sites.map((site) => site.rank?.text)).toEqual(['#1 de 6', '#2 de 6', '#3 de 6', '#4 de 6', '#5 de 6', '#6 de 6'])
  })

  it('la REF es un hecho aparte: sin puesto, fuera de «mejor de N», de las brechas y de la robustez', () => {
    expect(facts.references.map((site) => [site.siteId, site.reference, site.rank?.text])).toEqual([[YUNGAY, true, 'REF · referencia conocida, fuera del ranking']])
    expect(facts.sites.some((site) => site.siteId === YUNGAY)).toBe(false)
    expect(facts.comparison.bestOfN.some((item) => item.siteId === YUNGAY)).toBe(false)
    expect(facts.comparison.gaps).toHaveLength(5)
    expect(facts.robustness.sites.some((site) => site.siteId === YUNGAY)).toBe(false)
  })

  it('la robustez sale de la sensibilidad que escribió el pipeline (analysis-summary.json)', () => {
    expect(facts.robustness.status).toBe('ready')
    expect(facts.robustness.scenarios?.text).toBe('14 escenarios')
    expect(facts.robustness.sites[0]?.text).toBe(facts.sites[0]?.stability?.text)
  })

  it('con alcance de Misión, solo los sitios evaluados', () => {
    const scoped = buildFactsLayer({ base: v3Snapshot.profile, candidates: v3Snapshot.candidates, views, robustness: null, onlySiteIds: ['ar-win-s2580-w06710'] })
    expect(scoped.sites.map((site) => site.siteId)).toEqual(['ar-win-s2580-w06710'])
    expect(scoped.sites[0]?.rank?.text).toBe('#6 de 6')
    expect(scoped.references).toEqual([])
  })
})
