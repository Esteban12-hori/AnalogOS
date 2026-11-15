/**
 * features/leaders — líneas de métricas estilo Tesla en espacio de pantalla (incremento 6,
 * docs/UX_REDESIGN.md §3.4). Slots: `stage.overlay` (capa sobre el escenario, bajo los paneles;
 * pointer-events: none) y `stage.hud` (interruptor «Líneas» en la franja de leyenda del escenario).
 *
 * Consume: canal por cuadro de features/globe (getStageAnchor/getStageProjection/
 * subscribeStageFrame), buildMetricViews de features/metrics y del store `ui` selection,
 * activeCriterionId, stageInsets y obstacles. Nunca hace setState por cuadro: cada cuadro de
 * cámara lo aplica `createLeaderController` escribiendo directo en el DOM (transform y `d`).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Los campos añadidos respecto del stub del
 * incremento 2 son todos OPCIONALES (docs/BUILD_CONTRACTS.md §1.2).
 */
import type { MetricView } from '../metrics'
import type { AppData } from '../../shell/public'

export interface LeaderLayerProps {
  data: AppData
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LeaderLayoutInput {
  /**
   * Centro y radio del anillo del lugar en pantalla: todas las líneas salen de su borde.
   * `visible` (0–1, opcional; 1 por omisión): por debajo de 0,5 el lugar no se ve → chip.
   */
  anchor: { x: number; y: number; radius: number; visible?: number }
  /** Etiquetas a ubicar (ancho/alto medidos), en orden de prioridad. */
  labels: ReadonlyArray<{ id: string; width: number; height: number }>
  /** Área segura: viewport menos stageInsets. */
  safeArea: Rect
  /** Paneles a evitar (ui.obstacles). */
  obstacles: readonly Rect[]
  /** Lado elegido en el cuadro anterior (histéresis). */
  previousSide: 'left' | 'right' | null
  /** Ancho del polígono / ancho del área libre: >0,45 → modo acoplado sin líneas. */
  polygonWidthFraction: number
  /** Alto < 860 px: máximo 3 etiquetas. */
  compact: boolean
  /** Etiquetas mostradas en el cuadro anterior (0 = chip): crecer exige holgura extra (histéresis). */
  previousCount?: number
  /** Encabezado «Todo el sector · …» sobre la columna (medido). Si no cabe, no se dibuja la columna. */
  header?: { width: number; height: number } | null
  /** Tamaño del chip «Métricas en el panel →» (medido) para ubicarlo en modo 'chip'. */
  chip?: { width: number; height: number } | null
}

export interface LeaderLayout {
  /** 'lines' = etiquetas con líneas; 'docked' = acopladas sin líneas; 'chip' = 0 etiquetas («Métricas en el panel →»). */
  mode: 'lines' | 'docked' | 'chip'
  side: 'left' | 'right'
  /** Esquina superior izquierda de cada etiqueta (px CSS del viewport), en orden de prioridad. */
  placements: ReadonlyArray<{ id: string; x: number; y: number }>
  /** Etiquetas ubicadas: 4, 3, 2 o 0 (nunca 1). */
  count?: number
  /** Punto único del borde del anillo del que salen todas las líneas (solo 'lines'). */
  origin?: { x: number; y: number }
  /** x del bus vertical que reúne las líneas antes del origen (solo 'lines'). */
  busX?: number
  /** Esquina superior izquierda del encabezado (si se pidió y cupo). */
  header?: { x: number; y: number }
  /** Esquina superior izquierda del chip (solo 'chip', si se pidió y cupo). */
  chip?: { x: number; y: number }
}

export { LeaderLayer } from './LeaderLayer'
export { LeaderToggle } from './LeaderToggle'
// `layoutLeaders`, `LEADER_GEOMETRY` y `pickPrincipalMetrics` viven en el chunk diferido de las
// líneas: se importan directo de './layoutLeaders' y './principal' (§6.1). Aquí solo tipos.
export type { LeaderPath, MobileLeader, MobileLeaderInput } from './leaderPaths'
export { getLeadersEnabled, setLeadersEnabled, useLeadersEnabled } from './preference'
export type { MetricView }
