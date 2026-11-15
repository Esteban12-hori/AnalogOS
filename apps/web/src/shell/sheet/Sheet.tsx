/**
 * Single sheet with 3 detents for <1100 px (ADR-014): S0 tray, S1 place, S2 detail card.
 * - It is dragged only from the handle or the header (`.sheet-grip`), with no transition during
 *   the drag; on release `resolveDetent` decides and the transition uses --dur-4 / --ease-sheet.
 * - The handle is a <button>: one tap goes up one detent (at S2 it goes down to S1); ↑/↓ change detent.
 * - Low landscape (height ≤500 px): side sheet of 360 px, no dragging.
 */
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { tShell } from '../../i18n/messages/shell'
import { DETENTS, type DetentId } from '../layout'
import { MODE_PANEL_ID } from '../ModeTabs'
import { DETENT_SLOP_PX, resolveDetent } from './resolveDetent'

interface SheetProps {
  detent: DetentId
  onDetentChange: (detent: DetentId) => void
  heights: Record<DetentId, number>
  side: boolean
  label: string
  /** Mode tab that labels the sheet (tabpanel of the Explore | Mission tabs). */
  labelledBy: string
  /** Content of the draggable header (title, back, close). */
  head?: ReactNode
  /** Virtual keyboard open: the carousel collapses and the composer moves up. */
  keyboardOpen: boolean
  children: ReactNode
}

interface Drag {
  pointerId: number
  startY: number
  startHeight: number
  origin: number
  lastY: number
  lastT: number
  velocity: number
  moved: boolean
}

export function Sheet({ detent, onDetentChange, heights, side, label, labelledBy, head, keyboardOpen, children }: SheetProps) {
  const t = useT(tShell)
  const sheet = useRef<HTMLElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const index = DETENTS.indexOf(detent)
  const stops = DETENTS.map((id) => heights[id])

  const go = (next: number) => {
    const target = DETENTS[Math.min(Math.max(next, 0), DETENTS.length - 1)]
    if (target && target !== detent) onDetentChange(target)
  }

  const setVisible = (height: number | null) => {
    const element = sheet.current
    if (!element) return
    if (height === null) {
      element.style.removeProperty('--sheet-drag')
      element.removeAttribute('data-dragging')
      return
    }
    element.setAttribute('data-dragging', '')
    element.style.setProperty('--sheet-drag', `${height}px`)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (side || event.button !== 0) return
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: heights[detent],
      origin: index,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      moved: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.abs(dy) < DETENT_SLOP_PX) return
      state.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const dt = Math.max(event.timeStamp - state.lastT, 1)
    // Positive velocity = the sheet grows (finger moving up). Simple exponential smoothing.
    state.velocity = 0.7 * ((state.lastY - event.clientY) / dt) + 0.3 * state.velocity
    state.lastY = event.clientY
    state.lastT = event.timeStamp
    const min = (stops[0] ?? 0) * 0.6
    const max = stops[stops.length - 1] ?? 0
    setVisible(Math.min(Math.max(state.startHeight - dy, min), max))
  }

  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    setVisible(null)
    if (!state.moved) return
    suppressClick.current = true
    const height = state.startHeight - (event.clientY - state.startY)
    go(resolveDetent(height, state.velocity, stops, { from: state.origin, cancelled }))
  }

  const onHandleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    go(index === DETENTS.length - 1 ? index - 1 : index + 1)
  }

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') go(index + 1)
    else if (event.key === 'ArrowDown') go(index - 1)
    else return
    event.preventDefault()
  }

  return (
    <section
      ref={sheet}
      id={MODE_PANEL_ID}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="sheet"
      data-detent={detent}
      data-side={side ? '' : undefined}
      data-keyboard={keyboardOpen ? '' : undefined}
      data-obstacle=""
      style={{ ['--sheet-visible' as string]: `${heights[detent]}px` }}
    >
      <div
        className="sheet-grip"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
      >
        <button
          type="button"
          className="sheet-handle"
          aria-label={t('sheet.handle', { label, detent: t(`sheet.detent.${detent}`) })}
          aria-keyshortcuts="ArrowUp ArrowDown"
          onClick={onHandleClick}
          onKeyDown={onHandleKey}
        >
          <span aria-hidden="true" />
        </button>
        {head && <div className="sheet-head">{head}</div>}
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  )
}
