/**
 * features/places — carrusel de lugares (PlaceRail) y catálogo de análogos ◆ (incremento 3).
 * Slots: `dock.places` (≥1100), `sheet.tray.places` y `sheet.list` (<1100), `rail.reference` y
 * `sheet.reference` (un ◆ seleccionado).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo (docs/BUILD_CONTRACTS.md §2.1).
 * Añadido en el incremento 3 (solo exports nuevos; nada cambió de firma):
 * - `buildPlaceModel` y sus tipos: orden de lugares (● por similitud, ◆ alfabéticos).
 * - `classifyReferences(analogs, candidates)`: regla §1 #16 (punto-en-polígono → insignia
 *   «coincide con» o ◆ propio), reutilizable por el globo. Usa el clasificador geométrico que
 *   `loadReferenceAnalogs` trae en un chunk diferido; antes de cargar devuelve «sin ◆».
 * - `referenceAnalogsFrom`: valida un catálogo ya leído (útil en tests y herramientas).
 * La geometría (classify.ts, geometry.ts) no se reexporta aquí a propósito: así no entra al
 * chunk principal.
 */
import type { ReferenceAnalog } from '../../domain/contracts'
import type { AppData } from '../../shell/public'

export interface PlaceRailProps {
  data: AppData
  /** 'dock' = fila superior del dock (≥1100). 'sheet' = bandeja S0 o lista de la hoja (<1100). */
  placement: 'dock' | 'sheet'
  /** Solo en 'sheet': «Ver lista» reemplaza la bandeja por la lista completa (S1/S2 sin selección). */
  listView?: boolean
  /**
   * Pide al armazón abrir o cerrar la vista de lista (el armazón decide el detent). Sin él, en el
   * dock «Ver lista» alterna la vista dentro del propio dock y en la hoja el botón no aparece.
   */
  onListViewChange?: (open: boolean) => void
}

export interface ReferenceCardProps {
  data: AppData
  /** id del análogo ◆ seleccionado (ui.selection.kind === 'reference'). */
  analogId: string
}

export type ReferenceAnalogsState =
  | { status: 'loading' }
  | { status: 'ready'; analogs: readonly ReferenceAnalog[] }
  | { status: 'unavailable'; reason: string }

export { PlaceRail } from './PlaceRail'
export { ReferenceCard } from './ReferenceCard'
export { classifyReferences, loadReferenceAnalogs, referenceAnalogsFrom, useReferenceAnalogs } from './referenceAnalogs'
export { buildPlaceModel } from './placeModel'
export type { EvaluatedPlace, Place, PlaceModel, PlaceModelInput, ReferenceClassification, ReferencePlace } from './placeModel'
