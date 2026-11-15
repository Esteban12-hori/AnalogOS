/**
 * Mission composer (docs/UX_REDESIGN.md §3.2 and §2.3 C/D, on top of the team planner, ADR-013).
 *
 * - Explore: "Describe the test…" pill (the same box that the static HTML renders).
 * - Mission: the form (`MissionComposer`).
 * - S1: "Refine" button that asks to return to the inbox.
 * None of them carries ✦: that glyph means "AI only" (shell/glyphs.ts) and "Send" never calls the AI.
 * - Keys: "/" opens the composer from outside a text field; Esc cancels the wait for the AI.
 *
 * The main chunk carries only the view: controller, planner, validators, AI client,
 * "Your mission", recents and suggestions travel in the mission chunk.
 */
import { useEffect } from 'react'
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
 * "/" is a single-character shortcut (WCAG 2.1.4): it only acts when focus is on the page or on the
 * stage, never on tabs, lists or buttons (voice control, screen readers).
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
        // An open popover is closed first; the mission is only cancelled if it is waiting.
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
          {waiting ? 'Proposing…' : 'Refine'}
        </button>
        <GlobeOrbit active={waiting && wait !== 'quiet'} label="Proposing requirements…" />
      </>
    )
  }

  if (mode === 'explorar') {
    return (
      <button type="button" className="composer-pill" data-placement={placement} aria-keyshortcuts="/" onClick={openMission}>
        <span className="composer-pill-text">{PROMPT}</span>
        <kbd aria-hidden="true">/</kbd>
      </button>
    )
  }

  return <MissionComposer data={data} placement={placement} />
}
