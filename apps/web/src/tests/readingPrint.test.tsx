// M11-READING-PRINT: “Go to Reading” from “Your mission” (surface by width, without touching selection,
// planner or AI) and the printable report (complete, with/without geology, no stale report or empty
// page). SSR and logic tests: they do not replace checking a native PDF.
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildGeologyCatalog } from '../../../../shared/geology/guidance'
import { GEOLOGY_LAYER_NOTE, UNITS_NOT_ADDITIVE } from '../components/planner/GeologyGuidance'
import { MissionPrintReport, ResultView } from '../components/planner/ResultView'
import { parseGeologyContext } from '../domain/geologyContext'
import { ReadingPill } from '../features/analysis'
import { MissionPrintHost, PRINT_NOTICE, printNoticeReason } from '../features/composer/printHost'
import { isPrintReady, markPrintMounted, printStore } from '../features/composer/printState'
import { createMissionController, type ControllerDeps } from '../features/composer/missionController'
import { initialComposerState, type ComposerState } from '../features/composer/composerStore'
import { fingerprint, MAX_BRIEF_CHARS } from '../mission'
import { sheetBody, sheetHead } from '../shell/AppShell'
import { FullDetail } from '../shell/detail/FullDetail'
import { readingRoute } from '../shell/readingRoute'
import { createStore } from '../state/store'
import { INITIAL_MISSION_STATE, missionStore, type MissionState } from '../state/mission'
import { uiActions, uiStore } from '../state/ui'
import { evaluateExample, readJson, readyData, v3Bundle, v3Snapshot, YUNGAY } from './v3Support'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const noop = () => undefined

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
  printStore.reset()
})

describe('“Go to Reading”: surface by width (ADR-014, M11)', () => {
  const site = v3Snapshot.candidates.find((c) => c.role !== 'reference')!
  const evaluated = { siteId: site.site_id, kind: 'evaluated' as const, preview: false }
  const reference = { siteId: 'ref-analog', kind: 'reference' as const, preview: false }

  it('≥1440 left panel and 1100–1439 pill, with or without selection', () => {
    for (const selection of [null, evaluated, reference]) {
      expect(readingRoute('wide', selection, selection === evaluated)).toEqual({ surface: 'left', back: null })
      expect(readingRoute('medium', selection, selection === evaluated)).toEqual({ surface: 'pill', back: null })
    }
  })

  it('<1100: ● → tab of its site sheet; without selection or ◆ → Reading view of the sheet, returning to where it was', () => {
    expect(readingRoute('narrow', evaluated, true)).toEqual({ surface: 'sheet-tab', back: 'S1' })
    expect(readingRoute('narrow', null, false)).toEqual({ surface: 'sheet-reading', back: 'S0' })
    expect(readingRoute('narrow', reference, false)).toEqual({ surface: 'sheet-reading', back: 'S1' })
    // A ● no longer in the snapshot does not open an empty sheet.
    expect(readingRoute('narrow', evaluated, false)).toEqual({ surface: 'sheet-reading', back: 'S1' })
  })

  it('requesting the Reading only sets Mission and counts the request: the selection (◆ included) does not change', () => {
    uiActions.select(YUNGAY, 'evaluated')
    const before = uiStore.getState().selection
    uiActions.requestReading()
    expect(uiStore.getState().selection).toBe(before)
    expect(uiStore.getState().mode).toBe('mision')
    expect(uiStore.getState().readingRequest).toBe(1)
    uiActions.select('ref-analog', 'reference')
    const ref = uiStore.getState().selection
    uiActions.requestReading()
    expect(uiStore.getState().selection).toBe(ref)
    expect(uiStore.getState().readingRequest).toBe(2)
  })

  it('navigating after evaluating (also with no prioritized sites) does not mutate the planner or call the AI', () => {
    const mission = createStore<MissionState>(INITIAL_MISSION_STATE)
    const composer = createStore<ComposerState>(initialComposerState())
    const requestExplanation = vi.fn(() => new Promise(() => undefined))
    const requestDraft = vi.fn(() => new Promise(() => undefined))
    const deps: ControllerDeps = {
      bundle: v3Bundle,
      requestDraft: requestDraft as unknown as ControllerDeps['requestDraft'],
      requestExplanation: requestExplanation as unknown as ControllerDeps['requestExplanation'],
      apiUrl: () => 'http://127.0.0.1/api/ai',
      mission,
      composer,
      ui: { getState: () => uiStore.getState(), setMissionPhase: noop, select: noop, resetCameraTouch: noop },
      announce: noop,
      persistHistory: noop,
      download: noop,
      now: () => 1_700_000_000_000,
      setTimer: () => 0,
      clearTimer: noop,
    }
    const controller = createMissionController(deps)
    controller.loadExample()
    controller.dispatch({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } })
    controller.dispatch({ type: 'confirm' })
    expect(controller.evaluate()).toBe(true)
    const snapshot = mission.getState()
    expect(snapshot.evaluation?.recommended_site_ids).toEqual([])
    const planner = controller.getState()
    uiActions.requestReading()
    uiActions.requestReading()
    expect(mission.getState()).toBe(snapshot)
    expect(controller.getState()).toBe(planner)
    expect(planner.explain.status).not.toBe('pending')
    expect(requestExplanation).not.toHaveBeenCalled()
    expect(requestDraft).not.toHaveBeenCalled()
  })

  it('mobile sheet: “Reading” view without ● (also with ◆) instead of the reference sheet; Back/✕ do not close the place', () => {
    const body = renderToStaticMarkup(<>{sheetBody({ detent: 'S2', data: readyData, site: null, selection: { siteId: 'ref-analog', kind: 'reference' }, onShowOnMap: noop, onListView: noop, reading: true })}</>)
    expect(body).toContain('data-slot="sheet.reading"')
    expect(body).not.toContain('data-slot="sheet.reference"')
    const head = renderToStaticMarkup(<>{sheetHead({ detent: 'S2', data: readyData, siteName: null, hasSelection: true, onDetent: noop, readingBack: 'S1' })}</>)
    expect(head).toContain('>Reading</h2>')
    expect(head).toContain('aria-label="Close Reading"')
    expect(head).not.toContain('Cerrar el lugar')
    // Outside the Reading view, the sheet does not change.
    const plain = renderToStaticMarkup(<>{sheetBody({ detent: 'S2', data: readyData, site: null, selection: { siteId: 'ref-analog', kind: 'reference' }, onShowOnMap: noop, onListView: noop })}</>)
    expect(plain).toContain('data-slot="sheet.reference"')
  })

  it('mobile sheet with ●: the site sheet opens directly on the “Reading” tab', () => {
    const html = renderToStaticMarkup(<FullDetail data={readyData} site={site} placement="sheet" onShowOnMap={noop} tabRequest={{ tab: 'lectura', nonce: 1 }} />)
    expect(html).toMatch(/aria-selected="true"[^>]*>Reading|>Reading<\/button>/)
    expect(html).toContain('data-slot="full.reading"')
    expect(html).not.toContain('data-slot="full.metrics"')
    const normal = renderToStaticMarkup(<FullDetail data={readyData} site={site} placement="sheet" onShowOnMap={noop} />)
    expect(normal).toContain('data-slot="full.metrics"')
  })

  it('pill in Mission (1100–1439): label “Reading”; in Explore it stays “Deterministic reading”', () => {
    expect(renderToStaticMarkup(<ReadingPill data={readyData} />)).toContain('Deterministic reading')
    uiActions.setMode('mision')
    const html = renderToStaticMarkup(<ReadingPill data={readyData} openSignal={0} />)
    expect(html).toContain('<span>Reading</span>')
  })
})

describe('compact result: “Go to Reading” action and printing without deferred waits (M11)', () => {
  const props = { onExplain: noop, onExport: noop, exportError: null, onEdit: noop, candidates: v3Bundle.candidates }

  it('also offered when no area is prioritized; the team view does not carry it', () => {
    const none = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])
    expect(none.evaluation.recommended_site_ids).toEqual([])
    const compact = renderToStaticMarkup(<ResultView {...props} {...none} compact onOpenReading={noop} />)
    expect(compact).toContain('No area is prioritized')
    expect(compact).toContain('>Go to Reading</button>')
    expect(renderToStaticMarkup(<ResultView {...props} {...none} onOpenReading={noop} />)).not.toContain('Ir a la Lectura')
  })

  it('round 2: a single action, after the initial summary and before chips, groups and export', () => {
    for (const ev of [evaluateExample(), evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])]) {
      const html = renderToStaticMarkup(<ResultView {...props} {...ev} compact onOpenReading={noop} />)
      expect(html.match(/Go to Reading/g)).toHaveLength(1)
      const cta = html.indexOf('Go to Reading')
      expect(cta).toBeGreaterThan(html.indexOf('class="pl-lead"'))
      expect(cta).toBeLessThan(html.indexOf('class="pl-chips"'))
      expect(cta).toBeLessThan(html.indexOf('class="pl-group"'))
      // It is not presented as an export.
      expect(html.slice(html.indexOf('class="pl-export"'))).not.toContain('Ir a la Lectura')
      expect(html).toContain('<p class="pl-reading-cta"><button type="button" class="pl-reading-link">Go to Reading</button></p>')
    }
  })

  it('“Print report” stays disabled with “Preparing report…” until the current report is mounted', () => {
    const ev = evaluateExample()
    const waiting = renderToStaticMarkup(<ResultView {...props} {...ev} compact printReady={false} />)
    expect(waiting).toMatch(/<button type="button" disabled=""[^>]*>Preparing report…<\/button>/)
    expect(waiting).not.toContain('Imprimir informe')
    expect(renderToStaticMarkup(<ResultView {...props} {...ev} compact printReady />)).toMatch(/<button type="button"[^>]*>Print report<\/button>/)
    // Team view: its report is inside, the button stays available.
    expect(renderToStaticMarkup(<ResultView {...props} {...ev} />)).toContain('>Print report</button>')
  })

  it('single-source freshness: ready only with the SAME result mounted; another result or an edit disables it', () => {
    const a = evaluateExample().evaluation
    const b = evaluateExample().evaluation
    expect(isPrintReady(a, null)).toBe(false)
    const unmount = markPrintMounted(a)
    expect(isPrintReady(a, printStore.getState().mounted)).toBe(true)
    expect(isPrintReady(b, printStore.getState().mounted)).toBe(false) // another mission: never the previous report
    expect(isPrintReady(null, printStore.getState().mounted)).toBe(false) // prueba editada (resultado anulado)
    unmount()
    expect(printStore.getState().mounted).toBeNull()
  })
})

describe('informe imprimible (M11)', () => {
  const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
  const ev = evaluateExample()
  const catalog = buildGeologyCatalog(ev.evaluation, context, fingerprint(context))

  it('a notice instead of an empty page or a stale report: initial load, no evaluation and edited test', () => {
    expect(printNoticeReason(false, false, false)).toBe('loading_data')
    expect(printNoticeReason(true, false, false)).toBe('no_result')
    expect(printNoticeReason(true, false, true)).toBe('stale')
    expect(printNoticeReason(true, true, false)).toBeNull()
    const loading = renderToStaticMarkup(<MissionPrintHost data={{ status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }} />)
    expect(text(loading)).toContain(PRINT_NOTICE.loading_data)
    expect(text(renderToStaticMarkup(<MissionPrintHost data={readyData} />))).toContain(PRINT_NOTICE.no_result)
    // Edit after evaluating: the reducer cancels the result; the dimmed view is NOT printed.
    missionStore.setState({ planner: { ...ev.state, result: null, confirmed: false }, request: ev.request, evaluation: ev.evaluation, stale: true })
    const stale = renderToStaticMarkup(<MissionPrintHost data={readyData} />)
    expect(text(stale)).toContain(PRINT_NOTICE.stale)
    expect(stale).not.toContain('pl-print-opt')
    // With a current result and the report still on its way (deferred chunk): preparing notice.
    missionStore.setState({ planner: ev.state, request: ev.request, evaluation: ev.evaluation, stale: false })
    const preparing = renderToStaticMarkup(<MissionPrintHost data={readyData} />)
    expect(text(preparing)).toContain(PRINT_NOTICE.preparing)
  })

  it('with geology: the same evidence as the screen, limits always and without turning mapping into suitability', () => {
    const html = renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={ev.request} state={ev.state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />)
    const geo = text(html.slice(html.indexOf('pl-print-geo')))
    expect(geo).toContain(GEOLOGY_LAYER_NOTE)
    expect(geo).toContain(UNITS_NOT_ADDITIVE)
    expect(geo).toContain('Limits of the geological evidence')
    expect(geo).toContain('Map date')
    expect(geo).toContain('distributed by')
    for (const site of catalog.sites) {
      for (const limit of site.limits) expect(geo).toContain(text(limit).trim())
      for (const unit of site.units.slice(0, 3)) expect(geo).toContain(text(unit.description ?? 'Descripción original ausente en la fuente.').trim())
    }
    for (const excluded of catalog.excluded) expect(geo).toContain(excluded.reason)
    expect(geo).not.toMatch(/\bapto\b|aprobad|autorizad|\bis suitable\b|\bapproved\b|\bauthorized\b/i)
  })

  it('without geology: full report without the geology section', () => {
    const html = text(renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={ev.request} state={ev.state} candidates={v3Bundle.candidates} />))
    expect(html).not.toContain('Orientación geológica')
    for (const heading of ['Test', 'Geometry', 'Result', 'Ordering rule', 'Limits', 'Evidence', 'Provenance and versions']) expect(html).toContain(heading)
  })

  it('whole long brief, all sectors (REF labeled) and evidence sources with URL', () => {
    const long = `${'Ensayo de navegación autónoma con pendientes suaves y suelo desnudo. '.repeat(40)}FIN-DEL-BRIEF`.slice(-MAX_BRIEF_CHARS)
    const html = renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={{ ...ev.request, brief: long }} state={ev.state} candidates={v3Bundle.candidates} />)
    expect(html).toContain('FIN-DEL-BRIEF')
    expect(text(html)).toContain(text(long).trim())
    expect(ev.evaluation.options.length).toBeGreaterThan(1)
    expect((html.match(/class="pl-print-opt"/g) ?? []).length).toBe(ev.evaluation.options.length)
    expect(text(html)).toContain('(REF, known reference)')
    const urls = ev.evaluation.evidence.map((e) => e.source_url).filter((u): u is string => !!u)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(html).toContain(url)
  })
})
