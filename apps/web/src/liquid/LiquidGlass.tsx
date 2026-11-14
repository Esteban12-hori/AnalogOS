/**
 * Infraestructura global del liquid glass:
 * - LiquidBackdrop: manchas de color en movimiento lento detrás de todo (el vidrio necesita algo que refractar)
 *   y el filtro SVG de refracción que usan los controles en Chromium.
 * - useLiquidPointer: un único listener que mueve el brillo especular (--lg-x/--lg-y) de la superficie bajo el cursor.
 * Estilos en liquid-glass.css.
 */
import { useEffect } from 'react'

/** Superficies que siguen al cursor. Debe coincidir con los grupos de liquid-glass.css. */
export const LIQUID_SURFACES = [
  '.glass',
  '.candidate-card',
  '.comparison-card',
  '.metric',
  '.criterion-row',
  '.method-steps li',
  '.two-column-notes > div',
  '.detail-actions button',
  '.view-switch',
  '.globe-label',
  '.map-legend',
  '.map-heading > div',
  '.offline-chip',
  '.warning-box',
  '.ranking-note',
].join(', ')

function supportsRefraction(): boolean {
  if (typeof navigator === 'undefined' || typeof CSS === 'undefined') return false
  const ua = navigator.userAgent
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && CSS.supports('backdrop-filter', 'url(#a)')
}

export function useLiquidPointer() {
  useEffect(() => {
    const root = document.documentElement
    if (supportsRefraction()) root.classList.add('lg-refract')
    if (window.matchMedia?.('(hover: none)').matches) return () => root.classList.remove('lg-refract')

    let frame = 0
    let pending: { el: HTMLElement; x: number; y: number } | null = null
    const flush = () => {
      frame = 0
      if (!pending) return
      const { el, x, y } = pending
      el.style.setProperty('--lg-x', `${x}px`)
      el.style.setProperty('--lg-y', `${y}px`)
      pending = null
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return
      // La superficie más interna bajo el cursor es la que recibe el brillo.
      const el = event.target.closest<HTMLElement>(LIQUID_SURFACES)
      if (!el) return
      const rect = el.getBoundingClientRect()
      pending = { el, x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (!frame) frame = requestAnimationFrame(flush)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
      root.classList.remove('lg-refract')
    }
  }, [])
}

export function LiquidBackdrop() {
  return (
    <>
      <div className="lg-backdrop" aria-hidden="true">
        <span className="lg-blob lg-blob-blue" />
        <span className="lg-blob lg-blob-orange" />
        <span className="lg-blob lg-blob-deep" />
      </div>
      <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.022" numOctaves="2" seed="11" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  )
}
