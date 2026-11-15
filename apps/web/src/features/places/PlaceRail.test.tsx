// PlaceRail y ReferenceCard renderizados con react-dom/server (sin jsdom), con el snapshot v3:
// estructura APG del listbox, candidatos en su puesto global, REF aparte y sin número, filtro por
// país, ◆ sin %, estados de carga/error y Misión agrupada por la evaluación del equipo.
// Incluye las aserciones del ranking del equipo (CandidateRanking, retirado al integrar; ADR-013).
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { filterByCountry, rankMap, splitByRole } from '../../domain/discovery'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { evaluateExample, readyData, v3Snapshot } from '../../tests/v3Support'
import { uiStore } from '../../state/ui'
import { loadReferenceAnalogs, PlaceRail, ReferenceCard as ReferenceCardSlot } from './index'
// La tarjeta del ◆ vive en un chunk diferido; aquí se prueba su contenido directamente.
import ReferenceCard from './ReferenceCardView'

const ready: AppData = readyData
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
  const { ranked, references } = splitByRole(v3Snapshot.candidates)
  const rankOf = rankMap(ranked)

  it('listbox horizontal APG con candidatos, referencia y ◆, y una sola parada de tabulación', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('role="listbox"')
    expect(html).toContain('aria-orientation="horizontal"')
    expect(html.match(/role="group"/g)?.length).toBeGreaterThanOrEqual(3)
    expect(html).toContain('Candidatos de la búsqueda')
    expect(html).toContain('Referencia conocida: Pampa Yungay')
    expect(html).toContain('Emblemáticos · por calcular')
    expect(options(html)).toHaveLength(14)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('Ver lista')
    expect(html).toContain('aria-label="Lugares siguientes"')
  })

  it('orden estable: candidatos con su puesto global de 6, la REF sin número y luego ◆ sin % ni ranking', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards.slice(0, 6).map((card) => card.match(/#\d de 6/)?.[0])).toEqual(['#1 de 6', '#2 de 6', '#3 de 6', '#4 de 6', '#5 de 6', '#6 de 6'])
    expect(cards[0]).toContain('Interior de Antofagasta')
    expect(cards[0]).toContain('94,9')
    expect(cards[0]).toContain('similitud v3')
    expect(cards[0]).toContain('Confianza')
    expect(cards[0]).toContain('77,5')
    expect(cards[0]).toContain('Chile')
    expect(cards[3]).toContain('Argentina')
    // La REF: rótulo, nunca un número de puesto aunque su similitud supere a candidatos.
    expect(cards[6]).toContain('REF · Referencia conocida')
    expect(cards[6]).toContain('Pampa Yungay')
    expect(cards[6]).toContain('no sale de la búsqueda')
    expect(cards[6]).not.toMatch(/#\d/)
    expect(cards[7]).toContain('Isla Devon')
    for (const card of cards.slice(7)) {
      expect(card).toContain('por calcular')
      expect(card).not.toMatch(/\d\s*%/)
      expect(card).not.toMatch(/#\d/)
      expect(card).not.toContain('Confianza')
    }
  })

  it('§1 #16: Atacama · Yungay es una insignia «coincide con» sobre la REF, no un ◆ propio', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards[6]).toContain('Coincide con Desierto de Atacama · Yungay')
    expect(cards.filter((card) => card.includes('Análogo emblemático'))).toHaveLength(7)
    expect(cards.some((card) => card.includes('Análogo emblemático') && card.includes('Atacama'))).toBe(false)
  })

  it('ranking del equipo: REF aparte y filtro por país con el puesto global (aserciones portadas de CandidateRanking)', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html.indexOf('Candidatos de la búsqueda')).toBeLessThan(html.indexOf('Referencia conocida: Pampa Yungay'))
    expect(html).toContain('REF')
    expect(html).toContain('aria-label="Filtrar candidatos por país"')
    expect(options(html).filter((card) => card.includes('data-kind="evaluated"'))).toHaveLength(ranked.length + references.length)
    const argentina = filterByCountry(ranked, 'AR')
    // Mismo puesto global en la tarjeta argentina que en el ranking completo, no uno local.
    expect(text(html)).toContain(`#${rankOf.get(argentina[0]!.site_id)} de 6`)
    expect(rankOf.get(argentina[0]!.site_id)).toBe(4)
  })

  it('informa con honestidad cuando un país no deja candidatos y mantiene la referencia conocida', () => {
    const chileOnly: AppData = { ...ready, snapshot: { ...v3Snapshot, candidates: v3Snapshot.candidates.filter((site) => site.country === 'CL') } }
    const html = renderToStaticMarkup(<PlaceRail data={chileOnly} placement="dock" />)
    expect(html).not.toContain('aria-label="Filtrar candidatos por país"') // un solo país: sin filtro
    const empty: AppData = { ...ready, snapshot: { ...v3Snapshot, candidates: references } }
    const none = renderToStaticMarkup(<PlaceRail data={empty} placement="dock" />)
    expect(none).toContain('La búsqueda no dejó candidatos elegibles')
    expect(none).toContain('No se completa la lista con sitios elegidos a mano')
    expect(none).toContain('Referencia conocida: Pampa Yungay')
  })

  it('la selección (globo o carrusel) marca la opción, le da el foco de tabulación y «◉ en el globo»', () => {
    uiStore.setState({ selection: { siteId: ranked[1]!.site_id, kind: 'evaluated', preview: false } })
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />))
    const selected = cards.filter((card) => card.includes('aria-selected="true"'))
    expect(selected).toHaveLength(1)
    expect(selected[0]).toContain('tabindex="0"')
    expect(text(selected[0] ?? '')).toContain('◉ En el globo · Candidato · #2 de 6')
  })

  it('Explorar muestra la promesa del producto como nota', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" promise="Prioriza qué sectores merecen reconocimiento para un ensayo de rover" />)
    expect(html).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
  })

  it('Misión sin evaluar: orden del snapshot y aviso; nada de % de misión', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('Sin evaluar')
    expect(html).not.toContain('motor determinista v')
  })

  it('Misión con evaluación: grupos por estado, puesto solo de priorizados, «Factibilidad territorial: pendiente»', () => {
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('mission-rules-1.0.0')
    expect(html).toContain('similitud v3 sin recalcular')
    expect(html).not.toContain('aria-label="Filtrar candidatos por país"')
    const cards = options(html).map(text)
    expect(cards[0]).toContain('#1')
    expect(cards[0]).toContain('Priorizado para reconocimiento')
    expect(cards[0]).toContain('Factibilidad territorial: pendiente')
    expect(cards[0]).toContain('sin recalcular')
    expect(html).not.toMatch(/% de misión|motor determinista v/)
  })

  it('edición tras evaluar: resultados previos con aria-busy, sin inert, hasta reevaluar', () => {
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, stale: true, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('inert')
    expect(html).toContain('Editó la prueba: confirme y evalúe de nuevo')
  })

  it('alcance sin evidencia: diagnóstico honesto en lugar de una lista vacía', () => {
    const { evaluation } = evaluateExample({ mode: 'point', siteId: '', lon: '10', lat: '10', west: '', south: '', east: '', north: '', windowSiteId: null })
    expect(evaluation.outcome).toBe('insufficient_coverage')
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('Evidencia insuficiente para esta geometría')
    expect(html).toContain('Exporte el diagnóstico (JSON)')
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
