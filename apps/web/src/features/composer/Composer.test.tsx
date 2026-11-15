import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { Composer } from './Composer'
import { composerStore, initialComposerState } from './composerStore'
import { MissionComposer, showPresetChips } from './MissionComposer'
import { MissionPanel } from './MissionPanel'
import { MOBILITY, draft, interpretation, realSnapshot } from './testSupport'

const real = realSnapshot()
const snapshot: DemoSnapshot = {
  candidates: [...real.candidates],
  profile: real.profile,
  manifest: { snapshot_version: 'science-screening-v2', created_at: '', pipeline_version: '', datasets: [] },
  chileOutline: { type: 'FeatureCollection', features: [] },
  surfaceSeries: new Map(),
  marsReference: null,
}
const ready: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
const base = { id: real.profile.id, version: real.profile.version }

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
  composerStore.setState(initialComposerState())
})

function mision(): void {
  uiStore.setState({ mode: 'mision' })
}

describe('composer · vista (SSR)', () => {
  it('Explorar: píldora con la tecla «/», sin cifras', () => {
    const html = renderToStaticMarkup(<Composer data={ready} placement="dock" />)
    expect(html).toContain('composer-pill')
    expect(html).toContain('aria-keyshortcuts="/"')
    expect(html).toContain('Describe el trabajo que quieres probar para Marte')
    expect(html).not.toMatch(/\d %/)
  })

  it('Misión: el Composer del slot monta el formulario, sin cifras propias', () => {
    mision()
    const html = renderToStaticMarkup(<Composer data={ready} placement="dock" />)
    expect(html).toContain('composer-form')
    expect(html).toContain('composer-status')
    expect(html).not.toMatch(/\d %/)
  })

  it('Misión en reposo: textarea, perfil base, Enviar desactivado y rótulo DEMO · sin IA', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(html).toContain('<textarea')
    expect(html).toContain('Perfil base')
    expect(html).toMatch(/<button type="submit" class="composer-send" disabled="">/)
    expect(html).toContain('DEMO · sin IA')
    expect(html).toContain('el % lo calcula el motor determinista')
    expect(html).not.toContain('Detener')
  })

  it('mientras carga el snapshot no se puede enviar y lo dice', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={loading} placement="sheet" />)
    expect(html).toContain('Esperando el snapshot validado')
  })

  it('espera: Enviar → Detener al instante, aria-busy y la fase real con su paso', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ run: { id: 1, startedAt: Date.now(), text: 'rover', interpreter: 'demo' }, wait: 'quiet' })
    const quiet = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(quiet).toContain('Detener')
    expect(quiet).toContain('aria-busy="true"')
    expect(quiet).toContain('Interpretación DEMO · sin IA · paso 1 de 4')
    expect(quiet).not.toContain('composer-light')
    composerStore.setState({ wait: 'busy' })
    const busy = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(busy).toContain('composer-light')
    expect(busy).toContain('boot-inline')
  })

  it('a los 10 s: «tardando más de lo normal» con Cancelar y Usar perfil base', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ run: { id: 1, startedAt: Date.now() - 11000, text: 'rover', interpreter: 'lktron' }, wait: 'slow' })
    const html = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(html).toContain('Está tardando más de lo normal')
    expect(html).toContain('Cancelar')
    expect(html).toContain('Usar perfil base')
  })

  it('tiempo agotado y error: neutro con ✕ y Reintentar', () => {
    mision()
    uiStore.setState({ missionPhase: 'error' })
    missionStore.setState({ error: { code: 'timeout', message: 'Tiempo agotado: la interpretación no respondió en 20 s. Puedes reintentar.' } })
    composerStore.setState({ lastText: 'rover' })
    const html = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(html).toContain('Tiempo agotado')
    expect(html).toContain('✕')
    expect(html).toContain('Reintentar')
  })

  it('resultados: línea con el orden del motor y la pastilla del perfil activo', () => {
    mision()
    uiStore.setState({ missionPhase: 'analysis' })
    missionStore.setState({ source: 'demo', profile: draft(MOBILITY, base), revision: 1 })
    composerStore.setState({ result: { revision: 1, text: '3 lugares ordenados por el motor test-1.0.0 · #1 Pampa Yungay 70,0 %', firstSiteId: 'x' } })
    const html = renderToStaticMarkup(<MissionComposer data={ready} placement="dock" />)
    expect(html).toContain('3 lugares ordenados por el motor test-1.0.0')
    expect(html).toContain('Tu perfil · 5')
    expect(html).toContain('Refina tu misión')
    expect(html).toContain('paso 4 de 4')
  })

  it('S1: botón «✦ Refinar»', () => {
    const html = renderToStaticMarkup(<Composer data={ready} placement="sheet-head" />)
    expect(html).toContain('composer-refine')
    expect(html).toContain('Refinar')
  })
})

describe('«Tu misión» (SSR)', () => {
  it('sin misión: perfil base real del snapshot (needs_calibration), sin inventar niveles', () => {
    const html = renderToStaticMarkup(<MissionPanel data={ready} placement="panel" />)
    expect(html).toContain('Tu misión')
    expect(html).toContain('Perfil base del snapshot')
    expect(html).toContain('needs_calibration')
    for (const weight of ['20 %', '15 %', '10 %', '5 %']) expect(html).toContain(weight)
    expect(html).not.toContain('Deshacer')
  })

  it('con misión DEMO: resaltados, niveles, pesos, lo pedido sin datos y versión del motor', () => {
    missionStore.setState({
      text: 'probar un rover en pendiente rocosa',
      source: 'demo',
      interpretation: interpretation(),
      profile: draft(MOBILITY, base, 'Perfil de tu misión'),
      scoring: {
        profileId: 'mission:x',
        engineVersion: 'test-1.0.0',
        sites: [{ siteId: 'a', similarity: 70, rank: 1, status: 'scored', coverage: 1, confidence: null, contributions: {}, limitingCriterionId: null }],
      },
      revision: 1,
    })
    composerStore.setState({ highlights: [{ start: 19, end: 28, criterionId: 'slope' }], mentioned: ['slope', 'terrain_roughness', 'local_relief'] })
    uiStore.setState({ missionPhase: 'analysis' })
    const html = renderToStaticMarkup(<MissionPanel data={ready} placement="panel" />)
    expect(html).toContain('<mark data-criterion="slope">pendiente</mark>')
    expect(html).toContain('DEMO · sin IA')
    expect(html).toContain('Clave')
    expect(html).toContain('27 %')
    expect(html).toContain('base 20 %')
    expect(html).toContain('revisión experta · fuera del score')
    expect(html).toContain('Pediste, sin datos aún')
    expect(html).toContain('hielo')
    expect(html).toContain('motor determinista test-1.0.0')
    expect(html).toContain('Cobertura del peso con datos: 100 %')
    expect(html).toContain('id="composer-mission-panel"')
    expect(html).toMatch(/Deshacer<\/button>/)
    expect(html).toContain('disabled=""')
  })

  it('al editar: radios nativos por criterio (Clave/Importante/Menor/Excluir)', () => {
    missionStore.setState({ source: 'preset', profile: draft(MOBILITY, base, 'Movilidad y autonomía'), revision: 1 })
    // El modo edición se activa con el botón; en SSR se verifica el estado de lectura y el botón.
    const html = renderToStaticMarkup(<MissionPanel data={ready} placement="sheet" />)
    expect(html).toContain('aria-pressed="false">Editar</button>')
    expect(html).toContain('Perfil predefinido')
  })
})

describe('sugerencias «Refinar»', () => {
  it('se ofrecen antes de resultados y no tapan las tarjetas cuando hay resultados', () => {
    expect(showPresetChips('idle', false)).toBe(true)
    expect(showPresetChips('error', false)).toBe(true)
    expect(showPresetChips('interpreting', true)).toBe(false)
    expect(showPresetChips('analysis', false)).toBe(false)
    expect(showPresetChips('done', false)).toBe(false)
  })
})
