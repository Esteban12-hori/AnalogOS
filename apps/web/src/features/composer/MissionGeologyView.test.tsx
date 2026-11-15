// “Your mission” (compact ResultView) and the printable report with the team's geological guidance
// (M10): the section shows in the result, labeled and with its export, without the AI action (which
// lives in Reading), and the printed report always includes it with its limits.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildGeologyCatalog, deterministicGeologyRefs } from '../../../../../shared/geology/guidance'
import { MissionPrintReport, ResultView } from '../../components/planner/ResultView'
import type { GeologyUi } from '../../components/planner/usePlanner'
import { parseGeologyContext } from '../../domain/geologyContext'
import { fingerprint } from '../../mission'
import { evaluateExample, readJson, v3Bundle } from '../../tests/v3Support'

const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
const contextFp = fingerprint(context)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('“Your mission” with geological guidance', () => {
  const { state, request, evaluation } = evaluateExample()
  const catalog = buildGeologyCatalog(evaluation, context, contextFp)
  const geo: GeologyUi = { available: true, unavailableReason: null, useGeology: true, setUseGeology: () => undefined, catalog, onExportGeology: () => undefined, exportError: null }
  const props = { evaluation, request, state, candidates: v3Bundle.candidates, onExplain: () => undefined, onExport: () => undefined, exportError: null, onEdit: () => undefined }

  it('compact result: general guidance without AI, limits, source and export; the AI action is in Reading', () => {
    const html = renderToStaticMarkup(<ResultView {...props} geo={geo} compact />)
    expect(html).toContain('Geological guidance for this test')
    expect(html).toContain('General guidance without AI')
    expect(html).toContain('Limits of the geological evidence')
    expect(html).toContain('Download JSON with geological guidance')
    expect(html).toContain('href="https://lineasdebasepublicas')
    expect(text(html)).toContain('“Highlight reasons with AI” in Reading')
    // A single AI action in the integrated UI: the team panel is not repeated.
    expect(html).not.toContain('pl-ai-title')
    expect(html).toContain('Download JSON</button>') // mission export (M8) intact
    expect(html).not.toMatch(/\bapto\b|aprobad|autorizad|\bis suitable\b|\bapproved\b|\bauthorized\b/i)
  })

  it('compact result: guidance is folded AFTER export, with the label and the sectors in the summary', () => {
    const html = renderToStaticMarkup(<ResultView {...props} geo={geo} compact />)
    const fold = html.indexOf('<details class="pl-more pl-geo-fold">')
    expect(fold).toBeGreaterThan(-1) // closed by default: no open attribute
    expect(fold).toBeGreaterThan(html.indexOf('class="pl-export"'))
    // “Back to editing” and the mission export stay before the geological guidance.
    expect(html.indexOf('Back to editing')).toBeLessThan(html.indexOf('class="pl-geo"'))
    const summary = text(html.slice(fold, html.indexOf('</summary>', fold)))
    expect(summary).toContain('Geological guidance for this test')
    expect(summary).toContain('General guidance without AI')
    expect(summary).toContain(`${catalog.sites.length} ${catalog.sites.length === 1 ? 'sector' : 'sectors'}`)
    // Inside the fold, the team component unchanged (section labeled by its h3).
    expect(html.slice(fold)).toContain('aria-labelledby="pl-geo-title"')
    expect(html.slice(fold)).toContain('Download JSON with geological guidance')
  })

  it('with the current AI selection, the folded summary says “AI selection”', () => {
    const refIds = deterministicGeologyRefs(catalog).ref_ids
    const withAi = {
      ...state,
      explain: { ...state.explain, geologyRecord: { catalog_fingerprint: catalog.catalog_fingerprint, selection: { ref_ids: refIds } } },
    } as unknown as typeof state
    const html = renderToStaticMarkup(<ResultView {...props} state={withAi} geo={geo} compact />)
    const fold = html.indexOf('<details class="pl-more pl-geo-fold">')
    const summary = text(html.slice(fold, html.indexOf('</summary>', fold)))
    expect(summary).toContain('AI selection')
    expect(summary).not.toContain('General guidance without AI')
  })

  it('the team view (without compact variant) does not change: geology guide before export and no fold', () => {
    const html = renderToStaticMarkup(<ResultView {...props} geo={geo} />)
    expect(html).not.toContain('pl-geo-fold')
    expect(html.indexOf('class="pl-geo"')).toBeLessThan(html.indexOf('class="pl-export"'))
  })

  it('without geology context the section does not exist and the compact result stays the same', () => {
    const html = renderToStaticMarkup(<ResultView {...props} compact />)
    expect(html).not.toContain('Geological guidance for this test')
    expect(html).toContain('Download JSON</button>')
  })

  it('printable report of the integrated UI: includes the geological guidance with its limits', () => {
    const withGeo = text(renderToStaticMarkup(<MissionPrintReport evaluation={evaluation} request={request} state={state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />))
    expect(withGeo).toContain('Geological guidance (general, without AI)')
    expect(withGeo).toContain('Limits')
    expect(withGeo).toContain('https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base')
    const without = text(renderToStaticMarkup(<MissionPrintReport evaluation={evaluation} request={request} state={state} candidates={v3Bundle.candidates} />))
    expect(without).not.toContain('Orientación geológica')
  })
})
