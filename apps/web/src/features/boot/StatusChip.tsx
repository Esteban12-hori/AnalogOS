/**
 * Chip de estado de la barra superior (slot `topbar.status`): «● Snapshot v2 · 3 evaluados ·
 * 8 por calcular». Al terminar el arranque, la bitácora se pliega aquí. Los ◆ «por calcular» solo
 * se cuentan si el catálogo publicado está disponible; nunca se inventan.
 */
import { GLYPH } from '../../shell/public'
import { useReferenceAnalogs } from '../places'
import { chipText } from './bootModel'
import type { StatusChipProps } from './index'

export function StatusChip({ data }: StatusChipProps) {
  const analogs = useReferenceAnalogs()
  const status = data.status === 'loading' ? 'loading' : data.snapshot ? 'ready' : 'error'
  return (
    <span className="status-chip" data-state={status}>
      {status === 'error' ? <span aria-hidden="true">{GLYPH.fail}</span> : <span className="status-dot" />}
      {chipText({
        status,
        version: data.snapshot?.manifest.snapshot_version ?? null,
        evaluated: data.snapshot?.candidates.length ?? 0,
        pendingAnalogs: analogs.status === 'ready' ? analogs.analogs.length : null,
      })}
    </span>
  )
}
