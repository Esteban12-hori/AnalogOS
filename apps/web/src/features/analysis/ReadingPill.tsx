/**
 * Píldora «Lectura determinista» (slot `pill.reading`, Explorar ≥1100). Es un disclosure: abre los
 * hechos del snapshot debajo, sin desenfoque (marcadores y chips sin blur, §2.4). En Explorar no hay
 * IA: la Lectura es determinista (sin ✦). La vista se precarga al primer hover/foco.
 * Esc cierra y devuelve el foco a la píldora.
 * En Misión (1100–1439, M11) es la superficie de «Ir a la Lectura»: `openSignal` la abre sin tocar la
 * selección, y el rótulo pasa a «Lectura» porque ahí puede incluir la selección pedida a la IA.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
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

  useEffect(() => {
    if (!ready) setOpen(false)
  }, [ready])

  // «Ir a la Lectura»: cada pedido nuevo abre la píldora (el armazón lleva el foco al título).
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
        <span>{mission ? 'Lectura' : 'Lectura determinista'}</span>
        <span className="analysis-pill-caret" aria-hidden="true">⌄</span>
      </button>
      <div id={popId} className="analysis-pop" hidden={!open}>
        {open && <ReadingPanel data={data} placement="panel" />}
      </div>
    </div>
  )
}
