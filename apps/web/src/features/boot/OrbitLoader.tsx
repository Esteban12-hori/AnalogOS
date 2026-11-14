/**
 * Órbita reutilizable para la espera de la IA (docs/UX_REDESIGN.md §2.3 C, §4.4).
 * - 0–300 ms: nada (anti-parpadeo). Desde 300 ms entra con la fase real.
 * - 'inline': anillo de 14 px junto al texto.
 * - 'globe': la misma órbita del arranque vuelve alrededor del globo (la dibuja BootLayer en el
 *   escenario, solo con la vista global en pantalla); aquí queda el texto de la fase.
 * El satélite da 2 vueltas de 2,4 s como máximo (en fase con la luz del composer si esta usa
 * ORBIT_DELAY_MS y ORBIT_LOOP_MS) y luego queda quieto. No anuncia: el composer llama announce().
 */
import { useEffect } from 'react'
import { requestStageOrbit } from './milestones'
import type { OrbitLoaderProps } from './index'
import './boot.css'

export function OrbitLoader({ active, label, placement = 'inline' }: OrbitLoaderProps) {
  useEffect(() => (active && placement === 'globe' ? requestStageOrbit() : undefined), [active, placement])
  if (!active) return null
  return (
    <span className="boot-inline" data-placement={placement}>
      {placement === 'inline' && (
        <span className="boot-mini" aria-hidden="true">
          <span className="boot-ring"><span className="boot-sat" /></span>
        </span>
      )}
      <span>{label}</span>
    </span>
  )
}
