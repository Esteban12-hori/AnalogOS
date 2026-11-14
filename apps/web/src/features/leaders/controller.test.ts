import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getStageAnchor, getStageProjection, publishStageFrame, subscribeStageFrame, type StageProjection } from '../globe'
import { createLeaderController, SETTLE_MS, type AttrTarget, type LeaderTargets, type StyleTarget } from './controller'
import type { LeaderScene } from './frame'
import type { StageFrameInput } from './projector'
import { scienceSite } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')
const IDS = ['slope', 'terrain_roughness', 'bare_ground_fraction', 'local_relief']

/** Doble de elemento: cuenta cada escritura real al DOM. */
class FakeElement implements StyleTarget, AttrTarget {
  writes = 0
  attrs = new Map<string, string>()
  dataset: Record<string, string | undefined>
  private transformValue = ''
  constructor() {
    const self = this
    this.dataset = new Proxy<Record<string, string | undefined>>({}, {
      set(target, key, value) {
        self.writes += 1
        target[key as string] = value as string
        return true
      },
    })
  }
  style = {
    owner: this as FakeElement,
    get transform() {
      return this.owner.transformValue
    },
    set transform(value: string) {
      this.owner.writes += 1
      this.owner.transformValue = value
    },
  }
  setAttribute(name: string, value: string) {
    this.writes += 1
    this.attrs.set(name, value)
  }
}

function fakeTargets() {
  const labels = new Map(IDS.map((id) => [id, new FakeElement()]))
  const paths = new Map(IDS.map((id) => [id, new FakeElement()]))
  const targets: LeaderTargets = {
    root: new FakeElement(),
    labels,
    paths,
    header: new FakeElement(),
    chip: new FakeElement(),
    origin: new FakeElement(),
    mobile: new FakeElement(),
    mobileEnd: new FakeElement(),
  }
  return { targets, labels, paths, root: targets.root as FakeElement }
}

const scene: LeaderScene = {
  siteId: yungay.site_id,
  geometry: yungay.geometry,
  narrow: false,
  sideSheet: false,
  compact: false,
  viewport: { width: 1440, height: 900 },
  insets: { top: 78, right: 404, bottom: 280, left: 0 },
  obstacles: [],
  labels: IDS.map((id) => ({ id, width: 170, height: 62 })),
  header: { width: 232, height: 30 },
  chip: { width: 170, height: 28 },
}

function projectionAt(x: number, y: number): StageProjection {
  return { mode: 'globe', project: (lon, lat) => ({ x: x + (lon + 69.95) * 30, y: y - (lat + 24.08) * 30, visible: 1 }) }
}

/** Temporizador manual: el test decide cuándo «pasa» SETTLE_MS. */
function manualTimers() {
  let pending: { callback: () => void; ms: number } | null = null
  let armed = 0
  return {
    setTimer: (callback: () => void, ms: number) => {
      armed += 1
      pending = { callback, ms }
      return armed
    },
    clearTimer: () => {
      pending = null
    },
    fire() {
      const current = pending
      pending = null
      current?.callback()
    },
    get pending() {
      return pending
    },
    get armed() {
      return armed
    },
  }
}

describe('createLeaderController', () => {
  afterEach(() => publishStageFrame({ projection: null, anchor: null }))

  it('espera a que la cámara se asiente antes de trazar (coreografía B)', () => {
    const { targets, root } = fakeTargets()
    const timers = manualTimers()
    let stage: StageFrameInput = { projection: projectionAt(400, 340), anchor: null }
    const controller = createLeaderController({ targets: () => targets, readStage: () => stage, ...timers })
    controller.restart()
    controller.setScene(scene)
    expect(controller.phase).toBe('waiting')
    expect(root.dataset.phase).toBe('waiting')
    // Cada cuadro de vuelo rearma la espera.
    const before = timers.armed
    stage = { projection: projectionAt(410, 340), anchor: null }
    controller.frame()
    controller.frame()
    expect(timers.armed).toBe(before + 2)
    expect(timers.pending?.ms).toBe(SETTLE_MS)
    timers.fire()
    expect(controller.phase).toBe('enter')
    expect(root.dataset.phase).toBe('enter')
    expect(root.dataset.mode).toBe('lines')
    expect(controller.last?.count).toBe(4)
  })

  it('cada cuadro mueve etiquetas y trazos escribiendo directo en el DOM', () => {
    const { targets, labels, paths } = fakeTargets()
    const timers = manualTimers()
    let x = 400
    const controller = createLeaderController({ targets: () => targets, readStage: () => ({ projection: projectionAt(x, 340), anchor: null }), ...timers })
    controller.restart()
    controller.setScene(scene)
    timers.fire()
    const slope = labels.get('slope')
    const firstTransform = slope?.style.transform
    const firstPath = paths.get('slope')?.attrs.get('d')
    expect(firstTransform).toMatch(/^translate3d\(\d+px, \d+px, 0\)$/)
    expect(firstPath).toMatch(/^M[\d.]+ [\d.]+H[\d.]+V[\d.]+H[\d.]+$/)
    x = 430
    controller.frame()
    expect(slope?.style.transform).not.toBe(firstTransform)
    expect(paths.get('slope')?.attrs.get('d')).not.toBe(firstPath)
    expect(slope?.dataset.placed).toBe('1')
  })

  it('no reescribe lo que no cambió (un cuadro igual no toca el DOM)', () => {
    const { targets, labels, paths, root } = fakeTargets()
    const timers = manualTimers()
    const controller = createLeaderController({ targets: () => targets, readStage: () => ({ projection: projectionAt(400, 340), anchor: null }), ...timers })
    controller.restart()
    controller.setScene(scene)
    timers.fire()
    const count = () => [...labels.values(), ...paths.values(), root].reduce((sum, element) => sum + element.writes, 0)
    const settled = count()
    controller.frame()
    controller.frame()
    expect(count()).toBe(settled)
  })

  it('una selección nueva olvida la histéresis y vuelve a esperar', () => {
    const { targets, root } = fakeTargets()
    const timers = manualTimers()
    const controller = createLeaderController({ targets: () => targets, readStage: () => ({ projection: projectionAt(400, 340), anchor: null }), ...timers })
    controller.restart()
    controller.setScene(scene)
    timers.fire()
    controller.restart()
    expect(controller.phase).toBe('waiting')
    expect(root.dataset.phase).toBe('waiting')
    controller.dispose()
    expect(timers.pending).toBeNull()
  })

  it('recibe los cuadros del canal del globo (stageBridge) sin pasar por React', () => {
    const { targets, labels } = fakeTargets()
    const timers = manualTimers()
    // El mismo canal que LeaderLayer inyecta (STAGE_BRIDGE).
    const controller = createLeaderController({ targets: () => targets, readStage: () => ({ projection: getStageProjection(), anchor: getStageAnchor() }), ...timers })
    const unsubscribe = subscribeStageFrame(controller.frame)
    controller.restart()
    controller.setScene(scene)
    publishStageFrame({ projection: projectionAt(400, 340), anchor: null })
    timers.fire()
    const before = labels.get('slope')?.style.transform
    for (let step = 1; step <= 30; step += 1) publishStageFrame({ projection: projectionAt(400 + step * 2, 340), anchor: null })
    expect(labels.get('slope')?.style.transform).not.toBe(before)
    expect(controller.last?.mode).toBe('lines')
    // El globo deja de publicar (p. ej. desmontado): la capa se apaga sola.
    publishStageFrame({ projection: null, anchor: null })
    expect(controller.last?.mode).toBe('off')
    unsubscribe()
  })
})

describe('sin setState por cuadro', () => {
  const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8')

  it('el controlador y la capa no usan estado de React (solo refs y escritura directa)', () => {
    for (const file of ['controller.ts', 'frame.ts', 'layoutLeaders.ts', 'leaderPaths.ts', 'projector.ts']) {
      expect(read(file), file).not.toMatch(/from 'react'/)
    }
    for (const file of ['LeaderStage.tsx', 'LeaderCanvas.tsx', 'LeaderLayer.tsx']) {
      expect(read(file), file).not.toMatch(/useState|useReducer|setState/)
    }
  })

  it('la única suscripción por cuadro va al controlador', () => {
    expect(read('LeaderStage.tsx')).toMatch(/bridge\.subscribe\(controller\.frame\)/)
    expect(read('LeaderLayer.tsx')).toMatch(/subscribe: subscribeStageFrame/)
  })

  it('la parte diferida no importa índices de otras features (se inyectan desde LeaderLayer)', () => {
    for (const file of ['LeaderCanvas.tsx', 'LeaderStage.tsx', 'controller.ts', 'frame.ts', 'projector.ts', 'labelModel.ts', 'principal.ts', 'layoutLeaders.ts', 'leaderPaths.ts']) {
      expect(read(file), file).not.toMatch(/^import (?!type)[^\n]*from '\.\.\/(globe|metrics|places|boot|engine|composer|analysis)'/m)
    }
  })
})
