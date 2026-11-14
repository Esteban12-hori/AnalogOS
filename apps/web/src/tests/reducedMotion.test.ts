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
