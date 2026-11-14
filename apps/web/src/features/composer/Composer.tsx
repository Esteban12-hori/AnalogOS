/**
 * Composer de misión (incremento 9, docs/UX_REDESIGN.md §3.2 y §2.3 C/D).
 *
 * - Explorar: píldora «✦ Describe el trabajo…» (la misma caja que pinta el HTML estático).
 * - Misión: el formulario (`MissionComposer`).
 * - S1: botón «✦ Refinar» que pide volver a la bandeja.
 * - Teclas: «/» abre el composer desde fuera de un campo de texto; Esc cancela la espera.
 *
 * El chunk principal lleva solo la vista: orquestador, motor, contratos, tarjeta «Tu misión»,
 * recientes y chips viajan en el chunk de misión, que se precarga al entrar a Misión.
 */
import { useEffect } from 'react'
import { GLYPH } from '../../shell/public'
import { uiActions, useUi } from '../../state/ui'
import { useComposer } from './composerStore'
import { focusComposer } from './focus'
import { isWaitingPhase, phaseLabel } from './labels'
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

export function Composer({ data, placement, onRequestTray }: ComposerProps) {
  const mode = useUi((state) => state.mode)
  const phase = useUi((state) => state.missionPhase)
  const run = useComposer((state) => state.run)
  const wait = useComposer((state) => state.wait)
  const waiting = run !== null && isWaitingPhase(phase)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Escape') {
        // Un popover abierto se cierra primero; la misión solo se cancela si se está esperando.
        if (!waiting || anyPopoverOpen()) return
        event.preventDefault()
        withController((mission) => mission.cancel())
      } else if (event.key === '/' && !isEditable(event.target)) {
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
          <span aria-hidden="true">{GLYPH.ai}</span> {waiting ? 'Interpretando…' : 'Refinar'}
        </button>
        <GlobeOrbit active={waiting && wait !== 'quiet'} label={phaseLabel(phase, run?.interpreter ?? null)} />
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
