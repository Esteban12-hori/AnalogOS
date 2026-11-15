/**
 * «Go to Reading» (M11): which surface the request leads to depending on the breakpoint, without touching the selection.
 *   ≥1440 → Reading in the left panel (Mission) · 1100–1439 → «Reading» pill (also in Mission)
 *   <1100 → sheet S2: with a ● from the snapshot, the «Reading» tab of its card; with no selection or with a
 *   reference ◆, the sheet's «Reading» view. Back returns to S1 (with a selection) or to S0.
 */
import type { UiSelection } from '../state/ui'
import type { DetentId, StageTramo } from './layout'

export type ReadingSurface = 'left' | 'pill' | 'sheet-tab' | 'sheet-reading'

export interface ReadingRoute {
  surface: ReadingSurface
  /** Sheet only: the detent that Back, Esc, «← Back» and the Reading's ✕ return to. */
  back: DetentId | null
}

export function readingRoute(tramo: StageTramo, selection: UiSelection | null, siteFound: boolean): ReadingRoute {
  if (tramo === 'wide') return { surface: 'left', back: null }
  if (tramo === 'medium') return { surface: 'pill', back: null }
  if (selection?.kind === 'evaluated' && siteFound) return { surface: 'sheet-tab', back: 'S1' }
  return { surface: 'sheet-reading', back: selection ? 'S1' : 'S0' }
}

/** Title of the Reading within each surface (the view is deferred: it may take a while to mount). */
export const READING_TITLE_SELECTOR: Readonly<Record<ReadingSurface, string>> = {
  left: '.left-panel [data-slot="left.reading"] .analysis-head h2',
  pill: '.reading-pill-slot .analysis-head h2',
  'sheet-tab': '.sheet [data-slot="full.reading"] .analysis-head h2',
  'sheet-reading': '.sheet [data-slot="sheet.reading"] .analysis-head h2',
}

/** Cap on the focus retry (the Reading view arrives in a deferred chunk). */
export const READING_FOCUS_TIMEOUT_MS = 2500

/**
 * Moves focus to the Reading title when it appears. Retry bounded by time and cancelable:
 * it is abandoned if the user presses a key or touches the screen beforehand, so as not to steal their focus.
 * Returns the function that cancels it.
 */
export function focusWhenReady(root: ParentNode, selector: string, timeoutMs = READING_FOCUS_TIMEOUT_MS): () => void {
  let frame = 0
  let done = false
  const started = Date.now()
  const stop = () => {
    done = true
    window.cancelAnimationFrame(frame)
    window.removeEventListener('keydown', stop, true)
    window.removeEventListener('pointerdown', stop, true)
  }
  const tick = () => {
    if (done) return
    const el = root.querySelector<HTMLElement>(selector)
    if (el && el.isConnected && !el.closest('[inert]') && !el.closest('[hidden]')) {
      // No preventScroll: the panel with its own scroll brings the title into view.
      el.focus()
      if (document.activeElement === el) return stop()
    }
    if (Date.now() - started > timeoutMs) return stop()
    frame = window.requestAnimationFrame(tick)
  }
  window.addEventListener('keydown', stop, true)
  window.addEventListener('pointerdown', stop, true)
  frame = window.requestAnimationFrame(tick)
  return stop
}
