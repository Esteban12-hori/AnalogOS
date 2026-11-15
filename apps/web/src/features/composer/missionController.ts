/**
 * Mission controller (deferred chunk, ADR-013): ONE instance of the team's planner for
 * the whole interface. It uses `plannerReducer`, `buildRequest`, `evaluateMission` unchanged,
 * `composeExplanation`/`deterministicSelection`, `buildMissionExport` and the AI client
 * (`requestDraft`/`requestExplanation`): it is the same logic as `usePlanner`, over an external store
 * so that the dock, "Your mission", the carousel, the globe, the rail and the Reading read the same state
 * in the same render (a `useReducer` inside a component would force copying it with a render
 * delay and controlled fields would lose characters).
 *
 * It is the ONLY writer of `state/mission.ts` and of `ui.missionPhase`. It never calls the AI on its
 * own: only when the user presses "Propose requirements with AI" or "Highlight reasons with AI".
 * Every external dependency arrives through `ControllerDeps` so it can be tested with doubles.
 *
 * Geological channel (the team's M10, ported from `usePlanner`): with the official context validated and the
 * checkbox active, "Highlight reasons with AI" also sends the context fingerprint and the closed catalog
 * of the current evaluation (`buildGeologyCatalog`); the reducer accepts the selection only if it matches
 * that catalog exactly. Without AI, the geological guidance is the deterministic template. None of
 * this changes states, order, exclusions or the M8 export.
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
import { GEOLOGY_ERROR_CODES, requestDraft, requestExplanation } from '../../mission/aiClient'
import { canonicalMessage, displayMissionMessage } from '../../mission/messages'
import type { AiExplanationRecord } from '../../mission/exportReport'
import { buildGeologyCatalog, deterministicGeologyRefs, type GeologyCatalog } from '../../../../../shared/geology/guidance'
import { GeologyExportError, buildMissionGeologyExport } from '../../../../../shared/geology/exportWrapper'
import type { GeologyContext, GeologyContextState } from '../../domain/geologyContext'
import type { GeologyUi, PlannerApi } from '../../components/planner/usePlanner'
import type { StepId } from '../../components/planner/PlannerView'
import { announce, type AnnouncementKind } from '../../shell/public'
import { missionSource, missionStore, type MissionState } from '../../state/mission'
import type { Store } from '../../state/store'
import { uiActions, uiStore, type MissionPhase, type SelectionKind, type UiState } from '../../state/ui'
import { composerStore, GEOLOGY_LOADING_REASON, UNDO_MAX, type ComposerState, type GeologyChannel } from './composerStore'
import { addHistory, entryFrom, entrySignature, loadHistory, saveHistory, type HistoryEntry } from './history'
import { registeredMissionGeology, subscribeMissionGeology } from './runLoader'
import { QUIET_MS, PHASE_THRESHOLDS, waitStage } from './labels'
import { resultAnnouncement } from './model'

// Messages kept in the planner and composer state are canonical English (ADR-017): the interface shows them with
// displayMissionMessage. Announcements are spoken once, so they use the interface language at that moment.
export const CANCELLED_DRAFT = canonicalMessage('msg.cancelledDraft')
export const CANCELLED_EXPLAIN = canonicalMessage('msg.cancelledExplain')

export interface ControllerDeps {
  bundle: EvidenceBundle
  /** Initial geological context (M10); afterwards it arrives through `setGeology`. Absent = loading. */
  geology?: GeologyContextState
  requestDraft: typeof requestDraft
  requestExplanation: typeof requestExplanation
  /** Absolute URL of /api/ai relative to the document (it does not exist in the ZIP: the AI is "not available"). */
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
  /** JSON download (in the browser: Blob + temporary link). */
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
  /** Evaluates the confirmed request (synchronous). false if it was not confirmed or failed. */
  evaluate(): boolean
  runDraft(): void
  /** Explicit `withGeology` (e.g. "Retry without geology"); without it, the geological channel checkbox. */
  runExplain(withGeology?: boolean): void
  cancelDraft(): void
  cancelExplain(): void
  exportJson(): void
  /** "Download JSON with geological guidance" (M10 wrapper over the M8 export, without changing it). */
  exportGeologyJson(): void
  /** Validated geological context (or its absence): the shell registers it as soon as it loads. */
  setGeology(state: GeologyContextState): void
  /** Geological catalog of an evaluation (null without a valid context or without an evaluation). */
  geologyCatalog(evaluation: MissionEvaluation | null): GeologyCatalog | null
  /** Dock "Send": "Define a test" path with the brief loaded; it does not call the AI. */
  submitBrief(text: string): void
  loadExample(): void
  addMetricRequirement(metric: MetricId): void
  /** "Evaluate this sector" (with a site) or "Evaluate a sector…" (without a site: choose in the selector). */
  startSector(siteId?: string): void
  requestStep(step: StepId, target?: 'brief'): void
  restore(entryId: string): void
  undo(): boolean
  clearHistory(): void
  /** View compatible with the team's `PlannerApi`, for `PlannerView`. */
  api(state: PlannerState): PlannerApi
  /** Geological channel with the shape of `GeologyUi` from `usePlanner`. */
  geologyUi(state: PlannerState): GeologyUi
  dispose(): void
}

/** Visible phase derived from the planner state (pure function). */
export function phaseFor(state: PlannerState): MissionPhase {
  if (state.draft.status === 'pending') return 'interpreting'
  if (state.explain.status === 'pending') return 'analysis'
  if (state.result) return 'done'
  if (state.journey !== null || state.brief.trim() !== '' || state.requirements.length > 0) return 'review'
  return 'idle'
}

/** Highlighted reasons: the validated AI selection or, without it, the deterministic template. */
export function explanationFor(evaluation: MissionEvaluation, record: AiExplanationRecord | null): ExplanationView {
  return record
    ? composeExplanation(evaluation, record.selection, 'anthropic')
    : composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')
}

const newRequestId = (): string => `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

/** Availability of the geological channel (same texts as the team's `usePlanner`). */
export function geologyChannel(state: GeologyContextState): GeologyChannel {
  return {
    available: state.status === 'ready',
    unavailableReason: state.status === 'unavailable' ? state.reason : state.status === 'loading' ? GEOLOGY_LOADING_REASON : null,
  }
}

export function createMissionController(deps: ControllerDeps): MissionController {
  let state = initialPlannerState()
  const listeners = new Set<() => void>()
  const controllers = new Map<string, AbortController>()
  const cancelled = new Set<string>()
  let waitTimers: unknown[] = []
  let explanationCache: { evaluation: MissionEvaluation; record: AiExplanationRecord | null; view: ExplanationView } | null = null
  let stepNonce = 0
  // Geological channel: validated context and its fingerprint (of the FULL context, not of the bytes; once per load).
  let geology: GeologyContextState = deps.geology ?? { status: 'loading' }
  let context: GeologyContext | null = geology.status === 'ready' ? geology.context : null
  let contextFp: string | null = context ? fingerprint(context) : null
  let geologyPublished = false
  let catalogCache: { evaluation: MissionEvaluation; fp: string; catalog: GeologyCatalog | null } | null = null

  /** Closed catalog of the evaluation (memoized by evaluation and context). Without an evaluated window it emits no units. */
  function geologyCatalog(evaluation: MissionEvaluation | null): GeologyCatalog | null {
    if (!evaluation || !context || !contextFp) return null
    if (catalogCache && catalogCache.evaluation === evaluation && catalogCache.fp === contextFp) return catalogCache.catalog
    let catalog: GeologyCatalog | null
    try {
      catalog = buildGeologyCatalog(evaluation, context, contextFp)
    } catch {
      catalog = null // a package that does not reconcile leaves the mission without geology, never without a result
    }
    catalogCache = { evaluation, fp: contextFp, catalog }
    return catalog
  }

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

  /** Draft wait: visual stages at 300 ms, 3 s and 10 s (no timeout of its own). */
  function startWait(): void {
    clearWait()
    const at = deps.now()
    deps.composer.setState({ draftStartedAt: at, wait: waitStage(0), notice: null })
    waitTimers = [QUIET_MS, PHASE_THRESHOLDS.counterMs, PHASE_THRESHOLDS.slowMs].map((ms) =>
      deps.setTimer(() => {
        if (deps.composer.getState().draftStartedAt !== at) return
        deps.composer.setState({ wait: waitStage(ms) })
        if (ms === PHASE_THRESHOLDS.slowMs) deps.announce(displayMissionMessage(canonicalMessage('msg.slowAnnouncement')))
      }, ms),
    )
  }

  function endWait(): void {
    clearWait()
    if (deps.composer.getState().draftStartedAt !== null) deps.composer.setState({ draftStartedAt: null, wait: null })
  }

  /** Publishes the state in `state/mission` and the phase in `ui` (results choreography). */
  function publish(previous: PlannerState, action: PlannerAction): void {
    const current = deps.mission.getState()
    const built = buildRequest(state)
    const fresh = state.result !== null && state.result !== previous.result
    let { evaluation, stale, revision, evaluatedRequest, explanation: view, explanationProvenance } = current
    if (action.type === 'reset') {
      evaluation = null
      evaluatedRequest = null
      stale = false
      view = null
      explanationProvenance = null
    } else if (state.result) {
      evaluation = state.result
      stale = false
      view = explanation(state.result, state.explain.record)
      explanationProvenance = state.explain.record?.provenance ?? null
      if (fresh) {
        revision += 1
        evaluatedRequest = built.request
      }
    } else if (evaluation) {
      // The reducer invalidated the result (edit): it remains as a dimmed visual reference.
      stale = true
    }
    deps.mission.setState({ planner: state, request: built.request, evaluation, stale, evaluatedRequest, explanation: view, explanationProvenance, source: missionSource(state), revision, geologyCatalog: geologyCatalog(state.result) })
    deps.ui.setMissionPhase(phaseFor(state))

    // Network: any request that the reducer no longer considers current is aborted (ported from usePlanner).
    const live = new Set([state.draft.requestId, state.explain.requestId].filter((id): id is string => !!id))
    for (const [id, controller] of controllers) {
      if (!live.has(id)) {
        controller.abort()
        controllers.delete(id)
      }
    }
    if (state.draft.status !== 'pending') endWait()

    if (fresh && state.result) {
      // Preview of the recommended #1, unless the user has a manual selection.
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

  /** Restores entries with existing reducer actions (without creating new actions). */
  function applyEntry(entry: HistoryEntry): void {
    dispatch({ type: 'reset' })
    dispatch({ type: 'set_journey', journey: entry.journey, siteId: entry.journey === 'sector' && entry.scope.mode === 'sector' && entry.scope.siteId ? entry.scope.siteId : undefined })
    dispatch({ type: 'set_brief', brief: entry.brief })
    // New, consecutive ids: the reducer's counter keeps going without colliding with what was restored.
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
        deps.composer.setState({ evaluationError: error instanceof MissionInputError ? error.issues.join(' · ') : canonicalMessage('msg.evaluateFailed') })
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

    runExplain(withGeology) {
      const built = buildRequest(state)
      if (!state.result || !built.request || state.explain.status === 'pending') return
      const requestId = newRequestId()
      const abort = new AbortController()
      controllers.set(requestId, abort)
      // Explicit opt-in and only with a valid context; the catalog comes from the current evaluation (as in usePlanner).
      const wantGeology = (withGeology ?? deps.composer.getState().useGeology) && !!context && !!contextFp
      const catalog = wantGeology ? geologyCatalog(state.result) ?? undefined : undefined
      dispatch({ type: 'explain_start', requestId, geologyCatalog: catalog })
      void deps.requestExplanation({
        requestId, request: built.request, requestFp: fingerprint(built.request), url: deps.apiUrl(),
        geologyContextFp: catalog ? contextFp ?? undefined : undefined, signal: abort.signal,
      }).then((result) => {
        controllers.delete(requestId)
        if (cancelled.delete(requestId)) return dispatch({ type: 'explain_fail', requestId, message: CANCELLED_EXPLAIN, unavailable: false })
        if (result.ok) {
          dispatch({ type: 'explain_ok', requestId, requestFp: result.value.requestFp, evaluationFp: result.value.evaluationFp, selection: result.value.selection, provenance: result.value.provenance, geology: result.value.geology })
        } else {
          const geologyFailure = !!result.code && (GEOLOGY_ERROR_CODES as readonly string[]).includes(result.code)
          dispatch({ type: 'explain_fail', requestId, message: result.message, unavailable: result.unavailable, geologyFailure })
        }
      })
    },

    cancelDraft() {
      const id = state.draft.status === 'pending' ? state.draft.requestId : null
      if (!id) return
      cancelled.add(id)
      controllers.get(id)?.abort()
      deps.composer.setState({ notice: CANCELLED_DRAFT })
      deps.announce(displayMissionMessage(CANCELLED_DRAFT))
    },

    cancelExplain() {
      const id = state.explain.status === 'pending' ? state.explain.requestId : null
      if (!id) return
      cancelled.add(id)
      controllers.get(id)?.abort()
      deps.announce(displayMissionMessage(CANCELLED_EXPLAIN))
    },

    exportJson() {
      const built = buildRequest(state)
      if (!state.result || !built.request) return
      try {
        const doc = buildMissionExport(built.request, state.result, deps.bundle, { draft: state.draft.record, explanation: state.explain.record })
        deps.download(`analogos-recommendation-${evaluationFingerprint(state.result).slice(0, 8)}.json`, `${JSON.stringify(doc, null, 2)}\n`)
        deps.composer.setState({ exportError: null })
      } catch (error) {
        deps.composer.setState({ exportError: error instanceof MissionExportError ? error.message : canonicalMessage('msg.exportFailed') })
      }
    },

    exportGeologyJson() {
      const built = buildRequest(state)
      if (!state.result || !built.request || !context || !contextFp) return
      try {
        const m8 = buildMissionExport(built.request, state.result, deps.bundle, { draft: state.draft.record, explanation: state.explain.record })
        const catalog = buildGeologyCatalog(state.result, context, contextFp)
        const record = state.explain.geologyRecord
        const ai = record && state.explain.record && record.catalog_fingerprint === catalog.catalog_fingerprint
        const doc = buildMissionGeologyExport(m8, state.result, context, contextFp, ai && state.explain.record
          ? { mode: 'ai', ref_ids: record.selection.ref_ids, ai: { record, provenance: state.explain.record.provenance } }
          : { mode: 'deterministic', ref_ids: deterministicGeologyRefs(catalog).ref_ids }, { bundle: deps.bundle })
        deps.download(`analogos-recommendation-geology-${evaluationFingerprint(state.result).slice(0, 8)}.json`, `${JSON.stringify(doc, null, 2)}\n`)
        deps.composer.setState({ geologyExportError: null })
      } catch (error) {
        deps.composer.setState({ geologyExportError: error instanceof MissionExportError || error instanceof GeologyExportError ? error.message : canonicalMessage('msg.exportGeologyFailed') })
      }
    },

    setGeology(next) {
      if (next === geology && geologyPublished) return
      const nextContext = next.status === 'ready' ? next.context : null
      const nextFp = nextContext === context ? contextFp : nextContext ? fingerprint(nextContext) : null
      const changed = nextFp !== contextFp
      geology = next
      context = nextContext
      contextFp = nextFp
      catalogCache = null
      geologyPublished = true
      deps.composer.setState({ geology: geologyChannel(next) })
      // The loaded context is no longer that of the selection: the reducer discards it (and the pending one is aborted).
      if (changed) dispatch({ type: 'geology_context_changed' })
      deps.mission.setState({ geologyCatalog: geologyCatalog(state.result) })
      for (const listener of [...listeners]) listener()
    },

    geologyCatalog,

    submitBrief(text) {
      const brief = text.slice(0, 3000)
      if (!brief.trim()) return
      // The dock also describes a test over an already chosen sector. Changing the path
      // here silently widened its geometry to the full catalog.
      if (state.journey === null) dispatch({ type: 'set_journey', journey: 'test' })
      dispatch({ type: 'set_brief', brief })
      // Focus goes to the newly loaded text: it is visible even if "Your mission" is a scrolling strip.
      controller.requestStep('describe', 'brief')
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

    requestStep(step, target) {
      stepNonce += 1
      deps.composer.setState({ stepRequest: target ? { step, nonce: stepNonce, target } : { step, nonce: stepNonce }, openRequest: deps.composer.getState().openRequest + 1 })
    },

    restore(entryId) {
      const entry = deps.composer.getState().history.find((item) => item.id === entryId)
      if (!entry) return
      applyEntry(entry)
      deps.composer.setState({ notice: canonicalMessage('msg.restored') })
      controller.requestStep('confirm')
    },

    undo() {
      const [, previous, ...rest] = deps.composer.getState().undo
      if (!previous) return false
      applyEntry(previous)
      deps.composer.setState({ undo: [previous, ...rest], notice: canonicalMessage('msg.undone') })
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
        geologyUi: controller.geologyUi(current),
        exportJson: controller.exportJson,
        exportError: composer.exportError,
      }
    },

    geologyUi(current) {
      const composer = deps.composer.getState()
      const channel = geologyChannel(geology)
      return {
        available: channel.available,
        unavailableReason: channel.unavailableReason,
        useGeology: composer.useGeology,
        setUseGeology: (value: boolean) => deps.composer.setState({ useGeology: value }),
        catalog: geologyCatalog(current.result),
        onExportGeology: controller.exportGeologyJson,
        exportError: composer.geologyExportError,
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
let unsubscribeGeology: (() => void) | null = null

/**
 * Controller with the real dependencies. The bundle is the validated v3 snapshot WITHOUT transformation:
 * the server recomputes with the same packaging and compares fingerprints (bundleParity).
 */
export function missionController(bundle: EvidenceBundle): MissionController {
  if (singleton) return singleton
  singleton = createMissionController({
    bundle,
    geology: registeredMissionGeology(),
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
  // Outside the render: "Your mission" may create the instance when it mounts and the dock reads this store.
  const created = singleton
  queueMicrotask(() => {
    composerStore.setState({ ready: true, history: loadHistory() })
    // The geological context that the shell registers (now or when loading finishes) reaches the controller.
    unsubscribeGeology = subscribeMissionGeology((state) => created.setGeology(state))
  })
  return singleton
}

/** Tests only: forgets the real instance. */
export function resetMissionControllerForTests(): void {
  unsubscribeGeology?.()
  unsubscribeGeology = null
  singleton?.dispose()
  singleton = null
}
