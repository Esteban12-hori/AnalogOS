// Máquina de fases de la misión, umbrales de espera 3/10/20 s (§2.3 C) y «cancelar y reemplazar».
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionPhase } from '../../state/ui'
import {
  PHASE_THRESHOLDS,
  createMissionRunController,
  isBusyPhase,
  missionPhaseStep,
  msUntilNextWaitStage,
  nextMissionPhase,
  waitStage,
  type MissionPhaseEvent,
  type MissionRun,
} from './index'

const ALL: readonly MissionPhase[] = ['idle', 'interpreting', 'profile', 'scoring', 'analysis', 'done', 'error', 'cancelled']
const BUSY: readonly MissionPhase[] = ['interpreting', 'profile', 'scoring', 'analysis']

function walk(events: MissionPhaseEvent['type'][], from: MissionPhase = 'idle'): MissionPhase {
  return events.reduce<MissionPhase>((phase, type) => nextMissionPhase(phase, { type } as MissionPhaseEvent), from)
}

describe('nextMissionPhase', () => {
  it('recorre idle → interpreting → profile → scoring → analysis → done', () => {
    const seen: MissionPhase[] = []
    let phase: MissionPhase = 'idle'
    for (const type of ['submit', 'interpreted', 'profile_valid', 'scored', 'analysis_done'] as const) {
      phase = nextMissionPhase(phase, { type })
      seen.push(phase)
    }
    expect(seen).toEqual(['interpreting', 'profile', 'scoring', 'analysis', 'done'])
    expect(seen.slice(0, 4).map(missionPhaseStep)).toEqual([1, 2, 3, 4])
  })

  it('ignora eventos fuera de orden (p. ej. un resultado atrasado)', () => {
    expect(nextMissionPhase('interpreting', { type: 'scored' })).toBe('interpreting')
    expect(nextMissionPhase('idle', { type: 'interpreted' })).toBe('idle')
    expect(nextMissionPhase('done', { type: 'analysis_done' })).toBe('done')
    expect(nextMissionPhase('cancelled', { type: 'interpreted' })).toBe('cancelled')
  })

  it('cancel y fail solo actúan en fases ocupadas', () => {
    for (const phase of ALL) {
      const busy = BUSY.includes(phase)
      expect(isBusyPhase(phase)).toBe(busy)
      expect(nextMissionPhase(phase, { type: 'cancel' })).toBe(busy ? 'cancelled' : phase)
      expect(nextMissionPhase(phase, { type: 'fail' })).toBe(busy ? 'error' : phase)
    }
  })

  it('submit desde cualquier fase vuelve a interpretar (cancelar y reemplazar); reset → idle', () => {
    for (const phase of ALL) {
      expect(nextMissionPhase(phase, { type: 'submit' })).toBe('interpreting')
      expect(nextMissionPhase(phase, { type: 'reset' })).toBe('idle')
    }
    expect(walk(['submit', 'interpreted', 'submit'])).toBe('interpreting')
    expect(walk(['submit', 'fail', 'submit', 'interpreted'])).toBe('profile')
  })
})

describe('umbrales de espera (3 / 10 / 20 s)', () => {
  it('PHASE_THRESHOLDS es el de la especificación', () => {
    expect(PHASE_THRESHOLDS).toEqual({ quietMs: 300, counterMs: 3000, slowMs: 10000, timeoutMs: 20000 })
    expect(Object.isFrozen(PHASE_THRESHOLDS)).toBe(true)
  })

  it.each([
    [0, 'quiet'],
    [299, 'quiet'],
    [300, 'busy'],
    [2999, 'busy'],
    [3000, 'counter'],
    [9999, 'counter'],
    [10000, 'slow'],
    [19999, 'slow'],
    [20000, 'timeout'],
    [60000, 'timeout'],
    [-5, 'quiet'],
    [Number.NaN, 'quiet'],
  ] as const)('%d ms → %s', (elapsed, stage) => {
    expect(waitStage(elapsed)).toBe(stage)
  })

  it('el próximo cambio de tramo permite un solo setTimeout, sin sondeo por cuadro', () => {
    expect(msUntilNextWaitStage(0)).toBe(300)
    expect(msUntilNextWaitStage(300)).toBe(2700)
    expect(msUntilNextWaitStage(2999)).toBe(1)
    expect(msUntilNextWaitStage(3000)).toBe(7000)
    expect(msUntilNextWaitStage(15000)).toBe(5000)
    expect(msUntilNextWaitStage(20000)).toBeNull()
  })

  it('acepta umbrales propios', () => {
    const fast = { counterMs: 30, slowMs: 100, timeoutMs: 200 }
    expect(waitStage(250, fast)).toBe('timeout')
    expect(waitStage(150, fast)).toBe('slow')
    expect(waitStage(299, { ...fast, timeoutMs: 1000 })).toBe('slow')
    // Con umbrales menores que el silencio por defecto, el próximo cambio sigue siendo el más cercano.
    expect(msUntilNextWaitStage(0, fast)).toBe(30)
    expect(msUntilNextWaitStage(150, fast)).toBe(50)
    expect(msUntilNextWaitStage(250, fast)).toBeNull()
  })
})

describe('createMissionRunController · cancelar y reemplazar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('un envío nuevo aborta la corrida anterior y sus eventos dejan de contar', () => {
    const runs = createMissionRunController()
    const first = runs.start()
    expect(runs.isCurrent(first)).toBe(true)
    const second = runs.start()
    expect(second.id).toBeGreaterThan(first.id)
    expect(first.signal.aborted).toBe(true)
    expect(runs.abortReason(first)).toBe('replaced')
    expect(runs.isCurrent(first)).toBe(false)
    expect(runs.isCurrent(second)).toBe(true)
    expect(runs.current()).toBe(second)
    runs.dispose()
  })

  it('cancel aborta la vigente; sin corrida vigente devuelve false', () => {
    const runs = createMissionRunController()
    expect(runs.cancel()).toBe(false)
    const run = runs.start()
    expect(runs.cancel()).toBe(true)
    expect(run.signal.aborted).toBe(true)
    expect(runs.abortReason(run)).toBe('cancelled')
    expect(runs.current()).toBeNull()
  })

  it('a los 20 s la corrida vigente se agota una sola vez; la reemplazada no dispara', () => {
    vi.useFakeTimers()
    const timedOut: MissionRun[] = []
    const runs = createMissionRunController({ onTimeout: (run) => timedOut.push(run) })
    const replaced = runs.start()
    vi.advanceTimersByTime(5000)
    const current = runs.start()
    vi.advanceTimersByTime(PHASE_THRESHOLDS.timeoutMs - 1)
    expect(timedOut).toEqual([])
    expect(runs.isCurrent(current)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(timedOut).toEqual([current])
    expect(runs.abortReason(current)).toBe('timeout')
    expect(runs.abortReason(replaced)).toBe('replaced')
    expect(current.signal.aborted).toBe(true)
    vi.advanceTimersByTime(60000)
    expect(timedOut).toHaveLength(1)
  })

  it('finish desarma el tiempo agotado y no aborta la señal', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const runs = createMissionRunController({ onTimeout })
    const run = runs.start()
    runs.finish(run)
    vi.advanceTimersByTime(30000)
    expect(onTimeout).not.toHaveBeenCalled()
    expect(run.signal.aborted).toBe(false)
    expect(runs.abortReason(run)).toBeNull()
    expect(runs.isCurrent(run)).toBe(false)
  })

  it('usa el reloj y los temporizadores inyectados', () => {
    const scheduled: Array<{ ms: number; callback: () => void }> = []
    const runs = createMissionRunController({
      now: () => 1234,
      setTimer: (callback, ms) => scheduled.push({ ms, callback }),
      clearTimer: () => undefined,
      thresholds: { counterMs: 30, slowMs: 100, timeoutMs: 200 },
    })
    const run = runs.start()
    expect(run.startedAt).toBe(1234)
    expect(scheduled.map((row) => row.ms)).toEqual([200])
    scheduled[0]?.callback()
    expect(runs.abortReason(run)).toBe('timeout')
  })

  it('escenario completo: el resultado atrasado de la corrida reemplazada no toca la fase', async () => {
    const runs = createMissionRunController()
    let phase: MissionPhase = 'idle'
    const dispatch = (run: MissionRun, event: MissionPhaseEvent) => {
      if (event.type !== 'submit' && !runs.isCurrent(run)) return
      phase = nextMissionPhase(phase, event)
    }
    let releaseSlow: () => void = () => undefined
    const slow = new Promise<void>((resolve) => {
      releaseSlow = resolve
    })

    const a = runs.start()
    dispatch(a, { type: 'submit' })
    const aDone = slow.then(() => dispatch(a, { type: 'interpreted' }))

    const b = runs.start() // el usuario envía otro texto: reemplaza a la corrida A
    dispatch(b, { type: 'submit' })
    dispatch(b, { type: 'interpreted' })
    dispatch(b, { type: 'profile_valid' })
    expect(phase).toBe('scoring')

    releaseSlow()
    await aDone
    expect(phase).toBe('scoring') // A llegó tarde: se descartó
    dispatch(b, { type: 'scored' })
    expect(phase).toBe('analysis')
    runs.dispose()
  })
})
