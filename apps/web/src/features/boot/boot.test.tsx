import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppData } from '../../shell/appData'
import {
  BOOT_TIMING,
  bootLines,
  bootReducer,
  chipText,
  FOLD_MS,
  initialBootState,
  INITIAL_MILESTONES,
  introPhaseFor,
  orbitGeometry,
  phaseTimer,
  resolveIntroMode,
  revealDelay,
  snapshotLabel,
  stageVisible,
  type BootState,
  type Milestones,
} from './bootModel'
import { inlineModule } from './loadingHints'
import { getBootMilestones, reportBootMilestone, requestStageOrbit, resetBootMilestones, useStageOrbit } from './milestones'
import { OrbitLoader } from './OrbitLoader'
import { globalViewOnScreen } from './StageOrbit'
import { StatusChip } from './StatusChip'

afterEach(() => resetBootMilestones())

const m = (snapshot: Milestones['snapshot'], globe: Milestones['globe'], texture: Milestones['texture'] = 'pending'): Milestones => ({ snapshot, globe, texture })

describe('modo de la intro', () => {
  it('?intro=full la fuerza; ya vista en la sesión → solo aterrizaje', () => {
    expect(resolveIntroMode('', false)).toBe('normal')
    expect(resolveIntroMode('', true)).toBe('quiet')
    expect(resolveIntroMode('?intro=full', true)).toBe('full')
    expect(resolveIntroMode('?modo=mision&intro=full', false)).toBe('full')
    expect(resolveIntroMode('?intro=corta', false)).toBe('normal')
  })

  it('?intro=full sostiene la órbita para grabarla; el resto revela al instante', () => {
    expect(revealDelay('full', 200)).toBe(BOOT_TIMING.fullHoldMs - 200)
    expect(revealDelay('full', 4000)).toBe(0)
    expect(revealDelay('normal', 200)).toBe(0)
    expect(revealDelay('quiet', 200)).toBe(0)
  })
})

describe('máquina del arranque (hitos reales)', () => {
  const orbit = initialBootState('normal')

  it('órbita → revelado → pliegue → final, con temporizadores de ~1,6 s y 280 ms', () => {
    const reveal = bootReducer(orbit, { type: 'visible', at: 1200 })
    expect(reveal).toEqual({ mode: 'normal', phase: 'reveal' })
    expect(phaseTimer('reveal')).toBe(BOOT_TIMING.foldAfterMs)
    const fold = bootReducer(reveal, { type: 'timer' })
    expect(fold.phase).toBe('fold')
    expect(phaseTimer('fold')).toBe(FOLD_MS)
    expect(bootReducer(fold, { type: 'timer' }).phase).toBe('done')
    expect(phaseTimer('orbit')).toBeNull()
    expect(phaseTimer('done')).toBeNull()
  })

  it('si todo cargó en <300 ms: sin órbita ni bitácora, solo el aterrizaje', () => {
    expect(bootReducer(orbit, { type: 'visible', at: 120 })).toEqual({ mode: 'quiet', phase: 'reveal' })
    // ?intro=full nunca se acorta
    expect(bootReducer(initialBootState('full'), { type: 'visible', at: 120 }).mode).toBe('full')
  })

  it('cualquier interacción salta al estado final, sin animación', () => {
    expect(bootReducer(orbit, { type: 'interaction' }).phase).toBe('done')
    expect(bootReducer({ mode: 'normal', phase: 'reveal' }, { type: 'interaction' }).phase).toBe('done')
    const fold: BootState = { mode: 'normal', phase: 'fold' }
    expect(bootReducer(fold, { type: 'interaction' })).toBe(fold)
  })

  it('los eventos fuera de fase no hacen nada', () => {
    const done: BootState = { mode: 'normal', phase: 'done' }
    for (const event of [{ type: 'visible', at: 0 }, { type: 'interaction' }, { type: 'timer' }] as const) {
      expect(bootReducer(done, event)).toBe(done)
    }
    expect(bootReducer(orbit, { type: 'timer' })).toBe(orbit)
    const reveal: BootState = { mode: 'normal', phase: 'reveal' }
    expect(bootReducer(reveal, { type: 'visible', at: 9 })).toBe(reveal)
  })

  it('ui.introPhase: el globo aterriza solo durante el revelado y con el globo listo', () => {
    expect(introPhaseFor(orbit, 'pending')).toBe('pending')
    expect(introPhaseFor({ mode: 'normal', phase: 'reveal' }, 'ok')).toBe('play')
    expect(introPhaseFor({ mode: 'quiet', phase: 'reveal' }, 'ok')).toBe('play')
    expect(introPhaseFor({ mode: 'normal', phase: 'reveal' }, 'error')).toBe('done')
    expect(introPhaseFor({ mode: 'normal', phase: 'fold' }, 'ok')).toBe('done')
    expect(introPhaseFor({ mode: 'normal', phase: 'done' }, 'ok')).toBe('done')
  })

  it('el 3D «se ve» con el globo listo y, en escritorio, el póster retirado; sin globo también', () => {
    expect(stageVisible(m('ok', 'pending'), true, true)).toBe(false)
    expect(stageVisible(m('ok', 'ok'), true, false)).toBe(false)
    expect(stageVisible(m('ok', 'ok'), true, true)).toBe(true)
    expect(stageVisible(m('ok', 'ok'), false, false)).toBe(true)
    expect(stageVisible(m('ok', 'error'), true, false)).toBe(true)
  })
})

describe('bitácora: solo hitos reales', () => {
  it('estado inicial del HTML: snapshot y globo en curso, imagen nítida en espera', () => {
    expect(bootLines(INITIAL_MILESTONES).map((line) => [line.state, line.text])).toEqual([
      ['run', 'Snapshot científico · validando'],
      ['run', 'Globo 3D · cargando'],
      ['wait', 'Imagen NASA Blue Marble nítida'],
    ])
  })

  it('la versión sale del manifiesto y la imagen nítida pasa a «en curso» solo con el globo listo', () => {
    const lines = bootLines(m('ok', 'ok'), 'science-screening-v2')
    expect(lines.map((line) => [line.state, line.text])).toEqual([
      ['ok', 'Snapshot científico v2 · validado'],
      ['ok', 'Globo 3D · listo'],
      ['run', 'Imagen NASA Blue Marble nítida · cargando'],
    ])
    expect(bootLines(m('ok', 'ok', 'ok'))[2]).toMatchObject({ state: 'ok', text: 'Imagen NASA Blue Marble nítida · lista' })
  })

  it('errores neutros con ✕ y sin globo la imagen no se carga', () => {
    const lines = bootLines(m('error', 'error'))
    expect(lines.map((line) => line.state)).toEqual(['fail', 'fail', 'wait'])
    expect(lines[1]?.text).toBe('Globo 3D · no disponible · mapa SVG local')
    expect(lines[2]?.text).toBe('Imagen NASA Blue Marble nítida · sin globo 3D')
  })

  it('el tiempo transcurrido solo acompaña a las líneas en curso', () => {
    const lines = bootLines(m('ok', 'pending'), 'science-screening-v2', 7)
    expect(lines.map((line) => line.text)).toEqual(['Snapshot científico v2 · validado', 'Globo 3D · cargando · 7 s', 'Imagen NASA Blue Marble nítida'])
  })

  it('snapshotLabel abrevia solo un sufijo de versión real', () => {
    expect(snapshotLabel('science-screening-v2')).toBe('v2')
    expect(snapshotLabel('demo-V10')).toBe('v10')
    expect(snapshotLabel('fixture-2026')).toBe('fixture-2026')
    expect(snapshotLabel(null)).toBeNull()
  })
})

describe('chip de estado', () => {
  it('«Snapshot v2 · 3 evaluados · 8 por calcular» solo con el catálogo de ◆ publicado', () => {
    const ready = { status: 'ready' as const, version: 'science-screening-v2', evaluated: 3 }
    expect(chipText({ ...ready, pendingAnalogs: 8 })).toBe('Snapshot v2 · 3 evaluados · 8 por calcular')
    expect(chipText({ ...ready, pendingAnalogs: null })).toBe('Snapshot v2 · 3 evaluados')
    expect(chipText({ ...ready, pendingAnalogs: 0 })).toBe('Snapshot v2 · 3 evaluados')
    expect(chipText({ ...ready, evaluated: 1, pendingAnalogs: null })).toBe('Snapshot v2 · 1 evaluado')
    expect(chipText({ ...ready, status: 'loading', pendingAnalogs: 8 })).toBe('Cargando snapshot validado…')
    expect(chipText({ ...ready, status: 'error', pendingAnalogs: 8 })).toBe('Snapshot no disponible')
  })

  it('renderiza el estado real del snapshot', () => {
    const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
    expect(renderToStaticMarkup(<StatusChip data={loading} />)).toContain('Cargando snapshot validado…')
    const snapshot = { manifest: { snapshot_version: 'science-screening-v2' }, candidates: [{}, {}, {}] } as unknown as AppData['snapshot']
    const html = renderToStaticMarkup(<StatusChip data={{ ...loading, status: 'ready', snapshot }} />)
    expect(html).toContain('Snapshot v2 · 3 evaluados')
    expect(html).not.toContain('por calcular') // el catálogo de ◆ aún no está publicado
    expect(renderToStaticMarkup(<StatusChip data={{ ...loading, status: 'error', error: 'x' }} />)).toContain('✕')
  })
})

describe('hitos y órbita de la espera', () => {
  it('reportBootMilestone actualiza el hito sin tocar los demás', () => {
    reportBootMilestone('globe', 'ok')
    expect(getBootMilestones()).toEqual({ snapshot: 'pending', globe: 'ok', texture: 'pending' })
    const before = getBootMilestones()
    reportBootMilestone('globe', 'ok')
    expect(getBootMilestones()).toBe(before)
  })

  it('OrbitLoader: nada inactivo; en línea con anillo; en el globo solo el texto de la fase', () => {
    expect(renderToStaticMarkup(<OrbitLoader active={false} label="x" />)).toBe('')
    const inline = renderToStaticMarkup(<OrbitLoader active label="Perfil recibido · paso 2 de 4" />)
    expect(inline).toContain('boot-mini')
    expect(inline).toContain('Perfil recibido · paso 2 de 4')
    const globe = renderToStaticMarkup(<OrbitLoader active label="Interpretando" placement="globe" />)
    expect(globe).not.toContain('boot-mini')
    expect(globe).toContain('data-placement="globe"')
  })

  it('las esperas piden y liberan la órbita del escenario (manda la más antigua)', () => {
    function Probe() {
      const request = useStageOrbit()
      return <i>{request ? `t${request.startedAt}` : 'sin espera'}</i>
    }
    const read = () => renderToStaticMarkup(<Probe />)
    expect(read()).toContain('sin espera')
    const release = requestStageOrbit(10)
    const second = requestStageOrbit(20)
    expect(read()).toContain('t10')
    release()
    expect(read()).toContain('t20')
    second()
    release() // liberar dos veces no rompe nada
    expect(read()).toContain('sin espera')
  })
})

describe('órbita de la IA: solo con la vista global en pantalla', () => {
  const center = { x: 720, y: 450 }
  const radius = 250
  /** Proyección ortográfica centrada en Atacama con escala `k` (1 = vista global). */
  const ortho = (k: number, lon0 = -69.5, lat0 = -24, mode: 'globe' | 'flat' = 'globe') => ({
    mode,
    project(lon: number, lat: number) {
      const rad = Math.PI / 180
      const [l, p, l0, p0] = [lon * rad, lat * rad, lon0 * rad, lat0 * rad]
      const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0)
      return {
        x: center.x + k * radius * Math.cos(p) * Math.sin(l - l0),
        y: center.y - k * radius * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0)),
        visible: cosc > 0 ? 1 : 0,
      }
    },
  })

  it('sin canal por cuadro se asume la vista global; en 2D, no', () => {
    expect(globalViewOnScreen(null, center, radius)).toBe(true)
    expect(globalViewOnScreen(ortho(1, -69.5, -24, 'flat'), center, radius)).toBe(false)
  })

  it('vista global sí; acercado o girado lejos de Atacama, no', () => {
    expect(globalViewOnScreen(ortho(1), center, radius)).toBe(true)
    expect(globalViewOnScreen(ortho(2), center, radius)).toBe(false)
    expect(globalViewOnScreen(ortho(1, 60, 10), center, radius)).toBe(false)
  })
})

describe('geometría y script en línea', () => {
  it('orbitGeometry sigue el centro asentado sin cambiar la escala', () => {
    const base = orbitGeometry(1440, 900)
    const moved = orbitGeometry(1440, 900, { x: 900, y: 400 })
    expect(moved.size).toBe(base.size)
    expect(moved.radius).toBe(base.radius)
    expect([moved.x, moved.y]).toEqual([900, 400])
  })

  it('inlineModule quita comentarios y export y el código sigue siendo válido', () => {
    const source = '// cabecera\n/** doc */\nexport var A = {\n  /** x */\n  b: 2\n}\nexport function f(x) {\n  var g = A\n  return x * g.b\n}\n'
    const code = inlineModule(source)
    expect(code).not.toMatch(/export|\/\/|\/\*/)
    expect(new Function(`${code}\nreturn f(21)`)()).toBe(42)
  })
})
