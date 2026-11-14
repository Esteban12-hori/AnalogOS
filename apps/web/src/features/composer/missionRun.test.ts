import { describe, expect, it } from 'vitest'
import { checkMissionInterpretation, type MissionInterpretation } from '../../domain/aiContracts'
import { rankCandidates } from '../../domain/scoring'
import * as engine from '../engine'
import type { LktronResult } from '../analysis'
import { createMissionController, type EngineApi } from './missionRun'
import { MOBILITY, demoMatch, fakeEngine, harness, interpretation, levels, realSnapshot } from './testSupport'

const snapshot = realSnapshot()
const YUNGAY = 'cl-pampa-yungay-screening'
const DOMEYKO = 'cl-domeyko-interior-screening'
const ELENA = 'cl-pampa-maria-elena-screening'
/** FIXTURE: un orden distinto del snapshot (Yungay es #1 en el snapshot) para probar que manda el motor. */
const ENGINE_ORDER = [ELENA, DOMEYKO, YUNGAY]
const TEXT = 'probar un rover en pendiente rocosa'

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('composer · Misión → resultados sin red (modo DEMO)', () => {
  it('fases interpreting → profile → scoring → analysis; el orden y el % los pone el motor; un solo anuncio', async () => {
    const fake = fakeEngine(ENGINE_ORDER)
    const h = harness(fake)
    const controller = createMissionController(h.deps)

    await controller.submit(TEXT, snapshot)

    expect(h.phases).toEqual(['interpreting', 'profile', 'scoring', 'analysis'])
    expect(h.cameraResets).toEqual([1]) // justo después de pasar a interpreting
    const state = h.mission.getState()
    expect(state).toMatchObject({ text: TEXT, source: 'demo', error: null, revision: 1 })
    expect(state.profile?.levels).toEqual(levels({ slope: 3, terrain_roughness: 3, local_relief: 2 }))
    expect(state.scoring?.sites.map((site) => site.siteId)).toEqual(ENGINE_ORDER)
    // El #1 del motor (no el del snapshot) queda en vista previa, sin mover el foco.
    expect(rankCandidates(snapshot.candidates)[0]?.site_id).toBe(YUNGAY)
    expect(h.selections).toEqual([{ siteId: ELENA, kind: 'evaluated', preview: true }])
    expect(h.announcements).toEqual([{ text: '3 lugares ordenados para tu misión. Primero: Pampa María Elena, 80,0 % de similitud.', kind: 'status' }])
    const composer = h.composer.getState()
    expect(composer.run).toBeNull()
    expect(composer.highlights).toEqual(demoMatch(TEXT).highlights)
    expect(composer.mentioned).toEqual(['slope', 'terrain_roughness', 'local_relief'])
    expect(composer.result?.text).toContain('por el motor test-1.0.0')
    expect(composer.history[0]).toMatchObject({ text: TEXT, source: 'demo' })
    expect(h.persisted).toHaveLength(1)
    expect(h.pendingTimers()).toBe(0)
  })

  it('valida con el contrato real: una interpretación inválida se descarta sin mostrarse', async () => {
    const bad = fakeEngine(ENGINE_ORDER, { matchMissionDemo: () => demoMatch(TEXT, { mission_summary: 'Prioriza 3 criterios al 50 %' }) })
    const h = harness(bad, { validate: checkMissionInterpretation })
    await createMissionController(h.deps).submit(TEXT, snapshot)
    expect(h.phases).toEqual(['interpreting', 'profile', 'error'])
    expect(h.mission.getState()).toMatchObject({ scoring: null, revision: 0, error: { code: 'invalid' } })
    expect(h.announcements).toEqual([{ text: expect.stringContaining('no cumple el contrato'), kind: 'alert' }])
    expect(h.selections).toEqual([])
  })

  it('sin criterios de terreno: error neutro «insufficient», sin %', async () => {
    const none = fakeEngine(ENGINE_ORDER, { matchMissionDemo: () => demoMatch('hola', { status: 'no_terrain_criteria', criteria: [] }) })
    const h = harness(none, { validate: checkMissionInterpretation })
    await createMissionController(h.deps).submit('hola', snapshot)
    expect(h.mission.getState().error?.code).toBe('insufficient')
    expect(h.phases.at(-1)).toBe('error')
    expect(none.calls.scored).toHaveLength(0)
  })

  it('motor por calcular (stub): lo dice y no inventa cifras ni orden', async () => {
    const stub = fakeEngine(ENGINE_ORDER, { matchMissionDemo: () => null })
    const h = harness(stub)
    await createMissionController(h.deps).submit(TEXT, snapshot)
    expect(h.mission.getState()).toMatchObject({ scoring: null, profile: null, revision: 0, error: { code: 'unavailable' } })
    expect(h.announcements[0]?.kind).toBe('alert')

    const throwing = fakeEngine(ENGINE_ORDER, {
      profileFromLevels: () => {
        throw new Error('por implementar')
      },
    })
    const h2 = harness(throwing)
    await createMissionController(h2.deps).submit(TEXT, snapshot)
    expect(h2.mission.getState().error?.message).toMatch(/por calcular/)
    expect(h2.phases).toEqual(['interpreting', 'profile', 'error'])
  })

  it('texto vacío no envía nada', async () => {
    const h = harness(fakeEngine(ENGINE_ORDER))
    await createMissionController(h.deps).submit('   ', snapshot)
    expect(h.phases).toEqual([])
  })
})

describe('composer · lktron opcional (ADR-010)', () => {
  it('con lktron: pide con catálogo y perfil actual; usa su interpretación validada', async () => {
    const requests: unknown[] = []
    const fromAi = interpretation({ engine: 'lktron', model: 'lktron-test', prompt_version: '0.1.0' })
    const h = harness(fakeEngine(ENGINE_ORDER), {
      validate: checkMissionInterpretation,
      lktron: {
        enabled: true,
        interpret: async (request) => {
          requests.push(request)
          return { ok: true, value: fromAi }
        },
      },
    })
    const controller = createMissionController(h.deps)
    await controller.submit(TEXT, snapshot)
    expect(h.mission.getState().source).toBe('lktron')
    expect(h.composer.getState().highlights).toBeNull()
    expect(requests[0]).toMatchObject({ text: TEXT, locale: 'es-CL', current_profile: null })
    await controller.submit('ahora con relieve', snapshot)
    expect(requests[1]).toMatchObject({ current_profile: levels({ slope: 3, terrain_roughness: 3, local_relief: 2 }) })
  })

  it('sin red: el flujo central sigue en modo DEMO · sin IA y lo avisa', async () => {
    const h = harness(fakeEngine(ENGINE_ORDER), {
      lktron: { enabled: true, interpret: async () => ({ ok: false, code: 'unavailable', message: 'sin red' }) },
    })
    await createMissionController(h.deps).submit(TEXT, snapshot)
    expect(h.mission.getState().source).toBe('demo')
    expect(h.composer.getState().notice).toMatch(/DEMO · sin IA/)
    expect(h.announcements).toHaveLength(1)
  })

  it('otro perfil base: se descarta', async () => {
    const foreign = interpretation({ engine: 'lktron', base_profile: { id: 'otro-perfil', version: '1' } })
    const h = harness(fakeEngine(ENGINE_ORDER), {
      lktron: { enabled: true, interpret: async () => ({ ok: true, value: foreign }) },
    })
    await createMissionController(h.deps).submit(TEXT, snapshot)
    expect(h.mission.getState().error?.code).toBe('invalid')
  })
})

describe('composer · cancelar, reemplazar y tiempos (§2.3 C)', () => {
  function slowLktron() {
    const calls: Array<{ signal: AbortSignal; done: ReturnType<typeof deferred<LktronResult<MissionInterpretation>>> }> = []
    return {
      calls,
      lktron: {
        enabled: true,
        interpret: (_request: unknown, signal: AbortSignal) => {
          const done = deferred<LktronResult<MissionInterpretation>>()
          calls.push({ signal, done })
          return done.promise
        },
      },
    }
  }

  it('Esc/Detener cancela: fase cancelled, se conservan los resultados previos y la respuesta tardía se ignora', async () => {
    const slow = slowLktron()
    const h = harness(fakeEngine(ENGINE_ORDER), { lktron: slow.lktron })
    const controller = createMissionController(h.deps)
    const pending = controller.submit(TEXT, snapshot)
    expect(h.composer.getState().run).not.toBeNull()
    expect(controller.cancel()).toBe(true)
    expect(slow.calls[0]?.signal.aborted).toBe(true)
    slow.calls[0]?.done.resolve({ ok: true, value: interpretation({ engine: 'lktron' }) })
    await pending
    expect(h.phases).toEqual(['interpreting', 'cancelled'])
    expect(h.mission.getState()).toMatchObject({ revision: 0, scoring: null, error: { code: 'cancelled' } })
    expect(controller.cancel()).toBe(false)
  })

  it('un envío nuevo reemplaza al anterior: solo el último escribe y anuncia', async () => {
    const slow = slowLktron()
    const h = harness(fakeEngine(ENGINE_ORDER), { lktron: slow.lktron })
    const controller = createMissionController(h.deps)
    const first = controller.submit('primera misión', snapshot)
    const second = controller.submit('segunda misión con pendiente', snapshot)
    expect(slow.calls[0]?.signal.aborted).toBe(true)
    slow.calls[1]?.done.resolve({ ok: true, value: interpretation({ engine: 'lktron' }) })
    slow.calls[0]?.done.resolve({ ok: true, value: interpretation({ engine: 'lktron' }) })
    await Promise.all([first, second])
    expect(h.mission.getState()).toMatchObject({ text: 'segunda misión con pendiente', revision: 1 })
    expect(h.announcements).toHaveLength(1)
  })

  it('300 ms quieto → órbita; 3 s contador; 10 s lento (aviso); 20 s tiempo agotado', async () => {
    const slow = slowLktron()
    const h = harness(fakeEngine(ENGINE_ORDER), { lktron: slow.lktron })
    const pending = createMissionController(h.deps).submit(TEXT, snapshot)
    const wait = () => h.composer.getState().wait
    expect(wait()).toBe('quiet')
    h.advance(299)
    expect(wait()).toBe('quiet')
    h.advance(1)
    expect(wait()).toBe('busy')
    h.advance(2700)
    expect(wait()).toBe('counter')
    h.advance(7000)
    expect(wait()).toBe('slow')
    expect(h.announcements).toEqual([{ text: expect.stringContaining('tardando más de lo normal'), kind: 'status' }])
    h.advance(10000)
    expect(slow.calls[0]?.signal.aborted).toBe(true)
    expect(h.phases.at(-1)).toBe('error')
    expect(h.mission.getState().error).toMatchObject({ code: 'timeout' })
    expect(h.composer.getState()).toMatchObject({ run: null, wait: null, lastText: TEXT })
    slow.calls[0]?.done.resolve({ ok: true, value: interpretation({ engine: 'lktron' }) })
    await pending
    expect(h.mission.getState().revision).toBe(0)
    expect(h.pendingTimers()).toBe(0)
  })

  it('«Usar perfil base» durante la espera: deja de esperar y rige el perfil del snapshot', async () => {
    const slow = slowLktron()
    const h = harness(fakeEngine(ENGINE_ORDER), { lktron: slow.lktron })
    const controller = createMissionController(h.deps)
    const pending = controller.submit(TEXT, snapshot)
    controller.useBaseProfile(snapshot)
    expect(h.phases.at(-1)).toBe('idle')
    expect(h.announcements.at(-1)?.text).toBe('Perfil base del snapshot. Primero: Pampa Yungay, 75,7 % de similitud.')
    slow.calls[0]?.done.resolve({ ok: true, value: interpretation({ engine: 'lktron' }) })
    await pending
    expect(h.mission.getState().revision).toBe(0)
  })
})

describe('composer · «Tu misión»: niveles, Deshacer, predefinidos e historial', () => {
  async function withMission() {
    const fake = fakeEngine(ENGINE_ORDER)
    const h = harness(fake)
    const controller = createMissionController(h.deps)
    await controller.submit(TEXT, snapshot)
    return { fake, h, controller }
  }

  it('editar un nivel recalcula con el motor (sin IA) y Deshacer vuelve atrás', async () => {
    const { fake, h, controller } = await withMission()
    const before = h.mission.getState()
    controller.applyLevels({ ...MOBILITY, aridity_context: 3 }, snapshot, { keepSelection: true })
    const after = h.mission.getState()
    expect(after.revision).toBe(2)
    expect(after.profile?.label).toBe('Perfil personalizado')
    expect(after.profile?.weights.aridity_context).toBeCloseTo(3 / 13, 10)
    expect(after.text).toBe(TEXT)
    expect(after.interpretation).toBe(before.interpretation)
    expect(fake.calls.scored).toHaveLength(2)
    expect(h.selections).toHaveLength(1) // keepSelection: no se reemplaza la selección manual
    expect(h.phases.slice(-3)).toEqual(['profile', 'scoring', 'analysis'])

    expect(controller.undo(snapshot)).toBe(true)
    const undone = h.mission.getState()
    expect(undone.revision).toBe(3)
    expect(undone.profile).toBe(before.profile)
    expect(undone.scoring).toBe(before.scoring)
    expect(h.announcements.at(-1)?.text).toMatch(/^Deshecho\. 3 lugares ordenados/)
    // Deshacer hasta el perfil base y luego no queda nada que deshacer.
    expect(controller.undo(snapshot)).toBe(true)
    expect(h.mission.getState().profile).toBeNull()
    expect(h.phases.at(-1)).toBe('idle')
    expect(controller.undo(snapshot)).toBe(false)
  })

  it('todo en Excluir no se puntúa', async () => {
    const { h, controller, fake } = await withMission()
    controller.applyLevels(levels({}), snapshot)
    expect(h.mission.getState()).toMatchObject({ revision: 1, error: { code: 'insufficient' } })
    expect(fake.calls.scored).toHaveLength(1)
  })

  it('perfil predefinido: conserva su id, queda needs_calibration y entra al historial', async () => {
    const h = harness(fakeEngine(ENGINE_ORDER))
    const controller = createMissionController(h.deps)
    expect(controller.presets()).toEqual([{ id: 'preset-movilidad', label: 'Movilidad y autonomía', description: 'Pendiente y rugosidad como claves.' }])
    controller.applyPreset('preset-movilidad', snapshot)
    expect(h.mission.getState().profile).toMatchObject({ id: 'preset-movilidad', origin: 'preset', status: 'needs_calibration', levels: MOBILITY })
    expect(h.mission.getState()).toMatchObject({ source: 'preset', text: null, interpretation: null })
    expect(h.composer.getState().history[0]).toMatchObject({ presetId: 'preset-movilidad', text: null })
    controller.applyPreset('no-existe', snapshot)
    expect(h.mission.getState().revision).toBe(1)
  })

  it('restaurar del historial recalcula con el motor y no duplica la entrada', async () => {
    const { h, controller, fake } = await withMission()
    controller.useBaseProfile(snapshot)
    expect(h.mission.getState().profile).toBeNull()
    const [entry] = h.composer.getState().history
    controller.restore(entry?.id ?? '', snapshot)
    expect(h.mission.getState()).toMatchObject({ text: TEXT, source: 'demo', interpretation: null })
    expect(fake.calls.scored).toHaveLength(2)
    expect(h.composer.getState().history).toHaveLength(1)
    controller.clearHistory()
    expect(h.composer.getState().history).toEqual([])
    expect(h.persisted.at(-1)).toEqual([])
  })
})

describe('composer · con el motor real de features/engine', () => {
  const real: EngineApi = {
    matchMissionDemo: engine.matchMissionDemo,
    profileFromLevels: engine.profileFromLevels,
    scoreMission: engine.scoreMission,
    MISSION_PRESETS: engine.MISSION_PRESETS,
    PHASE_THRESHOLDS: engine.PHASE_THRESHOLDS,
  }
  const stub = engine.ENGINE_VERSION.endsWith('-stub')

  it.runIf(stub)('motor stub: la misión queda «por calcular» con un error honesto', async () => {
    const h = harness(real, { validate: checkMissionInterpretation })
    await createMissionController(h.deps).submit('probar navegación autónoma de un rover en terreno rocoso', snapshot)
    expect(h.mission.getState()).toMatchObject({ scoring: null, revision: 0, error: { code: 'unavailable' } })
    expect(h.selections).toEqual([])
  })

  it.runIf(!stub)('motor real: DEMO sin red → resultados con el orden del motor y un solo anuncio', async () => {
    const h = harness(real, { validate: checkMissionInterpretation })
    const text = 'probar navegación autónoma de un rover en terreno rocoso'
    await createMissionController(h.deps).submit(text, snapshot)
    const state = h.mission.getState()
    expect(h.phases).toEqual(['interpreting', 'profile', 'scoring', 'analysis'])
    expect(state.source).toBe('demo')
    expect(state.interpretation?.engine).toBe('demo')
    expect(state.profile?.status).toBe('needs_calibration')
    const expected = engine.scoreMission({ profile: state.profile as NonNullable<typeof state.profile>, candidates: snapshot.candidates, base: snapshot.profile })
    expect(state.scoring?.sites.map((site) => [site.siteId, site.similarity, site.rank])).toEqual(
      expected.sites.map((site) => [site.siteId, site.similarity, site.rank]),
    )
    const first = expected.sites[0]
    expect(h.selections).toEqual([{ siteId: first?.siteId, kind: 'evaluated', preview: true }])
    expect(h.announcements).toHaveLength(1)
    expect(h.announcements[0]?.text).toMatch(/^3 lugares ordenados para tu misión\. Primero: .+, \d+,\d % de similitud\.$/)
    expect(h.composer.getState().highlights?.length).toBeGreaterThan(0)
  })
})
