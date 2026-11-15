/**
 * Shell actions shared by the record, the rail, and the sheet (integrator's file).
 * - «Evaluate this sector»: switches to Mission and opens the planner's «sector» flow for the team
 *   with the scope fixed to that window (ADR-009, ADR-013). It does not evaluate or call the AI.
 * - «Export record (JSON)»: `buildExport` of the team (role, origin, review, and search scope).
 */
import type { CandidateSite, SearchResults } from '../domain/contracts'
import { buildExport } from '../domain/discovery'
import { withController } from '../features/composer'
import { uiActions } from '../state/ui'

export function evaluateSector(siteId: string): void {
  uiActions.setMode('mision')
  withController((mission) => mission.startSector(siteId))
}

/** Text of the exported record (honesty notice, site, and search scope). */
export function siteExportText(candidate: CandidateSite, search: SearchResults | null): string {
  return `${JSON.stringify(buildExport(candidate, search), null, 2)}\n`
}

/** Every record download goes through here (header and Sources tab): a single content per file. */
export function exportSiteJson(candidate: CandidateSite, search: SearchResults | null): void {
  const blob = new Blob([siteExportText(candidate, search)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${candidate.site_id}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
