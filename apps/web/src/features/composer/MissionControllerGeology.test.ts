// Geological channel (the team's M10) ported to the integrated interface's mission controller: same
// guarantees as `usePlanner` — explicit opt-in, closed catalog of the current assessment, the AI does not
// produce figures or rank (identical recalculation and fingerprints), retry without geology, and M10 export
// that is verifiable and reconstructible without touching the M8 export.
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

/** AI response for the `index` call (minimal M8 selection and chosen geological references). */
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

describe('mission controller · geology channel', () => {
  it('without context (loading or absent): channel unavailable with the reason, no geology catalog or export', () => {
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
    // The requirements explanation works the same way: no geological fingerprint in the request.
    h.controller.runExplain()
    expect(h.calls[0]!.geologyContextFp).toBeUndefined()
  })

  it('with context: closed catalog of the current evaluation, published for Your mission and the report', () => {
    const h = harness()
    const result = evaluate(h)
    h.controller.setGeology(ready)
    expect(h.composer.getState().geology).toEqual({ available: true, unavailableReason: null })
    const catalog = h.mission.getState().geologyCatalog
    expect(catalog).toEqual(buildGeologyCatalog(result, context, contextFp))
    const ui = h.controller.api(h.controller.getState()).geologyUi
    expect(ui.available).toBe(true)
    expect(ui.useGeology).toBe(true) // checkbox on by default, as in usePlanner
    expect(ui.catalog).toBe(catalog)
    // Receiving the context does not evaluate or reorder anything.
    expect(h.controller.getState().result).toBe(result)
  })

  it('opt-in: sends ONLY the context fingerprint and accepts the selection tied to the exact catalog; identical recomputation and fingerprints', async () => {
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
    // The AI does not produce figures or rank: the result is the same object and the recalculation yields the same fingerprints.
    expect(state.result).toBe(result)
    const recomputed = evaluateMission(buildRequest(state).request!, v3Bundle)
    expect({ request: recomputed.request_fingerprint, evaluation: evaluationFingerprint(recomputed), options: recomputed.options.map((option) => [option.site_id, option.status, option.rank]) }).toEqual(before)
  })

  it('without opt-in (checkbox unticked or “Retry without geology”): the fingerprint is not sent and a response with geology is discarded', async () => {
    const h = harness(ready)
    evaluate(h)
    h.composer.setState({ useGeology: false })
    h.controller.runExplain()
    expect(h.calls[0]!.geologyContextFp).toBeUndefined()
    answer(h, 0, [buildGeologyCatalog(h.controller.getState().result!, context, contextFp).refs[0]!.ref_id])
    await flush()
    expect(h.controller.getState().explain.status).toBe('error') // geology not requested: never accepted
    h.composer.setState({ useGeology: true })
    h.controller.runExplain(false)
    expect(h.calls[1]!.geologyContextFp).toBeUndefined()
    answer(h, 1, null)
    await flush()
    expect(h.controller.getState().explain.status).toBe('done')
    expect(h.controller.getState().explain.geologyRecord).toBeNull()
  })

  it('failure of the geology channel only: error with an option to retry without geology', async () => {
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

  it('changing the context discards the geology selection (not shown with another package)', async () => {
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

  it('export with geology: validatable M10 wrapper, deterministic without AI and with the AI selection when present', async () => {
    const h = harness(ready)
    const result = evaluate(h)
    h.controller.exportGeologyJson()
    expect(h.downloads).toHaveLength(1)
    const [name, text] = h.downloads[0]!
    expect(name).toBe(`analogos-recommendation-geology-${evaluationFingerprint(result).slice(0, 8)}.json`)
    const deterministic = JSON.parse(text) as unknown
    expect(validateAnyMissionExport(deterministic, { bundle: v3Bundle })).toEqual({ format: 'mission-geology-export-2', issues: [] })
    expect(JSON.stringify(deterministic)).toContain(deterministicGeologyRefs(buildGeologyCatalog(result, context, contextFp)).ref_ids[0]!)
    // The M8 export without geology remains independent; the new ones are 1.1.0 (English).
    h.controller.exportJson()
    expect(validateAnyMissionExport(JSON.parse(h.downloads[1]![1]) as unknown, { bundle: v3Bundle })).toEqual({ format: 'mission-export-1.1', issues: [] })
    // With the AI selection accepted.
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
