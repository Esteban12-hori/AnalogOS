import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppData } from '../../shell/public'
import { uiActions, uiStore } from '../../state/ui'
import { LeaderLayer, LeaderToggle, setLeadersEnabled } from './index'
import { leaderHeader, leaderLabelModel } from './labelModel'
import { LeaderStage, type LeaderStageProps } from './LeaderStage'
import { pickPrincipalMetrics } from './principal'
import { scienceCandidates, scienceManifest, scienceMars, scienceProfile, scienceSite, snapshotViews } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')
const principal = pickPrincipalMetrics(snapshotViews(yungay))
const labels = principal.map(leaderLabelModel)
const header = leaderHeader({ site: yungay, manifest: scienceManifest, principal, missionActive: false })

function stage(overrides: Partial<LeaderStageProps> = {}): string {
  return renderToStaticMarkup(
    <LeaderStage
      siteId={yungay.site_id}
      geometry={yungay.geometry}
      labels={labels}
      header={header}
      narrow={false}
      sideSheet={false}
      compact={false}
      width={1440}
      height={900}
      insets={{ top: 78, right: 404, bottom: 280, left: 0 }}
      obstacles={[]}
      activeId={null}
      busy={false}
      drawKey="k"
      bridge={{ subscribe: () => () => undefined, read: () => ({ projection: null, anchor: null }) }}
      {...overrides}
    />,
  )
}

const data: AppData = {
  status: 'ready',
  snapshot: {
    candidates: scienceCandidates,
    manifest: scienceManifest,
    profile: scienceProfile,
    outline: { type: 'FeatureCollection', features: [] },
    search: null,
    precedents: null,
    surfaceSeries: new Map(),
    marsReference: scienceMars,
  },
  visual: { status: 'loading' },
  error: null,
}

afterEach(() => {
  uiStore.reset()
  setLeadersEnabled(true)
})

describe('LeaderToggle', () => {
  it('es un interruptor accesible «Líneas» con su estado', () => {
    const on = renderToStaticMarkup(<LeaderToggle />)
    expect(on).toContain('role="switch"')
    expect(on).toContain('aria-checked="true"')
    expect(on).toContain('type="button"')
    expect(on).toContain('Líneas<span class="leaders-toggle-state" aria-hidden="true">: sí</span>')
    setLeadersEnabled(false)
    const off = renderToStaticMarkup(<LeaderToggle />)
    expect(off).toContain('aria-checked="false"')
    expect(off).toContain('no')
  })
})

describe('LeaderLayer', () => {
  it('sin selección, con un ◆ seleccionado o con las líneas apagadas no dibuja nada', () => {
    expect(renderToStaticMarkup(<LeaderLayer data={data} />)).toBe('')
    uiActions.select('devon-island', 'reference')
    expect(renderToStaticMarkup(<LeaderLayer data={data} />)).toBe('')
    uiActions.select(yungay.site_id, 'evaluated')
    setLeadersEnabled(false)
    expect(renderToStaticMarkup(<LeaderLayer data={data} />)).toBe('')
  })

  it('con un sector evaluado carga el dibujo en diferido (sin bloquear el render)', () => {
    uiActions.select(yungay.site_id, 'evaluated')
    expect(() => renderToStaticMarkup(<LeaderLayer data={data} />)).not.toThrow()
  })
})

describe('LeaderStage', () => {
  it('capa aria-hidden: el riel de métricas es la ruta accesible', () => {
    const html = stage()
    expect(html).toMatch(/^<div class="leaders-layer" data-mode="off" data-phase="waiting" aria-hidden="true">/)
  })

  it('cuatro etiquetas en orden de peso con valores reales; ■ solo donde hay MOLA', () => {
    const html = stage()
    const titles = [...html.matchAll(/<div class="leaders-title"><span>([^<]+)<\/span>/g)].map((match) => match[1])
    expect(titles).toEqual(['Pendiente', 'Rugosidad', 'Suelo expuesto', 'Relieve local'])
    expect(html.match(/class="leaders-mars"/g)).toHaveLength(3)
    expect(html).toContain('3,2°')
    expect(html).toContain('2,2°')
    expect(html).toContain('69 %')
    expect(html).toContain('┆ regla')
    expect(html).toContain('cumple la regla · no significa igual a Marte')
    expect(html).toContain('limitante')
  })

  it('encabezado de honestidad: todo el sector, medianas, vs ■ Jezero (MOLA)', () => {
    const text = stage().replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '')
    expect(text).toContain('Todo el sector · ≈ 450 km² · medianas ~460–480 m · vs ■ Jezero (MOLA)')
  })

  it('un trazo por etiqueta; la línea de un dato pendiente es discontinua (sin pathLength)', () => {
    const geology = leaderLabelModel(snapshotViews(yungay, { geologic_relevance: 0.5 }).find((view) => view.criterionId === 'geologic_relevance') ?? (() => { throw new Error('geo') })())
    const html = stage({ labels: [geology, ...labels.slice(0, 3)] })
    expect(html.match(/<path /g)).toHaveLength(4)
    expect(html).toMatch(/<path class="leaders-path" data-pending="" style="--i:0" d=""><\/path>/)
    expect(html.match(/pathLength="1"/g)).toHaveLength(3)
    expect(html).toContain('por calcular')
  })

  it('marca la etiqueta y la línea del criterio activo en el riel', () => {
    const html = stage({ activeId: 'terrain_roughness' })
    expect(html.match(/data-active=""/g)?.length).toBe(3) // capa + trazo + etiqueta
  })

  it('en móvil: una sola línea, sin etiquetas ni encabezado', () => {
    const html = stage({ narrow: true, width: 390, height: 844 })
    expect(html.match(/<path /g)).toHaveLength(1)
    expect(html).not.toContain('leaders-label')
    expect(html).not.toContain('leaders-header')
    expect(html).toContain('data-narrow=""')
  })

  it('misión en curso: capa a --o-busy', () => {
    expect(stage({ busy: true })).toContain('data-busy=""')
  })
})

describe('estilos de las líneas (§2.2 y §2.4)', () => {
  const css = readFileSync(resolve(__dirname, 'leaders.css'), 'utf8')
  const toggleCss = readFileSync(resolve(__dirname, 'leaders-toggle.css'), 'utf8')

  it('sin blur y sin estilizar clases del armazón', () => {
    for (const sheet of [css, toggleCss]) {
      expect(sheet).not.toMatch(/backdrop-filter/)
      expect(sheet).not.toMatch(/(^|[\s,}])\.(app|dock|rail|sheet|topbar|stage)\b/m)
    }
  })

  it('los keyframes solo animan opacity, transform o stroke-dashoffset, sin bucles', () => {
    const frames = [...css.matchAll(/@keyframes [\w-]+ \{([^@]*?)\}\s*(?=@|\.|$)/g)].map((match) => match[1] ?? '')
    expect(frames.length).toBeGreaterThanOrEqual(3)
    for (const body of frames) {
      const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1])
      for (const property of properties) expect(['opacity', 'transform', 'stroke-dashoffset']).toContain(property)
    }
    expect(css).not.toMatch(/infinite/)
  })

  it('la coreografía está parametrizada en tokens y se apaga con reduced motion', () => {
    for (const token of ['--leaders-after-ring', '--leaders-line-dur', '--leaders-line-stagger', '--leaders-label-dur', '--leaders-label-shift', '--leaders-line-ease']) {
      expect(css).toContain(`${token}:`)
    }
    expect(css).toContain('var(--ease-emph)')
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('--leaders-line-dur: 0ms')
    expect(reduced).toContain('--leaders-label-shift: 0px')
    expect(reduced).toMatch(/animation: none/)
  })
})
