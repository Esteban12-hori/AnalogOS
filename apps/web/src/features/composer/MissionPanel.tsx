/**
 * «Tu misión» (chunk diferido de misión, ADR-013): el planificador del equipo como pieza interna
 * del rediseño. Monta `PlannerView` (requisitos con `RequirementEditor`, alcance con `ScopePicker`,
 * `ConfirmSummary`, `ResultView` compacto) sobre el planificador COMPARTIDO, más el historial local
 * y Deshacer. Slots: `left.mission` (panel ≥1440), popover del composer (<1440) y `full.mission`
 * (pestaña de S2).
 *
 * Nada aquí calcula: la evaluación es `evaluateMission` del equipo; la IA solo propone requisitos
 * (sin confirmar) cuando el usuario pulsa su botón, con el aviso de envío literal del equipo.
 * Con el contexto geológico oficial, el resultado incluye la orientación geológica de la prueba
 * (`GeologyGuidance` del equipo, M10) y su exportación; la selección con IA se pide en la Lectura.
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
  anthropic: 'Requisitos propuestos con IA · sin confirmar hasta que usted confirme',
  example: 'Ejemplo editable · no es una recomendación',
  manual: 'Requisitos escritos por usted',
}

/** Rótulo de procedencia: con la propuesta de la IA, dice si usted ya la confirmó. */
export function sourceLabel(source: MissionSource, confirmed: boolean): string {
  return source === 'anthropic' && confirmed ? 'Requisitos propuestos con IA · confirmados por usted' : SOURCE_LABEL[source]
}

/**
 * «Borrar todo» en la interfaz integrada: aquí SÍ hay historial local (las pruebas evaluadas),
 * a diferencia del panel del equipo, que no guarda nada en el navegador.
 */
export const RESET_HINT = 'Borra la prueba en curso. Las pruebas ya evaluadas quedan en el historial de este navegador: bórrelas en «Historial» › «Borrar historial».'

/** Planificador compartido con la misma forma que `usePlanner` del equipo. */
function useSharedPlanner(controller: MissionController) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const evaluationError = useComposer((composer) => composer.evaluationError)
  const exportError = useComposer((composer) => composer.exportError)
  // Canal geológico (M10): disponibilidad, casilla y error de su exportación también rehacen la vista.
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
          Deshacer · volver a la prueba anterior
        </button>
      )}
      {history.length > 0 && (
        <details className="composer-details">
          <summary>Historial · {history.length}</summary>
          <ul className="composer-history">
            {history.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="composer-history-item" onClick={() => controller.restore(entry.id)}>
                  <span>{entry.brief.trim() || 'Prueba sin texto'}</span>
                  <small>{entry.label} · {formatWhen(entry.at)}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="composer-btn composer-btn-quiet" onClick={() => controller.clearHistory()}>
            Borrar historial
          </button>
          <p className="composer-card-note">Solo en este navegador. Se guardan el texto, el alcance y los requisitos que usted escribió; al restaurar, se confirma y se evalúa de nuevo.</p>
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
        <h2 id={titleId} className="composer-card-title">Tu misión</h2>
        <p className="composer-card-note">
          {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail}</span> Sin snapshot validado: la misión no puede evaluarse.</> : 'Esperando el snapshot validado…'}
        </p>
      </section>
    )
  }
  return <MissionPanelBody data={data} placement={placement} promise={promise} controller={missionController(bundle)} titleId={titleId} source={source} notice={notice} stepRequest={stepRequest} />
}

/** «Ir a la Lectura» (M11): solo UI; el armazón elige la superficie según el ancho. */
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
        <h2 id={titleId} className="composer-card-title">Tu misión</h2>
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
