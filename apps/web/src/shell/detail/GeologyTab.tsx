/**
 * "Geology" tab of the detail sheet (deferred chunk): the team's official geological context panel
 * (M9, `GeologyContext`) as is, with coverage, units, provenance and "Download geological
 * context (JSON)". If the package is missing or fails validation, the panel says "not available" and the rest of the
 * detail sheet does not change.
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
