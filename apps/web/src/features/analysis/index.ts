/**
 * features/analysis — capa de hechos deterministas, paquete de evidencia (FNV-1a 64),
 * validación de tokens de la IA, robustez, panel «Lectura», análisis pregenerado y cliente
 * lktron NDJSON detrás de un flag (incremento 10, ADR-010).
 * Slots: `left.reading` (panel ≥1440 en Misión), `rail.reading` (pestaña «Lectura IA» del riel
 * en 1100–1439), `full.reading` (pestaña de la ficha completa / S2) y `pill.reading`
 * (píldora «✦ Lectura» en Explorar ≥1100).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo (docs/BUILD_CONTRACTS.md §2.8).
 *
 * Chunk principal: este archivo, la píldora, el envoltorio del panel, el store de la lectura y
 * el controlador (una suscripción a `ui.missionPhase`). Todo lo pesado (motor, validadores Ajv,
 * vistas de métricas, paquete, compuerta y vista) se descarga con `import()` al primer uso.
 * Ver README.md en esta carpeta.
 */
import type { MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
import type { AppData } from '../../shell/public'
import { startReadingController } from './controller'

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

export { ReadingPanel } from './ReadingPanel'
export { ReadingPill } from './ReadingPill'
export { LKTRON_ENABLED, interpretWithLktron } from './lktron'
export type { MissionInterpretRequest, MissionInterpretation }

// ---- Exports añadidos en el incremento 10 (opcionales para el integrador) -------------------
/** Fragmento ✦ (summary de un lugar o primer insight de un criterio) para riel o S1. */
export { ReadingSnippet, type ReadingSnippetProps } from './ReadingSnippet'
/** Lectura activa (perfil base o misión) para quien quiera leerla sin montar el panel. */
export { useActiveReading, useReadingSlot } from './readingStore'
export { startReadingController } from './controller'
export type { Reading, ReadingBlock, ReadingContext, ReadingSlot, FactsLayer, AiLayer } from './types'

// Un único orquestador por página: escucha `ui.missionPhase` (fase `analysis` → lectura de la
// misión → `done`), aunque ningún panel esté montado (p. ej. móvil en S0). En Node (tests) no
// se arranca solo: los tests lo inician con dependencias inyectadas.
if (typeof window !== 'undefined') startReadingController()
