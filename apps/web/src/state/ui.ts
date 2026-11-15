/**
 * Store `ui` (docs/UX_REDESIGN.md §2.1). UI state shared between the shell and the
 * features. Integrator's file: features read it with `useUi` and write only with
 * `uiActions` (each action states which feature uses it in docs/BUILD_CONTRACTS.md).
 *
 * `stageAnchor` {x, y, visible, mode} changes every frame: it does NOT belong here; the globe publishes it through
 * its own channel (features/globe).
 */
import { createStore, useStore } from './store'

export type UiMode = 'explorar' | 'mision'
export type SelectionKind = 'evaluated' | 'reference'

export interface UiSelection {
  siteId: string
  kind: SelectionKind
  /** true = preview (e.g. the #1 when results arrive): does not open the sheet or move focus. */
  preview: boolean
}

export interface StageInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Visible Mission phase, derived from the team planner (ADR-013):
 * idle (no test) · interpreting (AI draft in progress; only the composer waits) ·
 * review (describe, scope or confirm; nothing waits) · scoring (synchronous evaluation, transient) ·
 * analysis (AI explanation in progress; only the Reading waits) · done · error · cancelled.
 */
export type MissionPhase = 'idle' | 'interpreting' | 'review' | 'scoring' | 'analysis' | 'done' | 'error' | 'cancelled'
export type IntroPhase = 'pending' | 'play' | 'done'

export type UiState = {
  mode: UiMode
  selection: UiSelection | null
  /** Canal ligero carrusel → globo. */
  hoverSiteId: string | null
  /** Rail ↔ lines ↔ AI cards. */
  activeCriterionId: string | null
  previewCriterionId: string | null
  /** Updated only when the layout settles (end of transition), never per frame. */
  stageInsets: StageInsets
  /** Panel rects cached with ResizeObserver, for layoutLeaders. */
  obstacles: readonly DOMRectReadOnly[]
  missionPhase: MissionPhase
  introPhase: IntroPhase
  /** Decides whether results may fly to the #1 (null = the user has not touched the camera). */
  cameraTouchedAt: number | null
  /**
   * Increments with "Go to the Reading" (M11). The shell decides the surface based on width; requesting it does not
   * touch the selection, the planner or the AI.
   */
  readingRequest: number
}

export const ZERO_INSETS: StageInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 })

export function readModeFromSearch(search: string): UiMode {
  const value = new URLSearchParams(search).get('modo')
  return value === 'mision' || value === 'misión' ? 'mision' : 'explorar'
}

/** `?modo=` is written with replaceState; Explore is the default mode and is not written. */
export function searchWithMode(search: string, mode: UiMode): string {
  const params = new URLSearchParams(search)
  if (mode === 'mision') params.set('modo', 'mision')
  else params.delete('modo')
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function createInitialUiState(search = ''): UiState {
  return {
    mode: readModeFromSearch(search),
    // Explore starts with no selection: the globe is the protagonist and the rail stays closed.
    selection: null,
    hoverSiteId: null,
    activeCriterionId: null,
    previewCriterionId: null,
    stageInsets: ZERO_INSETS,
    obstacles: [],
    missionPhase: 'idle',
    introPhase: 'pending',
    cameraTouchedAt: null,
    readingRequest: 0,
  }
}

export const uiStore = createStore<UiState>(
  createInitialUiState(typeof window === 'undefined' ? '' : window.location.search),
)

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector)
}

export function sameInsets(a: StageInsets, b: StageInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left
}

function sameRects(a: readonly DOMRectReadOnly[], b: readonly DOMRectReadOnly[]): boolean {
  return a.length === b.length && a.every((rect, i) => {
    const other = b[i]
    return other !== undefined && rect.x === other.x && rect.y === other.y && rect.width === other.width && rect.height === other.height
  })
}

const PHASES_BUSY: readonly MissionPhase[] = ['interpreting', 'scoring', 'analysis']

/**
 * Is a wait in progress? Each surface decides what affects it: the composer waits on
 * `interpreting`, the Reading on `analysis`; `review` (editing requirements) never counts as a wait.
 */
export function isMissionBusy(phase: MissionPhase): boolean {
  return PHASES_BUSY.includes(phase)
}

export const uiActions = {
  setMode(mode: UiMode): void {
    uiStore.setState({ mode })
  },
  /** Manual selection (preview=false) or preview (preview=true). */
  select(siteId: string, kind: SelectionKind = 'evaluated', preview = false): void {
    const current = uiStore.getState().selection
    if (current && current.siteId === siteId && current.kind === kind && current.preview === preview) return
    uiStore.setState({ selection: { siteId, kind, preview } })
  },
  clearSelection(): void {
    // Hover is also cleared: on touch, the card that published it may have been unmounted without blur.
    uiStore.setState({ selection: null, activeCriterionId: null, previewCriterionId: null, hoverSiteId: null })
  },
  setHover(siteId: string | null): void {
    uiStore.setState({ hoverSiteId: siteId })
  },
  setActiveCriterion(criterionId: string | null): void {
    uiStore.setState({ activeCriterionId: criterionId })
  },
  setPreviewCriterion(criterionId: string | null): void {
    uiStore.setState({ previewCriterionId: criterionId })
  },
  /** Shell only: when the layout settles. Ignores equal values so as not to notify. */
  setStageInsets(insets: StageInsets): void {
    if (sameInsets(uiStore.getState().stageInsets, insets)) return
    uiStore.setState({ stageInsets: Object.freeze({ ...insets }) })
  },
  /** Shell only (ResizeObserver of its panels). */
  setObstacles(obstacles: readonly DOMRectReadOnly[]): void {
    if (sameRects(uiStore.getState().obstacles, obstacles)) return
    uiStore.setState({ obstacles: Object.freeze([...obstacles]) })
  },
  setMissionPhase(missionPhase: MissionPhase): void {
    uiStore.setState({ missionPhase })
  },
  setIntroPhase(introPhase: IntroPhase): void {
    uiStore.setState({ introPhase })
  },
  /** The globe/map calls this on any user input on the camera. */
  touchCamera(at: number = Date.now()): void {
    uiStore.setState({ cameraTouchedAt: at })
  },
  /**
   * "Go to the Reading" (compact result of "Your mission", M11): sets Mission and asks the shell to open the
   * Reading. UI only: it does not change the selection, the brief, the requirements, the scope, nor call the AI.
   */
  requestReading(): void {
    uiStore.setState((state) => ({ mode: 'mision', readingRequest: state.readingRequest + 1 }))
  },
  /** When an AI wait starts: results will fly to the #1 only if no one touches the camera. */
  resetCameraTouch(): void {
    uiStore.setState({ cameraTouchedAt: null })
  },
}
