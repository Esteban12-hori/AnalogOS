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

/** Texto de la ficha exportada (aviso de honestidad, sitio y alcance de la búsqueda). */
export function siteExportText(candidate: CandidateSite, search: SearchResults | null): string {
  return `${JSON.stringify(buildExport(candidate, search), null, 2)}\n`
}

/** Toda descarga de ficha pasa por aquí (cabecera y pestaña Fuentes): un solo contenido por archivo. */
export function exportSiteJson(candidate: CandidateSite, search: SearchResults | null): void {
  const blob = new Blob([siteExportText(candidate, search)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${candidate.site_id}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
