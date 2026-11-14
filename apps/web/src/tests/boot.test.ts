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

describe('posición del póster previo a React', () => {
  it('coincide al píxel con el globo 3D en el área libre base (móvil, laptop y monitores grandes)', () => {
    for (const [w, h] of VIEWPORTS) {
      const insets = baseStageInsets(w, h)
      const radius = globeScreenRadius(w, h, insets)
      const center = globeScreenCenter(w, h, insets)
      const layout = posterLayout(w, h, insets)
      expect(layout.size).toBeCloseTo(2 * radius * (445 / 396.5), 6)
      expect(layout.left + layout.size / 2).toBeCloseTo(center.x, 6)
      expect(layout.top + layout.size / 2).toBeCloseTo(center.y, 6)
      // La capa de arranque (anillo, silueta, bitácora) usa exactamente la misma geometría.
      const geometry = orbitGeometry(w, h)
      expect(geometry.radius).toBeCloseTo(radius, 6)
      expect(geometry.x).toBeCloseTo(center.x, 6)
      expect(geometry.y).toBeCloseTo(center.y, 6)
    }
  })

  it('sin márgenes conserva la fórmula original (globo centrado en el viewport)', () => {
    const layout = posterLayout(1440, 900)
    expect(layout.size).toBeCloseTo(2 * globeScreenRadius(1440, 900) * (445 / 396.5), 6)
    expect(layout.left + layout.size / 2).toBeCloseTo(720, 6)
  })
})

describe('script en línea del arranque (index.html, antes de React)', () => {
  const read = (path: string) => inlineModule(readFileSync(resolve(__dirname, path), 'utf8'))
  const script = bootHeadScript(read('../shell/stageGeometry.js'), read('../boot/posterLayout.js'))

  /** Ejecuta el script con un navegador mínimo y devuelve las variables y el modo que deja en <html>. */
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

  it('escribe las mismas variables --boot-* que BootLayer en cada tramo (al píxel)', () => {
    for (const [w, h] of VIEWPORTS) {
      const { vars } = run(w, h)
      const expected = orbitVars(orbitGeometry(w, h))
      for (const [name, value] of Object.entries(expected)) expect(parseFloat(vars[name] ?? 'NaN')).toBeCloseTo(parseFloat(value), 6)
    }
  })

  it('mismo modo que resolveIntroMode: ?intro=full, sesión ya vista o normal', () => {
    expect(run(1440, 900).mode).toBe('normal')
    expect(run(1440, 900, '', { [INTRO_SESSION_KEY]: '1' }).mode).toBe('quiet')
    expect(run(1440, 900, '?intro=full', { [INTRO_SESSION_KEY]: '1' }).mode).toBe('full')
    expect(run(1440, 900, '', 'throws').mode).toBe('normal')
  })
})

describe('capa de arranque: HTML estático = primer render de React', () => {
  const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
  /** Estructura comparable: etiquetas, clases y texto (sin estilos ni URLs). */
  const shape = (html: string) =>
    html
      .replace(/<(\/?)(\w+)([^>]*)>/g, (_, slash: string, tag: string, attrs: string) => {
        const cls = /class="([^"]*)"/.exec(attrs)?.[1]
        const state = /data-s="([^"]*)"/.exec(attrs)?.[1]
        return `<${slash}${tag}${cls ? `.${cls}` : ''}${state ? `[${state}]` : ''}>`
      })
      .replace(/<source>|<\/source>/g, '')

  it('mismas cajas, clases e hitos iniciales (el paso a React no salta)', () => {
    const react = renderToStaticMarkup(createElement(BootLayer, { data: loading }))
    const html = staticBootHtml({ posterUrl: './assets/globe-poster.webp' })
    expect(shape(react)).toBe(shape(html))
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<source media="(min-width: 1100px)" srcset="./assets/globe-poster.webp">')
  })

  it('el armazón estático monta la capa en stage.overlay, bajo los paneles', () => {
    const html = staticShellHtml({ posterUrl: './p.webp' })
    expect(html.indexOf('data-slot="stage.overlay"')).toBeGreaterThan(html.indexOf('class="stage"'))
    expect(html.indexOf('data-slot="stage.overlay"')).toBeLessThan(html.indexOf('class="topbar"'))
    expect(html).toContain('Snapshot científico · validando')
    // Sin URL de póster (tests, dev) no hay imagen: el móvil nunca la descarga.
    expect(staticShellHtml()).not.toContain('<picture>')
  })
})

describe('el anillo orbital y la bitácora no invaden la barra ni el dock', () => {
  it('la órbita (inclinada desde 1100 px) cabe en el área libre base', () => {
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

  it('boot.css reserva la franja de leyenda bajo la bitácora y usa los mismos factores', () => {
    const css = readFileSync(resolve(__dirname, '../features/boot/boot.css'), 'utf8')
    expect(css).toContain('calc(var(--boot-fb, 100vh) - 140px)')
    expect(css).toContain('width: calc(var(--boot-s) * .94)')
    expect(css).toContain('rotate(-12deg) scaleX(1.32)')
    // Nada de blur ni bucles infinitos en la capa de arranque.
    expect(css).not.toMatch(/backdrop-filter|infinite/)
    // El modo «ya vista» oculta la órbita del arranque, nunca la de la espera de la IA (sin data-phase).
    expect(css).toContain(':root[data-boot="quiet"] .boot[data-phase] .boot-orbit')
    expect(css).not.toMatch(/:root\[data-boot="quiet"\] \.boot-orbit/)
  })
})

describe('textura adaptativa del globo', () => {
  it('usa 2K en teléfonos y pantallas comunes, 4K en Retina grandes', async () => {
    const { pickGlobeTexture } = await import('../data/preload')
    expect(pickGlobeTexture(412, 823, 1.75)).toBe('2k')
    expect(pickGlobeTexture(1366, 768, 1)).toBe('2k')
    expect(pickGlobeTexture(1440, 900, 2)).toBe('4k')
    expect(pickGlobeTexture(2560, 1440, 1)).toBe('4k')
  })

  it('hideBootStage retira el póster por el estado de la capa de arranque (sin tocar el DOM)', async () => {
    const { bootPoster, hideBootStage } = await import('../data/preload')
    expect(bootPoster.getState().hidden).toBe(false)
    hideBootStage()
    expect(bootPoster.getState().hidden).toBe(true)
    bootPoster.reset()
  })
})
