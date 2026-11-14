// Integración con las implementaciones reales de features/metrics (buildMetricViews) y
// features/engine (sensitivity). Ya integradas en feature/mision-redesign: verifican cifras
// reales del snapshot v2 y que el análisis pregenerado corresponde EXACTAMENTE al paquete del
// perfil base (misma huella, cero descartes). Si alguna volviera a ser un stub, fallan.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkEvidencePacket } from '../../domain/aiContracts'
import { ENGINE_VERSION, sensitivity } from '../engine'
import { buildMetricViews } from '../metrics'
import { parsePregenerated, pickPregenerated, PREGENERATED_PATH } from './pregenerated'
import { PERTURBATION, sensitivityInputs } from './robustness'
import { buildReading, replayEvents } from './runtime'
import { DOMEYKO, loadScienceSnapshot, MARIA_ELENA, REPO_ROOT, YUNGAY } from './testSupport'

const snapshot = loadScienceSnapshot()
const yungay = snapshot.candidates.find((site) => site.site_id === YUNGAY)
const metricsReal = yungay !== undefined && buildMetricViews({ site: yungay, sites: snapshot.candidates, profile: snapshot.profile, weights: null, contributions: null, marsReference: snapshot.marsReference }).length > 0
const engineReal = !ENGINE_VERSION.endsWith('-stub')
const integrated = metricsReal && engineReal

describe('integración con metrics y engine reales', () => {
  it('metrics y engine son las implementaciones reales, no stubs', () => {
    expect(integrated).toBe(true)
  })

  const reading = buildReading({ snapshot, context: 'base', mission: null })
  const { packet, facts } = reading

  it('paquete válido con cifras reales del snapshot v2', () => {
    expect(checkEvidencePacket(packet).ok).toBe(true)
    expect(packet.facts[`site:${YUNGAY}:slope:ratio`]).toBe('1,4× Jezero')
    expect(packet.facts[`site:${YUNGAY}:terrain_roughness:ratio`]).toBe('1,5× Jezero')
    expect(packet.facts[`site:${YUNGAY}:local_relief:ratio`]).toBe('1,6× Jezero')
    expect(packet.facts[`site:${MARIA_ELENA}:slope:ratio`]).toBe('0,3× Jezero')
    expect(packet.facts['mars:slope']).toBe('2,2°')
  })

  it('limitante por contribución, no distingue, valor regional compartido', () => {
    for (const siteId of [YUNGAY, DOMEYKO, MARIA_ELENA]) {
      expect(packet.fact_kinds).toContainEqual({ kind: 'limiting_factor', site_id: siteId, criterion_id: 'terrain_roughness' })
    }
    expect(packet.fact_kinds).toContainEqual({ kind: 'no_discrimination', criterion_id: 'surface_temperature_variability' })
    expect(packet.fact_kinds).toContainEqual({ kind: 'shared_regional_value', criterion_id: 'aridity_context', site_ids: [DOMEYKO, MARIA_ELENA] })
  })

  it('los insumos de sensitivity reproducen la estabilidad del pipeline con el perfil base', () => {
    expect(facts.robustness.status).toBe('ready')
    for (const candidate of snapshot.candidates) {
      const inputs = sensitivityInputs(snapshot.profile, null, candidate)
      const result = sensitivity(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight, PERTURBATION)
      expect(result.stability).toBe(candidate.stability)
    }
    expect(packet.facts['sens:flips']).toBeDefined()
  })

  it('el análisis pregenerado corresponde a este paquete y pasa la compuerta sin descartes', () => {
    const file = parsePregenerated(JSON.parse(readFileSync(resolve(REPO_ROOT, 'artifacts', PREGENERATED_PATH), 'utf8')))
    const events = pickPregenerated(file, packet.packet_hash)
    // Si falla: el paquete cambió (metrics, engine o snapshot) y el pregenerado debe rehacerse.
    expect(events, `huella actual ${packet.packet_hash}`).not.toBeNull()
    const ai = replayEvents(reading, events ?? [], null)
    expect(ai.discards).toEqual([])
    expect(ai.status).toBe('done')
    expect(ai.blocks.length).toBe((events?.length ?? 0) - 2)
  })
})
