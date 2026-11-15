/**
 * "Deterministic Reading" pill (slot `pill.reading`, Explore ≥1100). It is a disclosure: it opens the
 * snapshot facts below, without blur (markers and chips without blur, §2.4). In Explore there is no
 * AI: the Reading is deterministic (no ✦). The view is preloaded on first hover/focus.
 * Esc closes it and returns focus to the pill.
 * In Mission (1100–1439, M11) it is the "Go to the Reading" surface: `openSignal` opens it without touching the
 * selection, and the label changes to "Reading" because there it may include the selection requested from the AI.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '../../i18n'
import { tComposer } from '../../i18n/messages/composer'
import { useUi } from '../../state/ui'
import type { ReadingPillProps } from './index'
import { preloadReading, ReadingPanel } from './ReadingPanel'
import './pill.css'

export function ReadingPill({ data, openSignal }: ReadingPillProps) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const popId = useId()
  const ready = data.status === 'ready'
  const mission = useUi((state) => state.mode) === 'mision'
  const seenSignal = useRef(openSignal)
  const t = useT(tComposer)

  useEffect(() => {
    if (!ready) setOpen(false)
  }, [ready])

  // "Go to the Reading": each new request opens the pill (the shell moves focus to the title).
  useEffect(() => {
    if (openSignal === seenSignal.current) return
    seenSignal.current = openSignal
    if (!ready) return
    preloadReading()
    setOpen(true)
  }, [openSignal, ready])

  const prefetch = () => {
    if (ready) preloadReading()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div className="analysis-pill-wrap" onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="analysis-pill"
        aria-expanded={open}
        aria-controls={popId}
        disabled={!ready}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => {
          prefetch()
          setOpen((value) => !value)
        }}
      >
        <span className="analysis-pill-star" aria-hidden="true">≡</span>
        <span>{mission ? t('reading.title') : t('reading.deterministic')}</span>
        <span className="analysis-pill-caret" aria-hidden="true">⌄</span>
      </button>
      <div id={popId} className="analysis-pop" hidden={!open}>
        {open && <ReadingPanel data={data} placement="panel" />}
      </div>
    </div>
  )
}
