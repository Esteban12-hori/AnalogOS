// Composer y «Tu misión» renderizados con react-dom/server (sin jsdom), sobre el planificador
// compartido del equipo (ADR-013): «Enviar» nunca llama a la IA, la espera del borrador muestra la
// fase real y «Cancelar», y «Tu misión» monta las piezas del equipo (sin niveles ni pesos propios).
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { initialPlannerState, plannerReducer } from '../../mission'
import type { AppData } from '../../shell/public'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData } from '../../tests/v3Support'
import { Composer } from './Composer'
import { composerStore, initialComposerState } from './composerStore'
import { MissionComposer, showSuggestions } from './MissionComposer'
import { MissionPanel } from './MissionPanel'
import { resetMissionControllerForTests } from './missionController'

const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
  composerStore.setState(initialComposerState())
  resetMissionControllerForTests()
})

function mision(): void {
  uiStore.setState({ mode: 'mision' })
}

describe('composer · vista (SSR)', () => {
  it('Explorar: píldora con la tecla «/», sin cifras', () => {
    const html = renderToStaticMarkup(<Composer data={readyData} placement="dock" />)
    expect(html).toContain('composer-pill')
    expect(html).toContain('aria-keyshortcuts="/"')
    expect(html).toContain('Describe la prueba que quieres hacer para Marte')
    expect(text(html)).not.toMatch(/\d+,\d/)
  })

  it('Misión en reposo: textarea de hasta 3000 caracteres, Enviar desactivado y la IA como opción, sin «DEMO»', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(html).toContain('<textarea')
    expect(html).toContain('maxLength="3000"')
    expect(html).toMatch(/<button type="submit" class="composer-send" disabled="">/)
    expect(html).toContain('Enviar')
    expect(text(html)).toContain('la IA es opcional')
    expect(html).not.toContain('DEMO')
    expect(html).not.toMatch(/\d+,\d\s*%/)
  })

  it('mientras carga el snapshot no se puede enviar y lo dice', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={loading} placement="dock" />)
    expect(html).toContain('Esperando el snapshot validado')
  })

  it('borrador de IA en curso: «Proponiendo requisitos…», aria-busy, Enviar → Cancelar', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ draftStartedAt: Date.now(), wait: 'busy' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Proponiendo requisitos')
    expect(html).toContain('data-stop=""')
    expect(text(html)).toContain('Cancelar')
  })

  it('a los 10 s: «tardando más de lo normal» con Cancelar; sin tiempo límite propio', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ draftStartedAt: Date.now() - 11_000, wait: 'slow' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toContain('La IA está tardando más de lo normal')
    expect(text(html)).toContain('Cancelar')
    expect(html).not.toContain('Tiempo agotado')
  })

  it('cancelado o no disponible: el mensaje se muestra neutro y el recorrido manual sigue', () => {
    mision()
    const planner = plannerReducer(plannerReducer(initialPlannerState(), { type: 'draft_start', requestId: 'r1' }), { type: 'draft_fail', requestId: 'r1', message: 'Solicitud cancelada: los requisitos no cambiaron y el recorrido manual sigue disponible.', unavailable: false })
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner })
    uiStore.setState({ missionPhase: 'review' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toContain('Solicitud cancelada')
    expect(html).toContain('data-tone="cancelled"')
    expect(html).not.toContain('falló')
  })

  it('resultados: «N priorizados · #1 ‹nombre› · similitud v3 X (sin recalcular)» y la pastilla con los requisitos', () => {
    mision()
    const { state, evaluation } = evaluateExample()
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, revision: 1 })
    uiStore.setState({ missionPhase: 'done' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toMatch(/\d priorizados de 7 · #1 Interior de Antofagasta · 25,0° S, 69,7° O · similitud v3 94,9 \(sin recalcular\)/)
    expect(html).toContain('Tu misión · 3 requisitos')
    expect(html).not.toMatch(/% de misión|motor determinista v/)
  })

  it('S1: botón «✦ Refinar»', () => {
    const html = renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)
    expect(html).toContain('composer-refine')
    expect(text(html)).toContain('Refinar')
  })
})

describe('«Tu misión» (SSR)', () => {
  it('monta el planificador del equipo en su variante compacta: recorridos y promesa, sin niveles ni pesos', () => {
    mision()
    const html = renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" promise="Prioriza qué sectores merecen reconocimiento para un ensayo de rover" />)
    expect(html).toContain('Tu misión')
    expect(html).toContain('Definir una prueba')
    expect(html).toContain('Evaluar un sector')
    expect(html).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
    expect(html).toContain('planner is-compact')
    expect(html).not.toMatch(/Clave|Importante|nivel ÷ suma|Perfil de tu misión/)
  })

  it('sin snapshot: espera neutra, sin cifras', () => {
    const html = renderToStaticMarkup(<MissionPanel data={loading} placement="panel" />)
    expect(html).toContain('Esperando el snapshot validado')
  })
})

describe('sugerencias', () => {
  it('se ofrecen antes de resultados y no tapan las tarjetas cuando hay resultados o una espera', () => {
    expect(showSuggestions('idle', false)).toBe(true)
    expect(showSuggestions('review', false)).toBe(true)
    expect(showSuggestions('done', false)).toBe(false)
    expect(showSuggestions('analysis', false)).toBe(false)
    expect(showSuggestions('interpreting', true)).toBe(false)
  })
})
