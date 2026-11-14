/**
 * Cifra que cambia sin interpolarse (docs/UX_REDESIGN.md §1.7 y §2.2): el valor nuevo aparece
 * ya final, con un fundido y un desplazamiento de 4 px que indica si subió (entra desde abajo)
 * o bajó (desde arriba). Se anima por ref con Web Animations: sin setState ni re-render.
 * Con reduced motion, solo opacidad en 120 ms.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../shell/public'

interface FadeNumberProps {
  /** Valor numérico que decide si hay cambio y su dirección (null = sin cifra). */
  value: number | string | null
  children: ReactNode
  className?: string
}

/** +4 si subió, −4 si bajó, 0 si no hay dirección (texto o nulo). */
export function fadeOffset(before: number | string | null, after: number | string | null): number {
  if (typeof before !== 'number' || typeof after !== 'number' || before === after) return 0
  return after > before ? 4 : -4
}

export function FadeNumber({ value, children, className }: FadeNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef<number | string | null | undefined>(undefined)
  useLayoutEffect(() => {
    const before = previous.current
    previous.current = value
    const element = ref.current
    if (before === undefined || before === value || !element || typeof element.animate !== 'function') return
    const reduced = prefersReducedMotion()
    const dy = fadeOffset(before, value)
    element.animate(
      reduced || dy === 0
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }],
      { duration: reduced ? 120 : 200, easing: 'cubic-bezier(.2, 0, 0, 1)' },
    )
  }, [value])
  return (
    <span ref={ref} className={className ? `metrics-num ${className}` : 'metrics-num'}>
      {children}
    </span>
  )
}
