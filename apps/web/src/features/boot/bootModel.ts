/**
 * Pure model of the "Honest orbit" Loading WOW (docs/UX_REDESIGN.md §2.3 A, §3.3, §4.3, §4.4).
 * No DOM or React: used by the static HTML (content/shell.ts, via the loadingHints plugin in
 * Node), BootLayer, StatusChip, OrbitLoader and the tests. No figure is invented: the texts
 * only reflect real milestones reported by the shell.
 */
import { posterLayout } from '../../boot/posterLayout.js'
import { baseStageInsets } from '../../shell/stageGeometry.js'

export type BootMilestone = 'snapshot' | 'globe' | 'texture'
export type MilestoneStatus = 'pending' | 'ok' | 'error'
export type Milestones = Readonly<Record<BootMilestone, MilestoneStatus>>

/** 'full' = ?intro=full (video) · 'normal' = first time in the session · 'quiet' = only the landing. */
export type IntroMode = 'full' | 'normal' | 'quiet'

export const INTRO_SESSION_KEY = 'analogos.intro'

export const BOOT_TIMING = {
  /** Before this, neither orbit nor log is visible: anti-flicker and loading from cache (<300 ms). */
  fastMs: 300,
  /** From the reveal until the log folds into the chip (~1,6 s). */
  foldAfterMs: 1600,
  /** ?intro=full: the orbit stays visible at least until this instant (ms since navigation). */
  fullHoldMs: 1500,
  /** Satellite: at most 2 laps of 2,4 s; afterwards, a static state with elapsed time. */
  loopMs: 2400,
  loops: 2,
} as const

/** Entry delay of the orbit while waiting for the AI (§2.3 C: 0–300 ms, nothing). */
export const ORBIT_DELAY_MS = BOOT_TIMING.fastMs
/** Duration of one orbit lap: the composer light uses the same one to stay in phase. */
export const ORBIT_LOOP_MS = BOOT_TIMING.loopMs

export function resolveIntroMode(search: string, playedThisSession: boolean): IntroMode {
  if (new URLSearchParams(search).get('intro') === 'full') return 'full'
  return playedThisSession ? 'quiet' : 'normal'
}

// ---- Boot state machine ---------------------------------------------------------------

/** orbit → reveal (3D visible: wave, landing) → fold (log into the chip, 280 ms) → done. */
export type BootPhase = 'orbit' | 'reveal' | 'fold' | 'done'

export interface BootState {
  mode: IntroMode
  phase: BootPhase
}

export type BootEvent =
  /** The 3D globe is already visible (or there will be no globe: error or SVG). `at` = ms since navigation. */
  | { type: 'visible'; at: number }
  /** pointerdown, wheel or key: jumps to the final state, without animation. */
  | { type: 'interaction' }
  /** reveal: ~1,6 s have passed · fold: the fold has finished. */
  | { type: 'timer' }

/** Duration of the log folding into the chip (--dur-3) + margin. */
export const FOLD_MS = 300

export function initialBootState(mode: IntroMode): BootState {
  return { mode, phase: 'orbit' }
}

export function bootReducer(state: BootState, event: BootEvent): BootState {
  if (event.type === 'visible') {
    if (state.phase !== 'orbit') return state
    // Everything loaded from cache before 300 ms: no orbit or log, only the landing.
    return { phase: 'reveal', mode: state.mode === 'normal' && event.at < BOOT_TIMING.fastMs ? 'quiet' : state.mode }
  }
  if (event.type === 'interaction') return state.phase === 'orbit' || state.phase === 'reveal' ? { ...state, phase: 'done' } : state
  if (state.phase === 'reveal') return { ...state, phase: 'fold' }
  if (state.phase === 'fold') return { ...state, phase: 'done' }
  return state
}

/** Time until the next `timer` in each phase (null = no timer). */
export function phaseTimer(phase: BootPhase): number | null {
  return phase === 'reveal' ? BOOT_TIMING.foldAfterMs : phase === 'fold' ? FOLD_MS : null
}

/** Intro phase read by the globe: it lands only during the reveal and with the globe ready. */
export function introPhaseFor(state: BootState, globe: MilestoneStatus): 'pending' | 'play' | 'done' {
  if (state.phase === 'orbit') return 'pending'
  if (state.phase === 'reveal') return globe === 'ok' ? 'play' : 'done'
  return 'done'
}

/** Is the 3D globe already visible? Desktop: globe ready and poster removed. Mobile (no poster): globe ready. */
export function stageVisible(milestones: Milestones, hasPoster: boolean, posterHidden: boolean): boolean {
  if (milestones.globe === 'error') return true
  return milestones.globe === 'ok' && (!hasPoster || posterHidden)
}

/** Wait before revealing: with ?intro=full the orbit is held so that it can be recorded. */
export function revealDelay(mode: IntroMode, at: number): number {
  return mode === 'full' ? Math.max(0, BOOT_TIMING.fullHoldMs - at) : 0
}

// ---- Log ---------------------------------------------------------------------------

/** ok = ✓ · run = en curso (•) · wait = en espera (·) · fail = ✕ */
export type LineState = 'ok' | 'run' | 'wait' | 'fail'

export interface BootLine {
  id: BootMilestone
  state: LineState
  text: string
}

export const LINE_GLYPH: Readonly<Record<LineState, string>> = { ok: '✓', run: '•', wait: '·', fail: '✕' }

/** [name, in progress, completed, failed] of each milestone. */
const LINE_TEXT: Readonly<Record<BootMilestone, readonly [string, string, string, string]>> = {
  snapshot: ['Scientific snapshot', 'validating', 'validated', 'could not be validated'],
  globe: ['3D globe', 'loading', 'ready', 'not available · local SVG map'],
  texture: ['Sharp NASA Blue Marble image', 'loading', 'ready', 'not available'],
}

/** "science-screening-v2" → "v2". If there is no version suffix, the full version. */
export function snapshotLabel(version: string | null | undefined): string | null {
  if (!version) return null
  return /(?:^|[-_ ])(v\d+)$/i.exec(version)?.[1]?.toLowerCase() ?? version
}

/**
 * Log lines built from real milestones. `elapsedS` (seconds since navigation) is
 * appended to the in-progress lines when the orbit has already stopped. The sharp image waits for the globe.
 */
export function bootLines(milestones: Milestones, version: string | null = null, elapsedS: number | null = null): BootLine[] {
  const label = snapshotLabel(version)
  return (['snapshot', 'globe', 'texture'] as const).map((id): BootLine => {
    const [name, run, ok, fail] = LINE_TEXT[id]
    const status = milestones[id]
    if (id === 'texture' && status === 'pending' && milestones.globe !== 'ok') {
      return { id, state: 'wait', text: milestones.globe === 'error' ? `${name} · no 3D globe` : name }
    }
    if (status === 'ok') return { id, state: 'ok', text: `${name}${id === 'snapshot' && label ? ` ${label}` : ''} · ${ok}` }
    if (status === 'error') return { id, state: 'fail', text: `${name} · ${fail}` }
    return { id, state: 'run', text: `${name} · ${run}${elapsedS !== null ? ` · ${elapsedS} s` : ''}` }
  })
}

export const INITIAL_MILESTONES: Milestones = Object.freeze({ snapshot: 'pending', globe: 'pending', texture: 'pending' })

// ---- Status chip -----------------------------------------------------------------------

export interface ChipInput {
  status: 'loading' | 'ready' | 'error'
  version: string | null
  /** Search candidates (with rank); in historical snapshots, all those evaluated. */
  evaluated: number
  /** Known references (REF, no rank); 0 in historical snapshots. */
  references?: number
  /** ◆ of the published catalog (null = catalog not available: not mentioned). */
  pendingAnalogs: number | null
}

/**
 * "Snapshot v3 · 6 candidates · 1 REF · 7 ◆ to be computed" (with references, ADR-008) or
 * "Snapshot v2 · 3 evaluated · 8 to be computed" (historical). Without a ◆ catalog, it is not mentioned.
 */
export function chipText({ status, version, evaluated, references = 0, pendingAnalogs }: ChipInput): string {
  if (status === 'loading') return 'Loading validated snapshot…'
  if (status === 'error') return 'Snapshot not available'
  const label = snapshotLabel(version)
  const parts = [`Snapshot${label ? ` ${label}` : ''}`]
  if (references > 0) {
    parts.push(`${evaluated} ${evaluated === 1 ? 'candidate' : 'candidates'}`, `${references} REF`)
    if (pendingAnalogs !== null && pendingAnalogs > 0) parts.push(`${pendingAnalogs} ◆ not yet calculated`)
  } else {
    parts.push(`${evaluated} evaluated`)
    if (pendingAnalogs !== null && pendingAnalogs > 0) parts.push(`${pendingAnalogs} not yet calculated`)
  }
  return parts.join(' · ')
}

/** Single announcement when the snapshot is validated: "6 candidates and 1 known reference". */
export function snapshotAnnouncement(version: string, evaluated: number, references: number): string {
  const counted = references > 0
    ? `${evaluated} ${evaluated === 1 ? 'candidate' : 'candidates'} and ${references} ${references === 1 ? 'known reference' : 'known references'}`
    : `${evaluated} ${evaluated === 1 ? 'evaluated place' : 'evaluated places'}`
  return `Scientific snapshot ${snapshotLabel(version)} validated: ${counted}.`
}

// ---- Orbit geometry -------------------------------------------------------------

/** Half-side of the poster over the radius of the disc (same value as GLOBE_POSTER and posterLayout). */
export const POSTER_HALF_OVER_RADIUS = 445 / 396.5
/**
 * Orbital ring (boot.css): diameter = 0,94 · poster side, just outside the disc and inside
 * the atmosphere. From 1100 px it tilts (−12°) and opens horizontally (×1,32).
 */
export const RING = { overPoster: 0.94, tiltDeg: -12, stretchX: 1.32 } as const

/** Semi-axes of the orbit on screen (tilted or not): to verify that it does not encroach on the bar or dock. */
export function ringExtent(size: number, wide: boolean): { halfWidth: number; halfHeight: number } {
  const r = (size * RING.overPoster) / 2
  if (!wide) return { halfWidth: r, halfHeight: r }
  const a = r * RING.stretchX
  const t = (RING.tiltDeg * Math.PI) / 180
  return { halfWidth: Math.hypot(a * Math.cos(t), r * Math.sin(t)), halfHeight: Math.hypot(a * Math.sin(t), r * Math.cos(t)) }
}

export interface OrbitGeometry {
  /** Center of the globe in CSS pixels. */
  x: number
  y: number
  /** Side of the poster (globe + atmosphere). */
  size: number
  /** Radius of the globe disc, without atmosphere. */
  radius: number
  /** Bottom edge of the base free area: the log sits above the legend strip. */
  freeBottom: number
}

/**
 * Same formula as the pre-React poster (posterLayout + baseStageInsets): radius of the
 * global view and center of the base free area. `center` allows following the settled margins
 * (setViewOffset) without changing the scale.
 */
export function orbitGeometry(width: number, height: number, center?: { x: number; y: number }): OrbitGeometry {
  const insets = baseStageInsets(width, height)
  const layout = posterLayout(width, height, insets)
  const size = layout.size
  return {
    x: center?.x ?? layout.left + size / 2,
    y: center?.y ?? layout.top + size / 2,
    size,
    radius: size / 2 / POSTER_HALF_OVER_RADIUS,
    freeBottom: height - insets.bottom,
  }
}

/** CSS variables of the boot layer (the inline script in the HTML writes the same ones). */
export function orbitVars(geometry: OrbitGeometry): Record<string, string> {
  return { '--boot-x': `${geometry.x}px`, '--boot-y': `${geometry.y}px`, '--boot-s': `${geometry.size}px`, '--boot-fb': `${geometry.freeBottom}px` }
}

