/**
 * Máquina de estados de la misión y espera de la IA (docs/UX_REDESIGN.md §2.3 C y §5.1).
 * Pura: no lee ni escribe stores. `features/composer` la usa para escribir `ui.missionPhase`.
 *
 * idle ─submit→ interpreting ─interpreted→ profile ─profile_valid→ scoring ─scored→ analysis
 *      ─analysis_done→ done. Desde cualquier fase ocupada: fail → error, cancel → cancelled.
 * `submit` desde cualquier fase empieza de nuevo (cancelar y reemplazar); `reset` → idle.
 * Un evento fuera de orden (p. ej. un `scored` atrasado de una corrida reemplazada) no cambia
 * la fase; para descartar eventos de corridas viejas está `createMissionRunController`.
 */
import type { MissionPhase } from '../../state/ui'
import type {
  MissionAbortReason,
  MissionPhaseEvent,
  MissionRun,
  MissionRunController,
  MissionRunControllerOptions,
  PhaseThresholds,
  WaitStage,
} from './types'

/** Umbrales de la espera de IA (§2.3 C): 0,3 s quieto, 3 s contador, 10 s lento, 20 s agotado. */
export const PHASE_THRESHOLDS: PhaseThresholds = Object.freeze({
  quietMs: 300,
  counterMs: 3000,
  slowMs: 10000,
  timeoutMs: 20000,
})

const BUSY: ReadonlySet<MissionPhase> = new Set<MissionPhase>(['interpreting', 'profile', 'scoring', 'analysis'])

const FORWARD: Partial<Record<MissionPhaseEvent['type'], readonly [MissionPhase, MissionPhase]>> = {
  interpreted: ['interpreting', 'profile'],
  profile_valid: ['profile', 'scoring'],
  scored: ['scoring', 'analysis'],
  analysis_done: ['analysis', 'done'],
}

export function isBusyPhase(phase: MissionPhase): boolean {
  return BUSY.has(phase)
}

export function nextMissionPhase(phase: MissionPhase, event: MissionPhaseEvent): MissionPhase {
  switch (event.type) {
    case 'submit':
      return 'interpreting'
    case 'reset':
      return 'idle'
    case 'cancel':
      return BUSY.has(phase) ? 'cancelled' : phase
    case 'fail':
      return BUSY.has(phase) ? 'error' : phase
    default: {
      const step = FORWARD[event.type]
      return step && step[0] === phase ? step[1] : phase
    }
  }
}

/** Paso visible 1–4 de las fases ocupadas («paso 2 de 4»); null fuera de ellas. */
export function missionPhaseStep(phase: MissionPhase): 1 | 2 | 3 | 4 | null {
  switch (phase) {
    case 'interpreting':
      return 1
    case 'profile':
      return 2
    case 'scoring':
      return 3
    case 'analysis':
      return 4
    default:
      return null
  }
}

function quietOf(thresholds: PhaseThresholds): number {
  return thresholds.quietMs ?? PHASE_THRESHOLDS.quietMs ?? 300
}

/**
 * Tramo de la espera según el tiempo transcurrido: quiet (<0,3 s, nada se mueve) · busy (órbita y
 * luz) · counter (≥3 s, contador) · slow (≥10 s, «Está tardando más de lo normal», Cancelar y
 * Usar perfil base) · timeout (≥20 s, tiempo agotado y Reintentar).
 */
export function waitStage(elapsedMs: number, thresholds: PhaseThresholds = PHASE_THRESHOLDS): WaitStage {
  const elapsed = elapsedMs > 0 ? elapsedMs : 0
  if (elapsed >= thresholds.timeoutMs) return 'timeout'
  if (elapsed >= thresholds.slowMs) return 'slow'
  if (elapsed >= thresholds.counterMs) return 'counter'
  if (elapsed >= quietOf(thresholds)) return 'busy'
  return 'quiet'
}

/**
 * Milisegundos hasta el próximo cambio de tramo (para un solo setTimeout, sin sondeo por cuadro);
 * null cuando ya se agotó el tiempo.
 */
export function msUntilNextWaitStage(elapsedMs: number, thresholds: PhaseThresholds = PHASE_THRESHOLDS): number | null {
  const elapsed = elapsedMs > 0 ? elapsedMs : 0
  if (elapsed >= thresholds.timeoutMs) return null
  const boundaries = [quietOf(thresholds), thresholds.counterMs, thresholds.slowMs, thresholds.timeoutMs].sort((a, b) => a - b)
  for (const boundary of boundaries) {
    if (elapsed < boundary) return boundary - elapsed
  }
  return null
}

interface ActiveRun {
  run: MissionRun
  controller: AbortController
  timer: unknown
}

/**
 * «Cancelar y reemplazar»: una sola corrida vigente. `start()` aborta la anterior (motivo
 * 'replaced'), `cancel()` la vigente ('cancelled') y, a los `timeoutMs`, se aborta sola
 * ('timeout') y avisa con `onTimeout` para pasar a error con «tiempo agotado».
 * El AbortSignal se aborta sin motivo propio (AbortError estándar para fetch); el motivo se
 * consulta con `abortReason(run)`.
 */
export function createMissionRunController(options: MissionRunControllerOptions = {}): MissionRunController {
  const thresholds = options.thresholds ?? PHASE_THRESHOLDS
  const now = options.now ?? (() => Date.now())
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => globalThis.setTimeout(callback, ms))
  const clearTimer = options.clearTimer ?? ((handle: unknown) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>))
  const reasons = new WeakMap<MissionRun, MissionAbortReason>()
  let sequence = 0
  let active: ActiveRun | null = null

  function abortActive(reason: MissionAbortReason): MissionRun | null {
    const current = active
    if (!current) return null
    active = null
    clearTimer(current.timer)
    reasons.set(current.run, reason)
    current.controller.abort()
    return current.run
  }

  return {
    start() {
      abortActive('replaced')
      const controller = new AbortController()
      sequence += 1
      const run: MissionRun = Object.freeze({ id: sequence, signal: controller.signal, startedAt: now() })
      const timer = setTimer(() => {
        if (active?.run !== run) return
        abortActive('timeout')
        options.onTimeout?.(run)
      }, thresholds.timeoutMs)
      active = { run, controller, timer }
      return run
    },
    cancel() {
      return abortActive('cancelled') !== null
    },
    finish(run) {
      if (active?.run !== run) return
      clearTimer(active.timer)
      active = null
    },
    isCurrent(run) {
      return active?.run === run && !run.signal.aborted
    },
    current() {
      return active?.run ?? null
    },
    abortReason(run) {
      return reasons.get(run) ?? null
    },
    dispose() {
      abortActive('cancelled')
    },
  }
}
