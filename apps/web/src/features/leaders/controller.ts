/**
 * Controlador imperativo de las líneas Tesla: aplica cada cuadro de cámara escribiendo directo
 * en el DOM (transform de etiquetas, `d` de los trazos, data-* de la capa). React solo monta
 * los elementos y entrega la escena cuando cambia el contenido o el layout asentado: nunca hay
 * setState por cuadro (§2.2 regla 5, docs/BUILD_CONTRACTS.md §2.4).
 *
 * Fases (data-phase de la capa):
 *  - 'waiting': selección nueva y cámara en vuelo; nada se ve. Cada cuadro rearma la espera.
 *  - 'enter': la cámara se asentó (`settleMs` sin cuadros): el CSS traza las líneas y entra
 *    las etiquetas (coreografía B). Desde ahí las líneas siguen al globo sin transición.
 */
import { computeLeaderFrame, FRESH_MEMORY, nextMemory, type LeaderFrame, type LeaderMemory, type LeaderScene } from './frame'
import type { StageFrameInput } from './projector'

/** Sin cuadros de cámara durante este tiempo = la cámara llegó (frameloop a demanda). */
export const SETTLE_MS = 140

/** Lo mínimo del DOM que el controlador toca (los tests usan dobles con esta forma). */
export interface StyleTarget {
  style: { transform: string }
  dataset: Record<string, string | undefined>
}
export interface AttrTarget {
  setAttribute(name: string, value: string): void
}
export interface RootTarget {
  dataset: Record<string, string | undefined>
}

export interface LeaderTargets {
  root: RootTarget | null
  labels: ReadonlyMap<string, StyleTarget>
  paths: ReadonlyMap<string, AttrTarget>
  header: StyleTarget | null
  chip: StyleTarget | null
  origin: AttrTarget | null
  mobile: AttrTarget | null
  mobileEnd: AttrTarget | null
}

export type LeaderPhase = 'waiting' | 'enter'

export interface LeaderControllerOptions {
  targets: () => LeaderTargets
  /** Lee el cuadro vigente del escenario (LeaderStageBridge.read). */
  readStage: () => StageFrameInput
  settleMs?: number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export interface LeaderController {
  /** Contenido o layout asentado nuevo (no por cuadro): recalcula y aplica. */
  setScene(scene: LeaderScene | null): void
  /** Selección o resultado nuevo: oculta y espera a que la cámara se asiente. */
  restart(): void
  /** Un cuadro del escenario. */
  frame(): void
  dispose(): void
  readonly phase: LeaderPhase
  readonly last: LeaderFrame | null
}

function px(value: number): number {
  return Math.round(value)
}

export function createLeaderController(options: LeaderControllerOptions): LeaderController {
  const { readStage } = options
  const settleMs = options.settleMs ?? SETTLE_MS
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms))
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  let scene: LeaderScene | null = null
  let memory: LeaderMemory = FRESH_MEMORY
  let phase: LeaderPhase = 'waiting'
  let timer: unknown = null
  let last: LeaderFrame | null = null
  // Última escritura por elemento y propiedad: no se reescribe lo que no cambió.
  const written = new WeakMap<object, Map<string, string>>()

  const put = (target: object, key: string, value: string, apply: (value: string) => void) => {
    let map = written.get(target)
    if (!map) {
      map = new Map()
      written.set(target, map)
    }
    if (map.get(key) === value) return
    map.set(key, value)
    apply(value)
  }

  const setData = (target: RootTarget | StyleTarget, key: string, value: string) =>
    put(target, `data-${key}`, value, (next) => {
      target.dataset[key] = next
    })

  const place = (target: StyleTarget | null, at: { x: number; y: number } | null) => {
    if (!target) return
    setData(target, 'placed', at ? '1' : '0')
    if (at) put(target, 'transform', `translate3d(${px(at.x)}px, ${px(at.y)}px, 0)`, (next) => {
      target.style.transform = next
    })
  }

  const attr = (target: AttrTarget | null, name: string, value: string) => {
    if (target) put(target, name, value, (next) => target.setAttribute(name, next))
  }

  const write = (frame: LeaderFrame) => {
    const targets = options.targets()
    if (targets.root) {
      setData(targets.root, 'mode', frame.mode)
      setData(targets.root, 'side', frame.side)
      setData(targets.root, 'count', String(frame.count))
    }
    const placed = new Map(frame.placements.map((placement) => [placement.id, placement]))
    for (const [id, label] of targets.labels) place(label, placed.get(id) ?? null)
    place(targets.header, frame.header)
    place(targets.chip, frame.chip)
    const paths = new Map(frame.paths.map((path) => [path.id, path.d]))
    for (const [id, path] of targets.paths) attr(path, 'd', paths.get(id) ?? '')
    attr(targets.origin, 'cx', frame.origin ? String(px(frame.origin.x)) : '-99')
    attr(targets.origin, 'cy', frame.origin ? String(px(frame.origin.y)) : '-99')
    attr(targets.mobile, 'd', frame.mobile?.d ?? '')
    attr(targets.mobileEnd, 'cx', frame.mobile ? String(px(frame.mobile.to.x)) : '-99')
    attr(targets.mobileEnd, 'cy', frame.mobile ? String(px(frame.mobile.to.y)) : '-99')
  }

  const setPhase = (next: LeaderPhase) => {
    phase = next
    const root = options.targets().root
    if (root) setData(root, 'phase', next)
  }

  const compute = (withMemory: LeaderMemory): LeaderFrame | null => {
    if (!scene) return null
    const frame = computeLeaderFrame(scene, readStage(), withMemory)
    write(frame)
    last = frame
    return frame
  }

  const settle = () => {
    timer = null
    // Al asentarse se elige el mejor lado sin arrastrar lo que pasó durante el vuelo.
    const frame = compute(FRESH_MEMORY)
    memory = frame ? nextMemory(FRESH_MEMORY, frame) : FRESH_MEMORY
    setPhase('enter')
  }

  const arm = () => {
    if (timer !== null) clearTimer(timer)
    timer = setTimer(settle, settleMs)
  }

  const frame = () => {
    if (phase === 'waiting') {
      compute(FRESH_MEMORY)
      arm()
      return
    }
    const result = compute(memory)
    if (result) memory = nextMemory(memory, result)
  }

  return {
    setScene(next) {
      scene = next
      frame()
    },
    restart() {
      memory = FRESH_MEMORY
      setPhase('waiting')
      arm()
    },
    frame,
    dispose() {
      if (timer !== null) clearTimer(timer)
      timer = null
    },
    get phase() {
      return phase
    },
    get last() {
      return last
    },
  }
}
