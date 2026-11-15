/**
 * "Your mission" (deferred mission chunk, ADR-013): the team's planner as an internal piece
 * of the redesign. Mounts `PlannerView` (requirements with `RequirementEditor`, scope with `ScopePicker`,
 * `ConfirmSummary`, compact `ResultView`) on top of the SHARED planner, plus the local history
 * and Undo. Slots: `left.mission` (panel ≥1440), composer popover (<1440) and `full.mission`
 * (S2 tab).
 *
 * Nothing here computes: the evaluation is the team's `evaluateMission`; the AI only proposes requirements
 * (unconfirmed) when the user presses its button, with the team's literal submission notice.
 * With the official geological context, the result includes the geological guidance for the test
 * (the team's `GeologyGuidance`, M10) and its export; AI-assisted selection is requested in the Reading.
 */
import { useMemo, useSyncExternalStore } from 'react'
import { PlannerView } from '../../components/planner/PlannerView'
import type { EvidenceBundle } from '../../mission/types'
import { GLYPH } from '../../shell/public'
import { useMission, type MissionSource } from '../../state/mission'
import { uiActions } from '../../state/ui'
import { useComposer, type ComposerState } from './composerStore'
import { formatWhen } from './history'
import { missionController, type MissionController } from './missionController'
import { MISSION_PANEL_ID, type MissionPanelProps } from './panel'
import { usePrintReady } from './printState'
import './mission.css'

const SOURCE_LABEL: Readonly<Record<MissionSource, string>> = {
  anthropic: 'Requirements proposed with AI · unconfirmed until you confirm',
  example: 'Editable example · not a recommendation',
  manual: 'Requirements written by you',
}

/** Provenance label: with the AI's proposal, it says whether you have already confirmed it. */
export function sourceLabel(source: MissionSource, confirmed: boolean): string {
  return source === 'anthropic' && confirmed ? 'Requirements proposed with AI · confirmed by you' : SOURCE_LABEL[source]
}

/**
 * "Clear all" in the integrated interface: here there IS a local history (the evaluated tests),
 * unlike the team's panel, which stores nothing in the browser.
 */
export const RESET_HINT = 'Clears the current test. Tests already evaluated stay in this browser’s history: delete them in “History” › “Clear history”.'

/** Shared planner with the same shape as the team's `usePlanner`. */
function useSharedPlanner(controller: MissionController) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const evaluationError = useComposer((composer) => composer.evaluationError)
  const exportError = useComposer((composer) => composer.exportError)
  // Geological channel (M10): availability, checkbox and error of its export also redo the view.
  const geology = useComposer((composer) => composer.geology)
  const useGeology = useComposer((composer) => composer.useGeology)
  const geologyExportError = useComposer((composer) => composer.geologyExportError)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => controller.api(state), [controller, state, evaluationError, exportError, geology, useGeology, geologyExportError])
}

function HistoryBlock({ controller }: { controller: MissionController }) {
  const history = useComposer((state) => state.history)
  const undo = useComposer((state) => state.undo)
  if (history.length === 0 && undo.length < 2) return null
  return (
    <div className="mission-extras">
      {undo.length >= 2 && (
        <button type="button" className="composer-btn" onClick={() => controller.undo()}>
          Undo · back to the previous test
        </button>
      )}
      {history.length > 0 && (
        <details className="composer-details">
          <summary>History · {history.length}</summary>
          <ul className="composer-history">
            {history.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="composer-history-item" onClick={() => controller.restore(entry.id)}>
                  <span>{entry.brief.trim() || 'Test without text'}</span>
                  <small>{entry.label} · {formatWhen(entry.at)}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="composer-btn composer-btn-quiet" onClick={() => controller.clearHistory()}>
            Clear history
          </button>
          <p className="composer-card-note">Only in this browser. The text, scope and requirements you wrote are saved; when restored, they are confirmed and evaluated again.</p>
        </details>
      )}
    </div>
  )
}

export function MissionPanel({ data, placement, promise }: MissionPanelProps) {
  const snapshot = data.status === 'ready' ? data.snapshot : null
  const source = useMission((state) => state.source)
  const notice = useComposer((state) => state.notice)
  const stepRequest = useComposer((state) => state.stepRequest)
  const titleId = `composer-${placement}-title`
  const bundle = useMemo<EvidenceBundle | null>(
    () => (snapshot ? { candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile } : null),
    [snapshot],
  )

  if (!snapshot || !bundle) {
    return (
      <section className="composer-card" data-placement={placement} aria-labelledby={titleId}>
        <h2 id={titleId} className="composer-card-title">Your mission</h2>
        <p className="composer-card-note">
          {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail}</span> No validated snapshot: the mission cannot be evaluated.</> : 'Waiting for the validated snapshot…'}
        </p>
      </section>
    )
  }
  return <MissionPanelBody data={data} placement={placement} promise={promise} controller={missionController(bundle)} titleId={titleId} source={source} notice={notice} stepRequest={stepRequest} />
}

/** "Go to the Reading" (M11): UI only; the shell chooses the surface according to the width. */
const openReading = () => uiActions.requestReading()

function MissionPanelBody({
  data,
  placement,
  promise,
  controller,
  titleId,
  source,
  notice,
  stepRequest,
}: MissionPanelProps & {
  controller: MissionController
  titleId: string
  source: MissionSource | null
  notice: string | null
  stepRequest: ComposerState['stepRequest']
}) {
  const api = useSharedPlanner(controller)
  const printReady = usePrintReady()
  const snapshot = data.snapshot!
  return (
    <section
      className="composer-card mission-card"
      data-placement={placement}
      aria-labelledby={titleId}
      id={placement === 'panel' ? MISSION_PANEL_ID : undefined}
      tabIndex={placement === 'panel' ? -1 : undefined}
    >
      <header className="composer-card-head">
        <h2 id={titleId} className="composer-card-title">Your mission</h2>
        {source && (
          <span className="composer-card-source" data-source={source}>
            {source === 'anthropic' && <span aria-hidden="true">{GLYPH.ai} </span>}
            {sourceLabel(source, api.state.confirmed)}
          </span>
        )}
      </header>
      {promise && api.state.journey === null && <p className="composer-card-lead">{promise}</p>}
      {notice && <p className="composer-card-note" role="status">{notice}</p>}
      <PlannerView
        snapshot={snapshot}
        api={api}
        intent={null}
        compact
        stepRequest={stepRequest}
        resetHint={RESET_HINT}
        footer={<HistoryBlock controller={controller} />}
        onOpenReading={openReading}
        printReady={printReady}
      />
    </section>
  )
}
