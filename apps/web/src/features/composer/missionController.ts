/**
 * Controlador de misión (chunk diferido, ADR-013): UNA instancia del planificador del equipo para
 * toda la interfaz. Usa sin cambios `plannerReducer`, `buildRequest`, `evaluateMission`,
 * `composeExplanation`/`deterministicSelection`, `buildMissionExport` y el cliente de IA
 * (`requestDraft`/`requestExplanation`): es la misma lógica de `usePlanner`, sobre un store externo
 * para que el dock, «Tu misión», el carrusel, el globo, el riel y la Lectura lean el mismo estado
 * en el mismo render (un `useReducer` dentro de un componente obligaría a copiarlo con un render
 * de retraso y los campos controlados perderían caracteres).
 *
 * Es el ÚNICO escritor de `state/mission.ts` y de `ui.missionPhase`. Nunca llama a la IA por su
 * cuenta: solo cuando el usuario pulsa «Proponer requisitos con IA» o «Destacar motivos con IA».
 * Toda dependencia externa llega por `ControllerDeps` para probarse con dobles.
 */
import {
  MissionExportError,
  MissionInputError,
  buildMissionExport,
  buildRequest,
  composeExplanation,
  defaultMetricRequirement,
  deterministicSelection,
  evaluateMission,
  evaluationFingerprint,
  exampleState,
  fingerprint,
  initialPlannerState,
  plannerReducer,
  type EvidenceBundle,
  type ExplanationView,
  type MetricId,
  type MissionEvaluation,
  type PlannerAction,
  type PlannerState,
} from '../../mission'
import { requestDraft, requestExplanation } from '../../mission/aiClient'
import type { AiExplanationRecord } from '../../mission/exportReport'
import type { PlannerApi } from '../../components/planner/usePlanner'
import type { StepId } from '../../components/planner/PlannerView'
import { announce, type AnnouncementKind } from '../../shell/public'
import { missionSource, missionStore, type MissionState } from '../../state/mission'
import type { Store } from '../../state/store'
import { uiActions, uiStore, type MissionPhase, type SelectionKind, type UiState } from '../../state/ui'
import { composerStore, UNDO_MAX, type ComposerState } from './composerStore'
import { addHistory, entryFrom, entrySignature, loadHistory, saveHistory, type HistoryEntry } from './history'
import { QUIET_MS, PHASE_THRESHOLDS, waitStage } from './labels'
import { resultAnnouncement } from './model'

export const CANCELLED_DRAFT = 'Solicitud cancelada: los requisitos no cambiaron y el recorrido manual sigue disponible.'
export const CANCELLED_EXPLAIN = 'Solicitud cancelada: se mantiene la plantilla determinista.'

export interface ControllerDeps {
  bundle: EvidenceBundle
  requestDraft: typeof requestDraft
  requestExplanation: typeof requestExplanation
  /** URL absoluta de /api/ai relativa al documento (en el ZIP no existe: la IA queda «no disponible»). */
  apiUrl: () => string
  mission: Store<MissionState>
  composer: Store<ComposerState>
  ui: {
    getState: () => Pick<UiState, 'selection'>
    setMissionPhase(phase: MissionPhase): void
    select(siteId: string, kind?: SelectionKind, preview?: boolean): void
    resetCameraTouch(): void
  }
  announce(text: string, kind?: AnnouncementKind): void
  persistHistory(list: readonly HistoryEntry[]): void
  /** Descarga del JSON (en el navegador: Blob + enlace temporal). */
  download(fileName: string, text: string): void
  now(): number
  setTimer(callback: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
}

export interface MissionController {
  readonly bundle: EvidenceBundle
  getState(): PlannerState
  subscribe(listener: () => void): () => void
  dispatch(action: PlannerAction): void
  /** Evalúa la solicitud confirmada (síncrono). false si no estaba confirmada o falló. */
  evaluate(): boolean
  runDraft(): void
  runExplain(): void
  cancelDraft(): void
  cancelExplain(): void
  exportJson(): void
  /** «Enviar» del dock: recorrido «Definir una prueba» con el brief cargado; no llama a la IA. */
  submitBrief(text: string): void
  loadExample(): void
  addMetricRequirement(metric: MetricId): void
  /** «Evaluar este sector» (con sitio) o «Evaluar un sector…» (sin sitio: elegir en el selector). */
  startSector(siteId?: string): void
  requestStep(step: StepId): void
  restore(entryId: string): void
  undo(): boolean
  clearHistory(): void
  /** Vista compatible con `PlannerApi` del equipo, para `PlannerView`. */
  api(state: PlannerState): PlannerApi
  dispose(): void
}

/** Fase visible a partir del estado del planificador (función pura). */
export function phaseFor(state: PlannerState): MissionPhase {
  if (state.draft.status === 'pending') return 'interpreting'
  if (state.explain.status === 'pending') return 'analysis'
  if (state.result) return 'done'
  if (state.journey !== null || state.brief.trim() !== '' || state.requirements.length > 0) return 'review'
  return 'idle'
}

/** Motivos destacados: la selección validada de la IA o, sin ella, la plantilla determinista. */
export function explanationFor(evaluation: MissionEvaluation, record: AiExplanationRecord | null): ExplanationView {
  return record
    ? composeExplanation(evaluation, record.selection, 'anthropic')
    : composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')
}

const newRequestId = (): string => `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

export function createMissionController(deps: ControllerDeps): MissionController {
  let state = initialPlannerState()
  const listeners = new Set<() => void>()
  const controllers = new Map<string, AbortController>()
  const cancelled = new Set<string>()
  let waitTimers: unknown[] = []
  let explanationCache: { evaluation: MissionEvaluation; record: AiExplanationRecord | null; view: ExplanationView } | null = null
  let stepNonce = 0

  function explanation(evaluation: MissionEvaluation, record: AiExplanationRecord | null): ExplanationView {
    if (explanationCache && explanationCache.evaluation === evaluation && explanationCache.record === record) return explanationCache.view
    const view = explanationFor(evaluation, record)
    explanationCache = { evaluation, record, view }
    return view
  }

  function clearWait(): void {
    for (const timer of waitTimers) deps.clearTimer(timer)
    waitTimers = []
  }

  /** Espera del borrador: tramos visuales a 300 ms, 3 s y 10 s (sin tiempo límite propio). */
  function startWait(): void {
    clearWait()
    const at = deps.now()
    deps.composer.setState({ draftStartedAt: at, wait: waitStage(0), notice: null })
    waitTimers = [QUIET_MS, PHASE_THRESHOLDS.counterMs, PHASE_THRESHOLDS.slowMs].map((ms) =>
      deps.setTimer(() => {
        if (deps.composer.getState().draftStartedAt !== at) return
        deps.composer.setState({ wait: waitStage(ms) })
        if (ms === PHASE_THRESHOLDS.slowMs) deps.announce('La IA está tardando más de lo normal. Puede cancelar y seguir manualmente.')
      }, ms),
    )
  }

  function endWait(): void {
    clearWait()
    if (deps.composer.getState().draftStartedAt !== null) deps.composer.setState({ draftStartedAt: null, wait: null })
  }

  /** Publica el estado en `state/mission` y la fase en `ui` (coreografía de resultados). */
  function publish(previous: PlannerState, action: PlannerAction): void {
    const current = deps.mission.getState()
    const built = buildRequest(state)
    const fresh = state.result !== null && state.result !== previous.result
    let { evaluation, stale, revision, evaluatedRequest, explanation: view } = current
    if (action.type === 'reset') {
      evaluation = null
      evaluatedRequest = null
      stale = false
      view = null
    } else if (state.result) {
      evaluation = state.result
      stale = false
      view = explanation(state.result, state.explain.record)
      if (fresh) {
        revision += 1
        evaluatedRequest = built.request
      }
    } else if (evaluation) {
      // El reductor invalidó el resultado (edición): queda como referencia visual atenuada.
      stale = true
    }
    deps.mission.setState({ planner: state, request: built.request, evaluation, stale, evaluatedRequest, explanation: view, source: missionSource(state), revision })
    deps.ui.setMissionPhase(phaseFor(state))

    // Red: se aborta toda petición que el reductor ya no considera vigente (portado de usePlanner).
    const live = new Set([state.draft.requestId, state.explain.requestId].filter((id): id is string => !!id))
    for (const [id, controller] of controllers) {
      if (!live.has(id)) {
        controller.abort()
        controllers.delete(id)
      }
    }
    if (state.draft.status !== 'pending') endWait()

    if (fresh && state.result) {
      // Vista previa del #1 recomendado, salvo que el usuario tenga una selección manual.
      const first = state.result.recommended_site_ids[0]
      const selection = deps.ui.getState().selection
      if (first && (selection === null || selection.preview)) deps.ui.select(first, 'evaluated', true)
      deps.announce(resultAnnouncement(state.result, deps.bundle.candidates))
    }
  }

  function dispatch(action: PlannerAction): void {
    const previous = state
    state = plannerReducer(state, action)
    if (state === previous && action.type !== 'reset') return
    publish(previous, action)
    for (const listener of [...listeners]) listener()
  }

  function rememberEvaluated(): void {
    const entry = entryFrom(state, deps.now())
    const composer = deps.composer.getState()
    const history = addHistory(composer.history, entry)
    deps.persistHistory(history)
    const last = composer.undo[0]
    const undo = last && entrySignature(last) === entrySignature(entry) ? composer.undo : [entry, ...composer.undo].slice(0, UNDO_MAX)
    deps.composer.setState({ history, undo })
  }

  /** Restaura entradas con acciones existentes del reductor (sin crear acciones nuevas). */
  function applyEntry(entry: HistoryEntry): void {
    dispatch({ type: 'reset' })
    dispatch({ type: 'set_journey', journey: entry.journey, siteId: entry.journey === 'sector' && entry.scope.mode === 'sector' && entry.scope.siteId ? entry.scope.siteId : undefined })
    dispatch({ type: 'set_brief', brief: entry.brief })
    // Ids nuevos y consecutivos: el contador del reductor sigue sin chocar con lo restaurado.
    entry.requirements.forEach((requirement, index) => dispatch({ type: 'add_requirement', requirement: { ...requirement, requirement_id: `u${index + 1}` } }))
    dispatch({ type: 'set_scope', scope: entry.scope })
  }

  const controller: MissionController = {
    bundle: deps.bundle,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispatch,

    evaluate() {
      const built = buildRequest(state)
      if (!state.confirmed || !built.request) return false
      deps.ui.setMissionPhase('scoring')
      deps.ui.resetCameraTouch()
      try {
        const evaluation = evaluateMission(built.request, deps.bundle)
        deps.composer.setState({ evaluationError: null })
        dispatch({ type: 'evaluated', evaluation })
        if (state.result === evaluation) rememberEvaluated()
        return state.result === evaluation
      } catch (error) {
        deps.composer.setState({ evaluationError: error instanceof MissionInputError ? error.issues.join(' · ') : 'No se pudo evaluar la solicitud.' })
        deps.ui.setMissionPhase(phaseFor(state))
        return false
      }
    },

    runDraft() {
      if (!state.brief.trim() || state.draft.status === 'pending') return
      const requestId = newRequestId()
      const abort = new AbortController()
      controllers.set(requestId, abort)
      dispatch({ type: 'draft_start', requestId })
      startWait()
      void deps.requestDraft({ requestId, brief: state.brief, url: deps.apiUrl(), signal: abort.signal }).then((result) => {
        controllers.delete(requestId)
        if (cancelled.delete(requestId)) return dispatch({ type: 'draft_fail', requestId, message: CANCELLED_DRAFT, unavailable: false })
        if (result.ok) dispatch({ type: 'draft_ok', requestId, proposal: result.value.proposal, provenance: result.value.provenance })
        else dispatch({ type: 'draft_fail', requestId, message: result.message, unavailable: result.unavailable })
      })
    },

    runExplain() {
      const built = buildRequest(state)
      if (!state.result || !built.request || state.explain.status === 'pending') return
      const requestId = newRequestId()
      const abort = new AbortController()
      controllers.set(requestId, abort)
      dispatch({ type: 'explain_start', requestId })
      void deps.requestExplanation({ requestId, request: built.request, requestFp: fingerprint(built.request), url: deps.apiUrl(), signal: abort.signal }).then((result) => {
        controllers.delete(requestId)
        if (cancelled.delete(requestId)) return dispatch({ type: 'explain_fail', requestId, message: CANCELLED_EXPLAIN, unavailable: false })
        if (result.ok) {
          dispatch({ type: 'explain_ok', requestId, requestFp: result.value.requestFp, evaluationFp: result.value.evaluationFp, selection: result.value.selection, provenance: result.value.provenance })
        } else {
          dispatch({ type: 'explain_fail', requestId, message: result.message, unavailable: result.unavailable })
        }
      })
    },

    cancelDraft() {
      const id = state.draft.status === 'pending' ? state.draft.requestId : null
      if (!id) return
      cancelled.add(id)
      controllers.get(id)?.abort()
      deps.composer.setState({ notice: CANCELLED_DRAFT })
      deps.announce(CANCELLED_DRAFT)
    },

    cancelExplain() {
      const id = state.explain.status === 'pending' ? state.explain.requestId : null
      if (!id) return
      cancelled.add(id)
      controllers.get(id)?.abort()
      deps.announce(CANCELLED_EXPLAIN)
    },

    exportJson() {
      const built = buildRequest(state)
      if (!state.result || !built.request) return
      try {
        const doc = buildMissionExport(built.request, state.result, deps.bundle, { draft: state.draft.record, explanation: state.explain.record })
        deps.download(`analogos-recomendacion-${evaluationFingerprint(state.result).slice(0, 8)}.json`, `${JSON.stringify(doc, null, 2)}\n`)
        deps.composer.setState({ exportError: null })
      } catch (error) {
        deps.composer.setState({ exportError: error instanceof MissionExportError ? error.message : 'No se pudo generar la exportación.' })
      }
    },

    submitBrief(text) {
      const brief = text.slice(0, 3000)
      if (!brief.trim()) return
      if (state.journey !== 'test') dispatch({ type: 'set_journey', journey: 'test' })
      dispatch({ type: 'set_brief', brief })
      controller.requestStep('describe')
    },

    loadExample() {
      if (state.journey === null) dispatch({ type: 'set_journey', journey: 'test' })
      dispatch({ type: 'load_example', example: exampleState() })
      controller.requestStep('describe')
    },

    addMetricRequirement(metric) {
      if (state.journey === null) dispatch({ type: 'set_journey', journey: 'test' })
      dispatch({ type: 'add_requirement', requirement: defaultMetricRequirement(metric, `u${state.counter + 1}`) })
      controller.requestStep('describe')
    },

    startSector(siteId) {
      dispatch({ type: 'set_journey', journey: 'sector', siteId })
      controller.requestStep(siteId ? 'describe' : 'scope')
    },

    requestStep(step) {
      stepNonce += 1
      deps.composer.setState({ stepRequest: { step, nonce: stepNonce }, openRequest: deps.composer.getState().openRequest + 1 })
    },

    restore(entryId) {
      const entry = deps.composer.getState().history.find((item) => item.id === entryId)
      if (!entry) return
      applyEntry(entry)
      deps.composer.setState({ notice: 'Prueba restaurada: revise y confirme para volver a evaluar.' })
      controller.requestStep('confirm')
    },

    undo() {
      const [, previous, ...rest] = deps.composer.getState().undo
      if (!previous) return false
      applyEntry(previous)
      deps.composer.setState({ undo: [previous, ...rest], notice: 'Deshecho: se restauró la prueba anterior; confirme para volver a evaluar.' })
      controller.requestStep('confirm')
      return true
    },

    clearHistory() {
      deps.composer.setState({ history: [] })
      deps.persistHistory([])
    },

    api(current) {
      const composer = deps.composer.getState()
      return {
        state: current,
        dispatch,
        built: buildRequest(current),
        evaluate: controller.evaluate,
        evaluationError: composer.evaluationError,
        runDraft: controller.runDraft,
        runExplain: controller.runExplain,
        exportJson: controller.exportJson,
        exportError: composer.exportError,
      }
    },

    dispose() {
      clearWait()
      controllers.forEach((abort) => abort.abort())
      controllers.clear()
    },
  }
  return controller
}

// ---------------------------------------------------------------------------------------------
// Instancia real (navegador)
// ---------------------------------------------------------------------------------------------

function browserDownload(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

let singleton: MissionController | null = null

/**
 * Controlador con las dependencias reales. El bundle es el snapshot v3 validado SIN transformar:
 * el servidor recalcula con el mismo empaquetado y compara huellas (bundleParity).
 */
export function missionController(bundle: EvidenceBundle): MissionController {
  if (singleton) return singleton
  singleton = createMissionController({
    bundle,
    requestDraft,
    requestExplanation,
    apiUrl: () => new URL(`${import.meta.env.BASE_URL}api/ai`, document.baseURI).toString(),
    mission: missionStore,
    composer: composerStore,
    ui: { getState: () => uiStore.getState(), ...uiActions },
    announce,
    persistHistory: (list) => saveHistory(list),
    download: browserDownload,
    now: () => Date.now(),
    setTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearTimer: (handle) => window.clearTimeout(handle as number),
  })
  composerStore.setState({ ready: true, history: loadHistory() })
  return singleton
}

/** Solo tests: olvida la instancia real. */
export function resetMissionControllerForTests(): void {
  singleton?.dispose()
  singleton = null
}
