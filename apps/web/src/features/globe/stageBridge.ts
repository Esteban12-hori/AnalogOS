/**
 * Canal por cuadro del escenario (globo o mapa 2D) hacia capas en espacio de pantalla
 * (líneas Tesla). NO pasa por el store ni por React: cambia en cada cuadro de cámara.
 *
 * Publica solo features/globe:
 *  - el globo, desde su único useFrame (MarkerProjector), en cada cuadro que dibuja: con
 *    frameloop «demand» eso es solo durante vuelos, gestos, intro o cambios de datos;
 *  - el mapa 2D, en cada evento `move`/`resize` de MapLibre y al cambiar la selección;
 *  - sin WebGL (mapa SVG) o al desmontarse el globo: { projection: null, anchor: null }.
 * El ancla solo existe para un sector evaluado seleccionado y visible (nunca para un ◆).
 * Coordenadas en píxeles CSS del viewport (el escenario es fijo y ocupa todo el viewport).
 */

export interface ScreenPoint {
  /** Píxeles CSS del viewport. */
  x: number
  y: number
  /** 0–1: visibilidad continua según la orientación (smoothstep(.05, .25) en el globo). */
  visible: number
}

export interface StageProjection {
  mode: 'globe' | 'flat'
  /** Proyecta lon/lat a pantalla; null si cae fuera del encuadre o detrás del globo. */
  project(lon: number, lat: number): ScreenPoint | null
}

/** Ancla del lugar seleccionado: centro del anillo y su radio en pantalla. */
export interface StageAnchor {
  siteId: string
  x: number
  y: number
  radius: number
  visible: number
  mode: 'globe' | 'flat'
}

type FrameListener = () => void

let projection: StageProjection | null = null
let anchor: StageAnchor | null = null
const listeners = new Set<FrameListener>()

/** Proyección vigente (null si el escenario no publica). */
export function getStageProjection(): StageProjection | null {
  return projection
}

/** Ancla vigente del lugar seleccionado (null si no hay selección o no se ve). */
export function getStageAnchor(): StageAnchor | null {
  return anchor
}

/** Recibe un aviso por cada cuadro en que la cámara o el ancla cambian. */
export function subscribeStageFrame(listener: FrameListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Solo features/globe: publica proyección y ancla del cuadro actual. */
export function publishStageFrame(next: { projection: StageProjection | null; anchor: StageAnchor | null }): void {
  projection = next.projection
  anchor = next.anchor
  for (const listener of [...listeners]) listener()
}
