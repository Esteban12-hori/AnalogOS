/**
 * features/globe — escenario: globo 3D, paso a mapa 2D, marcadores ●◆○, vuelo y agrupación
 * (incremento 4). Slot: `stage` del armazón (capa de fondo, pantalla completa).
 *
 * INTERFAZ ESTABLE: `MapStage` y sus props, y el canal por cuadro de `stageBridge`.
 * Implementación actual: el escenario existente con márgenes {top,right,bottom,left};
 * el canal por cuadro es un STUB (no publica).
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
