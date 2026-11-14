/**
 * Regla §1 #16 de docs/UX_REDESIGN.md: la geometría decide si un ◆ es insignia o tarjeta propia.
 * - Punto citado dentro del polígono de un sector → insignia «coincide con» sobre ese ●.
 * - Región → ◆ propio; «contiene N sectores» solo con los sectores que caen enteros en su caja.
 * Módulo diferido: se carga junto con el catálogo (referenceAnalogs.ts), fuera del chunk principal.
 */
import type { CandidateSite, ReferenceAnalog } from '../../domain/contracts'
import { geometryInsideBbox, pointInGeometry } from './geometry'
import type { ReferenceClassification, ReferencePlace } from './placeModel'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

function byName(a: ReferencePlace, b: ReferencePlace): number {
  return collator.compare(a.analog.name, b.analog.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function classifyReferenceAnalogs(
  analogs: readonly ReferenceAnalog[],
  candidates: readonly CandidateSite[],
): ReferenceClassification {
  const badges = new Map<string, ReferenceAnalog[]>()
  const references: ReferencePlace[] = []
  for (const analog of analogs) {
    const { location } = analog
    if (location.kind === 'approximate_point') {
      const hits = candidates.filter((candidate) => pointInGeometry(location.lon, location.lat, candidate.geometry))
      for (const hit of hits) badges.set(hit.site_id, [...(badges.get(hit.site_id) ?? []), analog])
      if (hits.length === 0) references.push({ kind: 'reference', id: analog.id, analog, containsSectorIds: [] })
    } else {
      const inside = candidates.filter((candidate) => geometryInsideBbox(candidate.geometry, location.bbox))
      references.push({ kind: 'reference', id: analog.id, analog, containsSectorIds: inside.map((candidate) => candidate.site_id).sort() })
    }
  }
  return { badges, references: references.sort(byName) }
}
