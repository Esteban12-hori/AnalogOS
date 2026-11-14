/**
 * STUB del chip de estado de la barra superior (incremento 7: la bitácora se pliega aquí).
 * Muestra el estado real del snapshot; los ◆ «por calcular» se sumarán con el catálogo.
 */
import { GLYPH } from '../../shell/public'
import type { StatusChipProps } from './index'

export function StatusChip({ data }: StatusChipProps) {
  if (data.status === 'loading') {
    return <span className="status-chip" data-state="loading"><span className="status-dot" />Cargando snapshot validado…</span>
  }
  if (data.status === 'error' || !data.snapshot) {
    return <span className="status-chip" data-state="error"><span aria-hidden="true">{GLYPH.fail}</span>Snapshot no disponible</span>
  }
  const evaluated = data.snapshot.candidates.length
  return (
    <span className="status-chip" data-state="ready">
      <span className="status-dot" />
      Snapshot {data.snapshot.manifest.snapshot_version} · {evaluated} evaluados
    </span>
  )
}
