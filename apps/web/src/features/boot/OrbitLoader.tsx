/**
 * Reusable orbit for waiting on the AI (docs/UX_REDESIGN.md §2.3 C, §4.4).
 * - 0–300 ms: nothing (anti-flicker). From 300 ms it enters with the real phase.
 * - 'inline': ring of 14 px next to the text.
 * - 'globe': the same startup orbit returns around the globe (BootLayer draws it on the
 *   stage, only while the global view is on screen). No text is painted here: the phase is already in the
 *   composer's status line (or in S1's "Proponiendo…"), and a loose label in the overlay
 *   ended up in the corner, on top of the logo.
 * The satellite makes at most 2 laps of 2,4 s (in phase with the composer's light if it uses
 * ORBIT_DELAY_MS and ORBIT_LOOP_MS) and then stays still. It does not announce: the composer calls announce().
 */
import { useEffect } from 'react'
import { requestStageOrbit } from './milestones'
import type { OrbitLoaderProps } from './index'
import './boot.css'

export function OrbitLoader({ active, label, placement = 'inline' }: OrbitLoaderProps) {
  useEffect(() => (active && placement === 'globe' ? requestStageOrbit() : undefined), [active, placement])
  if (!active || placement === 'globe') return null
  return (
    <span className="boot-inline" data-placement={placement}>
      <span className="boot-mini" aria-hidden="true">
        <span className="boot-ring"><span className="boot-sat" /></span>
      </span>
      <span>{label}</span>
    </span>
  )
}
