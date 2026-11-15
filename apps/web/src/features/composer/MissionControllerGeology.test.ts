// Canal geológico (M10 del equipo) portado al controlador de misión de la interfaz integrada: mismas
// garantías que `usePlanner` — opt-in explícito, catálogo cerrado de la evaluación vigente, la IA no
// produce cifras ni ordena (recálculo y huellas idénticos), reintento sin geología y exportación M10
// validable y reconstruible sin tocar la exportación M8.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildGeologyCatalog, deterministicGeologyRefs } from '../../../../../shared/geology/guidance'
import { validateAnyMissionExport } from '../../../../../shared/geology/exportWrapper'
import { parseGeologyContext, type GeologyContextState } from '../../domain/geologyContext'
import { buildRequest, evaluateMission, evaluationFingerprint, fingerprint, type AiProvenance, type ExplanationSelection } from '../../mission'
import type { AiClientResult, ExplainValue } from '../../mission/aiClient'
import { createStore } from '../../state/store'
import { INITIAL_MISSION_STATE, type MissionState } from '../../state/mission'
import { readJson, v3Bundle } from '../../tests/v3Support'
import { GEOLOGY_LOADING_REASON, initialComposerState, type ComposerState } from './composerStore'
import { createMissionController, geologyChannel, type ControllerDeps } from './missionController'

const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
const ready: GeologyContextState = { status: 'ready', context }
const contextFp = fingerprint(context)
const provenance: AiProvenance = { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_geo', created_at: '2026-11-15T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }

type ExplainArgs = Parameters<ControllerDeps['requestExplanation']>[0]

function harness(geology?: GeologyContextState) {
  const mission = createStore<MissionState>(INITIAL_MISSION_STATE)
  const composer = createStore<ComposerState>(initialComposerState())
  const calls: ExplainArgs[] = []
  const pending: Array<(value: AiClientResult<ExplainValue>) => void> = []
  const downloads: Array<[string, string]> = []
  const deps: ControllerDeps = {
    bundle: v3Bundle,
    ...(geology ? { geology } : {}),
    requestDraft: vi.fn(() => new Promise(() => undefined)) as unknown as ControllerDeps['requestDraft'],
    requestExplanation: vi.fn((args: ExplainArgs) => {
      calls.push(args)
      return new Promise<AiClientResult<ExplainValue>>((resolve) => pending.push(resolve))
    }) as unknown as ControllerDeps['requestExplanation'],
    apiUrl: () => 'http://127.0.0.1/api/ai',
    mission,
    composer,
    ui: { getState: () => ({ selection: null }), setMissionPhase: () => undefined, select: () => undefined, resetCameraTouch: () => undefined },
    announce: () => undefined,
    persistHistory: () => undefined,
    download: (name, text) => downloads.push([name, text]),
    now: () => 1_700_000_000_000,
    setTimer: () => 0,
    clearTimer: () => undefined,
  }
  const controller = createMissionController(deps)
  return { controller, mission, composer, calls, pending, downloads, deps }
}

function evaluate(h: ReturnType<typeof harness>) {
  h.controller.loadExample()
  h.controller.dispatch({ type: 'confirm' })
  expect(h.controller.evaluate()).toBe(true)
  return h.controller.getState().result!
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Respuesta de la IA para la llamada `index` (selección M8 mínima y referencias geológicas elegidas). */
function answer(h: ReturnType<typeof harness>, index: number, geologyRefIds: string[] | null) {
  const call = h.calls[index]!
  const result = h.controller.getState().result!
  const catalog = buildGeologyCatalog(result, context, contextFp)
  const selection: ExplanationSelection = { options: [], verification_ids: [] }
  h.pending[index]!({
    ok: true,
    value: {
      requestFp: fingerprint(call.request), evaluationFp: evaluationFingerprint(result), selection, provenance,
      ...(geologyRefIds ? { geology: { contextFp, catalogFp: catalog.catalog_fingerprint, selection: { ref_ids: geologyRefIds } } } : {}),
    },
  })
}

afterEach(() => vi.restoreAllMocks())

describe('controlador de misión · canal geológico', () => {
  it('sin contexto (cargando o ausente): canal no disponible con el motivo, sin catálogo ni exportación geológica', () => {
    const h = harness()
    expect(geologyChannel({ status: 'loading' })).toEqual({ available: false, unavailableReason: GEOLOGY_LOADING_REASON })
    evaluate(h)
    const ui = h.controller.api(h.controller.getState()).geologyUi
    expect(ui).toMatchObject({ available: false, unavailableReason: GEOLOGY_LOADING_REASON, catalog: null })
    h.controller.setGeology({ status: 'unavailable', reason: 'No se encontró el paquete geológico de esta versión.' })
    expect(h.composer.getState().geology).toEqual({ available: false, unavailableReason: 'No se encontró el paquete geológico de esta versión.' })
    expect(h.mission.getState().geologyCatalog).toBeNull()
    h.controller.exportGeologyJson()
    expect(h.downloads).toHaveLength(0)
    // La explicación de requisitos funciona igual: sin huella geológica en la petición.
    h.controller.runExplain()
    expect(h.calls[0]!.geologyContextFp).toBeUndefined()
  })

  it('con contexto: catálogo cerrado de la evaluación vigente, publicado para Tu misión y el informe', () => {
    const h = harness()
    const result = evaluate(h)
    h.controller.setGeology(ready)
    expect(h.composer.getState().geology).toEqual({ available: true, unavailableReason: null })
    const catalog = h.mission.getState().geologyCatalog
    expect(catalog).toEqual(buildGeologyCatalog(result, context, contextFp))
    const ui = h.controller.api(h.controller.getState()).geologyUi
    expect(ui.available).toBe(true)
    expect(ui.useGeology).toBe(true) // casilla activa por defecto, como en usePlanner
    expect(ui.catalog).toBe(catalog)
    // Recibir el contexto no evalúa ni reordena nada.
    expect(h.controller.getState().result).toBe(result)
  })

  it('opt-in: envía SOLO la huella del contexto y acepta la selección ligada al catálogo exacto; recálculo y huellas idénticos', async () => {
    const h = harness(ready)
    const result = evaluate(h)
    const before = { request: result.request_fingerprint, evaluation: evaluationFingerprint(result), options: result.options.map((option) => [option.site_id, option.status, option.rank]) }
    h.controller.runExplain()
    expect(h.calls[0]!.geologyContextFp).toBe(contextFp)
    expect(Object.keys(h.calls[0]!).sort()).toEqual(['geologyContextFp', 'request', 'requestFp', 'requestId', 'signal', 'url'])
    expect(h.controller.getState().explain.pendingCatalog?.catalog_fingerprint).toBe(buildGeologyCatalog(result, context, contextFp).catalog_fingerprint)
    const picked = buildGeologyCatalog(result, context, contextFp).refs.slice(0, 2).map((ref) => ref.ref_id)
    answer(h, 0, picked)
    await flush()
    const state = h.controller.getState()
    expect(state.explain.status).toBe('done')
    expect(state.explain.geologyRecord?.selection.ref_ids).toEqual(picked)
    // La IA no produce cifras ni ordena: el resultado es el mismo objeto y el recálculo da las mismas huellas.
    expect(state.result).toBe(result)
    const recomputed = evaluateMission(buildRequest(state).request!, v3Bundle)
    expect({ request: recomputed.request_fingerprint, evaluation: evaluationFingerprint(recomputed), options: recomputed.options.map((option) => [option.site_id, option.status, option.rank]) }).toEqual(before)
  })

  it('sin opt-in (casilla desmarcada o «Reintentar sin geología»): no se envía la huella y una respuesta con geología se descarta', async () => {
    const h = harness(ready)
    evaluate(h)
    h.composer.setState({ useGeology: false })
    h.controller.runExplain()
    expect(h.calls[0]!.geologyContextFp).toBeUndefined()
    answer(h, 0, [buildGeologyCatalog(h.controller.getState().result!, context, contextFp).refs[0]!.ref_id])
    await flush()
    expect(h.controller.getState().explain.status).toBe('error') // geología no pedida: nunca se acepta
    h.composer.setState({ useGeology: true })
    h.controller.runExplain(false)
    expect(h.calls[1]!.geologyContextFp).toBeUndefined()
    answer(h, 1, null)
    await flush()
    expect(h.controller.getState().explain.status).toBe('done')
    expect(h.controller.getState().explain.geologyRecord).toBeNull()
  })

  it('fallo solo del canal geológico: error con opción de reintentar sin geología', async () => {
    const h = harness(ready)
    evaluate(h)
    h.controller.runExplain()
    h.pending[0]!({ ok: false, unavailable: false, code: 'geology_context_stale', message: 'El contexto geológico del servidor es de otra versión…' })
    await flush()
    expect(h.controller.getState().explain).toMatchObject({ status: 'error', geologyFailed: true })
    h.controller.runExplain(false)
    expect(h.calls[1]!.geologyContextFp).toBeUndefined()
    expect(h.controller.getState().explain.geologyFailed).toBe(false)
  })

  it('cambiar el contexto descarta la selección geológica (no se muestra con otro paquete)', async () => {
    const h = harness(ready)
    evaluate(h)
    h.controller.runExplain()
    answer(h, 0, [])
    await flush()
    expect(h.controller.getState().explain.geologyCatalog).not.toBeNull()
    h.controller.setGeology({ status: 'unavailable', reason: 'sin paquete' })
    expect(h.controller.getState().explain.geologyRecord).toBeNull()
    expect(h.mission.getState().geologyCatalog).toBeNull()
  })

  it('exportación con geología: envoltorio M10 validable, determinista sin IA y con la selección de la IA cuando la hay', async () => {
    const h = harness(ready)
    const result = evaluate(h)
    h.controller.exportGeologyJson()
    expect(h.downloads).toHaveLength(1)
    const [name, text] = h.downloads[0]!
    expect(name).toBe(`analogos-recomendacion-geologia-${evaluationFingerprint(result).slice(0, 8)}.json`)
    const deterministic = JSON.parse(text) as unknown
    expect(validateAnyMissionExport(deterministic, { bundle: v3Bundle })).toEqual({ format: 'mission-geology-export-1', issues: [] })
    expect(JSON.stringify(deterministic)).toContain(deterministicGeologyRefs(buildGeologyCatalog(result, context, contextFp)).ref_ids[0]!)
    // La exportación M8 1.0 sigue siendo la misma de siempre.
    h.controller.exportJson()
    expect(validateAnyMissionExport(JSON.parse(h.downloads[1]![1]) as unknown, { bundle: v3Bundle }).format).toBe('mission-export-1.0')
    // Con la selección de la IA aceptada.
    h.controller.runExplain()
    const picked = [buildGeologyCatalog(result, context, contextFp).refs.at(-1)!.ref_id]
    answer(h, 0, picked)
    await flush()
    h.controller.exportGeologyJson()
    const withAi = JSON.parse(h.downloads[2]![1]) as Record<string, unknown>
    expect(validateAnyMissionExport(withAi, { bundle: v3Bundle }).issues).toEqual([])
    expect(JSON.stringify(withAi)).toContain(picked[0]!)
    expect(JSON.stringify(withAi)).toContain('req_geo')
    expect(h.composer.getState().geologyExportError).toBeNull()
  })
})
