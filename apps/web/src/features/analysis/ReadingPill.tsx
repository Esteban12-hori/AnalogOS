/**
 * Píldora «✦ Lectura de la comparativa» (slot `pill.reading`, Explorar ≥1100). Es un disclosure:
 * abre la Lectura del perfil base debajo, sin desenfoque (marcadores y chips sin blur, §2.4).
 * La lectura se arma al primer hover/foco (prefetch) o al abrirla; nada pesado antes.
 * Esc cierra y devuelve el foco a la píldora.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { GLYPH } from '../../shell/public'
import { ensureBaseReading } from './controller'
import type { ReadingPillProps } from './index'
import { ReadingPanel, useRegisterSnapshot } from './ReadingPanel'
import { useReadingSlot } from './readingStore'
import './pill.css'

export function pillSuffix(slot: ReturnType<typeof useReadingSlot>): string | null {
  const ai = slot.reading?.ai
  if (!ai) return null
  if (ai.source === 'pregenerated' && ai.status === 'done') return 'pregenerada'
  if (ai.status === 'facts_only' || ai.status === 'stale' || ai.status === 'error') return 'solo hechos'
  return null
}

export function ReadingPill({ data }: ReadingPillProps) {
  useRegisterSnapshot(data)
  const [open, setOpen] = useState(false)
  const slot = useReadingSlot('base')
  const button = useRef<HTMLButtonElement>(null)
  const popId = useId()
  const ready = data.status === 'ready'
  const suffix = pillSuffix(slot)

  useEffect(() => {
    if (!ready) setOpen(false)
  }, [ready])

  const prefetch = () => {
    if (ready) void ensureBaseReading()
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
        <span className="analysis-pill-star" aria-hidden="true">{GLYPH.ai}</span>
        <span>Lectura de la comparativa</span>
        {suffix && <span className="analysis-pill-suffix"> · {suffix}</span>}
        <span className="analysis-pill-caret" aria-hidden="true">⌄</span>
      </button>
      <div id={popId} className="analysis-pop" hidden={!open}>
        {open && <ReadingPanel data={data} placement="panel" />}
      </div>
    </div>
  )
}
