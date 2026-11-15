/**
 * Píldora «Lectura determinista» (slot `pill.reading`, Explorar ≥1100). Es un disclosure: abre los
 * hechos del snapshot debajo, sin desenfoque (marcadores y chips sin blur, §2.4). En Explorar no hay
 * IA: la Lectura es determinista (sin ✦). La vista se precarga al primer hover/foco.
 * Esc cierra y devuelve el foco a la píldora.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { ReadingPillProps } from './index'
import { preloadReading, ReadingPanel } from './ReadingPanel'
import './pill.css'

export function ReadingPill({ data }: ReadingPillProps) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const popId = useId()
  const ready = data.status === 'ready'

  useEffect(() => {
    if (!ready) setOpen(false)
  }, [ready])

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
        <span>Lectura determinista</span>
        <span className="analysis-pill-caret" aria-hidden="true">⌄</span>
      </button>
      <div id={popId} className="analysis-pop" hidden={!open}>
        {open && <ReadingPanel data={data} placement="panel" />}
      </div>
    </div>
  )
}
