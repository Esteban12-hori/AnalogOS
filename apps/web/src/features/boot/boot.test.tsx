import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppData } from '../../shell/appData'
import {
  BOOT_TIMING,
  bootLines,
  bootReducer,
  chipText,
  snapshotAnnouncement,
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

describe('intro mode', () => {
  it('?intro=full forces it; already seen in the session → landing only', () => {
    expect(resolveIntroMode('', false)).toBe('normal')
    expect(resolveIntroMode('', true)).toBe('quiet')
    expect(resolveIntroMode('?intro=full', true)).toBe('full')
    expect(resolveIntroMode('?modo=mision&intro=full', false)).toBe('full')
    expect(resolveIntroMode('?intro=corta', false)).toBe('normal')
  })

  it('?intro=full holds the orbit for recording; the rest reveals instantly', () => {
    expect(revealDelay('full', 200)).toBe(BOOT_TIMING.fullHoldMs - 200)
    expect(revealDelay('full', 4000)).toBe(0)
    expect(revealDelay('normal', 200)).toBe(0)
    expect(revealDelay('quiet', 200)).toBe(0)
  })
})

describe('boot machine (real milestones)', () => {
  const orbit = initialBootState('normal')

  it('orbit → reveal → fold → final, with timers of ~1.6 s and 280 ms', () => {
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

  it('if everything loaded in <300 ms: no orbit or log, only the landing', () => {
    expect(bootReducer(orbit, { type: 'visible', at: 120 })).toEqual({ mode: 'quiet', phase: 'reveal' })
    // ?intro=full is never shortened
    expect(bootReducer(initialBootState('full'), { type: 'visible', at: 120 }).mode).toBe('full')
  })

  it('any interaction jumps to the final state, without animation', () => {
    expect(bootReducer(orbit, { type: 'interaction' }).phase).toBe('done')
    expect(bootReducer({ mode: 'normal', phase: 'reveal' }, { type: 'interaction' }).phase).toBe('done')
    const fold: BootState = { mode: 'normal', phase: 'fold' }
    expect(bootReducer(fold, { type: 'interaction' })).toBe(fold)
  })

  it('out-of-phase events do nothing', () => {
    const done: BootState = { mode: 'normal', phase: 'done' }
    for (const event of [{ type: 'visible', at: 0 }, { type: 'interaction' }, { type: 'timer' }] as const) {
      expect(bootReducer(done, event)).toBe(done)
    }
    expect(bootReducer(orbit, { type: 'timer' })).toBe(orbit)
    const reveal: BootState = { mode: 'normal', phase: 'reveal' }
    expect(bootReducer(reveal, { type: 'visible', at: 9 })).toBe(reveal)
  })

  it('ui.introPhase: the globe lands only during the reveal and with the globe ready', () => {
    expect(introPhaseFor(orbit, 'pending')).toBe('pending')
    expect(introPhaseFor({ mode: 'normal', phase: 'reveal' }, 'ok')).toBe('play')
    expect(introPhaseFor({ mode: 'quiet', phase: 'reveal' }, 'ok')).toBe('play')
    expect(introPhaseFor({ mode: 'normal', phase: 'reveal' }, 'error')).toBe('done')
    expect(introPhaseFor({ mode: 'normal', phase: 'fold' }, 'ok')).toBe('done')
    expect(introPhaseFor({ mode: 'normal', phase: 'done' }, 'ok')).toBe('done')
  })

  it('3D “is visible” with the globe ready and, on desktop, the poster removed; also without a globe', () => {
    expect(stageVisible(m('ok', 'pending'), true, true)).toBe(false)
    expect(stageVisible(m('ok', 'ok'), true, false)).toBe(false)
    expect(stageVisible(m('ok', 'ok'), true, true)).toBe(true)
    expect(stageVisible(m('ok', 'ok'), false, false)).toBe(true)
    expect(stageVisible(m('ok', 'error'), true, false)).toBe(true)
  })
})

describe('log: real milestones only', () => {
  it('initial HTML state: snapshot and globe in progress, sharp image waiting', () => {
    expect(bootLines(INITIAL_MILESTONES).map((line) => [line.state, line.text])).toEqual([
      ['run', 'Scientific snapshot · validating'],
      ['run', '3D globe · loading'],
      ['wait', 'Sharp NASA Blue Marble image'],
    ])
  })

  it('the version comes from the manifest and the sharp image moves to “in progress” only with the globe ready', () => {
    const lines = bootLines(m('ok', 'ok'), 'science-screening-v2')
    expect(lines.map((line) => [line.state, line.text])).toEqual([
      ['ok', 'Scientific snapshot v2 · validated'],
      ['ok', '3D globe · ready'],
      ['run', 'Sharp NASA Blue Marble image · loading'],
    ])
    expect(bootLines(m('ok', 'ok', 'ok'))[2]).toMatchObject({ state: 'ok', text: 'Sharp NASA Blue Marble image · ready' })
  })

  it('neutral errors with ✕ and without a globe the image is not loaded', () => {
    const lines = bootLines(m('error', 'error'))
    expect(lines.map((line) => line.state)).toEqual(['fail', 'fail', 'wait'])
    expect(lines[1]?.text).toBe('3D globe · not available · local SVG map')
    expect(lines[2]?.text).toBe('Sharp NASA Blue Marble image · no 3D globe')
  })

  it('elapsed time only accompanies in-progress lines', () => {
    const lines = bootLines(m('ok', 'pending'), 'science-screening-v2', 7)
    expect(lines.map((line) => line.text)).toEqual(['Scientific snapshot v2 · validated', '3D globe · loading · 7 s', 'Sharp NASA Blue Marble image'])
  })

  it('snapshotLabel abbreviates only a real version suffix', () => {
    expect(snapshotLabel('science-screening-v2')).toBe('v2')
    expect(snapshotLabel('demo-V10')).toBe('v10')
    expect(snapshotLabel('fixture-2026')).toBe('fixture-2026')
    expect(snapshotLabel(null)).toBeNull()
  })
})

describe('status chip', () => {
  it('v3: “Snapshot v3 · 6 candidates · 1 REF · 7 ◆ to be calculated” and the announcement with the known reference', () => {
    const v3 = { status: 'ready' as const, version: 'science-screening-v3', evaluated: 6, references: 1, pendingAnalogs: 7 }
    expect(chipText(v3)).toBe('Snapshot v3 · 6 candidates · 1 REF · 7 ◆ not yet calculated')
    expect(chipText({ ...v3, pendingAnalogs: null })).toBe('Snapshot v3 · 6 candidates · 1 REF')
    expect(snapshotAnnouncement('science-screening-v3', 6, 1)).toBe('Scientific snapshot v3 validated: 6 candidates and 1 known reference.')
    expect(snapshotAnnouncement('science-screening-v2', 3, 0)).toBe('Scientific snapshot v2 validated: 3 evaluated places.')
  })

  it('“Snapshot v2 · 3 evaluated · 8 to be calculated” only with the ◆ catalog published', () => {
    const ready = { status: 'ready' as const, version: 'science-screening-v2', evaluated: 3 }
    expect(chipText({ ...ready, pendingAnalogs: 8 })).toBe('Snapshot v2 · 3 evaluated · 8 not yet calculated')
    expect(chipText({ ...ready, pendingAnalogs: null })).toBe('Snapshot v2 · 3 evaluated')
    expect(chipText({ ...ready, pendingAnalogs: 0 })).toBe('Snapshot v2 · 3 evaluated')
    expect(chipText({ ...ready, evaluated: 1, pendingAnalogs: null })).toBe('Snapshot v2 · 1 evaluated')
    expect(chipText({ ...ready, status: 'loading', pendingAnalogs: 8 })).toBe('Loading validated snapshot…')
    expect(chipText({ ...ready, status: 'error', pendingAnalogs: 8 })).toBe('Snapshot not available')
  })

  it('renders the real snapshot state', () => {
    const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
    expect(renderToStaticMarkup(<StatusChip data={loading} />)).toContain('Loading validated snapshot…')
    const snapshot = { manifest: { snapshot_version: 'science-screening-v2' }, candidates: [{}, {}, {}] } as unknown as AppData['snapshot']
    const html = renderToStaticMarkup(<StatusChip data={{ ...loading, status: 'ready', snapshot }} />)
    expect(html).toContain('Snapshot v2 · 3 evaluated')
    expect(html).not.toContain('not yet calculated') // the ◆ catalog is not yet published
    expect(renderToStaticMarkup(<StatusChip data={{ ...loading, status: 'error', error: 'x' }} />)).toContain('✕')
  })
})

describe('waiting milestones and orbit', () => {
  it('reportBootMilestone updates the milestone without touching the others', () => {
    reportBootMilestone('globe', 'ok')
    expect(getBootMilestones()).toEqual({ snapshot: 'pending', globe: 'ok', texture: 'pending' })
    const before = getBootMilestones()
    reportBootMilestone('globe', 'ok')
    expect(getBootMilestones()).toBe(before)
  })

  it('OrbitLoader: nothing when idle; inline with a ring; on the globe nothing in the overlay (the composer states the phase)', () => {
    expect(renderToStaticMarkup(<OrbitLoader active={false} label="x" />)).toBe('')
    const inline = renderToStaticMarkup(<OrbitLoader active label="Perfil recibido · paso 2 de 4" />)
    expect(inline).toContain('boot-mini')
    expect(inline).toContain('Perfil recibido · paso 2 de 4')
    const globe = renderToStaticMarkup(<OrbitLoader active label="Interpretando" placement="globe" />)
    expect(globe).toBe('')
  })

  it('waits request and release the stage orbit (the oldest one wins)', () => {
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
    release() // releasing twice breaks nothing
    expect(read()).toContain('sin espera')
  })
})

describe('AI orbit: only with the global view on screen', () => {
  const center = { x: 720, y: 450 }
  const radius = 250
  /** Orthographic projection centered on Atacama with scale `k` (1 = global view). */
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

  it('without a per-frame channel the global view is assumed; in 2D, not', () => {
    expect(globalViewOnScreen(null, center, radius)).toBe(true)
    expect(globalViewOnScreen(ortho(1, -69.5, -24, 'flat'), center, radius)).toBe(false)
  })

  it('global view yes; zoomed in or rotated far from Atacama, no', () => {
    expect(globalViewOnScreen(ortho(1), center, radius)).toBe(true)
    expect(globalViewOnScreen(ortho(2), center, radius)).toBe(false)
    expect(globalViewOnScreen(ortho(1, 60, 10), center, radius)).toBe(false)
  })
})

describe('geometry and inline script', () => {
  it('orbitGeometry follows the settled center without changing the scale', () => {
    const base = orbitGeometry(1440, 900)
    const moved = orbitGeometry(1440, 900, { x: 900, y: 400 })
    expect(moved.size).toBe(base.size)
    expect(moved.radius).toBe(base.radius)
    expect([moved.x, moved.y]).toEqual([900, 400])
  })

  it('inlineModule strips comments and export and the code is still valid', () => {
    const source = '// cabecera\n/** doc */\nexport var A = {\n  /** x */\n  b: 2\n}\nexport function f(x) {\n  var g = A\n  return x * g.b\n}\n'
    const code = inlineModule(source)
    expect(code).not.toMatch(/export|\/\/|\/\*/)
    expect(new Function(`${code}\nreturn f(21)`)()).toBe(42)
  })
})
