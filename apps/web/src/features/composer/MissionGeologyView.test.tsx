// «Tu misión» (ResultView compacto) y el informe imprimible con la orientación geológica del equipo
// (M10): la sección se ve en el resultado, rotulada y con su exportación, sin la acción de IA (que
// vive en la Lectura), y el informe impreso la incluye siempre con sus límites.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildGeologyCatalog } from '../../../../../shared/geology/guidance'
import { MissionPrintReport, ResultView } from '../../components/planner/ResultView'
import type { GeologyUi } from '../../components/planner/usePlanner'
import { parseGeologyContext } from '../../domain/geologyContext'
import { fingerprint } from '../../mission'
import { evaluateExample, readJson, v3Bundle } from '../../tests/v3Support'

const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
const contextFp = fingerprint(context)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('«Tu misión» con orientación geológica', () => {
  const { state, request, evaluation } = evaluateExample()
  const catalog = buildGeologyCatalog(evaluation, context, contextFp)
  const geo: GeologyUi = { available: true, unavailableReason: null, useGeology: true, setUseGeology: () => undefined, catalog, onExportGeology: () => undefined, exportError: null }
  const props = { evaluation, request, state, candidates: v3Bundle.candidates, onExplain: () => undefined, onExport: () => undefined, exportError: null, onEdit: () => undefined }

  it('resultado compacto: orientación general sin IA, límites, fuente y exportación; la acción de IA está en la Lectura', () => {
    const html = renderToStaticMarkup(<ResultView {...props} geo={geo} compact />)
    expect(html).toContain('Orientación geológica para esta prueba')
    expect(html).toContain('Orientación general sin IA')
    expect(html).toContain('Límites de la evidencia geológica')
    expect(html).toContain('Descargar JSON con orientación geológica')
    expect(html).toContain('href="https://lineasdebasepublicas')
    expect(text(html)).toContain('«Destacar motivos con IA» en la Lectura')
    // Una sola acción de IA en la interfaz integrada: no se repite el panel del equipo.
    expect(html).not.toContain('pl-ai-title')
    expect(html).toContain('Descargar JSON</button>') // exportación M8 intacta
    expect(html).not.toMatch(/\bapto\b|aprobad|autorizad/i)
  })

  it('sin contexto geológico la sección no existe y el resultado compacto sigue igual', () => {
    const html = renderToStaticMarkup(<ResultView {...props} compact />)
    expect(html).not.toContain('Orientación geológica para esta prueba')
    expect(html).toContain('Descargar JSON</button>')
  })

  it('informe imprimible de la interfaz integrada: incluye la orientación geológica con sus límites', () => {
    const withGeo = text(renderToStaticMarkup(<MissionPrintReport evaluation={evaluation} request={request} state={state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />))
    expect(withGeo).toContain('Orientación geológica (general, sin IA)')
    expect(withGeo).toContain('Límites')
    expect(withGeo).toContain('https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base')
    const without = text(renderToStaticMarkup(<MissionPrintReport evaluation={evaluation} request={request} state={state} candidates={v3Bundle.candidates} />))
    expect(without).not.toContain('Orientación geológica')
  })
})
