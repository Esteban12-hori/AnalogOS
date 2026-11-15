import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { staticShellHtml } from '../content/shell'
import type { CandidateSite, DataManifest, MissionProfile } from '../domain/contracts'
import { formatScore } from '../domain/formatting'
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import type { AppData } from '../shell/appData'
import { AppShell } from '../shell/AppShell'
import { detailTabs, FullDetail } from '../shell/detail/FullDetail'
import { baseStageInsets, railWidth, sheetDetentHeights, stageInsetsFor, STAGE_GEOMETRY, stageTramo, viewportLayout } from '../shell/layout'
import { dataAttribution, dataAttributionText } from '../shell/attribution'
import { RightRail } from '../shell/RightRail'
import { keyboardInsetFrom, KEYBOARD_MIN_PX } from '../shell/sheet/useKeyboardInset'
import { nextTabIndex } from '../shell/Tabs'
import { uiStore } from '../state/ui'

const root = resolve(__dirname, '../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const snapshot: DemoSnapshot = {
  candidates,
  manifest: read('artifacts/science-v2/manifest.json') as DataManifest,
  profile: read('artifacts/science-v2/mission-profile.json') as MissionProfile,
  chileOutline: { type: 'FeatureCollection', features: [] },
  surfaceSeries: new Map(),
  marsReference: null,
}
const ready: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }

afterEach(() => uiStore.reset())

describe('layout del escenario fijo (ADR-008)', () => {
  it('tres tramos y variantes compactas', () => {
    expect(stageTramo(1440)).toBe('wide')
    expect(stageTramo(1439)).toBe('medium')
    expect(stageTramo(1100)).toBe('medium')
    expect(stageTramo(1099)).toBe('narrow')
    expect(viewportLayout(1280, 800).compact).toBe(true)
    expect(viewportLayout(844, 390).sideSheet).toBe(true)
    expect(viewportLayout(390, 844).sideSheet).toBe(false)
  })

  it('el riel mide clamp(340, 26vw, 380)', () => {
    expect(railWidth(1100)).toBe(340)
    expect(railWidth(1400)).toBe(364)
    expect(railWidth(2560)).toBe(380)
  })

  it('las alturas de la hoja crecen S0 < S1 < S2 y S2 deja ver la barra superior', () => {
    for (const [w, h] of [[390, 844], [360, 640], [1024, 768]] as const) {
      const heights = sheetDetentHeights(w, h)
      expect(heights.S0).toBeLessThan(heights.S1)
      expect(heights.S1).toBeLessThan(heights.S2)
      expect(heights.S2).toBe(h - baseStageInsets(w, h).top)
    }
  })

  it('los márgenes siguen al riel, al panel izquierdo y a la hoja; la base no los incluye', () => {
    const base = { width: 1440, height: 900, mode: 'explorar' as const, railOpen: false, railFull: false, detent: 'S0' as const }
    expect(stageInsetsFor(base)).toEqual(baseStageInsets(1440, 900))
    expect(stageInsetsFor({ ...base, railOpen: true }).right).toBe(railWidth(1440) + 2 * STAGE_GEOMETRY.gap)
    expect(stageInsetsFor({ ...base, railOpen: true, railFull: true }).right).toBe(520 + 24)
    expect(stageInsetsFor({ ...base, mode: 'mision' }).left).toBe(360 + 24)
    expect(stageInsetsFor({ ...base, width: 1280, mode: 'mision' }).left).toBe(0)
    const phone = { ...base, width: 390, height: 844 }
    expect(stageInsetsFor(phone).bottom).toBe(sheetDetentHeights(390, 844).S0)
    expect(stageInsetsFor({ ...phone, detent: 'S1' }).bottom).toBe(sheetDetentHeights(390, 844).S1)
    expect(stageInsetsFor({ ...phone, detent: 'S2' }).bottom).toBe(sheetDetentHeights(390, 844).S1)
  })

  it('shell.css reserva las mismas alturas que stageGeometry.js (CLS 0 y póster al píxel)', () => {
    const css = readFileSync(resolve(__dirname, '../shell/shell.css'), 'utf8')
    const g = STAGE_GEOMETRY
    for (const declaration of [
      `--topbar-h: ${g.topbarNarrow}px`,
      `--topbar-h: ${g.topbarWide}px`,
      `--banner-h: ${g.banner}px`,
      `--gap: ${g.gap}px`,
      `--dock-h: ${g.dockTall}px`,
      `--dock-h: ${g.dockCompact}px`,
      `--sheet-s0: ${g.sheetS0Tall}px`,
      `--sheet-s0: ${g.sheetS0Compact}px`,
      `--left-w: ${g.leftPanel}px`,
      `--rail-full-w: ${g.railFull}px`,
      `clamp(${g.railMin}px, ${g.railVw * 100}vw, ${g.railMax}px)`,
      `(max-height: ${g.compactHeight - 1}px)`,
      `(max-height: ${g.sheetCompactHeight - 1}px)`,
      `(min-width: ${g.medium}px)`,
    ]) {
      expect(css).toContain(declaration)
    }
  })
})

describe('utilidades del armazón', () => {
  it('teclado virtual: ignora la barra del navegador y entradas no finitas', () => {
    expect(keyboardInsetFrom(844, 844, 0)).toBe(0)
    expect(keyboardInsetFrom(844, 844 - (KEYBOARD_MIN_PX - 1), 0)).toBe(0)
    expect(keyboardInsetFrom(844, 500, 0)).toBe(344)
    expect(keyboardInsetFrom(844, 500, 20)).toBe(324)
    expect(keyboardInsetFrom(Number.NaN, 500, 0)).toBe(0)
  })

  it('pestañas APG: flechas circulares, Inicio y Fin', () => {
    expect(nextTabIndex('ArrowRight', 1, 2)).toBe(0)
    expect(nextTabIndex('ArrowLeft', 0, 2)).toBe(1)
    expect(nextTabIndex('Home', 4, 6)).toBe(0)
    expect(nextTabIndex('End', 0, 6)).toBe(5)
    expect(nextTabIndex('a', 0, 6)).toBeNull()
  })

  it('formatScore usa 1 decimal fijo: «50,0» y «77,5»', () => {
    expect(formatScore(49.99)).toBe('50,0')
    expect(formatScore(77.45)).toBe('77,5')
    expect(formatScore(75.67)).toBe('75,7')
    expect(formatScore(null)).toBe('—')
  })
})

describe('armazón: slots montados', () => {
  it('el HTML estático ya no tiene el hero y reserva dock y bandeja', () => {
    const html = staticShellHtml()
    expect(html).not.toContain('No buscamos')
    expect(html).toContain('class="dock"')
    expect(html).toContain('class="sheet" data-detent="S0"')
    expect(html).toContain('NO ES AUTORIZACIÓN DE TERRENO')
  })

  it('mientras carga: barra con pestañas de modo, dock con lugares y composer, sin ficha flotante', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html).toContain('role="tablist" aria-label="Modo"')
    expect(html).toContain('id="mode-panel" role="tabpanel"')
    expect(html).toContain('Cargando snapshot validado')
    expect(html).toContain('composer-pill')
    expect(html).not.toContain('No buscamos')
    expect(html).not.toContain('details-panel')
  })

  it('el riel muestra el lugar y «Ver ficha completa»; la ficha completa trae las pestañas', () => {
    const selection = { siteId: 'cl-pampa-yungay-screening', kind: 'evaluated' as const, preview: false }
    const rail = renderToStaticMarkup(
      <RightRail data={ready} tramo="wide" selection={selection} full={false} onFullChange={() => undefined} onShowOnMap={() => undefined} />,
    )
    expect(rail).toContain('Pampa Yungay')
    expect(rail).toContain('Ver ficha completa')
    expect(rail).toContain('75,7')
    const full = renderToStaticMarkup(
      <FullDetail data={ready} site={candidates[0] as CandidateSite} placement="rail" onShowOnMap={() => undefined} />,
    )
    for (const label of ['Métricas', 'Lectura IA', 'Señal', 'Comparar', 'Método', 'Fuentes']) expect(full).toContain(label)
    expect(detailTabs('sheet', 'mision')).toContain('mision')
    expect(detailTabs('rail', 'mision')).not.toContain('mision')
  })

  it('el riel cerrado queda inert y sin contenido', () => {
    const rail = renderToStaticMarkup(
      <RightRail data={ready} tramo="medium" selection={null} full={false} onFullChange={() => undefined} onShowOnMap={() => undefined} />,
    )
    expect(rail).toContain('inert=""')
    expect(rail).not.toContain('rail-head')
  })
})

describe('atribución, aviso y orden del armazón (CLAUDE.md: atribución siempre visible)', () => {
  it('la atribución sale del manifiesto: las fuentes que producen los %, sin métricas propias ni inventarios', () => {
    expect(dataAttribution(snapshot.manifest)).toEqual(['NASADEM', 'Copernicus Sentinel-2', 'MOLA (PDS)', 'NASA POWER', 'Natural Earth'])
    expect(dataAttributionText({ datasets: [] })).toBeNull()
  })

  it('Explorar sin selección: la línea de datos va en la franja del escenario (siempre montada)', () => {
    // MapStage necesita window (no se renderiza en Node): se verifica el cableado en el código.
    const shell = readFileSync(resolve(__dirname, '../shell/AppShell.tsx'), 'utf8')
    const stage = readFileSync(resolve(__dirname, '../features/globe/MapStage.tsx'), 'utf8')
    expect(shell).toMatch(/creditSlot=\{credit \? <p className="stage-data-credit">\{credit\}<\/p> : null\}/)
    // El armazón estático pinta la misma línea antes de React (mismo marcado y tamaño).
    expect(staticShellHtml({ credit: 'Datos: NASADEM' })).toContain('<div class="stage-dock" data-static=""><p class="stage-data-credit">Datos: NASADEM</p></div>')
    expect(stage).toMatch(/\{hudSlot\}\s*\{creditSlot\}\s*<\/div>/)
  })

  it('la barra superior va antes que el escenario en el DOM (orden de foco = orden visual) y hay main y h1', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html.indexOf('class="topbar"')).toBeLessThan(html.indexOf('class="stage"'))
    expect(html).toContain('<main class="app-main">')
    expect(html).toMatch(/<h1 class="sr-only">AnalogOS Chile<\/h1>/)
  })

  it('el aviso científico tiene texto accesible en todos los tramos (la versión corta no es aria-hidden)', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html).toContain('<span class="note-short">PRELIMINAR · NO AUTORIZA TERRENO</span>')
    expect(html).not.toMatch(/note-short" aria-hidden/)
  })
})
