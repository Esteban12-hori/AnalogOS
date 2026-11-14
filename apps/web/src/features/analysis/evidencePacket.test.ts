import { describe, expect, it } from 'vitest'
import { checkEvidencePacket } from '../../domain/aiContracts'
import type { CandidateSite, CriterionId } from '../../domain/contracts'
import type { MissionScoring } from '../engine'
import { buildEvidencePacket, FACT_TEXT_MAX, type EvidenceInput } from './evidencePacket'
import { packetHash } from './fnv'
import type { RobustnessSummary } from './robustness'
import { DOMEYKO, fixtureViews, loadScienceSnapshot, MARIA_ELENA, YUNGAY } from './testSupport'

const snapshot = loadScienceSnapshot()
const baseWeights = Object.fromEntries(snapshot.profile.criteria.map((criterion) => [criterion.id, criterion.weight])) as Partial<Record<CriterionId, number>>

/** FIXTURE de robustez: sin cambios de orden, rugosidad como criterio más sensible. */
const robustness: RobustnessSummary = {
  status: 'ready',
  scenarios: 14,
  flips: 0,
  topFlips: 0,
  mostSensitive: 'terrain_roughness',
  sites: snapshot.candidates.map((site) => ({ siteId: site.site_id, stability: site.stability, maxScoreDelta: 1 })),
}

function baseInput(overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    snapshotVersion: snapshot.manifest.snapshot_version,
    base: snapshot.profile,
    candidates: snapshot.candidates,
    profile: { id: snapshot.profile.id, origin: 'snapshot', status: 'needs_calibration', weights: baseWeights },
    missionSummary: null,
    scoring: null,
    views: fixtureViews(snapshot),
    robustness,
    unsupported: [],
    ...overrides,
  }
}

describe('evidence-packet/1 con el perfil base', () => {
  const { packet, facts } = buildEvidencePacket(baseInput())

  it('cumple el contrato y su huella es la FNV-1a 64 de su forma canónica', () => {
    const checked = checkEvidencePacket(packet)
    expect(checked.ok, checked.ok ? '' : checked.error).toBe(true)
    expect(packet.packet_hash).toBe(packetHash(packet as unknown as Record<string, unknown>))
  })

  it('es determinista y cualquier hecho distinto cambia la huella', () => {
    expect(buildEvidencePacket(baseInput()).packet).toEqual(packet)
    const changed = snapshot.candidates.map((site) => (site.site_id === YUNGAY ? { ...site, similarity: 75.76 } : site))
    expect(buildEvidencePacket(baseInput({ candidates: changed })).packet.packet_hash).not.toBe(packet.packet_hash)
    // La huella cubre lo citable: un cambio que no altera ningún texto formateado no la cambia.
    const same = snapshot.candidates.map((site) => (site.site_id === YUNGAY ? { ...site, similarity: 75.68 } : site))
    expect(buildEvidencePacket(baseInput({ candidates: same })).packet.packet_hash).toBe(packet.packet_hash)
  })

  it('ordena los lugares como el ranking y formatea las cifras del snapshot en es-CL', () => {
    expect(packet.sites).toEqual([YUNGAY, DOMEYKO, MARIA_ELENA])
    expect(packet.facts[`site:${YUNGAY}:similarity`]).toBe('75,7 %')
    expect(packet.facts[`site:${MARIA_ELENA}:similarity`]).toBe('50,0 %')
    expect(packet.facts[`site:${YUNGAY}:confidence`]).toBe('77,5')
    expect(packet.facts[`site:${YUNGAY}:stability`]).toBe('99,0')
    expect(packet.facts[`site:${YUNGAY}:feasibility`]).toBe('Requiere revisión')
    expect(packet.facts[`site:${YUNGAY}:rank`]).toBe('#1 de 3')
    expect(packet.facts[`coverage:${YUNGAY}`]).toBe('90 % del peso')
    expect(packet.facts['rank:gap:1:2']).toBe('4,1 puntos')
    expect(packet.facts['rank:gap:2:3']).toBe('21,6 puntos')
  })

  it('dirección y razón respecto de Jezero solo en pendiente, rugosidad y relieve', () => {
    expect(packet.facts['mars:slope']).toBe('2,2°')
    expect(packet.facts['mars:terrain_roughness']).toBe('11 m')
    expect(packet.facts[`site:${YUNGAY}:slope:raw`]).toBe('3,2°')
    expect(packet.facts[`site:${YUNGAY}:slope:ratio`]).toBe('1,4× Jezero')
    expect(packet.facts[`site:${YUNGAY}:slope:vs_mars`]).toBe('más inclinado que Jezero')
    expect(packet.facts[`site:${YUNGAY}:terrain_roughness:ratio`]).toBe('1,5× Jezero')
    expect(packet.facts[`site:${DOMEYKO}:slope:vs_mars`]).toBe('menos inclinado que Jezero')
    expect(packet.facts['mars:aridity_context']).toBeUndefined()
    expect(packet.facts[`site:${YUNGAY}:aridity_context:ratio`]).toBeUndefined()
    expect(packet.fact_kinds).toContainEqual({ kind: 'direction_vs_mars', site_id: DOMEYKO, criterion_id: 'slope', direction: 'less_demanding' })
  })

  it('limitante por contribución, «no distingue», valor regional compartido y mejor de N', () => {
    expect(packet.fact_kinds).toContainEqual({ kind: 'limiting_factor', site_id: YUNGAY, criterion_id: 'terrain_roughness' })
    expect(packet.fact_kinds).toContainEqual({ kind: 'no_discrimination', criterion_id: 'surface_temperature_variability' })
    expect(packet.fact_kinds).toContainEqual({ kind: 'no_discrimination', criterion_id: 'bare_ground_fraction' })
    expect(packet.fact_kinds).toContainEqual({ kind: 'shared_regional_value', criterion_id: 'aridity_context', site_ids: [DOMEYKO, MARIA_ELENA] })
    expect(packet.fact_kinds).toContainEqual({ kind: 'best_of_n', site_id: YUNGAY, criterion_id: 'slope' })
    expect(packet.fact_kinds).toContainEqual({ kind: 'best_of_n', site_id: DOMEYKO, criterion_id: 'local_relief' })
    // Empate en lo que se muestra (100 % y 100 %): no hay «mejor».
    expect(packet.fact_kinds.some((kind) => kind.kind === 'best_of_n' && kind.criterion_id === 'bare_ground_fraction')).toBe(false)
    expect(facts.sites[0]?.limiting?.criterionId).toBe('terrain_roughness')
  })

  it('nunca inventa: geología (needs_calibration) queda «por calcular» sin cifra', () => {
    expect(Object.keys(packet.facts).some((id) => id.includes('geologic_relevance'))).toBe(false)
    expect(facts.sites[0]?.missing).toEqual([{ criterionId: 'geologic_relevance', label: 'Geología', status: 'por calcular' }])
  })

  it('todo hecho cabe en 80 caracteres y las verificaciones de terreno se citan por lugar', () => {
    for (const text of Object.values(packet.facts)) expect(text.length).toBeLessThanOrEqual(FACT_TEXT_MAX)
    expect(packet.checks[`check:${YUNGAY}:1`]).toMatch(/^Confirmar límites/)
    expect(Object.keys(packet.checks)).toHaveLength(15)
  })

  it('robustez: hechos citables y barras con la estabilidad del snapshot', () => {
    expect(packet.facts['sens:flips']).toBe('ningún escenario cambia el orden')
    expect(packet.facts['sens:top_flips']).toBe('ningún escenario cambia el primer lugar')
    expect(packet.facts['sens:most_sensitive']).toBe('Rugosidad')
    expect(packet.facts['sens:perturbation']).toBe('±20 % por peso')
    expect(facts.robustness.sites.map((site) => site.text)).toEqual(['99,0', '98,9', '98,4'])
  })
})

describe('evidence-packet/1 con perfil de misión', () => {
  const weights: Partial<Record<CriterionId, number>> = {
    slope: 3 / 11, terrain_roughness: 3 / 11, local_relief: 2 / 11, bare_ground_fraction: 2 / 11, aridity_context: 1 / 11,
    surface_temperature_variability: 0, geologic_relevance: 0,
  }
  // FIXTURE: % inventados SOLO para probar que el paquete toma el orden y las cifras del motor.
  const scoring: MissionScoring = {
    profileId: 'mission:0123abcd',
    engineVersion: 'fixture',
    sites: [
      { siteId: DOMEYKO, similarity: 70.11, rank: 1, status: 'scored', coverage: 1, confidence: 80.04, contributions: {}, limitingCriterionId: null },
      { siteId: YUNGAY, similarity: 69.95, rank: 2, status: 'scored', coverage: 1, confidence: 81.2, contributions: {}, limitingCriterionId: null },
      { siteId: MARIA_ELENA, similarity: null, rank: null, status: 'insufficient_data', coverage: 0.5, confidence: null, contributions: {}, limitingCriterionId: null },
    ],
  }
  const input = baseInput({
    profile: { id: 'mission:0123abcd', origin: 'mission', status: 'needs_calibration', weights },
    scoring,
    // Con perfil de misión las contribuciones vienen del motor (aquí, ninguna).
    views: fixtureViews(snapshot, weights, new Map()),
    missionSummary: 'Prueba de navegación autónoma en terreno rocoso',
    unsupported: [{ phrase: 'obstáculos a escala de rueda', reason: 'not_measured' }, { phrase: 'pendiente de 5 grados', reason: 'ambiguous' }],
    robustness: null,
  })
  const { packet, facts } = buildEvidencePacket(input)

  it('toma orden, % y confianza del motor; sin % = datos insuficientes, sin posición', () => {
    expect(checkEvidencePacket(packet).ok).toBe(true)
    expect(packet.sites).toEqual([DOMEYKO, YUNGAY, MARIA_ELENA])
    expect(packet.facts[`site:${DOMEYKO}:similarity`]).toBe('70,1 %')
    expect(packet.facts[`site:${DOMEYKO}:rank`]).toBe('#1 de 2')
    expect(packet.facts[`site:${MARIA_ELENA}:similarity`]).toBe('datos insuficientes')
    expect(packet.facts[`site:${MARIA_ELENA}:rank`]).toBeUndefined()
    expect(packet.facts[`coverage:${MARIA_ELENA}`]).toBe('50 % del peso')
    expect(packet.facts['rank:gap:1:2']).toBe('0,2 puntos')
    expect(packet.facts['rank:gap:2:3']).toBeUndefined()
  })

  it('un criterio en Excluir (peso 0) no aporta hechos ni tipos de hecho', () => {
    expect(packet.profile.weights.surface_temperature_variability).toBe(0)
    expect(Object.keys(packet.facts).some((id) => id.includes('surface_temperature_variability'))).toBe(false)
    expect(packet.fact_kinds.some((kind) => kind.criterion_id === 'surface_temperature_variability')).toBe(false)
  })

  it('sin contribuciones del motor no hay limitante (nunca se toma el del perfil base)', () => {
    expect(packet.fact_kinds.some((kind) => kind.kind === 'limiting_factor')).toBe(false)
  })

  it('resumen y lo pedido sin datos pasan al paquete solo si no traen cifras', () => {
    expect(packet.mission_summary).toBe('Prueba de navegación autónoma en terreno rocoso')
    expect(packet.unsupported).toEqual([{ phrase: 'obstáculos a escala de rueda', reason: 'not_measured' }])
    expect(buildEvidencePacket({ ...input, missionSummary: 'Probar a 3 km' }).packet.mission_summary).toBeNull()
  })

  it('robustez por calcular si el motor no está disponible; nada se rellena', () => {
    expect(facts.robustness.status).toBe('por_calcular')
    expect(facts.robustness.sites.every((site) => site.stability === null)).toBe(true)
    expect(Object.keys(packet.facts).some((id) => id.startsWith('sens:') || id.endsWith(':stability'))).toBe(false)
  })

  it('con el motor «por calcular» no hay % ni posiciones', () => {
    const pending: MissionScoring = { ...scoring, sites: scoring.sites.map((site) => ({ ...site, similarity: null, rank: null, status: 'por_calcular' as const, coverage: 0 })) }
    const result = buildEvidencePacket({ ...input, scoring: pending })
    expect(result.packet.facts[`site:${YUNGAY}:similarity`]).toBe('por calcular')
    expect(Object.keys(result.packet.facts).some((id) => id.startsWith('rank:') || id.endsWith(':rank') || id.startsWith('coverage:'))).toBe(false)
  })
})

describe('límites del contrato', () => {
  it('descarta lugares con id fuera del patrón y acota a 12', () => {
    const template = snapshot.candidates[0] as CandidateSite
    const many = Array.from({ length: 14 }, (_, index) => ({ ...template, site_id: `cl-extra-${String.fromCharCode(97 + index)}`, similarity: 50 + index }))
    const { packet } = buildEvidencePacket(baseInput({ candidates: [...many, { ...template, site_id: 'XX-invalid' }], views: new Map() }))
    expect(packet.sites).toHaveLength(12)
    expect(packet.sites).not.toContain('XX-invalid')
    expect(checkEvidencePacket(packet).ok).toBe(true)
  })

  it('sin vistas de métricas (stub) el paquete sigue siendo válido, sin hechos por criterio', () => {
    const { packet } = buildEvidencePacket(baseInput({ views: new Map() }))
    expect(checkEvidencePacket(packet).ok).toBe(true)
    expect(Object.keys(packet.facts).some((id) => /:(raw|sim|ratio|vs_mars)$/.test(id))).toBe(false)
  })
})
