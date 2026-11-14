// Ciclo de la fase `analysis`: el composer la abre; analysis arma la lectura y la cierra con
// `done`, también si solo hay hechos. Una misión nueva o cancelar corta el trabajo en curso.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MissionProfileDraft, MissionScoring } from '../engine'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiActions, uiStore } from '../../state/ui'
import { ensureBaseReading, ensureMissionReading, resetControllerForTests, startReadingController, type ReadingRuntime } from './controller'
import { readingStore } from './readingStore'
import { resetPregeneratedCache } from './pregenerated'
import * as runtime from './runtime'
import { flush, loadScienceSnapshot, YUNGAY } from './testSupport'
import type { Reading } from './types'

const snapshot = loadScienceSnapshot()
const levels = { slope: 3, terrain_roughness: 3, local_relief: 2, bare_ground_fraction: 2, aridity_context: 1, surface_temperature_variability: 0, geologic_relevance: 0 } as const
const profile: MissionProfileDraft = {
  id: 'mission:0a1b2c3d',
  origin: 'mission',
  label: 'Perfil de misión',
  status: 'needs_calibration',
  levels,
  weights: { slope: 3 / 11, terrain_roughness: 3 / 11, local_relief: 2 / 11, bare_ground_fraction: 2 / 11, aridity_context: 1 / 11, surface_temperature_variability: 0, geologic_relevance: 0 },
  baseProfileId: 'mars-rover-screening-v2',
  baseProfileVersion: '2.0.1-preliminary',
}
// FIXTURE: % inventados solo para mover el ciclo (no son resultados del motor).
const scoring: MissionScoring = {
  profileId: profile.id,
  engineVersion: 'fixture',
  sites: snapshot.candidates.map((site, index) => ({ siteId: site.site_id, similarity: 70 - index, rank: index + 1, status: 'scored', coverage: 1, confidence: 77, contributions: {}, limitingCriterionId: null })),
}

/** Runtime falso que se puede soltar a mano para probar carreras. */
function controllableRuntime() {
  const calls: Array<{ context: string; allowLktron: boolean; signal: AbortSignal; release: () => void }> = []
  const fake: ReadingRuntime = {
    runReading: (input) => new Promise<Reading>((resolve) => {
      const reading = { key: input.context === 'base' ? 'base' : `mission:${input.mission?.profile?.id}:${input.mission?.revision}`, context: input.context } as Reading
      calls.push({ context: input.context, allowLktron: input.allowLktron, signal: input.signal, release: () => {
        input.publish(reading)
        resolve(reading)
      } })
    }),
  }
  return { fake, calls }
}

let stop: () => void = () => undefined

beforeEach(() => {
  uiStore.reset()
  missionStore.reset()
  readingStore.reset()
  resetControllerForTests()
  resetPregeneratedCache()
})

afterEach(() => stop())

function startMission(revision = 1) {
  missionStore.setState({ ...INITIAL_MISSION_STATE, text: 'probar navegación', source: 'demo', profile, scoring, revision })
}

describe('controlador de la fase analysis', () => {
  it('analysis → arma la lectura con lktron permitido → done', async () => {
    const { fake, calls } = controllableRuntime()
    stop = startReadingController({ loadRuntime: async () => fake, getSnapshot: async () => snapshot })
    startMission()
    uiActions.setMissionPhase('analysis')
    await flush()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ context: 'mission', allowLktron: true })
    expect(uiStore.getState().missionPhase).toBe('analysis')
    calls[0]?.release()
    await flush()
    expect(uiStore.getState().missionPhase).toBe('done')
    expect(readingStore.getState().mission.reading?.key).toBe('mission:mission:0a1b2c3d:1')
  })

  it('una misión nueva (interpreting) cancela el análisis en curso y no lo cierra', async () => {
    const { fake, calls } = controllableRuntime()
    stop = startReadingController({ loadRuntime: async () => fake, getSnapshot: async () => snapshot })
    startMission()
    uiActions.setMissionPhase('analysis')
    await flush()
    uiActions.setMissionPhase('interpreting')
    expect(calls[0]?.signal.aborted).toBe(true)
    calls[0]?.release()
    await flush()
    expect(uiStore.getState().missionPhase).toBe('interpreting')
    expect(readingStore.getState().mission.reading).toBeNull()
  })

  it('cancelar también corta el análisis', async () => {
    const { fake, calls } = controllableRuntime()
    stop = startReadingController({ loadRuntime: async () => fake, getSnapshot: async () => snapshot })
    startMission()
    uiActions.setMissionPhase('analysis')
    await flush()
    uiActions.setMissionPhase('cancelled')
    expect(calls[0]?.signal.aborted).toBe(true)
  })

  it('sin resultados del motor, la fase analysis se cierra igual (nunca queda colgada)', async () => {
    const { fake, calls } = controllableRuntime()
    stop = startReadingController({ loadRuntime: async () => fake, getSnapshot: async () => snapshot })
    uiActions.setMissionPhase('analysis')
    await flush()
    expect(calls).toHaveLength(0)
    expect(uiStore.getState().missionPhase).toBe('done')
  })

  it('si el runtime falla, la lectura queda en error y la fase se cierra', async () => {
    stop = startReadingController({
      loadRuntime: async () => ({ runReading: async () => {
        throw new Error('fallo de prueba')
      } }),
      getSnapshot: async () => snapshot,
    })
    startMission()
    uiActions.setMissionPhase('analysis')
    await flush()
    expect(readingStore.getState().mission).toMatchObject({ status: 'error', error: 'fallo de prueba' })
    expect(uiStore.getState().missionPhase).toBe('done')
  })

  it('con el runtime real (sin red ni lktron): solo hechos y done', async () => {
    stop = startReadingController({ loadRuntime: async () => runtime, getSnapshot: async () => snapshot })
    startMission()
    uiActions.setMissionPhase('analysis')
    await flush(20)
    expect(uiStore.getState().missionPhase).toBe('done')
    const reading = readingStore.getState().mission.reading
    expect(reading?.context).toBe('mission')
    expect(reading?.packet.profile.id).toBe(profile.id)
    expect(reading?.packet.sites[0]).toBe(YUNGAY)
    expect(reading?.ai.status).toBe('facts_only')
  })

  it('ensureMissionReading arma la lectura sin IA cuando falta; ensureBaseReading, una sola vez', async () => {
    const { fake, calls } = controllableRuntime()
    stop = startReadingController({ loadRuntime: async () => fake, getSnapshot: async () => snapshot })
    startMission(3)
    ensureMissionReading()
    await flush()
    expect(calls[0]).toMatchObject({ context: 'mission', allowLktron: false })
    void ensureBaseReading()
    void ensureBaseReading()
    await flush()
    expect(calls.filter((call) => call.context === 'base')).toHaveLength(1)
  })
})
