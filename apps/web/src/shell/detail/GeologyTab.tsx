/**
 * Pestaña «Geología» de la ficha (chunk diferido): el panel de contexto geológico oficial del equipo
 * (M9, `GeologyContext`) tal cual, con cobertura, unidades, procedencia y «Descargar contexto
 * geológico (JSON)». Si el paquete falta o no valida, el panel dice «no disponible» y el resto de la
 * ficha no cambia.
 */
import { GeologyContext } from '../../components/GeologyContext'
import type { CandidateSite } from '../../domain/contracts'
import { geologyStateOf, type AppData } from '../appData'
import './geology.css'

export function GeologyTab({ data, site }: { data: AppData; site: CandidateSite }) {
  return (
    <div className="geology-tab" data-slot="full.geology">
      <GeologyContext key={site.site_id} candidate={site} state={geologyStateOf(data)} />
    </div>
  )
}
