/**
 * features/places — carrusel de lugares (PlaceRail) y catálogo de análogos ◆ (incremento 3).
 * Slots: `dock.places` (≥1100), `sheet.tray` y `sheet.list` (<1100), `rail.reference`
 * (riel con un ◆ seleccionado).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB mínimo
 * (lista simple de sectores evaluados; sin catálogo de ◆).
 */
import type { ReferenceAnalog } from '../../domain/contracts'
import type { AppData } from '../../shell/public'

export interface PlaceRailProps {
  data: AppData
  /** 'dock' = fila superior del dock (≥1100). 'sheet' = bandeja S0 o lista de la hoja (<1100). */
  placement: 'dock' | 'sheet'
  /** Solo en 'sheet': «Ver lista» reemplaza la bandeja por la lista completa (S1/S2 sin selección). */
  listView?: boolean
  /** Pide al armazón abrir o cerrar la vista de lista (el armazón decide el detent). */
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
export { loadReferenceAnalogs, useReferenceAnalogs } from './referenceAnalogs'
