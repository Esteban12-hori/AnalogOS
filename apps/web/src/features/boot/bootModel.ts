/**
 * Modelo puro del Loading WOW «Órbita honesta» (docs/UX_REDESIGN.md §2.3 A, §3.3, §4.3, §4.4).
 * Sin DOM ni React: lo usan el HTML estático (content/shell.ts, vía el plugin loadingHints en
 * Node), BootLayer, StatusChip, OrbitLoader y los tests. Ninguna cifra se inventa: los textos
 * solo reflejan hitos reales que reporta el armazón.
 */
import { posterLayout } from '../../boot/posterLayout.js'
import { baseStageInsets } from '../../shell/stageGeometry.js'

export type BootMilestone = 'snapshot' | 'globe' | 'texture'
export type MilestoneStatus = 'pending' | 'ok' | 'error'
export type Milestones = Readonly<Record<BootMilestone, MilestoneStatus>>

/** 'full' = ?intro=full (video) · 'normal' = primera vez en la sesión · 'quiet' = solo el aterrizaje. */
export type IntroMode = 'full' | 'normal' | 'quiet'

export const INTRO_SESSION_KEY = 'analogos.intro'

export const BOOT_TIMING = {
  /** Antes de esto no se ven órbita ni bitácora: anti-parpadeo y carga desde caché (<300 ms). */
  fastMs: 300,
  /** Desde el revelado hasta que la bitácora se pliega en el chip (~1,6 s). */
  foldAfterMs: 1600,
  /** ?intro=full: la órbita se ve al menos hasta este instante (ms desde la navegación). */
  fullHoldMs: 1500,
  /** Satélite: 2 vueltas de 2,4 s como máximo; después, estado estático con tiempo transcurrido. */
  loopMs: 2400,
  loops: 2,
} as const

/** Retraso de entrada de la órbita en la espera de la IA (§2.3 C: 0–300 ms, nada). */
export const ORBIT_DELAY_MS = BOOT_TIMING.fastMs
/** Duración de una vuelta de la órbita: la luz del composer usa la misma para ir en fase. */
export const ORBIT_LOOP_MS = BOOT_TIMING.loopMs

export function resolveIntroMode(search: string, playedThisSession: boolean): IntroMode {
  if (new URLSearchParams(search).get('intro') === 'full') return 'full'
  return playedThisSession ? 'quiet' : 'normal'
}

// ---- Máquina del arranque ---------------------------------------------------------------

/** orbit → reveal (3D visible: onda, aterrizaje) → fold (bitácora al chip, 280 ms) → done. */
export type BootPhase = 'orbit' | 'reveal' | 'fold' | 'done'

export interface BootState {
  mode: IntroMode
  phase: BootPhase
}

export type BootEvent =
  /** El globo 3D ya se ve (o no habrá globo: error o SVG). `at` = ms desde la navegación. */
  | { type: 'visible'; at: number }
  /** pointerdown, rueda o tecla: salta al estado final, sin animación. */
  | { type: 'interaction' }
  /** reveal: pasaron ~1,6 s · fold: terminó el pliegue. */
  | { type: 'timer' }

/** Duración del pliegue de la bitácora en el chip (--dur-3) + margen. */
export const FOLD_MS = 300

export function initialBootState(mode: IntroMode): BootState {
  return { mode, phase: 'orbit' }
}

export function bootReducer(state: BootState, event: BootEvent): BootState {
  if (event.type === 'visible') {
    if (state.phase !== 'orbit') return state
    // Todo cargó desde caché antes de 300 ms: sin órbita ni bitácora, solo el aterrizaje.
    return { phase: 'reveal', mode: state.mode === 'normal' && event.at < BOOT_TIMING.fastMs ? 'quiet' : state.mode }
  }
  if (event.type === 'interaction') return state.phase === 'orbit' || state.phase === 'reveal' ? { ...state, phase: 'done' } : state
  if (state.phase === 'reveal') return { ...state, phase: 'fold' }
  if (state.phase === 'fold') return { ...state, phase: 'done' }
  return state
}

/** Tiempo hasta el próximo `timer` en cada fase (null = no hay temporizador). */
export function phaseTimer(phase: BootPhase): number | null {
  return phase === 'reveal' ? BOOT_TIMING.foldAfterMs : phase === 'fold' ? FOLD_MS : null
}

/** Fase de intro que lee el globo: aterriza solo durante el revelado y con el globo listo. */
export function introPhaseFor(state: BootState, globe: MilestoneStatus): 'pending' | 'play' | 'done' {
  if (state.phase === 'orbit') return 'pending'
  if (state.phase === 'reveal') return globe === 'ok' ? 'play' : 'done'
  return 'done'
}

/** ¿El globo 3D ya se ve? Escritorio: globo listo y póster retirado. Móvil (sin póster): globo listo. */
export function stageVisible(milestones: Milestones, hasPoster: boolean, posterHidden: boolean): boolean {
  if (milestones.globe === 'error') return true
  return milestones.globe === 'ok' && (!hasPoster || posterHidden)
}

/** Espera antes de revelar: con ?intro=full la órbita se sostiene para poder grabarla. */
export function revealDelay(mode: IntroMode, at: number): number {
  return mode === 'full' ? Math.max(0, BOOT_TIMING.fullHoldMs - at) : 0
}

// ---- Bitácora ---------------------------------------------------------------------------

/** ok = ✓ · run = en curso (•) · wait = en espera (·) · fail = ✕ */
export type LineState = 'ok' | 'run' | 'wait' | 'fail'

export interface BootLine {
  id: BootMilestone
  state: LineState
  text: string
}

export const LINE_GLYPH: Readonly<Record<LineState, string>> = { ok: '✓', run: '•', wait: '·', fail: '✕' }

/** [nombre, en curso, cumplido, fallido] de cada hito. */
const LINE_TEXT: Readonly<Record<BootMilestone, readonly [string, string, string, string]>> = {
  snapshot: ['Snapshot científico', 'validando', 'validado', 'no se pudo validar'],
  globe: ['Globo 3D', 'cargando', 'listo', 'no disponible · mapa SVG local'],
  texture: ['Imagen NASA Blue Marble nítida', 'cargando', 'lista', 'no disponible'],
}

/** «science-screening-v2» → «v2». Si no hay sufijo de versión, la versión completa. */
export function snapshotLabel(version: string | null | undefined): string | null {
  if (!version) return null
  return /(?:^|[-_ ])(v\d+)$/i.exec(version)?.[1]?.toLowerCase() ?? version
}

/**
 * Líneas de la bitácora a partir de hitos reales. `elapsedS` (segundos desde la navegación) se
 * agrega a las líneas en curso cuando la órbita ya quedó quieta. La imagen nítida espera al globo.
 */
export function bootLines(milestones: Milestones, version: string | null = null, elapsedS: number | null = null): BootLine[] {
  const label = snapshotLabel(version)
  return (['snapshot', 'globe', 'texture'] as const).map((id): BootLine => {
    const [name, run, ok, fail] = LINE_TEXT[id]
    const status = milestones[id]
    if (id === 'texture' && status === 'pending' && milestones.globe !== 'ok') {
      return { id, state: 'wait', text: milestones.globe === 'error' ? `${name} · sin globo 3D` : name }
    }
    if (status === 'ok') return { id, state: 'ok', text: `${name}${id === 'snapshot' && label ? ` ${label}` : ''} · ${ok}` }
    if (status === 'error') return { id, state: 'fail', text: `${name} · ${fail}` }
    return { id, state: 'run', text: `${name} · ${run}${elapsedS !== null ? ` · ${elapsedS} s` : ''}` }
  })
}

export const INITIAL_MILESTONES: Milestones = Object.freeze({ snapshot: 'pending', globe: 'pending', texture: 'pending' })

// ---- Chip de estado ---------------------------------------------------------------------

export interface ChipInput {
  status: 'loading' | 'ready' | 'error'
  version: string | null
  /** Candidatos de la búsqueda (con puesto); en snapshots históricos, todos los evaluados. */
  evaluated: number
  /** Referencias conocidas (REF, sin puesto); 0 en snapshots históricos. */
  references?: number
  /** ◆ del catálogo publicado (null = catálogo no disponible: no se menciona). */
  pendingAnalogs: number | null
}

/**
 * «Snapshot v3 · 6 candidatos · 1 REF · 7 ◆ por calcular» (con referencias, ADR-008) o
 * «Snapshot v2 · 3 evaluados · 8 por calcular» (históricos). Sin catálogo de ◆, no se menciona.
 */
export function chipText({ status, version, evaluated, references = 0, pendingAnalogs }: ChipInput): string {
  if (status === 'loading') return 'Cargando snapshot validado…'
  if (status === 'error') return 'Snapshot no disponible'
  const label = snapshotLabel(version)
  const parts = [`Snapshot${label ? ` ${label}` : ''}`]
  if (references > 0) {
    parts.push(`${evaluated} ${evaluated === 1 ? 'candidato' : 'candidatos'}`, `${references} REF`)
    if (pendingAnalogs !== null && pendingAnalogs > 0) parts.push(`${pendingAnalogs} ◆ por calcular`)
  } else {
    parts.push(`${evaluated} ${evaluated === 1 ? 'evaluado' : 'evaluados'}`)
    if (pendingAnalogs !== null && pendingAnalogs > 0) parts.push(`${pendingAnalogs} por calcular`)
  }
  return parts.join(' · ')
}

/** Anuncio único al validarse el snapshot: «6 candidatos y 1 referencia conocida». */
export function snapshotAnnouncement(version: string, evaluated: number, references: number): string {
  const counted = references > 0
    ? `${evaluated} ${evaluated === 1 ? 'candidato' : 'candidatos'} y ${references} ${references === 1 ? 'referencia conocida' : 'referencias conocidas'}`
    : `${evaluated} ${evaluated === 1 ? 'lugar evaluado' : 'lugares evaluados'}`
  return `Snapshot científico ${snapshotLabel(version)} validado: ${counted}.`
}

// ---- Geometría de la órbita -------------------------------------------------------------

/** Semilado del póster sobre el radio del disco (mismo valor que GLOBE_POSTER y posterLayout). */
export const POSTER_HALF_OVER_RADIUS = 445 / 396.5
/**
 * Anillo orbital (boot.css): diámetro = 0,94 · lado del póster, justo fuera del disco y dentro de
 * la atmósfera. Desde 1100 px se inclina (−12°) y se abre en horizontal (×1,32).
 */
export const RING = { overPoster: 0.94, tiltDeg: -12, stretchX: 1.32 } as const

/** Semiejes en pantalla de la órbita (inclinada o no): para verificar que no invade barra ni dock. */
export function ringExtent(size: number, wide: boolean): { halfWidth: number; halfHeight: number } {
  const r = (size * RING.overPoster) / 2
  if (!wide) return { halfWidth: r, halfHeight: r }
  const a = r * RING.stretchX
  const t = (RING.tiltDeg * Math.PI) / 180
  return { halfWidth: Math.hypot(a * Math.cos(t), r * Math.sin(t)), halfHeight: Math.hypot(a * Math.sin(t), r * Math.cos(t)) }
}

export interface OrbitGeometry {
  /** Centro del globo en píxeles CSS. */
  x: number
  y: number
  /** Lado del póster (globo + atmósfera). */
  size: number
  /** Radio del disco del globo, sin atmósfera. */
  radius: number
  /** Borde inferior del área libre base: la bitácora queda sobre la franja de leyenda. */
  freeBottom: number
}

/**
 * Misma fórmula que el póster previo a React (posterLayout + baseStageInsets): radio de la
 * vista global y centro del área libre base. `center` permite seguir los márgenes asentados
 * (setViewOffset) sin cambiar la escala.
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

/** Variables CSS de la capa de arranque (el script en línea del HTML escribe las mismas). */
export function orbitVars(geometry: OrbitGeometry): Record<string, string> {
  return { '--boot-x': `${geometry.x}px`, '--boot-y': `${geometry.y}px`, '--boot-s': `${geometry.size}px`, '--boot-fb': `${geometry.freeBottom}px` }
}

