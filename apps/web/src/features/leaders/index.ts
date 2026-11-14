/**
 * features/leaders — líneas de métricas estilo Tesla en espacio de pantalla (incremento 6).
 * Slots: `stage.overlay` (capa sobre el escenario, bajo los paneles; pointer-events: none) y
 * `stage.hud` (interruptor «Líneas» en la franja de leyenda del escenario).
 *
 * Consume: canal por cuadro de features/globe (getStageAnchor/getStageProjection/
 * subscribeStageFrame), buildMetricViews de features/metrics y del store `ui` selection,
 * activeCriterionId, stageInsets y obstacles. Nunca hace setState por cuadro.
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB (no dibuja).
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
  /** Centro y radio del anillo del lugar en pantalla: todas las líneas salen de su borde. */
  anchor: { x: number; y: number; radius: number }
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
}

export interface LeaderLayout {
  /** 'lines' = etiquetas con líneas; 'docked' = acopladas sin líneas; 'chip' = 0 etiquetas («Métricas en el panel →»). */
  mode: 'lines' | 'docked' | 'chip'
  side: 'left' | 'right'
  placements: ReadonlyArray<{ id: string; x: number; y: number }>
}

export { LeaderLayer, LeaderToggle } from './LeaderLayer'
export { layoutLeaders, pickPrincipalMetrics } from './layoutLeaders'
export type { MetricView }
