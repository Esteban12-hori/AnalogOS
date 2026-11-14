/**
 * Carga diferida del orquestador de misión (motor + contratos). Chunk principal: solo este
 * enlace. Si el chunk no carga (sin red y sin caché), la misión pasa a error neutro.
 */
import { missionStore } from '../../state/mission'
import { uiActions } from '../../state/ui'
import type { MissionController } from './missionRun'

let pending: Promise<MissionController> | null = null

export function loadController(): Promise<MissionController> {
  pending ??= import('./missionRun')
    .then((module) => module.missionController())
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

export function withController(fn: (controller: MissionController) => unknown): void {
  loadController()
    .then(fn)
    .catch(() => {
      missionStore.setState({ error: { code: 'unavailable', message: 'No se pudo cargar el motor de misión. Recarga la página para reintentar.' } })
      uiActions.setMissionPhase('error')
    })
}
