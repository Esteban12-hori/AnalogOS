/** Contenido del informe imprimible (chunk de misión): `PrintReport` del equipo sobre el planificador compartido, con la orientación geológica (M10) si hay contexto. */
import { useLayoutEffect } from 'react'
import { MissionPrintReport } from '../../components/planner/ResultView'
import type { CandidateSite } from '../../domain/contracts'
import { useMission } from '../../state/mission'
import { markPrintMounted } from './printState'

export default function PrintContent({ candidates }: { candidates: CandidateSite[] }) {
  const planner = useMission((state) => state.planner)
  const request = useMission((state) => state.request)
  const geologyCatalog = useMission((state) => state.geologyCatalog)
  const result = planner?.result ?? null
  const drawable = result !== null && request !== null
  // M11: «Imprimir informe» se habilita cuando ESTE resultado ya está en el DOM del informe.
  useLayoutEffect(() => (drawable && result ? markPrintMounted(result) : undefined), [drawable, result])
  if (!planner || !result || !request) return null
  return <MissionPrintReport evaluation={result} request={request} state={planner} candidates={candidates} geologyCatalog={geologyCatalog} />
}
