import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion, REDUCED_MOTION_QUERY, subscribeReducedMotion, useReducedMotion } from '../shell/useReducedMotion'

function fakeMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    matches,
    addEventListener: vi.fn((_: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: () => void) => listeners.delete(listener)),
  }
  const matchMedia = vi.fn((text: string) => {
    expect(text).toBe(REDUCED_MOTION_QUERY)
    return query as unknown as MediaQueryList
  })
  return { matchMedia, query, fire: () => listeners.forEach((listener) => listener()), listeners }
}

describe('useReducedMotion', () => {
  it('lee la preferencia del sistema', () => {
    expect(prefersReducedMotion(fakeMatchMedia(true).matchMedia)).toBe(true)
    expect(prefersReducedMotion(fakeMatchMedia(false).matchMedia)).toBe(false)
    expect(prefersReducedMotion(null)).toBe(false)
  })

  it('escucha los cambios y se desuscribe', () => {
    const media = fakeMatchMedia(false)
    const listener = vi.fn()
    const unsubscribe = subscribeReducedMotion(listener, media.matchMedia)
    media.fire()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(media.listeners.size).toBe(0)
  })

  it('en el servidor (sin matchMedia) devuelve false', () => {
    function Probe() {
      return createElement('span', null, useReducedMotion() ? 'reducido' : 'normal')
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe('<span>normal</span>')
  })
})

// ---- Transparencia reducida, vidrio y contraste del armazón (§2.4, §6.1, WCAG 1.4.3) ---------
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8')

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

describe('vidrio y transparencia reducida', () => {
  it('prefers-reduced-transparency: tinte sólido sin blur en las superficies del armazón', () => {
    const tokens = css('shell/tokens.css')
    const block = tokens.slice(tokens.indexOf('@media (prefers-reduced-transparency: reduce)'))
    expect(block).toMatch(/--glass-blur: none/)
    expect(block).toMatch(/--glass-tint: rgba\(4, 12, 18, \.96\)/)
    expect(block).toMatch(/--topbar-tint: rgba\(2, 7, 10, \.96\)/)
  })

  it('la barra superior es tinte sin blur: ninguna hoja de estilos le vuelve a poner backdrop-filter', () => {
    expect(css('liquid/liquid-glass.css')).not.toMatch(/\.topbar\s*\{[^}]*backdrop-filter/)
    expect(css('shell/shell.css')).toMatch(/\.topbar \{[^}]*backdrop-filter: none;/)
  })

  it('ningún bucle infinito en el armazón legado (spinner acotado, pulso único, manchas sin repetir)', () => {
    const styles = css('styles.css')
    expect(styles).not.toMatch(/\.loader \{[^}]*infinite/)
    expect(styles).not.toMatch(/markerPulse [^;]*infinite/)
    expect(css('liquid/liquid-glass.css')).not.toMatch(/lgDrift[ABC] [^;]*infinite/)
  })

  it('pestaña de modo activa: blanco sobre el pulgar ≥ 4,5:1', () => {
    expect(css('shell/tokens.css')).toMatch(/--mode-thumb: #0274AD;/)
    expect(contrast('#FFFFFF', '#0274AD')).toBeGreaterThanOrEqual(4.5)
  })
})
