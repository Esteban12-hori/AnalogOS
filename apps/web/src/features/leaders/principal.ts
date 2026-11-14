/** Selección de las métricas principales para las líneas Tesla (docs/UX_REDESIGN.md §3.4). Pura. */
import { CRITERION_IDS } from '../../domain/contracts'
import type { MetricView } from '../metrics'

/** Pesos a menos de esto se consideran empatados (p. ej. 3/11 calculado por dos caminos). */
const WEIGHT_TIE = 1e-9

function canonicalIndex(criterionId: string): number {
  const index = (CRITERION_IDS as readonly string[]).indexOf(criterionId)
  return index === -1 ? CRITERION_IDS.length : index
}

/**
 * Las `count` métricas de mayor peso del perfil activo; los empates se resuelven por el orden
 * canónico de criterios (y, fuera de él, por id). Se descartan las excluidas (peso 0 o
 * estado `excluded`): una métrica sin peso no es «principal». No reordena por similitud ni
 * por contribución: el orden lo fija el perfil, nunca el resultado.
 */
export function pickPrincipalMetrics(views: readonly MetricView[], count = 4): MetricView[] {
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (limit === 0) return []
  return views
    .filter((view) => Number.isFinite(view.weight) && view.weight > 0 && view.status !== 'excluded')
    .slice()
    .sort((a, b) => {
      const byWeight = b.weight - a.weight
      if (Math.abs(byWeight) > WEIGHT_TIE) return byWeight
      const byCanon = canonicalIndex(a.criterionId) - canonicalIndex(b.criterionId)
      if (byCanon !== 0) return byCanon
      return a.criterionId < b.criterionId ? -1 : a.criterionId > b.criterionId ? 1 : 0
    })
    .slice(0, limit)
}
