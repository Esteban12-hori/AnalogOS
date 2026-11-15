import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { posterLayout } from '../boot/posterLayout.js'
import { staticBootHtml, staticShellHtml } from '../content/shell'
import { globeScreenCenter, globeScreenRadius } from '../domain/mapZoom'
import { BootLayer } from '../features/boot'
import { INTRO_SESSION_KEY, orbitGeometry, orbitVars, ringExtent } from '../features/boot/bootModel'
import { bootHeadScript, inlineModule } from '../features/boot/loadingHints'
import type { AppData } from '../shell/appData'
import { baseStageInsets, chromeTop } from '../shell/stageGeometry.js'

const VIEWPORTS = [[390, 844], [360, 640], [844, 390], [1024, 768], [1100, 700], [1280, 720], [1440, 900], [1920, 1080], [3840, 2160]] as const

describe('pre-React poster position', () => {
  it('matches the 3D globe to the pixel in the base free area (mobile, laptop and large monitors)', () => {
    for (const [w, h] of VIEWPORTS) {
      const insets = baseStageInsets(w, h)
      const radius = globeScreenRadius(w, h, insets)
      const center = globeScreenCenter(w, h, insets)
      const layout = posterLayout(w, h, insets)
      expect(layout.size).toBeCloseTo(2 * radius * (445 / 396.5), 6)
      expect(layout.left + layout.size / 2).toBeCloseTo(center.x, 6)
      expect(layout.top + layout.size / 2).toBeCloseTo(center.y, 6)
      // The boot layer (ring, silhouette, log) uses exactly the same geometry.
      const geometry = orbitGeometry(w, h)
      expect(geometry.radius).toBeCloseTo(radius, 6)
      expect(geometry.x).toBeCloseTo(center.x, 6)
      expect(geometry.y).toBeCloseTo(center.y, 6)
    }
  })

  it('without insets it keeps the original formula (globe centered in the viewport)', () => {
    const layout = posterLayout(1440, 900)
    expect(layout.size).toBeCloseTo(2 * globeScreenRadius(1440, 900) * (445 / 396.5), 6)
    expect(layout.left + layout.size / 2).toBeCloseTo(720, 6)
  })
})

describe('inline boot script (index.html, before React)', () => {
  const read = (path: string) => inlineModule(readFileSync(resolve(__dirname, path), 'utf8'))
  const script = bootHeadScript(read('../shell/stageGeometry.js'), read('../boot/posterLayout.js'))

  /** Runs the script with a minimal browser and returns the variables and the mode it leaves on <html>. */
  function run(width: number, height: number, search = '', session: Record<string, string> | 'throws' = {}) {
    const vars: Record<string, string> = {}
    const attrs: Record<string, string> = {}
    const documentElement = { style: { setProperty: (name: string, value: string) => (vars[name] = value) }, setAttribute: (name: string, value: string) => (attrs[name] = value) }
    const sessionStorage = {
      getItem(key: string) {
        if (session === 'throws') throw new Error('bloqueado')
        return session[key] ?? null
      },
    }
    new Function('innerWidth', 'innerHeight', 'document', 'location', 'sessionStorage', 'addEventListener', 'URLSearchParams', script)(
      width, height, { documentElement }, { search }, sessionStorage, () => undefined, URLSearchParams,
    )
    return { vars, mode: attrs['data-boot'] }
  }

  it('writes the same --boot-* variables as BootLayer in each breakpoint (to the pixel)', () => {
    for (const [w, h] of VIEWPORTS) {
      const { vars } = run(w, h)
      const expected = orbitVars(orbitGeometry(w, h))
      for (const [name, value] of Object.entries(expected)) expect(parseFloat(vars[name] ?? 'NaN')).toBeCloseTo(parseFloat(value), 6)
    }
  })

  it('same mode as resolveIntroMode: ?intro=full, session already seen or normal', () => {
    expect(run(1440, 900).mode).toBe('normal')
    expect(run(1440, 900, '', { [INTRO_SESSION_KEY]: '1' }).mode).toBe('quiet')
    expect(run(1440, 900, '?intro=full', { [INTRO_SESSION_KEY]: '1' }).mode).toBe('full')
    expect(run(1440, 900, '', 'throws').mode).toBe('normal')
  })
})

describe('boot layer: static HTML = first React render', () => {
  const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
  /** Comparable structure: tags, classes, and text (without styles or URLs). */
  const shape = (html: string) =>
    html
      .replace(/<(\/?)(\w+)([^>]*)>/g, (_, slash: string, tag: string, attrs: string) => {
        const cls = /class="([^"]*)"/.exec(attrs)?.[1]
        const state = /data-s="([^"]*)"/.exec(attrs)?.[1]
        return `<${slash}${tag}${cls ? `.${cls}` : ''}${state ? `[${state}]` : ''}>`
      })
      .replace(/<source>|<\/source>/g, '')

  it('same boxes, classes and initial milestones (the handover to React does not jump)', () => {
    const react = renderToStaticMarkup(createElement(BootLayer, { data: loading }))
    const html = staticBootHtml({ posterUrl: './assets/globe-poster.webp' })
    expect(shape(react)).toBe(shape(html))
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<source media="(min-width: 1100px)" srcset="./assets/globe-poster.webp">')
  })

  it('the static shell mounts the layer in stage.overlay, under the panels', () => {
    const html = staticShellHtml({ posterUrl: './p.webp' })
    expect(html.indexOf('data-slot="stage.overlay"')).toBeGreaterThan(html.indexOf('class="stage"'))
    expect(html.indexOf('data-slot="stage.overlay"')).toBeLessThan(html.indexOf('class="topbar"'))
    expect(html).toContain('Scientific snapshot · validating')
    // Without a poster URL (tests, dev) there is no image: mobile never downloads it.
    expect(staticShellHtml()).not.toContain('<picture>')
  })
})

describe('the orbital ring and the log do not invade the bar or the dock', () => {
  it('the orbit (tilted from 1100 px) fits in the base free area', () => {
    for (const [w, h] of VIEWPORTS) {
      const g = orbitGeometry(w, h)
      const ring = ringExtent(g.size, w >= 1100)
      const insets = baseStageInsets(w, h)
      expect(g.y - ring.halfHeight).toBeGreaterThanOrEqual(chromeTop(w) - 1)
      expect(g.y + ring.halfHeight).toBeLessThanOrEqual(h - insets.bottom + 1)
      expect(g.x - ring.halfWidth).toBeGreaterThanOrEqual(insets.left - 1)
      expect(g.x + ring.halfWidth).toBeLessThanOrEqual(w - insets.right + 1)
    }
  })

  it('boot.css reserves the legend strip under the log and uses the same factors', () => {
    const css = readFileSync(resolve(__dirname, '../features/boot/boot.css'), 'utf8')
    expect(css).toContain('calc(var(--boot-fb, 100vh) - 140px)')
    expect(css).toContain('width: calc(var(--boot-s) * .94)')
    expect(css).toContain('rotate(-12deg) scaleX(1.32)')
    // No blur or infinite loops in the boot layer.
    expect(css).not.toMatch(/backdrop-filter|infinite/)
    // The "already seen" mode hides the boot orbit, never the one for the AI wait (without data-phase).
    expect(css).toContain(':root[data-boot="quiet"] .boot[data-phase] .boot-orbit')
    expect(css).not.toMatch(/:root\[data-boot="quiet"\] \.boot-orbit/)
  })
})

describe('adaptive globe texture', () => {
  it('uses 2K on phones and common screens, 4K on large Retina displays', async () => {
    const { pickGlobeTexture } = await import('../data/preload')
    expect(pickGlobeTexture(412, 823, 1.75)).toBe('2k')
    expect(pickGlobeTexture(1366, 768, 1)).toBe('2k')
    expect(pickGlobeTexture(1440, 900, 2)).toBe('4k')
    expect(pickGlobeTexture(2560, 1440, 1)).toBe('4k')
  })

  it('hideBootStage removes the poster through the boot layer state (without touching the DOM)', async () => {
    const { bootPoster, hideBootStage } = await import('../data/preload')
    expect(bootPoster.getState().hidden).toBe(false)
    hideBootStage()
    expect(bootPoster.getState().hidden).toBe(true)
    bootPoster.reset()
  })
})
