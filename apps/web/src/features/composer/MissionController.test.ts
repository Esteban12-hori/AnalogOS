// Controlador de misión (ADR-013) con dobles: UNA instancia del planificador del equipo para dock,
// «Tu misión», carrusel, riel y Lectura. Sin llamadas automáticas a la IA; nunca confirma solo; una
// edición invalida el escenario y aborta en red; historial v2 sin procedencia de la IA.
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

describe('controlador de misión', () => {
  it('«Enviar» abre el recorrido «Definir una prueba» con el brief y NO llama a la IA', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.submitBrief('Probar navegación autónoma en terreno llano')
    expect(h.deps.requestDraft).not.toHaveBeenCalled()
    expect(controller.getState()).toMatchObject({ journey: 'test', brief: 'Probar navegación autónoma en terreno llano', confirmed: false })
    expect(h.mission.getState().planner).toBe(controller.getState())
    expect(h.phases.at(-1)).toBe('review')
    expect(h.composer.getState().stepRequest?.step).toBe('describe')
    // El foco va al texto cargado (PlannerView), aunque el paso «describir» ya estuviera abierto.
    expect(h.composer.getState().stepRequest?.target).toBe('brief')
    expect(h.composer.getState().openRequest).toBe(1)
    controller.submitBrief('Otra vez')
    expect(h.composer.getState().stepRequest?.nonce).toBe(2)
  })

  it('un solo planificador: evaluar publica la evaluación, sube la revisión, anuncia una vez y previsualiza el #1', () => {
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
    expect(h.announcements[0]).toMatch(/^Evaluación lista\. \d de 6 candidatos priorizados /)
    expect(h.selections).toEqual([[state.evaluation!.recommended_site_ids[0], 'evaluated', true]])
    expect(h.phases.at(-1)).toBe('done')
    // Ninguna llamada a la IA en todo el recorrido manual.
    expect(h.deps.requestDraft).not.toHaveBeenCalled()
    expect(h.deps.requestExplanation).not.toHaveBeenCalled()
  })

  it('sin confirmar no se evalúa; nunca se confirma solo después de la IA', async () => {
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

  it('«Cancelar» aborta en red y el rótulo dice «cancelada», no «no disponible»', async () => {
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

  it('editar tras evaluar invalida (stale) y aborta la petición de IA en curso', () => {
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
    expect(state.evaluation).not.toBeNull() // referencia visual atenuada hasta reevaluar
    expect(h.phases.at(-1)).toBe('review')
    // Borrar todo descarta también la referencia visual.
    controller.dispatch({ type: 'reset' })
    expect(h.mission.getState()).toMatchObject({ evaluation: null, stale: false, explanation: null })
  })

  it('exportar: JSON del equipo con la IA en null cuando no se usó', () => {
    const h = harness()
    const controller = evaluated(h)
    controller.exportJson()
    expect(h.downloads).toHaveLength(1)
    const [name, content] = h.downloads[0]!
    expect(name).toMatch(/^analogos-recomendacion-[0-9a-f]{8}\.json$/)
    const doc = JSON.parse(content) as { ai: { draft: unknown; explanation: unknown } }
    expect(doc.ai).toEqual({ draft: null, explanation: null })
  })

  it('historial v2: guarda brief, alcance y requisitos del usuario; nunca propuestas intactas de la IA', async () => {
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
    // Restaurar usa acciones existentes del reductor y deja la prueba sin confirmar.
    controller.restore(entry!.id)
    expect(controller.getState()).toMatchObject({ brief: 'Rover', confirmed: false, result: null })
    expect(controller.getState().requirements.map((requirement) => requirement.requirement_id)).toEqual(['u1'])
    expect(h.composer.getState().stepRequest?.step).toBe('confirm')
  })

  it('Deshacer vuelve a la prueba evaluada anterior (sin confirmar)', () => {
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

  it('«Evaluar este sector» fija el alcance en esa ventana y abre los requisitos', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    controller.startSector('ar-win-s2580-w06710')
    expect(controller.getState()).toMatchObject({ journey: 'sector', scope: { mode: 'sector', siteId: 'ar-win-s2580-w06710' } })
    expect(h.composer.getState().stepRequest?.step).toBe('describe')
  })
})

describe('fases y espera', () => {
  it('phaseFor: borrador → interpreting; explicación → analysis; resultado → done; edición → review', () => {
    const h = harness()
    const controller = createMissionController(h.deps)
    expect(phaseFor(controller.getState())).toBe('idle')
    controller.submitBrief('x')
    expect(phaseFor(controller.getState())).toBe('review')
  })

  it('umbrales visuales sin tiempo límite propio: 300 ms, 3 s y 10 s', () => {
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
  it('valida en el límite e ignora la clave v1 de niveles', () => {
    expect(HISTORY_KEY).toBe('analogos.composer.history.v2')
    expect(parseHistory([{ id: 'a', at: 1, text: 'x', source: 'demo', label: 'y', levels: {}, presetId: null }])).toEqual([])
    expect(parseHistory('nada')).toEqual([])
    const storage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => undefined, removeItem: () => undefined }
    expect(loadHistory(storage)).toEqual([])
  })

  it('descarta requisitos de la IA y valores mal formados', () => {
    const entry = { id: 'a', at: 1, journey: 'test', brief: 'x', label: '1 requisito', scope: emptyScope(), requirements: [{ kind: 'unmeasured', requirement_id: 'u1', label: 'Tracción', importance: 'preference', origin: 'ai', source_quote: null, topic_id: 'traction', detail: '' }] }
    expect(parseHistory([entry])).toEqual([])
    const user = { ...entry, requirements: [{ ...entry.requirements[0], origin: 'user' }] }
    expect(parseHistory([user])).toHaveLength(1)
  })
})
