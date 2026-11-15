/**
 * Ids de hechos del paquete de evidencia (`site:<s>:<c>:raw`, `mars:<c>`, `coverage:<s>`…).
 * Vive en el chunk principal (lo usan las fichas de TokenText) para que la vista diferida y el
 * runtime diferido no compartan un chunk propio.
 */
import type { CriterionId } from '../../domain/contracts'
import { isCriterionId } from '../../domain/criteria'

/** Sitio y criterio de un id de hecho; null donde no aplica. */
export function parseFactId(id: string): { siteId: string | null; criterionId: CriterionId | null } {
  const parts = id.split(':')
  if (parts[0] === 'mars') return { siteId: null, criterionId: isCriterionId(parts[1]) ? parts[1] : null }
  if (parts[0] === 'coverage') return { siteId: parts[1] ?? null, criterionId: null }
  if (parts[0] === 'site') {
    const criterion = parts.length === 4 && isCriterionId(parts[2]) ? parts[2] : null
    return { siteId: parts[1] ?? null, criterionId: criterion }
  }
  return { siteId: null, criterionId: null }
}
