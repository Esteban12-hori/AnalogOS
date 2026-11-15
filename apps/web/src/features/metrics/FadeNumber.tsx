/**
 * Figure that changes without interpolation (docs/UX_REDESIGN.md §1.7 and §2.2): the new value appears
 * already final, with a fade and a 4 px shift that indicates whether it went up (enters from below)
 * or down (from above). It is animated via ref with Web Animations: no setState or re-render.
 * With reduced motion, opacity only for 120 ms.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../shell/public'

interface FadeNumberProps {
  /** Numeric value that determines whether there is a change and its direction (null = no figure). */
  value: number | string | null
  children: ReactNode
  className?: string
}

/** +4 if it went up, −4 if it went down, 0 if there is no direction (text or null). */
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
