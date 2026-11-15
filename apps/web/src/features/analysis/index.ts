/**
 * features/analysis — la Lectura (ADR-013): resultado de la evaluación del equipo, motivos
 * destacados (plantilla determinista o selección de Anthropic validada) y hechos del snapshot.
 * Slots: `left.reading` (panel ≥1440 en Misión), `rail.reading` (pestaña «Lectura» del riel en
 * 1100–1439), `full.reading` (pestaña de la ficha completa / S2), `sheet.reading` (vista «Lectura»
 * de S2 sin ● seleccionado, M11) y `pill.reading` (píldora en Explorar ≥1100 y en Misión 1100–1439).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo (docs/BUILD_CONTRACTS.md §2.8).
 *
 * Chunk principal: este archivo, la píldora y el envoltorio del panel. La vista, la capa de hechos
 * y los adaptadores se descargan con `import()` al abrir la Lectura. La IA nunca se llama sola:
 * solo con «✦ Destacar motivos con IA», que pasa por el controlador de misión (reductor del equipo).
 */
import type { AppData } from '../../shell/public'

export interface ReadingPanelProps {
  data: AppData
  /** 'panel' (izquierda ≥1440) · 'rail' (pestaña del riel 1100–1439) · 'full' (ficha completa / S2). */
  placement: 'panel' | 'rail' | 'full'
}

export interface ReadingPillProps {
  data: AppData
  /** Contador de «Ir a la Lectura» (M11): cada valor nuevo abre la píldora. */
  openSignal?: number
}

export { ReadingPanel } from './ReadingPanel'
export { ReadingPill } from './ReadingPill'
export type { FactsLayer, SiteFacts } from './types'
