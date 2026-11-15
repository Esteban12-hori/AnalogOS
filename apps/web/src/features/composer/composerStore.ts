/**
 * PRIVATE composer state (not shared state): the wait for the AI draft, the
 * local history, Undo, evaluation or export errors, and navigation requests to
 * "Your mission". Shared state lives in `state/mission.ts` (written only by the mission controller)
 * and in `ui.missionPhase`.
 */
import { composerNotice } from '../../mission/messageDisplay'
import { createStore, useStore } from '../../state/store'
import type { StepId } from '../../components/planner/PlannerView'
import type { HistoryEntry } from './history'
import type { WaitStage } from './labels'

/**
 * Geological channel of the AI explanation (the team's M10), as seen by the mission controller:
 * available only with the validated official context; otherwise, the reason (same texts as `usePlanner`).
 */
export interface GeologyChannel {
  available: boolean
  unavailableReason: string | null
}

/** Canonical English (stored in the channel); shown with displayMissionMessage. */
export const GEOLOGY_LOADING_REASON = composerNotice('notice.geologyLoading')

export interface ComposerState {
  /** The mission chunk has loaded and the controller is ready. */
  ready: boolean
  /** Epoch ms when the current AI draft started; null when not waiting. */
  draftStartedAt: number | null
  wait: WaitStage | null
  history: readonly HistoryEntry[]
  /** Tests evaluated in this session (the last one is the current one): Undo restores the previous one. */
  undo: readonly HistoryEntry[]
  /** Non-blocking notice in canonical English (“Request canceled…”, “Test restored…”); shown with displayMissionMessage. */
  notice: string | null
  evaluationError: string | null
  exportError: string | null
  /** Step request for the planner view in "Your mission". */
  stepRequest: { step: StepId; nonce: number; target?: 'brief' } | null
  /** Increments to request that "Your mission" be opened (popover <1440) or receive focus (panel ≥1440). */
  openRequest: number
  /** Published by the mission controller upon receiving the geological context (M10). */
  geology: GeologyChannel
  /** "Include geological guidance for the test" checkbox (enabled by default, as in `usePlanner`). */
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

/** The history is read from localStorage when the mission chunk loads. */
export const composerStore = createStore<ComposerState>(initialComposerState())

export function useComposer<T>(selector: (state: ComposerState) => T): T {
  return useStore(composerStore, selector)
}

/** Geological channel checkbox: read by the controller (when requesting the explanation) and by the Reading. */
export function setUseGeology(value: boolean): void {
  composerStore.setState({ useGeology: value })
}

/** Requests to open "Your mission" (the shell takes the mobile sheet to S0, where the composer lives). */
export function useMissionOpenRequest(): number {
  return useStore(composerStore, (state) => state.openRequest)
}
