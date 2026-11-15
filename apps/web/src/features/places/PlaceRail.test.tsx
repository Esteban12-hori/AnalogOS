// Incremento 3 · PlaceRail y ReferenceCard renderizados con react-dom/server (sin jsdom):
// estructura APG del listbox, orden, ◆ sin %, estados de carga/error/espera y tarjeta del riel.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { CandidateSite, DataManifest, MissionProfile } from '../../domain/contracts'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import type { MissionScoring } from '../engine'
import { loadReferenceAnalogs, PlaceRail, ReferenceCard as ReferenceCardSlot } from './index'
// La tarjeta del ◆ vive en un chunk diferido; aquí se prueba su contenido directamente.
import ReferenceCard from './ReferenceCardView'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const snapshot: DemoSnapshot = {
  candidates: read('artifacts/science-v2/candidate-details.json') as CandidateSite[],
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
const failed: AppData = { status: 'error', snapshot: null, visual: { status: 'loading' }, error: 'manifest.json inválido' }

/** Cada opción del listbox (las tarjetas no anidan <div>). */
function options(html: string): string[] {
  return [...html.matchAll(/<div[^>]*role="option"[^>]*>[\s\S]*?<\/div>/g)].map((match) => match[0])
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeAll(async () => {
  await loadReferenceAnalogs()
})

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
})

describe('PlaceRail', () => {
  it('listbox horizontal APG con dos grupos y una sola parada de tabulación', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('role="listbox"')
    expect(html).toContain('aria-orientation="horizontal"')
    expect(html.match(/role="group"/g)).toHaveLength(2)
    expect(html).toContain('Sectores evaluados')
    expect(html).toContain('Emblemáticos · por calcular')
    expect(options(html)).toHaveLength(10)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('Ver lista')
    expect(html).toContain('aria-label="Lugares siguientes"')
  })

  it('orden estable: ● por similitud y luego ◆ alfabéticos; ◆ sin % ni ranking', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards.slice(0, 3).map((card) => card.match(/#\d de 3/)?.[0])).toEqual(['#1 de 3', '#2 de 3', '#3 de 3'])
    expect(cards[0]).toContain('Pampa Yungay')
    expect(cards[0]).toContain('75,7')
    expect(cards[0]).toContain('similitud')
    expect(cards[0]).toContain('perfil base')
    expect(cards[0]).toContain('Confianza')
    expect(cards[0]).toContain('77,5')
    expect(cards[2]).toContain('50,0')
    expect(cards[3]).toContain('Isla Devon')
    for (const card of cards.slice(3)) {
      expect(card).toContain('por calcular')
      expect(card).not.toMatch(/\d\s*%/)
      expect(card).not.toMatch(/#\d/)
      expect(card).not.toContain('Confianza')
    }
  })

  it('§1 #16: Atacama · Yungay es una insignia «coincide con» sobre Pampa Yungay, no un ◆ propio', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards[0]).toContain('Coincide con Desierto de Atacama · Yungay')
    expect(cards.filter((card) => card.includes('Análogo emblemático'))).toHaveLength(7)
    expect(cards.some((card) => card.includes('Análogo emblemático') && card.includes('Atacama'))).toBe(false)
  })

  it('la selección (globo o carrusel) marca la opción, le da el foco de tabulación y «◉ en el globo»', () => {
    uiStore.setState({ selection: { siteId: 'cl-domeyko-interior-screening', kind: 'evaluated', preview: false } })
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />))
    const selected = cards.filter((card) => card.includes('aria-selected="true"'))
    expect(selected).toHaveLength(1)
    expect(selected[0]).toContain('tabindex="0"')
    expect(text(selected[0] ?? '')).toContain('Cordón de Domeyko')
    expect(text(selected[0] ?? '')).toContain('◉ En el globo · #2 de 3')
  })

  it('espera de la IA: resultados previos con aria-busy, sin inert, y el aviso del perfil base', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'interpreting' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('inert')
    expect(html).toContain('se reemplaza cuando el motor termine')
  })

  it('Misión con resultados: orden y % del motor, rotulados; lo no puntuado queda «por calcular»', () => {
    // FIXTURE: resultado sintético del motor, solo para probar la UI.
    const scoring: MissionScoring = {
      profileId: 'mission:FIXTURE',
      engineVersion: '0.0.0-fixture',
      sites: [{ siteId: 'cl-pampa-maria-elena-screening', similarity: 61.25, rank: 1, status: 'scored', coverage: 1, confidence: null, contributions: {}, limitingCriterionId: null }],
    }
    missionStore.setState({ scoring, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('Tu misión · % del motor determinista v0.0.0-fixture')
    const cards = options(html).map(text)
    expect(cards[0]).toContain('Pampa María Elena')
    expect(cards[0]).toContain('61,3')
    expect(cards[0]).toContain('#1 de 1')
    expect(cards[0]).toContain('Confianza por calcular con tu perfil')
    expect(cards[1]).toContain('Por calcular con tu perfil')
    expect(cards[1]).not.toMatch(/\d,\d/)
  })

  it('hoja: sin el armazón no ofrece «Ver lista»; con la vista de lista es vertical y ofrece volver', () => {
    expect(renderToStaticMarkup(<PlaceRail data={ready} placement="sheet" />)).not.toContain('Ver lista')
    const list = renderToStaticMarkup(<PlaceRail data={ready} placement="sheet" listView onListViewChange={() => undefined} />)
    expect(list).toContain('aria-orientation="vertical"')
    expect(list).toContain('Ver carrusel')
    expect(list).toContain('data-view="list"')
  })

  it('estados de carga y error: neutros, sin cifras', () => {
    const wait = renderToStaticMarkup(<PlaceRail data={loading} placement="dock" />)
    expect(wait).toContain('Cargando snapshot validado')
    expect(wait).toContain('aria-busy="true"')
    const error = renderToStaticMarkup(<PlaceRail data={failed} placement="dock" />)
    expect(error).toContain('✕')
    expect(error).toContain('No se pudieron cargar los lugares: manifest.json inválido')
  })
})

describe('ReferenceCard', () => {
  it('«Referencia mundial · por calcular» con zona aproximada y fuente enlazada', () => {
    const html = renderToStaticMarkup(<ReferenceCard data={ready} analogId="devon-island" />)
    expect(html).toContain('Referencia mundial · por calcular')
    expect(html).toContain('Isla Devon · cráter Haughton')
    expect(text(html)).toContain('radio ≈ 15 km')
    expect(text(html)).toContain('No es un pin exacto')
    expect(html).toContain('href="https://www.lpi.usra.edu/meetings/analogues2011/pdf/6019.pdf"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(text(html)).not.toMatch(/\d\s*%/)
  })

  it('muestra «coincide con» y regiones solo cuando la geometría lo respalda', () => {
    expect(text(renderToStaticMarkup(<ReferenceCard data={ready} analogId="atacama-yungay" />))).toContain('Coincide con ● Pampa Yungay')
    const mdrs = text(renderToStaticMarkup(<ReferenceCard data={ready} analogId="mdrs-utah" />))
    expect(mdrs).toContain('Región aproximada entre 38,40° N, 110,90° W y 38,44° N, 110,78° W')
    expect(mdrs).not.toContain('Contiene')
    expect(renderToStaticMarkup(<ReferenceCard data={ready} analogId="no-existe" />)).toContain('no está en el catálogo')
  })

  it('el slot exportado se dibuja con su propio Suspense mientras llega el chunk diferido', () => {
    expect(renderToStaticMarkup(<ReferenceCardSlot data={ready} analogId="devon-island" />)).toContain('Cargando la referencia')
  })
})
