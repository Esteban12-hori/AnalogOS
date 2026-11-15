// Composer and “Your mission” rendered with react-dom/server (no jsdom), on the team's shared planner
// (ADR-013): “Send” never calls the AI, waiting for the draft shows the real phase and “Cancel”, and
// “Your mission” mounts the team's pieces (no levels or weights of its own).
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

describe('composer · view (SSR)', () => {
  it('Explore: pill with the “/” key, no figures', () => {
    const html = renderToStaticMarkup(<Composer data={readyData} placement="dock" />)
    expect(html).toContain('composer-pill')
    expect(html).toContain('aria-keyshortcuts="/"')
    expect(html).toContain('Describe the Mars test you want to run')
    expect(text(html)).not.toMatch(/\d+,\d/)
  })

  it('Mission at rest: textarea up to 3000 characters, Send disabled and AI as an option, no “DEMO”', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(html).toContain('<textarea')
    expect(html).toContain('maxLength="3000"')
    expect(html).toMatch(/<button type="submit" class="composer-send" disabled="">/)
    expect(html).toContain('Send')
    expect(text(html)).toContain('the AI is optional')
    expect(html).not.toContain('DEMO')
    expect(html).not.toMatch(/\d+,\d\s*%/)
  })

  it('while the snapshot loads it cannot send and says so', () => {
    mision()
    const html = renderToStaticMarkup(<MissionComposer data={loading} placement="dock" />)
    expect(html).toContain('Waiting for the validated snapshot')
  })

  it('AI draft in progress: “Proposing requirements…”, aria-busy, Send → Cancel', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ draftStartedAt: Date.now(), wait: 'busy' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Proposing requirements')
    expect(html).toContain('data-stop=""')
    expect(text(html)).toContain('Cancel')
  })

  it('at 10 s: “taking longer than usual” with Cancel; no time limit of its own', () => {
    mision()
    uiStore.setState({ missionPhase: 'interpreting' })
    composerStore.setState({ draftStartedAt: Date.now() - 11_000, wait: 'slow' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toContain('The AI is taking longer than usual')
    expect(text(html)).toContain('Cancel')
    expect(html).not.toContain('Tiempo agotado')
  })

  it('canceled or unavailable: the message is shown neutrally and the manual path continues', () => {
    mision()
    const planner = plannerReducer(plannerReducer(initialPlannerState(), { type: 'draft_start', requestId: 'r1' }), { type: 'draft_fail', requestId: 'r1', message: 'Solicitud cancelada: los requisitos no cambiaron y el recorrido manual sigue disponible.', unavailable: false })
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner })
    uiStore.setState({ missionPhase: 'review' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toContain('Solicitud cancelada')
    expect(html).toContain('data-tone="cancelled"')
    expect(html).not.toContain('falló')
  })

  it('results: “N of 6 candidates prioritized · #1 ‹name› · v3 similarity X (not recalculated)” and the requirements pill', () => {
    mision()
    const { state, evaluation } = evaluateExample()
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, revision: 1 })
    uiStore.setState({ missionPhase: 'done' })
    const html = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(text(html)).toMatch(/\d of 6 candidates prioritized · #1 Interior de Antofagasta · 25\.0° S, 69\.7° W · v3 similarity 94\.9 \(not recalculated\)/)
    expect(html).toContain('Your mission · 3 requirements')
    expect(html).not.toMatch(/% de misión|motor determinista v/)
  })

  it('S1: “Refine” button', () => {
    const html = renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)
    expect(html).toContain('composer-refine')
    expect(text(html)).toContain('Refine')
  })

  it('S1: the pending AI draft uses an English action label', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'interpreting' })
    const html = renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)
    expect(text(html)).toContain('Proposing…')
    expect(html).toContain('aria-busy="true"')
  })

  it('✦ means “AI only”: neither the pill, nor the form (also with results), nor “Refine”, nor the static HTML carry it', () => {
    expect(renderToStaticMarkup(<Composer data={readyData} placement="dock" />)).not.toContain('✦')
    expect(renderToStaticMarkup(<Composer data={readyData} placement="sheet-head" onRequestTray={() => undefined} />)).not.toContain('✦')
    expect(staticShellHtml()).not.toContain('✦')
    mision()
    expect(renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)).not.toContain('✦')
    const { state, evaluation } = evaluateExample()
    missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, revision: 1 })
    uiStore.setState({ missionPhase: 'done' })
    const done = renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />)
    expect(done).toContain('v3 similarity 94.9')
    expect(done).not.toContain('✦')
    expect(done).not.toContain('data-done')
  })
})

describe('“Your mission” (SSR)', () => {
  it('mounts the team planner in its compact variant: paths and promise, no levels or weights', () => {
    mision()
    const html = renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" promise="Prioriza qué sectores merecen reconocimiento para un ensayo de rover" />)
    expect(html).toContain('Your mission')
    expect(html).toContain('Define a test')
    expect(html).toContain('Evaluate a sector')
    expect(html).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
    expect(html).toContain('planner is-compact')
    expect(html).not.toMatch(/Clave|Importante|nivel ÷ suma|Perfil de tu misión/)
  })

  it('“Clear all” does not promise that nothing is stored: there is local history here', () => {
    mision()
    missionController(v3Bundle).dispatch({ type: 'set_journey', journey: 'test' })
    const html = renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />)
    expect(html).toContain('Clear everything and start over')
    expect(html).not.toContain('nada se guarda en el navegador')
    expect(RESET_HINT).toContain('stay in this browser’s history')
    expect(html).toContain('stay in this browser’s history')
  })

  it('AI requirements: “unconfirmed” until you confirm; then “confirmed by you”', () => {
    expect(sourceLabel('anthropic', false)).toContain('unconfirmed')
    expect(sourceLabel('anthropic', true)).toBe('Requirements proposed with AI · confirmed by you')
    expect(sourceLabel('manual', true)).toBe('Requirements written by you')
    mision()
    const controller = missionController(v3Bundle)
    controller.dispatch({ type: 'set_journey', journey: 'test' })
    controller.dispatch({ type: 'draft_start', requestId: 'd1' })
    controller.dispatch({ type: 'draft_ok', requestId: 'd1', proposal: AI_PROPOSAL, provenance: AI_PROVENANCE })
    expect(text(renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />))).toContain('unconfirmed until you confirm')
    controller.dispatch({ type: 'confirm' })
    expect(controller.getState().confirmed).toBe(true)
    expect(controller.evaluate()).toBe(true)
    const html = text(renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />))
    expect(html).toContain('Requirements proposed with AI · confirmed by you')
    expect(html).not.toContain('unconfirmed')
  })

  it('no snapshot: neutral wait, no figures', () => {
    const html = renderToStaticMarkup(<MissionPanel data={loading} placement="panel" />)
    expect(html).toContain('Waiting for the validated snapshot')
  })
})

describe('sugerencias', () => {
  it('offered before results and do not cover the cards when there are results or a wait', () => {
    expect(showSuggestions('idle', false)).toBe(true)
    expect(showSuggestions('review', false)).toBe(true)
    expect(showSuggestions('done', false)).toBe(false)
    expect(showSuggestions('analysis', false)).toBe(false)
    expect(showSuggestions('interpreting', true)).toBe(false)
    // With the “Your mission” popover open (<1440) they do not overlap it or the cards.
    expect(showSuggestions('review', false, true)).toBe(false)
  })
})
