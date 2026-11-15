// Composer y «Tu misión» renderizados con react-dom/server (sin jsdom), sobre el planificador
// compartido del equipo (ADR-013): «Enviar» nunca llama a la IA, la espera del borrador muestra la
// fase real y «Cancelar», y «Tu misión» monta las piezas del equipo (sin niveles ni pesos propios).
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { initialPlannerState, plannerReducer } from '../../mission'
import { staticShellHtml } from '../../content/shell'
import type { AppData } from '../../shell/public'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData, v3Bundle } from '../../tests/v3Support'
import { Composer } from './Composer'
import { composerStore, initialComposerState } from './composerStore'
import { MissionComposer, showSuggestions } from './MissionComposer'
import { MissionPanel, RESET_HINT, sourceLabel } from './MissionPanel'
import { missionController, resetMissionControllerForTests } from './missionController'

const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
const AI_PROVENANCE = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_t', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
const AI_PROPOSAL = {
  activity: 'Actividad IA', target_kind: 'mars_rover_terrain' as const, target_profile_id: 'mars-rover-screening-v3', open_questions: [], warnings: [],
  requirements: [{ kind: 'measurable' as const, requirement_id: 'ai-1', label: 'Pendiente', importance: 'critical' as const, origin: 'ai' as const, confirmed: false, source_quote: 'pendiente', metric_id: 'median_slope_degree' as const, operator: '<=' as const, value: 3, unit: 'degree', scale: 'window' as const }],
}
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

  it('resultados: «N de 6 candidatos priorizados · #1 ‹nombre› · similitud v3 X (sin recalcular)» y la pastilla con los requisitos', () => {
    mision()
    const { state, evaluation } = evaluateExample()
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, revision: 1 })
    uiStore.setState({ missionPhase: 'done' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toMatch(/\d de 6 candidatos priorizados · #1 Interior de Antofagasta · 25,0° S, 69,7° O · similitud v3 94,9 \(sin recalcular\)/)
    expect(html).toContain('Tu misión · 3 requisitos')
    expect(html).not.toMatch(/% de misión|motor determinista v/)
  })

  it('S1: botón «Refinar»', () => {
    const html = renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)
    expect(html).toContain('composer-refine')
    expect(text(html)).toContain('Refinar')
  })

  it('✦ es «solo IA»: ni la píldora, ni el formulario (también con resultados), ni «Refinar», ni el HTML estático lo llevan', () => {
    expect(renderToStaticMarkup(<Composer data={readyData} placement="dock" />)).not.toContain('✦')
    expect(renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)).not.toContain('✦')
    expect(staticShellHtml()).not.toContain('✦')
    mision()
    expect(renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)).not.toContain('✦')
    const { state, evaluation } = evaluateExample()
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, revision: 1 })
    uiStore.setState({ missionPhase: 'done' })
    const done = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(done).toContain('similitud v3 94,9')
    expect(done).not.toContain('✦')
    expect(done).not.toContain('data-done')
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

  it('«Borrar todo» no promete que nada se guarda: aquí hay historial local', () => {
    mision()
    missionController(v3Bundle).dispatch({ type: 'set_journey', journey: 'test' })
    const html = renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />)
    expect(html).toContain('Borrar todo y empezar de nuevo')
    expect(html).not.toContain('nada se guarda en el navegador')
    expect(RESET_HINT).toContain('quedan en el historial de este navegador')
    expect(html).toContain('quedan en el historial de este navegador')
  })

  it('requisitos de la IA: «sin confirmar» hasta que usted confirma; luego «confirmados por usted»', () => {
    expect(sourceLabel('anthropic', false)).toContain('sin confirmar')
    expect(sourceLabel('anthropic', true)).toBe('Requisitos propuestos con IA · confirmados por usted')
    expect(sourceLabel('manual', true)).toBe('Requisitos escritos por usted')
    mision()
    const controller = missionController(v3Bundle)
    controller.dispatch({ type: 'set_journey', journey: 'test' })
    controller.dispatch({ type: 'draft_start', requestId: 'd1' })
    controller.dispatch({ type: 'draft_ok', requestId: 'd1', proposal: AI_PROPOSAL, provenance: AI_PROVENANCE })
    expect(text(renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />))).toContain('sin confirmar hasta que usted confirme')
    controller.dispatch({ type: 'confirm' })
    expect(controller.getState().confirmed).toBe(true)
    expect(controller.evaluate()).toBe(true)
    const html = text(renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />))
    expect(html).toContain('Requisitos propuestos con IA · confirmados por usted')
    expect(html).not.toContain('sin confirmar')
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
    // Con el popover de «Tu misión» abierto (<1440) no se enciman con él ni con las tarjetas.
    expect(showSuggestions('review', false, true)).toBe(false)
  })
})
