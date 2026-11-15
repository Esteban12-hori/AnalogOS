/**
 * «Ir a la Lectura» (M11): a qué superficie lleva el pedido según el tramo, sin tocar la selección.
 *   ≥1440 → Lectura del panel izquierdo (Misión) · 1100–1439 → píldora «Lectura» (también en Misión)
 *   <1100 → hoja S2: con un ● del snapshot, la pestaña «Lectura» de su ficha; sin selección o con un
 *   ◆ de referencia, la vista «Lectura» de la hoja. Volver regresa a S1 (con selección) o a S0.
 */
import type { UiSelection } from '../state/ui'
import type { DetentId, StageTramo } from './layout'

export type ReadingSurface = 'left' | 'pill' | 'sheet-tab' | 'sheet-reading'

export interface ReadingRoute {
  surface: ReadingSurface
  /** Solo en la hoja: detent al que vuelven Atrás, Esc, «← Volver» y ✕ de la Lectura. */
  back: DetentId | null
}

export function readingRoute(tramo: StageTramo, selection: UiSelection | null, siteFound: boolean): ReadingRoute {
  if (tramo === 'wide') return { surface: 'left', back: null }
  if (tramo === 'medium') return { surface: 'pill', back: null }
  if (selection?.kind === 'evaluated' && siteFound) return { surface: 'sheet-tab', back: 'S1' }
  return { surface: 'sheet-reading', back: selection ? 'S1' : 'S0' }
}

/** Título de la Lectura dentro de cada superficie (la vista es diferida: puede tardar en montarse). */
export const READING_TITLE_SELECTOR: Readonly<Record<ReadingSurface, string>> = {
  left: '.left-panel [data-slot="left.reading"] .analysis-head h2',
  pill: '.reading-pill-slot .analysis-head h2',
  'sheet-tab': '.sheet [data-slot="full.reading"] .analysis-head h2',
  'sheet-reading': '.sheet [data-slot="sheet.reading"] .analysis-head h2',
}

/** Tope del reintento de foco (la vista de la Lectura llega en un chunk diferido). */
export const READING_FOCUS_TIMEOUT_MS = 2500

/**
 * Lleva el foco al título de la Lectura cuando aparece. Reintento acotado por tiempo y cancelable:
 * se abandona si el usuario pulsa una tecla o toca la pantalla antes, para no robarle el foco.
 * Devuelve la función que lo cancela.
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
      // Sin preventScroll: el panel con scroll propio lleva el título a la vista.
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
