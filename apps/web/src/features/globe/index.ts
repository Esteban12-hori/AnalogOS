/**
 * features/globe — escenario: globo 3D, paso a mapa 2D, marcadores ●◆○, vuelo y agrupación
 * (incremento 4). Slot: `stage` del armazón (capa de fondo, pantalla completa).
 *
 * INTERFAZ ESTABLE: `MapStage` y sus props, y el canal por cuadro de `stageBridge`.
 *  - MapStage añade la prop OPCIONAL `onSelectReference` (◆); sin ella escribe
 *    `ui.selection` con `kind: 'reference'`. Lee del store: selection (vista previa), hoverSiteId,
 *    introPhase, cameraTouchedAt y mode; de la misión, scoring y revision; de places, los ◆.
 *  - stageBridge publica en cada cuadro del globo y en cada `move` del 2D (ver stageBridge.ts).
 * Las funciones puras (geometry.ts, flight.ts, markers.ts, keyboard.ts) no se reexportan aquí
 * para no arrastrarlas al chunk principal: viven en los chunks diferidos del globo y del 2D.
 */
export { MapStage, contextLayers } from './MapStage'
export type { MapStageProps, StageMilestone } from './MapStage'
export {
  getStageAnchor,
  getStageProjection,
  publishStageFrame,
  subscribeStageFrame,
} from './stageBridge'
export type { ScreenPoint, StageAnchor, StageProjection } from './stageBridge'
