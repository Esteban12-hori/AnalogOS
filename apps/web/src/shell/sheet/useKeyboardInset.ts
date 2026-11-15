/**
 * Teclado virtual en móvil (ADR-014): VisualViewport → `--kb-inset` en <html>, sin
 * `interactive-widget`. El composer sube con el teclado y el carrusel se pliega.
 */
import { useEffect, useState } from 'react'

/** Menos que esto es la barra de direcciones del navegador, no un teclado. */
export const KEYBOARD_MIN_PX = 80

/** Píxeles que el teclado tapa por abajo (0 si no hay teclado). Función pura. */
export function keyboardInsetFrom(innerHeight: number, viewportHeight: number, viewportOffsetTop: number): number {
  if (![innerHeight, viewportHeight, viewportOffsetTop].every(Number.isFinite)) return 0
  const covered = Math.round(innerHeight - viewportHeight - viewportOffsetTop)
  return covered >= KEYBOARD_MIN_PX ? covered : 0
}

export function useKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const viewport = typeof window === 'undefined' ? undefined : window.visualViewport
    if (!enabled || !viewport) return
    let frame = 0
    const update = () => {
      frame = 0
      const next = keyboardInsetFrom(window.innerHeight, viewport.height, viewport.offsetTop)
      document.documentElement.style.setProperty('--kb-inset', `${next}px`)
      setInset(next)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    viewport.addEventListener('resize', schedule)
    viewport.addEventListener('scroll', schedule)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', schedule)
      viewport.removeEventListener('scroll', schedule)
      document.documentElement.style.removeProperty('--kb-inset')
    }
  }, [enabled])
  return inset
}
