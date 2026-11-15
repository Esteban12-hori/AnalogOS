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
import { nextTabIndex, overflowEdges, revealDelta, TAB_EDGE_FADE } from '../shell/Tabs'
import { uiStore } from '../state/ui'

const root = resolve(__dirname, '../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const snapshot: DemoSnapshot = {
  candidates,
  manifest: read('artifacts/science-v2/manifest.json') as DataManifest,
  profile: read('artifacts/science-v2/mission-profile.json') as MissionProfile,
  outline: { type: 'FeatureCollection', features: [] },
  search: null,
  precedents: null,
  surfaceSeries: new Map(),
  marsReference: null,
}
const ready: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }

afterEach(() => uiStore.reset())

describe('fixed stage layout (ADR-014)', () => {
  it('three breakpoints and compact variants', () => {
    expect(stageTramo(1440)).toBe('wide')
    expect(stageTramo(1439)).toBe('medium')
    expect(stageTramo(1100)).toBe('medium')
    expect(stageTramo(1099)).toBe('narrow')
    expect(viewportLayout(1280, 800).compact).toBe(true)
    expect(viewportLayout(844, 390).sideSheet).toBe(true)
    expect(viewportLayout(390, 844).sideSheet).toBe(false)
  })

  it('the rail measures clamp(340, 26vw, 380)', () => {
    expect(railWidth(1100)).toBe(340)
    expect(railWidth(1400)).toBe(364)
    expect(railWidth(2560)).toBe(380)
  })

  it('sheet heights grow S0 < S1 < S2 and S2 lets the top bar show', () => {
    for (const [w, h] of [[390, 844], [360, 640], [1024, 768]] as const) {
      const heights = sheetDetentHeights(w, h)
      expect(heights.S0).toBeLessThan(heights.S1)
      expect(heights.S1).toBeLessThan(heights.S2)
      expect(heights.S2).toBe(h - baseStageInsets(w, h).top)
    }
  })

  it('insets follow the rail, the left panel and the sheet; the base does not include them', () => {
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

  it('shell.css reserves the same heights as stageGeometry.js (CLS 0 and poster to the pixel)', () => {
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

describe('shell utilities', () => {
  it('virtual keyboard: ignores the browser bar and non-finite inputs', () => {
    expect(keyboardInsetFrom(844, 844, 0)).toBe(0)
    expect(keyboardInsetFrom(844, 844 - (KEYBOARD_MIN_PX - 1), 0)).toBe(0)
    expect(keyboardInsetFrom(844, 500, 0)).toBe(344)
    expect(keyboardInsetFrom(844, 500, 20)).toBe(324)
    expect(keyboardInsetFrom(Number.NaN, 500, 0)).toBe(0)
  })

  it('APG tabs: circular arrows, Home and End', () => {
    expect(nextTabIndex('ArrowRight', 1, 2)).toBe(0)
    expect(nextTabIndex('ArrowLeft', 0, 2)).toBe(1)
    expect(nextTabIndex('Home', 4, 6)).toBe(0)
    expect(nextTabIndex('End', 0, 6)).toBe(5)
    expect(nextTabIndex('a', 0, 6)).toBeNull()
  })

  it('tab strip: marks the edges with hidden tabs and brings the active one out of the fade', () => {
    // Site sheet at 1440 with 8 tabs: 581 px of content in 486 visible px.
    expect(overflowEdges({ scrollLeft: 0, scrollWidth: 581, clientWidth: 486 })).toEqual({ start: false, end: true })
    expect(overflowEdges({ scrollLeft: 40, scrollWidth: 581, clientWidth: 486 })).toEqual({ start: true, end: true })
    expect(overflowEdges({ scrollLeft: 95, scrollWidth: 581, clientWidth: 486 })).toEqual({ start: true, end: false })
    expect(overflowEdges({ scrollLeft: 0, scrollWidth: 486.5, clientWidth: 486 })).toEqual({ start: false, end: false })
    // “Sources” at [1434−925, 1506−925] = [509, 581] of a 486 list: it scrolls until the tab is fully visible plus the fade.
    expect(revealDelta(509, 581, 486)).toBe(581 - (486 - TAB_EDGE_FADE))
    expect(revealDelta(100, 160, 486)).toBe(0)
    expect(revealDelta(10, 70, 486)).toBe(10 - TAB_EDGE_FADE)
    // Tab wider than the view: its start wins.
    expect(revealDelta(100, 700, 486)).toBe(100 - TAB_EDGE_FADE)
  })

  it('formatScore uses 1 fixed decimal: “50.0” and “77.5”', () => {
    expect(formatScore(49.99)).toBe('50.0')
    expect(formatScore(77.45)).toBe('77.5')
    expect(formatScore(75.67)).toBe('75.7')
    expect(formatScore(null)).toBe('—')
  })
})

describe('shell: mounted slots', () => {
  it('the static HTML no longer has the hero and reserves dock and tray', () => {
    const html = staticShellHtml()
    expect(html).not.toContain('No buscamos')
    expect(html).toContain('class="dock"')
    expect(html).toContain('class="sheet" data-detent="S0"')
    expect(html).toContain('NOT A TERRAIN AUTHORIZATION')
  })

  it('while loading: bar with mode tabs, dock with places and composer, no floating sheet', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html).toContain('role="tablist" aria-label="Mode"')
    expect(html).toContain('id="mode-panel" role="tabpanel"')
    expect(html).toContain('Loading validated snapshot')
    expect(html).toContain('composer-pill')
    expect(html).not.toContain('No buscamos')
    expect(html).not.toContain('details-panel')
  })

  it('the rail shows the place and “See full details”; the full sheet carries the tabs', () => {
    const selection = { siteId: 'cl-pampa-yungay-screening', kind: 'evaluated' as const, preview: false }
    const rail = renderToStaticMarkup(
      <RightRail data={ready} tramo="wide" selection={selection} full={false} onFullChange={() => undefined} onShowOnMap={() => undefined} />,
    )
    expect(rail).toContain('Pampa Yungay')
    expect(rail).toContain('See full details')
    expect(rail).toContain('75.7')
    const full = renderToStaticMarkup(
      <FullDetail data={ready} site={candidates[0] as CandidateSite} placement="rail" onShowOnMap={() => undefined} />,
    )
    for (const label of ['Metrics', 'Reading', 'Origin', 'Geology', 'Signal', 'Compare', 'Method', 'Sources']) expect(full).toContain(label)
    expect(full).not.toContain('Lectura IA')
    expect(full).toContain('Export site record (JSON source record)')
    expect(full).toContain('Evaluate this sector')
    expect(rail).toContain('Evaluate this sector')
    expect(detailTabs('sheet', 'mision')).toContain('mision')
    expect(detailTabs('rail', 'mision')).not.toContain('mision')
    expect(detailTabs('rail', 'explorar')).toContain('origen')
    expect(detailTabs('rail', 'explorar')).toContain('geologia')
  })

  it('v3: the sheet labels the known reference (REF) and the country; Method explains how they were searched', async () => {
    const { readyData, v3Snapshot } = await import('./v3Support')
    const ref = v3Snapshot.candidates.find((site) => site.role === 'reference') as CandidateSite
    const full = renderToStaticMarkup(<FullDetail data={readyData} site={ref} placement="rail" onShowOnMap={() => undefined} />)
    expect(full).toContain('REF · Known reference')
    expect(full).toContain('Chile')
    const { MethodTab } = await import('../shell/detail/MethodTab')
    const method = renderToStaticMarkup(<MethodTab data={readyData} />)
    expect(method).toContain('How they were searched')
    expect(method).toContain('50 evaluated of 50 attempted')
    expect(method).toContain('excluded from the ranking')
    expect(method).toContain('up to 3 per country')
    expect(method.match(/class="window /g)).toHaveLength(50)
    expect(method).toContain('search-results.json')
    expect(method).toContain('analysis-summary.json')
  })

  it('the closed rail is inert and empty', () => {
    const rail = renderToStaticMarkup(
      <RightRail data={ready} tramo="medium" selection={null} full={false} onFullChange={() => undefined} onShowOnMap={() => undefined} />,
    )
    expect(rail).toContain('inert=""')
    expect(rail).not.toContain('rail-head')
  })
})

describe('attribution, notice and shell order (CLAUDE.md: attribution always visible)', () => {
  it('attribution comes from the manifest: the sources that produce the %, without own metrics or inventories', () => {
    expect(dataAttribution(snapshot.manifest)).toEqual(['NASADEM', 'Copernicus Sentinel-2', 'MOLA (PDS)', 'NASA POWER', 'Natural Earth'])
    expect(dataAttributionText({ datasets: [] })).toBeNull()
  })

  it('Explore without selection: the data line goes in the stage strip (always mounted)', () => {
    // MapStage needs window (it does not render in Node): the wiring is checked in the code.
    const shell = readFileSync(resolve(__dirname, '../shell/AppShell.tsx'), 'utf8')
    const stage = readFileSync(resolve(__dirname, '../features/globe/MapStage.tsx'), 'utf8')
    expect(shell).toMatch(/creditSlot=\{credit \? <p className="stage-data-credit">\{credit\}<\/p> : null\}/)
    // The static shell paints the same line before React (same markup and size).
    expect(staticShellHtml({ credit: 'Datos: NASADEM' })).toContain('<div class="stage-dock" data-static=""><p class="stage-data-credit">Datos: NASADEM</p></div>')
    expect(stage).toMatch(/\{hudSlot\}\s*\{creditSlot\}\s*<\/div>/)
  })

  it('the top bar comes before the stage in the DOM (focus order = visual order) and there are main and h1', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html.indexOf('class="topbar"')).toBeLessThan(html.indexOf('class="stage"'))
    expect(html).toContain('<main class="app-main">')
    expect(html).toMatch(/<h1 class="sr-only">AnalogOS · Chile–Argentina pilot<\/h1>/)
    expect(html).not.toContain('AnalogOS Chile')
  })

  it('the scientific notice has accessible text at every breakpoint (the short version is not aria-hidden)', () => {
    const html = renderToStaticMarkup(<AppShell data={loading} />)
    expect(html).toContain('<span class="note-short">PRELIMINARY · NOT A TERRAIN AUTHORIZATION</span>')
    expect(html).not.toMatch(/note-short" aria-hidden/)
  })
})
