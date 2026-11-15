/**
 * Composer wait labels and thresholds (pure functions of the main chunk). The figures
 * here (wait seconds) belong to the client, not results.
 *
 * The visual thresholds come from the retired in-house engine (ADR-015, superseded): counter at
 * 3 s and slowness notice at 10 s. There is no longer an in-house time limit: the cut-off is made by the team's AI client
 * at 45 s (CLIENT_TIMEOUT_MS) or by the user with «Cancel» (AbortSignal).
 */
import type { MissionPhase } from '../../state/ui'

/** Visible stage of the wait: 0–300 ms still; from 300 ms orbit and light; 3 s counter; 10 s slow. */
export type WaitStage = 'quiet' | 'busy' | 'counter' | 'slow'

export interface PhaseThresholds {
  /** From here the seconds counter is visible. */
  counterMs: number
  /** From here «Cancel» is offered together with the slowness notice. */
  slowMs: number
}

export const PHASE_THRESHOLDS: Readonly<PhaseThresholds> = Object.freeze({ counterMs: 3000, slowMs: 10_000 })

/** 0–300 ms: nothing moves, to avoid flicker. */
export const QUIET_MS = 300

/** Stage of the wait at `elapsedMs` after it started. */
export function waitStage(elapsedMs: number, thresholds: PhaseThresholds = PHASE_THRESHOLDS): WaitStage {
  if (elapsedMs >= thresholds.slowMs) return 'slow'
  if (elapsedMs >= thresholds.counterMs) return 'counter'
  if (elapsedMs >= QUIET_MS) return 'busy'
  return 'quiet'
}

/** The composer waits only while the AI proposes requirements. */
export function isWaitingPhase(phase: MissionPhase): boolean {
  return phase === 'interpreting'
}

const STEP: Partial<Record<MissionPhase, string>> = {
  interpreting: 'The AI proposes editable requirements · you confirm',
  review: 'Review the requirements and confirm in “Your mission”',
  scoring: 'Deterministic calculation in progress',
  analysis: 'Results ready · the AI highlights reasons in Reading',
  done: 'Results ready',
  error: 'Could not be completed',
  cancelled: 'Request canceled',
}

/** Text of the actual phase (status line, orbit and card). */
export function phaseLabel(phase: MissionPhase): string {
  return STEP[phase] ?? ''
}

/** Whole seconds elapsed for the counter visible from 3 s. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}
