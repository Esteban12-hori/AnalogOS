// Render de las tres variantes con react-dom/server (sin jsdom). Snapshot real science-v2.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { CandidateSite, DataManifest, MissionProfile } from '../../domain/contracts'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import { parseMarsReference } from '../../domain/marsReference'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData, v3Snapshot } from '../../tests/v3Support'
import { fadeOffset } from './FadeNumber'
import { MetricRail } from './MetricRail'
import MetricDetails, { defaultCriterion, metricAriaLabel, nextIndex, sourceLine } from './MetricDetails'
import { resolveMetricContext } from './metricContext'
import { buildMetricViews } from './buildMetricViews'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const snapshot: DemoSnapshot = {
  candidates,
  manifest: read('artifacts/science-v2/manifest.json') as DataManifest,
  profile: read('artifacts/science-v2/mission-profile.json') as MissionProfile,
  outline: { type: 'FeatureCollection', features: [] },
  search: null,
  precedents: null,
  surfaceSeries: new Map(),
  marsReference: parseMarsReference(read('artifacts/science-v2/analysis-summary.json')),
}
const data: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const site = (id: string) => candidates.find((candidate) => candidate.site_id === id) as CandidateSite
const yungay = site('cl-pampa-yungay-screening')
const domeyko = site('cl-domeyko-interior-screening')

function context(of: CandidateSite) {
  return resolveMetricContext({ site: of, candidates, profile: snapshot.profile, marsReference: snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
}
function details(of: CandidateSite, variant: 'rail' | 'full' | 'sheet'): string {
  return renderToStaticMarkup(<MetricDetails data={data} site={of} variant={variant} context={context(of)} onShowOnMap={() => undefined} />)
}
/** Trozo de HTML de la fila/tarjeta/diapositiva de un criterio. */
function chunk(html: string, criterion: string): string {
  const at = html.indexOf(`data-criterion="${criterion}"`)
  expect(at).toBeGreaterThan(-1)
  const start = html.lastIndexOf('<', at)
  const following = html.indexOf('data-criterion="', at + 10)
  return html.slice(start, following === -1 ? undefined : html.lastIndexOf('<', following))
}

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
})

describe('MetricRail (chunk principal)', () => {
  it('pinta al instante similitud, confianza, estabilidad y factibilidad por separado', () => {
    const html = renderToStaticMarkup(<MetricRail data={data} site={yungay} variant="rail" />)
    expect(html).toContain('75,7')
    expect(html).toContain('#1 de 3')
    for (const label of ['Confianza', 'Estabilidad', 'Factibilidad']) expect(html).toContain(`<dt>${label}</dt>`)
    expect(html).toContain('77,5')
    expect(html).toContain('99,0')
    expect(html).toContain('Requiere revisión')
    expect(html).toContain('6 de 7 criterios con dato · 90 % del peso')
    expect(html).toContain('necesita calibración')
    // El detalle por criterio llega en diferido, con un estado de carga estático.
    expect(html).toContain('Cargando el detalle por criterio')
  })

  it('S1: «‹ #1 de 3 · % ›» con el anterior deshabilitado en el #1', () => {
    const html = renderToStaticMarkup(<MetricRail data={data} site={yungay} variant="sheet" />)
    expect(html).toContain('aria-label="Cambiar de lugar"')
    expect(html).toContain('aria-disabled="true" aria-label="No hay lugar anterior"')
    expect(html).toContain('aria-label="Lugar siguiente: Cordón de Domeyko"')
    expect(html).toContain('#1 de 3 · ')
    expect(html).toContain('75,7')
  })

  it('v3: país, rol y «Factibilidad territorial: pendiente»; la REF sin puesto', () => {
    const ref = v3Snapshot.candidates.find((candidate) => candidate.role === 'reference')!
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={ref} variant="rail" />)
    expect(html).toContain('REF · Referencia conocida')
    expect(html).toContain('Chile')
    expect(html).toContain('Factibilidad territorial: pendiente')
    expect(html).not.toMatch(/#\d de 6/)
    const first = renderToStaticMarkup(<MetricRail data={readyData} site={v3Snapshot.candidates[0]!} variant="rail" />)
    expect(first).toContain('#1 de 6')
    expect(first).toContain('Candidato de la búsqueda')
  })

  it('Misión con evaluación: estado, requisitos sin medición y la versión de las reglas; nunca un % de misión', () => {
    const { evaluation, request } = evaluateExample()
    missionStore.setState({ evaluation, evaluatedRequest: request, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const site = v3Snapshot.candidates[0]!
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={site} variant="rail" />)
    expect(html).toContain('Priorizado para reconocimiento')
    expect(html).toContain('Tracción')
    expect(html).toContain('mission-rules-1.0.0')
    expect(html).toContain('sin recalcular')
    expect(html).not.toMatch(/motor determinista v|tu perfil/)
  })

  it('tras editar la prueba, la capa de Misión queda aria-busy (sin inert) hasta reevaluar', () => {
    const { evaluation, request } = evaluateExample()
    missionStore.setState({ evaluation, evaluatedRequest: request, stale: true, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={v3Snapshot.candidates[0]!} variant="rail" />)
    expect(html).toContain('data-busy=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('inert')
  })
})

describe('MetricDetails · riel (acordeón)', () => {
  it('abre por defecto la limitante (Rugosidad) y la marca', () => {
    const html = details(yungay, 'rail')
    const roughness = chunk(html, 'terrain_roughness')
    expect(roughness).toContain('data-open=""')
    expect(roughness).toContain('data-limiting=""')
    expect(roughness).toContain('aria-expanded="true"')
    expect(roughness).toContain('Limitante')
    expect(roughness).toContain('aporte −0,091')
    expect(chunk(html, 'local_relief')).toContain('aria-expanded="false"')
    expect(html.match(/data-limiting=""/g)).toHaveLength(1)
  })

  it('■ Jezero solo en las filas topográficas; el resto lleva regla o nada', () => {
    const html = details(yungay, 'rail')
    for (const id of ['slope', 'terrain_roughness', 'local_relief']) expect(chunk(html, id)).toContain('■')
    for (const id of ['bare_ground_fraction', 'aridity_context', 'surface_temperature_variability', 'geologic_relevance']) {
      expect(chunk(html, id)).not.toContain('■')
      expect(chunk(html, id)).not.toContain('Jezero')
    }
    expect(chunk(html, 'surface_temperature_variability')).toContain('┆')
    expect(chunk(html, 'geologic_relevance')).toContain('por calcular')
  })

  it('la métrica activa del store manda sobre la limitante', () => {
    uiStore.setState({ activeCriterionId: 'aridity_context' })
    const html = details(yungay, 'rail')
    expect(chunk(html, 'aridity_context')).toContain('aria-expanded="true"')
    expect(chunk(html, 'terrain_roughness')).toContain('aria-expanded="false"')
    expect(html).toContain('Menos lluvia, más análogo')
  })

  it('advertencias neutras y acción «Ver el sector en el mapa»', () => {
    const html = details(yungay, 'rail')
    expect(html).toContain('aria-label="Advertencias del lugar"')
    expect(html).toContain('Ver el sector en el mapa')
  })
})

describe('MetricDetails · ficha completa', () => {
  it('siete tarjetas en orden de peso, con visualización y «satura»', () => {
    const html = details(yungay, 'full')
    const order = [...html.matchAll(/data-criterion="([a-z_]+)"/g)].map((match) => match[1])
    expect(order).toEqual(buildMetricViews(context(yungay).input).map((view) => view.criterionId))
    expect(chunk(html, 'slope')).toContain('role="img"')
    expect(chunk(html, 'surface_temperature_variability')).toContain('satura')
    expect(chunk(html, 'surface_temperature_variability')).toContain('cumple la regla · no significa igual a Marte')
    expect(chunk(html, 'bare_ground_fraction')).toContain('satura')
    expect(html).toContain('NASA POWER · celda climática regional más cercana')
  })

  it('valor regional compartido: Domeyko y María Elena en aridez', () => {
    const html = details(domeyko, 'full')
    expect(chunk(html, 'aridity_context')).toContain('Mismo valor y misma fuente que Pampa María Elena')
    expect(chunk(html, 'slope')).not.toContain('Mismo valor')
    expect(details(yungay, 'full')).not.toContain('Mismo valor')
  })
})

describe('MetricDetails · S1 (carrusel APG)', () => {
  it('pestañas con tabindex itinerante, diapositivas inactivas inertes y región aria-live propia', () => {
    const html = details(yungay, 'sheet')
    expect(html).toContain('role="tablist"')
    expect(html.match(/role="tab"/g)).toHaveLength(7)
    expect(html.match(/role="tabpanel"/g)).toHaveLength(7)
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('aria-roledescription="carrusel"')
    expect(html).toContain('aria-live="polite"')
    expect(html.match(/inert=""/g)).toHaveLength(6)
    const active = html.slice(html.indexOf('data-active=""') - 400, html.indexOf('data-active=""'))
    expect(active).toContain('terrain_roughness-slide')
  })
})

describe('utilidades del detalle', () => {
  it('teclado: flechas, Inicio y Fin sin dar la vuelta', () => {
    expect(nextIndex('ArrowDown', 0, 7, 'vertical')).toBe(1)
    expect(nextIndex('ArrowDown', 6, 7, 'vertical')).toBe(6)
    expect(nextIndex('ArrowUp', 0, 7, 'vertical')).toBe(0)
    expect(nextIndex('ArrowRight', 2, 7, 'horizontal')).toBe(3)
    expect(nextIndex('ArrowRight', 2, 7, 'vertical')).toBeNull()
    expect(nextIndex('Home', 4, 7, 'horizontal')).toBe(0)
    expect(nextIndex('End', 0, 7, 'vertical')).toBe(6)
  })

  it('métrica por defecto, nombre accesible y fuente', () => {
    const views = buildMetricViews(context(yungay).input)
    expect(defaultCriterion(views)).toBe('terrain_roughness')
    const roughness = views.find((view) => view.criterionId === 'terrain_roughness')
    expect(roughness && metricAriaLabel(roughness)).toBe('Rugosidad, similitud 66, sector 16,6 m, Jezero 11 m, limitante')
    expect(sourceLine('none', snapshot.manifest)).toBeNull()
    expect(sourceLine('desconocido', snapshot.manifest)).toBe('desconocido')
  })

  it('el fundido indica si la cifra subió o bajó, sin interpolar', () => {
    expect(fadeOffset(70, 75.7)).toBe(4)
    expect(fadeOffset(75.7, 70)).toBe(-4)
    expect(fadeOffset(null, 70)).toBe(0)
    expect(fadeOffset('a', 'b')).toBe(0)
  })
})
