/** Contenido del informe imprimible (chunk de misión): `PrintReport` del equipo sobre el planificador compartido, con la orientación geológica (M10) si hay contexto. */
import { MissionPrintReport } from '../../components/planner/ResultView'
import type { CandidateSite } from '../../domain/contracts'
import { useMission } from '../../state/mission'

export default function PrintContent({ candidates }: { candidates: CandidateSite[] }) {
  const planner = useMission((state) => state.planner)
  const request = useMission((state) => state.request)
  const geologyCatalog = useMission((state) => state.geologyCatalog)
  if (!planner?.result || !request) return null
  return <MissionPrintReport evaluation={planner.result} request={request} state={planner} candidates={candidates} geologyCatalog={geologyCatalog} />
}
