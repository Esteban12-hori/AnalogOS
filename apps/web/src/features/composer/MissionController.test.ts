// Mission controller (ADR-013) with test doubles: ONE instance of the team planner for the dock,
// "Your mission", carousel, rail, and Reading. No automatic calls to the AI; it never confirms on its own; an
// edit invalidates the scenario and aborts the in-flight network request; history v2 has no AI provenance.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyScope, type AiProvenance, type DraftProposal } from '../../mission'
import type { AiClientResult } from '../../mission/aiClient'
import { createStore } from '../../state/store'
import { INITIAL_MISSION_STATE, type MissionState } from '../../state/mission'
import type { MissionPhase, SelectionKind, UiState } from '../../state/ui'
import { v3Bundle } from '../../tests/v3Support'
import { initialComposerState, type ComposerState } from './composerStore'
import { HISTORY_KEY, loadHistory, parseHistory } from './history'
import { PHASE_THRESHOLDS, QUIET_MS, waitStage } from './labels'
import { CANCELLED_DRAFT, createMissionController, phaseFor, type ControllerDeps } from './missionController'

const provenance: AiProvenance = { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_t', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
const proposal: DraftProposal = {
  activity: 'Ensayo de navegación',
  target_kind: 'rover_mars',
  requirements: [
    { requirement_id: 'p1', label: 'Mediana de pendiente regional', importance: 'critical', origin: 'ai', confirmed: false, source_quote: 'pendiente', kind: 'measurable', metric_id: 'median_slope_degree', operator: '<=', value: 3, unit: 'degree', scale: 'window' },
  ],
  open_questions: [],
  warnings: [],
} as unknown as DraftProposal

interface Harness {
  deps: ControllerDeps
  mission: ReturnType<typeof createStore<MissionState>>
  composer: ReturnType<typeof createStore<ComposerState>>
  phases: MissionPhase[]
  selections: Array<[string, SelectionKind | undefined, boolean | undefined]>
  announcements: string[]
  downloads: Array<[string, string]>
  signals: AbortSignal[]
  persisted: unknown[]
  resolveDraft: (value: AiClientResult<{ proposal: DraftProposal; provenance: AiProvenance }>) => void
}

function harness(): Harness {
  const mission = createStore<MissionState>(INITIAL_MISSION_STATE)
  const composer = createStore<ComposerState>(initialComposerState())
  const ui: Pick<UiState, 'selection'> = { selection: null }
  const h = { mission, composer, phases: [], selections: [], announcements: [], downloads: [], signals: [], persisted: [] } as unknown as Harness
  h.deps = {
    bundle: v3Bundle,
    requestDraft: vi.fn((args: { signal?: AbortSignal }) => {
      if (args.signal) h.signals.push(args.signal)
      return new Promise((resolve) => {
        h.resolveDraft = resolve
        args.signal?.addEventListener('abort', () => resolve({ ok: false, unavailable: true, message: 'Solicitud cancelada.' }))
      })
    }) as unknown as ControllerDeps['requestDraft'],
    requestExplanation: vi.fn(() => new Promise(() => undefined)) as unknown as ControllerDeps['requestExplanation'],
    apiUrl: () => 'http://127.0.0.1/api/ai',
    mission,
    composer,
    ui: {
      getState: () => ui,
      setMissionPhase: (phase) => h.phases.push(phase),
      select: (siteId, kind, preview) => h.selections.push([siteId, kind, preview]),
      resetCameraTouch: () => undefined,
    },
    announce: (message) => h.announcements.push(message),
    persistHistory: (list) => h.persisted.push(list),
    download: (name, content) => h.downloads.push([name, content]),
    now: () => 1_700_000_000_000,
    setTimer: () => 0,
    clearTimer: () => undefined,
  }
  return h
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function evaluated(h: Harness) {
  const controller = createMissionController(h.deps)
  controller.loadExample()
  controller.dispatch({ type: 'confirm' })
  expect(controller.evaluate()).toBe(true)
  return controller
}

afterEach(() => vi.restoreAllMocks())

describe('mission controller', () => {
  it('“Send” opens the “Define a test” path with the brief and does NOT call the AI', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.submitBrief('Probar navegación autónoma en terreno llano')
    expect(h.deps.requestDraft).not.toHaveBeenCalled()
    expect(controller.getState()).toMatchObject({ journey: 'test', brief: 'Probar navegación autónoma en terreno llano', confirmed: false })
    expect(h.mission.getState().planner).toBe(controller.getState())
    expect(h.phases.at(-1)).toBe('review')
    expect(h.composer.getState().stepRequest?.step).toBe('describe')
    // Focus goes to the loaded text (PlannerView), even if the "describe" step was already open.
    expect(h.composer.getState().stepRequest?.target).toBe('brief')
    expect(h.composer.getState().openRequest).toBe(1)
    controller.submitBrief('Otra vez')
    expect(h.composer.getState().stepRequest?.nonce).toBe(2)
  })

  it('a single planner: evaluating publishes the evaluation, bumps the revision, announces once and previews #1', () => {
    const h = harness()
    const controller = evaluated(h)
    const state = h.mission.getState()
    expect(state.evaluation).toBe(controller.getState().result)
    expect(state.revision).toBe(1)
    expect(state.stale).toBe(false)
    expect(state.explanation?.source).toBe('deterministic_template')
    expect(state.source).toBe('example')
    expect(state.evaluatedRequest?.requirements.map((requirement) => requirement.requirement_id)).toEqual(['ex1', 'ex2', 'ex3'])
    expect(h.announcements).toHaveLength(1)
    expect(h.announcements[0]).toMatch(/^Evaluation ready\. \d of 6 candidates prioritized /)
    expect(h.selections).toEqual([[state.evaluation!.recommended_site_ids[0], 'evaluated', true]])
    expect(h.phases.at(-1)).toBe('done')
    // No AI calls during the entire manual flow.
    expect(h.deps.requestDraft).not.toHaveBeenCalled()
    expect(h.deps.requestExplanation).not.toHaveBeenCalled()
  })

  it('without confirming nothing is evaluated; never auto-confirmed after the AI', async () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.submitBrief('Rover en terreno llano')
    expect(controller.evaluate()).toBe(false)
    controller.runDraft()
    expect(h.phases.at(-1)).toBe('interpreting')
    expect(h.composer.getState().draftStartedAt).not.toBeNull()
    h.resolveDraft({ ok: true, value: { proposal, provenance } })
    await flush()
    const state = controller.getState()
    expect(state.draft.status).toBe('done')
    expect(state.confirmed).toBe(false)
    expect(state.result).toBeNull()
    expect(state.requirements.map((requirement) => requirement.origin)).toEqual(['ai'])
    expect(h.mission.getState().source).toBe('anthropic')
    expect(h.composer.getState().draftStartedAt).toBeNull()
  })

  it('“Cancel” aborts the network call and the label says “canceled”, not “unavailable”', async () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.submitBrief('Rover')
    controller.runDraft()
    controller.cancelDraft()
    expect(h.signals[0]?.aborted).toBe(true)
    await flush()
    expect(controller.getState().draft).toMatchObject({ status: 'error', message: CANCELLED_DRAFT })
    expect(h.announcements).toContain(CANCELLED_DRAFT)
  })

  it('editing after evaluating invalidates (stale) and aborts the AI request in flight', () => {
    const h = harness()
    const controller = evaluated(h)
    controller.runExplain()
    expect(h.phases.at(-1)).toBe('analysis')
    const explainCall = (h.deps.requestExplanation as unknown as { mock: { calls: Array<[{ signal: AbortSignal }]> } }).mock.calls[0]![0]
    controller.dispatch({ type: 'set_scope', scope: { ...emptyScope('ar-win-s2580-w06710'), mode: 'sector' } })
    expect(explainCall.signal.aborted).toBe(true)
    const state = h.mission.getState()
    expect(controller.getState().result).toBeNull()
    expect(state.stale).toBe(true)
    expect(state.evaluation).not.toBeNull() // dimmed visual reference until re-evaluation
    expect(h.phases.at(-1)).toBe('review')
    // Clearing everything also discards the visual reference.
    controller.dispatch({ type: 'reset' })
    expect(h.mission.getState()).toMatchObject({ evaluation: null, stale: false, explanation: null })
  })

  it('export: team JSON with AI as null when it was not used', () => {
    const h = harness()
    const controller = evaluated(h)
    controller.exportJson()
    expect(h.downloads).toHaveLength(1)
    const [name, content] = h.downloads[0]!
    expect(name).toMatch(/^analogos-recommendation-[0-9a-f]{8}\.json$/)
    const doc = JSON.parse(content) as { ai: { draft: unknown; explanation: unknown } }
    expect(doc.ai).toEqual({ draft: null, explanation: null })
  })

  it('history v2: stores brief, scope and user requirements; never untouched AI proposals', async () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.submitBrief('Rover')
    controller.runDraft()
    h.resolveDraft({ ok: true, value: { proposal, provenance } })
    await flush()
    controller.addMetricRequirement('country')
    controller.dispatch({ type: 'update_requirement', id: controller.getState().requirements.at(-1)!.requirement_id, patch: { countries: ['AR'] } })
    controller.dispatch({ type: 'confirm' })
    expect(controller.evaluate()).toBe(true)
    const [entry] = h.composer.getState().history
    expect(entry?.brief).toBe('Rover')
    expect(entry?.requirements.map((requirement) => [requirement.origin, requirement.kind === 'measurable' ? requirement.metric_id : null])).toEqual([['user', 'country']])
    expect(JSON.stringify(h.persisted.at(-1))).not.toMatch(/claude|anthropic|req_t/)
    // Restore uses existing reducer actions and leaves the test unconfirmed.
    controller.restore(entry!.id)
    expect(controller.getState()).toMatchObject({ brief: 'Rover', confirmed: false, result: null })
    expect(controller.getState().requirements.map((requirement) => requirement.requirement_id)).toEqual(['u1'])
    expect(h.composer.getState().stepRequest?.step).toBe('confirm')
  })

  it('Undo returns to the previously evaluated test (unconfirmed)', () => {
    const h = harness()
    const controller = evaluated(h)
    controller.addMetricRequirement('polygon_area_km2')
    controller.dispatch({ type: 'update_requirement', id: controller.getState().requirements.at(-1)!.requirement_id, patch: { valueText: ['500', ''] } })
    controller.dispatch({ type: 'confirm' })
    expect(controller.evaluate()).toBe(true)
    expect(h.composer.getState().undo).toHaveLength(2)
    expect(controller.undo()).toBe(true)
    expect(controller.getState().requirements).toHaveLength(3)
    expect(controller.getState().confirmed).toBe(false)
  })

  it('“Evaluate this sector” sets the scope to that window and opens the requirements', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.startSector('ar-win-s2580-w06710')
    expect(controller.getState()).toMatchObject({ journey: 'sector', scope: { mode: 'sector', siteId: 'ar-win-s2580-w06710' } })
    expect(h.composer.getState().stepRequest?.step).toBe('describe')
  })

  it('sending the brief after choosing AR6 keeps its geometry until evaluation', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.startSector('ar-win-s2580-w06710')
    controller.addMetricRequirement('median_slope_degree')
    controller.dispatch({ type: 'update_requirement', id: controller.getState().requirements[0].requirement_id, patch: { valueText: ['9', ''] } })
    controller.submitBrief('Reconocimiento regional para movilidad de rover en el sector elegido.')
    expect(controller.getState()).toMatchObject({ journey: 'sector', confirmed: false, scope: { mode: 'sector', siteId: 'ar-win-s2580-w06710' } })
    controller.dispatch({ type: 'confirm' })
    expect(controller.evaluate()).toBe(true)
    expect(controller.getState().result?.options.map((option) => option.site_id)).toEqual(['ar-win-s2580-w06710'])
    expect(h.deps.requestDraft).not.toHaveBeenCalled()
    expect(h.deps.requestExplanation).not.toHaveBeenCalled()
  })
})

describe('phases and waiting', () => {
  it('phaseFor: draft → interpreting; explanation → analysis; result → done; edit → review', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    expect(phaseFor(controller.getState())).toBe('idle')
    controller.submitBrief('x')
    expect(phaseFor(controller.getState())).toBe('review')
  })

  it('visual thresholds without a time limit of their own: 300 ms, 3 s and 10 s', () => {
    expect(PHASE_THRESHOLDS).toEqual({ counterMs: 3000, slowMs: 10_000 })
    expect(PHASE_THRESHOLDS).not.toHaveProperty('timeoutMs')
    expect(waitStage(QUIET_MS - 1)).toBe('quiet')
    expect(waitStage(QUIET_MS)).toBe('busy')
    expect(waitStage(2999)).toBe('busy')
    expect(waitStage(3000)).toBe('counter')
    expect(waitStage(10_000)).toBe('slow')
    expect(waitStage(60_000)).toBe('slow')
  })
})

describe('historial (formato v2)', () => {
  it('validates at the limit and ignores the v1 levels key', () => {
    expect(HISTORY_KEY).toBe('analogos.composer.history.v2')
    expect(parseHistory([{ id: 'a', at: 1, text: 'x', source: 'demo', label: 'y', levels: {}, presetId: null }])).toEqual([])
    expect(parseHistory('nada')).toEqual([])
    const storage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => undefined, removeItem: () => undefined }
    expect(loadHistory(storage)).toEqual([])
  })

  it('discards AI requirements and malformed values', () => {
    const entry = { id: 'a', at: 1, journey: 'test', brief: 'x', label: '1 requisito', scope: emptyScope(), requirements: [{ kind: 'unmeasured', requirement_id: 'u1', label: 'Tracción', importance: 'preference', origin: 'ai', source_quote: null, topic_id: 'traction', detail: '' }] }
    expect(parseHistory([entry])).toEqual([])
    const user = { ...entry, requirements: [{ ...entry.requirements[0], origin: 'user' }] }
    expect(parseHistory([user])).toHaveLength(1)
  })
})
