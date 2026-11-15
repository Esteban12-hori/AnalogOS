/**
 * Acciones del armazón compartidas por la ficha, el riel y la hoja (archivo del integrador).
 * - «Evaluar este sector»: pasa a Misión y abre el recorrido «sector» del planificador del equipo
 *   con el alcance fijado en esa ventana (ADR-009, ADR-013). No evalúa ni llama a la IA.
 * - «Exportar ficha (JSON)»: `buildExport` del equipo (rol, origen, revisión y alcance de la búsqueda).
 */
import type { CandidateSite, SearchResults } from '../domain/contracts'
import { buildExport } from '../domain/discovery'
import { withController } from '../features/composer'
import { uiActions } from '../state/ui'

export function evaluateSector(siteId: string): void {
  uiActions.setMode('mision')
  withController((mission) => mission.startSector(siteId))
}

export function exportSiteJson(candidate: CandidateSite, search: SearchResults | null): void {
  const blob = new Blob([`${JSON.stringify(buildExport(candidate, search), null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${candidate.site_id}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
