// M11-READING-PRINT: «Ir a la Lectura» desde «Tu misión» (superficie por ancho, sin tocar selección,
// planificador ni IA) y el informe imprimible (completo, con/sin geología, sin informe viejo ni
// página vacía). Pruebas SSR y de lógica: no sustituyen la comprobación de un PDF nativo.
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

describe('«Ir a la Lectura»: superficie según el ancho (ADR-014, M11)', () => {
  const site = v3Snapshot.candidates.find((c) => c.role !== 'reference')!
  const evaluated = { siteId: site.site_id, kind: 'evaluated' as const, preview: false }
  const reference = { siteId: 'ref-analog', kind: 'reference' as const, preview: false }

  it('≥1440 panel izquierdo y 1100–1439 píldora, con o sin selección', () => {
    for (const selection of [null, evaluated, reference]) {
      expect(readingRoute('wide', selection, selection === evaluated)).toEqual({ surface: 'left', back: null })
      expect(readingRoute('medium', selection, selection === evaluated)).toEqual({ surface: 'pill', back: null })
    }
  })

  it('<1100: ● → pestaña de su ficha; sin selección o ◆ → vista Lectura de la hoja, volviendo a donde estaba', () => {
    expect(readingRoute('narrow', evaluated, true)).toEqual({ surface: 'sheet-tab', back: 'S1' })
    expect(readingRoute('narrow', null, false)).toEqual({ surface: 'sheet-reading', back: 'S0' })
    expect(readingRoute('narrow', reference, false)).toEqual({ surface: 'sheet-reading', back: 'S1' })
    // Un ● que ya no está en el snapshot no abre una ficha vacía.
    expect(readingRoute('narrow', evaluated, false)).toEqual({ surface: 'sheet-reading', back: 'S1' })
  })

  it('pedir la Lectura solo fija Misión y cuenta el pedido: la selección (◆ incluida) no cambia', () => {
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

  it('navegar tras evaluar (también sin priorizados) no muta el planificador ni llama a la IA', () => {
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

  it('hoja móvil: vista «Lectura» sin ● (también con ◆) en lugar de la ficha de referencia; Volver/✕ no cierran el lugar', () => {
    const body = renderToStaticMarkup(<>{sheetBody({ detent: 'S2', data: readyData, site: null, selection: { siteId: 'ref-analog', kind: 'reference' }, onShowOnMap: noop, onListView: noop, reading: true })}</>)
    expect(body).toContain('data-slot="sheet.reading"')
    expect(body).not.toContain('data-slot="sheet.reference"')
    const head = renderToStaticMarkup(<>{sheetHead({ detent: 'S2', data: readyData, siteName: null, hasSelection: true, onDetent: noop, readingBack: 'S1' })}</>)
    expect(head).toContain('>Lectura</h2>')
    expect(head).toContain('aria-label="Cerrar la Lectura"')
    expect(head).not.toContain('Cerrar el lugar')
    // Fuera de la vista Lectura, la hoja no cambia.
    const plain = renderToStaticMarkup(<>{sheetBody({ detent: 'S2', data: readyData, site: null, selection: { siteId: 'ref-analog', kind: 'reference' }, onShowOnMap: noop, onListView: noop })}</>)
    expect(plain).toContain('data-slot="sheet.reference"')
  })

  it('hoja móvil con ●: la ficha abre directamente en la pestaña «Lectura»', () => {
    const html = renderToStaticMarkup(<FullDetail data={readyData} site={site} placement="sheet" onShowOnMap={noop} tabRequest={{ tab: 'lectura', nonce: 1 }} />)
    expect(html).toMatch(/aria-selected="true"[^>]*>Lectura|>Lectura<\/button>/)
    expect(html).toContain('data-slot="full.reading"')
    expect(html).not.toContain('data-slot="full.metrics"')
    const normal = renderToStaticMarkup(<FullDetail data={readyData} site={site} placement="sheet" onShowOnMap={noop} />)
    expect(normal).toContain('data-slot="full.metrics"')
  })

  it('píldora en Misión (1100–1439): rótulo «Lectura»; en Explorar sigue «Lectura determinista»', () => {
    expect(renderToStaticMarkup(<ReadingPill data={readyData} />)).toContain('Lectura determinista')
    uiActions.setMode('mision')
    const html = renderToStaticMarkup(<ReadingPill data={readyData} openSignal={0} />)
    expect(html).toContain('<span>Lectura</span>')
  })
})

describe('resultado compacto: acción «Ir a la Lectura» e impresión sin esperas diferidas (M11)', () => {
  const props = { onExplain: noop, onExport: noop, exportError: null, onEdit: noop, candidates: v3Bundle.candidates }

  it('se ofrece también cuando ninguna área queda priorizada; la vista del equipo no la lleva', () => {
    const none = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])
    expect(none.evaluation.recommended_site_ids).toEqual([])
    const compact = renderToStaticMarkup(<ResultView {...props} {...none} compact onOpenReading={noop} />)
    expect(compact).toContain('Ninguna área queda priorizada')
    expect(compact).toContain('>Ir a la Lectura</button>')
    expect(renderToStaticMarkup(<ResultView {...props} {...none} onOpenReading={noop} />)).not.toContain('Ir a la Lectura')
  })

  it('ronda 2: una sola acción, después del resumen inicial y antes de chips, grupos y exportación', () => {
    for (const ev of [evaluateExample(), evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])]) {
      const html = renderToStaticMarkup(<ResultView {...props} {...ev} compact onOpenReading={noop} />)
      expect(html.match(/Ir a la Lectura/g)).toHaveLength(1)
      const cta = html.indexOf('Ir a la Lectura')
      expect(cta).toBeGreaterThan(html.indexOf('class="pl-lead"'))
      expect(cta).toBeLessThan(html.indexOf('class="pl-chips"'))
      expect(cta).toBeLessThan(html.indexOf('class="pl-group"'))
      // No se presenta como exportación.
      expect(html.slice(html.indexOf('class="pl-export"'))).not.toContain('Ir a la Lectura')
      expect(html).toContain('<p class="pl-reading-cta"><button type="button" class="pl-reading-link">Ir a la Lectura</button></p>')
    }
  })

  it('«Imprimir informe» queda deshabilitado con «Preparando informe…» hasta que el informe vigente esté montado', () => {
    const ev = evaluateExample()
    const waiting = renderToStaticMarkup(<ResultView {...props} {...ev} compact printReady={false} />)
    expect(waiting).toMatch(/<button type="button" disabled=""[^>]*>Preparando informe…<\/button>/)
    expect(waiting).not.toContain('Imprimir informe')
    expect(renderToStaticMarkup(<ResultView {...props} {...ev} compact printReady />)).toMatch(/<button type="button"[^>]*>Imprimir informe<\/button>/)
    // Vista del equipo: su informe va dentro, el botón sigue disponible.
    expect(renderToStaticMarkup(<ResultView {...props} {...ev} />)).toContain('>Imprimir informe</button>')
  })

  it('vigencia de una sola fuente: listo solo con el MISMO resultado montado; otro resultado o editar lo deshabilitan', () => {
    const a = evaluateExample().evaluation
    const b = evaluateExample().evaluation
    expect(isPrintReady(a, null)).toBe(false)
    const unmount = markPrintMounted(a)
    expect(isPrintReady(a, printStore.getState().mounted)).toBe(true)
    expect(isPrintReady(b, printStore.getState().mounted)).toBe(false) // otra misión: nunca el informe anterior
    expect(isPrintReady(null, printStore.getState().mounted)).toBe(false) // prueba editada (resultado anulado)
    unmount()
    expect(printStore.getState().mounted).toBeNull()
  })
})

describe('informe imprimible (M11)', () => {
  const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
  const ev = evaluateExample()
  const catalog = buildGeologyCatalog(ev.evaluation, context, fingerprint(context))

  it('aviso en lugar de página vacía o informe viejo: carga inicial, sin evaluación y prueba editada', () => {
    expect(printNoticeReason(false, false, false)).toBe('loading_data')
    expect(printNoticeReason(true, false, false)).toBe('no_result')
    expect(printNoticeReason(true, false, true)).toBe('stale')
    expect(printNoticeReason(true, true, false)).toBeNull()
    const loading = renderToStaticMarkup(<MissionPrintHost data={{ status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }} />)
    expect(text(loading)).toContain(PRINT_NOTICE.loading_data)
    expect(text(renderToStaticMarkup(<MissionPrintHost data={readyData} />))).toContain(PRINT_NOTICE.no_result)
    // Edición tras evaluar: el reductor anula el resultado; la vista atenuada NO se imprime.
    missionStore.setState({ planner: { ...ev.state, result: null, confirmed: false }, request: ev.request, evaluation: ev.evaluation, stale: true })
    const stale = renderToStaticMarkup(<MissionPrintHost data={readyData} />)
    expect(text(stale)).toContain(PRINT_NOTICE.stale)
    expect(stale).not.toContain('pl-print-opt')
    // Con resultado vigente y el informe aún en camino (chunk diferido): aviso de preparación.
    missionStore.setState({ planner: ev.state, request: ev.request, evaluation: ev.evaluation, stale: false })
    const preparing = renderToStaticMarkup(<MissionPrintHost data={readyData} />)
    expect(text(preparing)).toContain(PRINT_NOTICE.preparing)
  })

  it('con geología: la misma evidencia que la pantalla, límites siempre y sin convertir cartografía en aptitud', () => {
    const html = renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={ev.request} state={ev.state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />)
    const geo = text(html.slice(html.indexOf('pl-print-geo')))
    expect(geo).toContain(GEOLOGY_LAYER_NOTE)
    expect(geo).toContain(UNITS_NOT_ADDITIVE)
    expect(geo).toContain('Límites de la evidencia geológica')
    expect(geo).toContain('Fecha del mapa')
    expect(geo).toContain('distribuido por')
    for (const site of catalog.sites) {
      for (const limit of site.limits) expect(geo).toContain(text(limit).trim())
      for (const unit of site.units.slice(0, 3)) expect(geo).toContain(text(unit.description ?? 'Descripción original ausente en la fuente.').trim())
    }
    for (const excluded of catalog.excluded) expect(geo).toContain(excluded.reason)
    expect(geo).not.toMatch(/\bapto\b|aprobad|autorizad/i)
  })

  it('sin geología: informe completo sin sección geológica', () => {
    const html = text(renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={ev.request} state={ev.state} candidates={v3Bundle.candidates} />))
    expect(html).not.toContain('Orientación geológica')
    for (const heading of ['Prueba', 'Geometría', 'Resultado', 'Regla de orden', 'Límites', 'Evidencias', 'Procedencia y versiones']) expect(html).toContain(heading)
  })

  it('brief largo íntegro, todos los sectores (REF rotulada) y fuentes de evidencia con URL', () => {
    const long = `${'Ensayo de navegación autónoma con pendientes suaves y suelo desnudo. '.repeat(40)}FIN-DEL-BRIEF`.slice(-MAX_BRIEF_CHARS)
    const html = renderToStaticMarkup(<MissionPrintReport evaluation={ev.evaluation} request={{ ...ev.request, brief: long }} state={ev.state} candidates={v3Bundle.candidates} />)
    expect(html).toContain('FIN-DEL-BRIEF')
    expect(text(html)).toContain(text(long).trim())
    expect(ev.evaluation.options.length).toBeGreaterThan(1)
    expect((html.match(/class="pl-print-opt"/g) ?? []).length).toBe(ev.evaluation.options.length)
    expect(text(html)).toContain('(REF, referencia conocida)')
    const urls = ev.evaluation.evidence.map((e) => e.source_url).filter((u): u is string => !!u)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(html).toContain(url)
  })
})
