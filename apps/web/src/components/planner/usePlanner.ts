import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  MissionExportError, MissionInputError, buildMissionExport, buildRequest, evaluateMission, evaluationFingerprint, fingerprint,
  initialPlannerState, plannerReducer, type EvidenceBundle, type PlannerAction, type PlannerState,
} from '../../mission'
import { buildGeologyCatalog, deterministicGeologyRefs, type GeologyCatalog } from '../../../../../shared/geology/guidance'
import { GeologyExportError, buildMissionGeologyExport } from '../../../../../shared/geology/exportWrapper'
import type { GeologyContextState } from '../../domain/geologyContext'
import { GEOLOGY_ERROR_CODES, requestDraft, requestExplanation } from '../../mission/aiClient'
import { canonicalMessage } from '../../mission/messages'
import { composerNotice } from '../../mission/messageDisplay'

const newRequestId = (): string => `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

/** Endpoint URL relative to the document: in the static ZIP (/AnalogOS/) it does not exist and the AI remains "unavailable". */
function apiUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}api/ai`, document.baseURI).toString()
}

/** Geological channel (M10): validated official context, user opt-in, and catalog of the current evaluation. */
export interface GeologyUi {
  /** Official context loaded and valid in the browser (M9). Without it there is no geological channel and everything else stays the same. */
  available: boolean
  unavailableReason: string | null
  useGeology: boolean
  setUseGeology: (value: boolean) => void
  catalog: GeologyCatalog | null
  onExportGeology: () => void
  exportError: string | null
}

export interface PlannerApi {
  state: PlannerState
  dispatch: (a: PlannerAction) => void
  built: ReturnType<typeof buildRequest>
  evaluate: () => boolean
  evaluationError: string | null
  runDraft: () => void
  runExplain: (withGeology?: boolean) => void
  geologyUi: GeologyUi
  exportJson: () => void
  exportError: string | null
}

// Errors and reasons are canonical English (ADR-017); the views show them with displayMissionMessage.
export function usePlanner(bundle: EvidenceBundle, geology: GeologyContextState = { status: 'unavailable', reason: canonicalMessage('msg.noGeology') }): PlannerApi {
  const [state, dispatch] = useReducer(plannerReducer, undefined, initialPlannerState)
  const latest = useRef(state)
  latest.current = state
  const useGeologyRef = useRef(true)
  const controllers = useRef(new Map<string, AbortController>())
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [geologyExportError, setGeologyExportError] = useState<string | null>(null)
  const [useGeology, setUseGeologyState] = useState(true)
  useGeologyRef.current = useGeology
  const setUseGeology = useCallback((value: boolean) => setUseGeologyState(value), [])
  const context = geology.status === 'ready' ? geology.context : null
  // Fingerprint of the COMPLETE validated context (it is not the byte hash). It is computed once per load.
  const contextFp = useMemo(() => (context ? fingerprint(context) : null), [context])
  useEffect(() => {
    dispatch({ type: 'geology_context_changed' })
  }, [contextFp])

  // If the reducer cancels a request (the content changed), the network request is also aborted.
  useEffect(() => {
    const live = new Set([state.draft.requestId, state.explain.requestId].filter((x): x is string => !!x))
    for (const [id, ctl] of controllers.current) {
      if (!live.has(id)) {
        ctl.abort()
        controllers.current.delete(id)
      }
    }
  }, [state.draft.requestId, state.explain.requestId])
  useEffect(() => () => controllers.current.forEach((c) => c.abort()), [])

  const built = useMemo(() => buildRequest(state), [state])

  const evaluate = useCallback((): boolean => {
    const b = buildRequest(latest.current)
    if (!latest.current.confirmed || !b.request) return false
    try {
      dispatch({ type: 'evaluated', evaluation: evaluateMission(b.request, bundle) })
      setEvaluationError(null)
      return true
    } catch (error) {
      setEvaluationError(error instanceof MissionInputError ? error.issues.join(' · ') : canonicalMessage('msg.evaluateFailed'))
      return false
    }
  }, [bundle])

  const runDraft = useCallback(() => {
    const s = latest.current
    if (!s.brief.trim() || s.draft.status === 'pending') return
    const requestId = newRequestId()
    const ctl = new AbortController()
    controllers.current.set(requestId, ctl)
    dispatch({ type: 'draft_start', requestId })
    void requestDraft({ requestId, brief: s.brief, url: apiUrl(), signal: ctl.signal }).then((r) => {
      controllers.current.delete(requestId)
      if (r.ok) dispatch({ type: 'draft_ok', requestId, proposal: r.value.proposal, provenance: r.value.provenance })
      else dispatch({ type: 'draft_fail', requestId, message: r.message, unavailable: r.unavailable })
    })
  }, [])

  const runExplain = useCallback((withGeology?: boolean) => {
    const s = latest.current
    const b = buildRequest(s)
    if (!s.result || !b.request || s.explain.status === 'pending') return
    const requestId = newRequestId()
    const ctl = new AbortController()
    controllers.current.set(requestId, ctl)
    // Explicit opt-in and only with a valid context; the catalog is computed here from the current evaluation.
    const wantGeology = (withGeology ?? useGeologyRef.current) && !!context && !!contextFp
    const geologyCatalog = wantGeology && context && contextFp ? buildGeologyCatalog(s.result, context, contextFp) : undefined
    dispatch({ type: 'explain_start', requestId, geologyCatalog })
    void requestExplanation({ requestId, request: b.request, requestFp: fingerprint(b.request), url: apiUrl(), geologyContextFp: geologyCatalog ? contextFp ?? undefined : undefined, signal: ctl.signal }).then((r) => {
      controllers.current.delete(requestId)
      if (r.ok) dispatch({ type: 'explain_ok', requestId, requestFp: r.value.requestFp, evaluationFp: r.value.evaluationFp, selection: r.value.selection, provenance: r.value.provenance, geology: r.value.geology })
      else dispatch({ type: 'explain_fail', requestId, message: r.message, unavailable: r.unavailable, geologyFailure: !!r.code && (GEOLOGY_ERROR_CODES as readonly string[]).includes(r.code) })
    })
  }, [context, contextFp])

  const exportJson = useCallback(() => {
    const s = latest.current
    const b = buildRequest(s)
    if (!s.result || !b.request) return
    try {
      const doc = buildMissionExport(b.request, s.result, bundle, { draft: s.draft.record, explanation: s.explain.record })
      const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analogos-recommendation-${evaluationFingerprint(s.result).slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportError(null)
    } catch (error) {
      setExportError(error instanceof MissionExportError ? error.message : canonicalMessage('msg.exportFailed'))
    }
  }, [bundle])

  // Catalog of the current evaluation (also without AI: deterministic guidance). Without an evaluated window it emits no units.
  const catalog = useMemo(() => (context && contextFp && state.result ? buildGeologyCatalog(state.result, context, contextFp) : null), [context, contextFp, state.result])

  const exportGeologyJson = useCallback(() => {
    const s = latest.current
    const b = buildRequest(s)
    if (!s.result || !b.request || !context || !contextFp) return
    try {
      const m8 = buildMissionExport(b.request, s.result, bundle, { draft: s.draft.record, explanation: s.explain.record })
      const cat = buildGeologyCatalog(s.result, context, contextFp)
      const rec = s.explain.geologyRecord
      const ai = rec && s.explain.record && rec.catalog_fingerprint === cat.catalog_fingerprint
      const doc = buildMissionGeologyExport(m8, s.result, context, contextFp, ai
        ? { mode: 'ai', ref_ids: rec.selection.ref_ids, ai: { record: rec, provenance: s.explain.record!.provenance } }
        : { mode: 'deterministic', ref_ids: deterministicGeologyRefs(cat).ref_ids }, { bundle })
      const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analogos-recommendation-geology-${evaluationFingerprint(s.result).slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setGeologyExportError(null)
    } catch (error) {
      setGeologyExportError(error instanceof MissionExportError || error instanceof GeologyExportError ? error.message : canonicalMessage('msg.exportGeologyFailed'))
    }
  }, [bundle, context, contextFp])

  const geologyUi: GeologyUi = {
    available: !!context, unavailableReason: geology.status === 'unavailable' ? geology.reason : geology.status === 'loading' ? composerNotice('notice.geologyLoading') : null,
    useGeology, setUseGeology, catalog, onExportGeology: exportGeologyJson, exportError: geologyExportError,
  }

  return { state, dispatch, built, evaluate, evaluationError, runDraft, runExplain, geologyUi, exportJson, exportError }
}
