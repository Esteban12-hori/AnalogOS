/**
 * Estado PRIVADO del composer (no es estado compartido): la espera del borrador de IA, el
 * historial local, Deshacer, errores de evaluación o exportación y pedidos de navegación a
 * «Tu misión». Lo compartido vive en `state/mission.ts` (solo lo escribe el controlador de misión)
 * y en `ui.missionPhase`.
 */
import { createStore, useStore } from '../../state/store'
import type { StepId } from '../../components/planner/PlannerView'
import type { HistoryEntry } from './history'
import type { WaitStage } from './labels'

/**
 * Canal geológico de la explicación con IA (M10 del equipo), tal como lo ve el controlador de misión:
 * disponible solo con el contexto oficial validado; si no, el motivo (mismos textos que `usePlanner`).
 */
export interface GeologyChannel {
  available: boolean
  unavailableReason: string | null
}

export const GEOLOGY_LOADING_REASON = 'El contexto geológico todavía se está cargando.'

export interface ComposerState {
  /** El chunk de misión cargó y el controlador está listo. */
  ready: boolean
  /** ms epoch en que empezó el borrador de IA en curso; null sin espera. */
  draftStartedAt: number | null
  wait: WaitStage | null
  history: readonly HistoryEntry[]
  /** Pruebas evaluadas en esta sesión (la última es la vigente): Deshacer restaura la anterior. */
  undo: readonly HistoryEntry[]
  /** Aviso no bloqueante («Solicitud cancelada…», «Restaurada…»). */
  notice: string | null
  evaluationError: string | null
  exportError: string | null
  /** Pedido de paso para la vista del planificador en «Tu misión». */
  stepRequest: { step: StepId; nonce: number; target?: 'brief' } | null
  /** Aumenta para pedir que «Tu misión» se abra (popover <1440) o reciba el foco (panel ≥1440). */
  openRequest: number
  /** Lo publica el controlador de misión al recibir el contexto geológico (M10). */
  geology: GeologyChannel
  /** Casilla «Incluir orientación geológica de la prueba» (activa por defecto, como en `usePlanner`). */
  useGeology: boolean
  geologyExportError: string | null
}

export const UNDO_MAX = 20

export function initialComposerState(history: readonly HistoryEntry[] = []): ComposerState {
  return {
    ready: false, draftStartedAt: null, wait: null, history, undo: [], notice: null, evaluationError: null, exportError: null, stepRequest: null, openRequest: 0,
    geology: { available: false, unavailableReason: GEOLOGY_LOADING_REASON }, useGeology: true, geologyExportError: null,
  }
}

/** El historial se lee de localStorage cuando carga el chunk de misión. */
export const composerStore = createStore<ComposerState>(initialComposerState())

export function useComposer<T>(selector: (state: ComposerState) => T): T {
  return useStore(composerStore, selector)
}

/** Casilla del canal geológico: la leen el controlador (al pedir la explicación) y la Lectura. */
export function setUseGeology(value: boolean): void {
  composerStore.setState({ useGeology: value })
}

/** Pedidos de abrir «Tu misión» (el armazón lleva la hoja móvil a S0, donde vive el composer). */
export function useMissionOpenRequest(): number {
  return useStore(composerStore, (state) => state.openRequest)
}
