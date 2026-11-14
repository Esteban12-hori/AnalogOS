/**
 * STUB del composer (incremento 9). En Explorar es una píldora que también abre la tecla «/».
 * En Misión muestra el textarea, pero el envío queda desactivado hasta que existan el motor
 * (incremento 8) y la orquestación (incremento 9): el texto no se envía a ningún servicio.
 */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { GLYPH } from '../../shell/public'
import { uiActions, useUi } from '../../state/ui'
import { COMPOSER_FOCUS_EVENT } from './focus'
import type { ComposerProps } from './index'
import './composer.css'

const PROMPT = 'Describe el trabajo que quieres probar para Marte…'

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

export function Composer({ placement, onRequestTray }: ComposerProps) {
  const mode = useUi((state) => state.mode)
  const [text, setText] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const pendingFocus = useRef(false)

  // «/» abre el composer desde cualquier lugar que no sea un campo de texto.
  useEffect(() => {
    if (placement === 'sheet-head') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return
      event.preventDefault()
      pendingFocus.current = true
      uiActions.setMode('mision')
      field.current?.focus()
    }
    const onFocusRequest = () => {
      pendingFocus.current = true
      field.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
    }
  }, [placement])

  useEffect(() => {
    if (mode === 'mision' && pendingFocus.current) {
      pendingFocus.current = false
      field.current?.focus()
    }
  }, [mode])

  if (placement === 'sheet-head') {
    return (
      <button type="button" className="composer-refine" onClick={() => onRequestTray?.()}>
        <span aria-hidden="true">{GLYPH.ai}</span> Refinar
      </button>
    )
  }

  if (mode === 'explorar') {
    return (
      <button
        type="button"
        className="composer-pill"
        data-placement={placement}
        aria-keyshortcuts="/"
        onClick={() => {
          pendingFocus.current = true
          uiActions.setMode('mision')
        }}
      >
        <span aria-hidden="true">{GLYPH.ai}</span>
        <span className="composer-pill-text">{PROMPT}</span>
        <kbd aria-hidden="true">/</kbd>
      </button>
    )
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.currentTarget.blur()
      event.preventDefault()
    }
  }

  return (
    <form className="composer-form" data-placement={placement} onSubmit={(event) => event.preventDefault()}>
      <label className="sr-only" htmlFor={`composer-${placement}`}>Tu misión</label>
      <span aria-hidden="true" className="composer-glyph">{GLYPH.ai}</span>
      <textarea
        id={`composer-${placement}`}
        ref={field}
        rows={1}
        maxLength={600}
        value={text}
        placeholder={PROMPT}
        aria-describedby={`composer-note-${placement}`}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" disabled aria-disabled="true">Enviar</button>
      <small id={`composer-note-${placement}`} className="composer-note">
        Motor de misión por calcular: el envío se activa con los perfiles y el matcher DEMO · sin IA.
      </small>
    </form>
  )
}
