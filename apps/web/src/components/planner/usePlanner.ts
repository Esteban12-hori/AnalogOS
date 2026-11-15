import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  MissionExportError, MissionInputError, buildMissionExport, buildRequest, evaluateMission, evaluationFingerprint, fingerprint,
  initialPlannerState, plannerReducer, type EvidenceBundle, type PlannerAction, type PlannerState,
} from '../../mission'
import { requestDraft, requestExplanation } from '../../mission/aiClient'

const newRequestId = (): string => `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

/** URL del endpoint relativa al documento: en el ZIP estático (/AnalogOS/) no existe y la IA queda «no disponible». */
function apiUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}api/ai`, document.baseURI).toString()
}

export interface PlannerApi {
  state: PlannerState
  dispatch: (a: PlannerAction) => void
  built: ReturnType<typeof buildRequest>
  evaluate: () => boolean
  evaluationError: string | null
  runDraft: () => void
  runExplain: () => void
  exportJson: () => void
  exportError: string | null
}

export function usePlanner(bundle: EvidenceBundle): PlannerApi {
  const [state, dispatch] = useReducer(plannerReducer, undefined, initialPlannerState)
  const latest = useRef(state)
  latest.current = state
  const controllers = useRef(new Map<string, AbortController>())
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Si el reductor cancela una solicitud (cambió el contenido), se aborta también la petición de red.
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
      setEvaluationError(error instanceof MissionInputError ? error.issues.join(' · ') : 'No se pudo evaluar la solicitud.')
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

  const runExplain = useCallback(() => {
    const s = latest.current
    const b = buildRequest(s)
    if (!s.result || !b.request || s.explain.status === 'pending') return
    const requestId = newRequestId()
    const ctl = new AbortController()
    controllers.current.set(requestId, ctl)
    dispatch({ type: 'explain_start', requestId })
    void requestExplanation({ requestId, request: b.request, requestFp: fingerprint(b.request), url: apiUrl(), signal: ctl.signal }).then((r) => {
      controllers.current.delete(requestId)
      if (r.ok) dispatch({ type: 'explain_ok', requestId, requestFp: r.value.requestFp, evaluationFp: r.value.evaluationFp, selection: r.value.selection, provenance: r.value.provenance })
      else dispatch({ type: 'explain_fail', requestId, message: r.message, unavailable: r.unavailable })
    })
  }, [])

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
      a.download = `analogos-recomendacion-${evaluationFingerprint(s.result).slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportError(null)
    } catch (error) {
      setExportError(error instanceof MissionExportError ? error.message : 'No se pudo generar la exportación.')
    }
  }, [bundle])

  return { state, dispatch, built, evaluate, evaluationError, runDraft, runExplain, exportJson, exportError }
}
