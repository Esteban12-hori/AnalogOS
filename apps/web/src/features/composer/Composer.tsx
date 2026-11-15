/**
 * Composer de misión (docs/UX_REDESIGN.md §3.2 y §2.3 C/D, sobre el planificador del equipo, ADR-013).
 *
 * - Explorar: píldora «✦ Describe la prueba…» (la misma caja que pinta el HTML estático).
 * - Misión: el formulario (`MissionComposer`).
 * - S1: botón «✦ Refinar» que pide volver a la bandeja.
 * - Teclas: «/» abre el composer desde fuera de un campo de texto; Esc cancela la espera de la IA.
 *
 * El chunk principal lleva solo la vista: controlador, planificador, validadores, cliente de IA,
 * «Tu misión», recientes y sugerencias viajan en el chunk de misión.
 */
import { useEffect } from 'react'
import { GLYPH } from '../../shell/public'
import { uiActions, useUi } from '../../state/ui'
import { useComposer } from './composerStore'
import { focusComposer } from './focus'
import { isWaitingPhase } from './labels'
import { GlobeOrbit, MissionComposer, PROMPT } from './MissionComposer'
import { anyPopoverOpen } from './popover'
import { withController } from './runLoader'
import type { ComposerProps } from './index'
import './composer.css'

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

function openMission(): void {
  uiActions.setMode('mision')
  focusComposer()
}

/**
 * «/» es un atajo de un solo carácter (WCAG 2.1.4): solo actúa con el foco en la página o en el
 * escenario, nunca sobre pestañas, listas o botones (control por voz, lectores de pantalla).
 */
function slashAllowed(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false
  if (target === null || target === window || target === document || target === document.body || target === document.documentElement) return true
  return target instanceof Element && target.closest('.stage') !== null
}

export function Composer({ data, placement, onRequestTray }: ComposerProps) {
  const mode = useUi((state) => state.mode)
  const phase = useUi((state) => state.missionPhase)
  const wait = useComposer((state) => state.wait)
  const waiting = isWaitingPhase(phase)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Escape') {
        // Un popover abierto se cierra primero; la misión solo se cancela si se está esperando.
        if (!waiting || anyPopoverOpen()) return
        event.preventDefault()
        withController((mission) => mission.cancelDraft())
      } else if (event.key === '/' && !isEditable(event.target) && slashAllowed(event.target)) {
        event.preventDefault()
        if (placement === 'sheet-head') onRequestTray?.()
        else openMission()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placement, waiting, onRequestTray])

  if (placement === 'sheet-head') {
    return (
      <>
        <button type="button" className="composer-refine" aria-busy={waiting || undefined} onClick={() => onRequestTray?.()}>
          <span aria-hidden="true">{GLYPH.ai}</span> {waiting ? 'Proponiendo…' : 'Refinar'}
        </button>
        <GlobeOrbit active={waiting && wait !== 'quiet'} label="Proponiendo requisitos…" />
      </>
    )
  }

  if (mode === 'explorar') {
    return (
      <button type="button" className="composer-pill" data-placement={placement} aria-keyshortcuts="/" onClick={openMission}>
        <span aria-hidden="true">{GLYPH.ai}</span>
        <span className="composer-pill-text">{PROMPT}</span>
        <kbd aria-hidden="true">/</kbd>
      </button>
    )
  }

  return <MissionComposer data={data} placement={placement} />
}
