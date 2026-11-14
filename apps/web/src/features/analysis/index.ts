/**
 * features/analysis — capa de hechos deterministas, paquete de evidencia (FNV-1a 64),
 * validación de tokens de la IA, robustez, panel «Lectura», análisis pregenerado y cliente
 * lktron NDJSON detrás de un flag (incremento 10, ADR-010).
 * Slots: `left.reading` (panel ≥1440 en Misión), `rail.reading` (pestaña «Lectura IA» del riel
 * en 1100–1439), `full.reading` (pestaña de la ficha completa / S2) y `pill.reading`
 * (píldora «✦ Lectura» en Explorar ≥1100).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB (rótulos
 * «por calcular»; lktron desactivado; sin texto generado).
 */
import type { MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
import type { AppData } from '../../shell/public'

export interface ReadingPanelProps {
  data: AppData
  /** 'panel' (izquierda ≥1440) · 'rail' (pestaña del riel 1100–1439) · 'full' (ficha completa / S2). */
  placement: 'panel' | 'rail' | 'full'
}

export interface ReadingPillProps {
  data: AppData
}

/** Resultado de una llamada a lktron. Nunca trae cifras: la interpretación ya validada. */
export type LktronResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'unavailable' | 'timeout' | 'invalid' | 'aborted'; message: string }

export { ReadingPanel, ReadingPill } from './ReadingPanel'
export { LKTRON_ENABLED, interpretWithLktron } from './lktron'
export type { MissionInterpretRequest, MissionInterpretation }
