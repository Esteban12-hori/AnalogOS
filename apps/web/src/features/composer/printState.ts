/**
 * ¿Está montado el informe imprimible de la evaluación vigente? (M11). La única fuente de vigencia es
 * `planner.result` de state/mission (el reductor del equipo lo anula al editar): el informe registra
 * aquí el objeto de resultado que dibuja y «Imprimir informe» solo se habilita si es el mismo objeto.
 * Así un clic nunca imprime un informe a medio cargar ni el de otra misión, y no hay impresión diferida.
 */
import type { MissionEvaluation } from '../../mission'
import { useMission } from '../../state/mission'
import { createStore, useStore } from '../../state/store'

export const printStore = createStore<{ mounted: MissionEvaluation | null }>({ mounted: null })

/** El informe imprimible avisa que ya dibuja este resultado (null al desmontarse). */
export function markPrintMounted(result: MissionEvaluation): () => void {
  printStore.setState({ mounted: result })
  return () => {
    if (printStore.getState().mounted === result) printStore.setState({ mounted: null })
  }
}

/** Puro: listo solo si hay resultado vigente y el informe montado es exactamente ese. */
export function isPrintReady(current: MissionEvaluation | null, mounted: MissionEvaluation | null): boolean {
  return current !== null && mounted === current
}

export function usePrintReady(): boolean {
  const current = useMission((state) => state.planner?.result ?? null)
  const mounted = useStore(printStore, (state) => state.mounted)
  return isPrintReady(current, mounted)
}
