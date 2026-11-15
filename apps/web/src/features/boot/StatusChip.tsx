/**
 * Chip de estado de la barra superior (slot `topbar.status`): «● Snapshot v2 · 3 evaluados ·
 * 8 por calcular». Al terminar el arranque, la bitácora se pliega aquí. Los ◆ «por calcular» solo
 * se cuentan si el catálogo publicado está disponible; nunca se inventan.
 */
import { useMemo } from 'react'
import { GLYPH } from '../../shell/public'
import { classifyReferences, useReferenceAnalogs } from '../places'
import { chipText } from './bootModel'
import type { StatusChipProps } from './index'

export function StatusChip({ data }: StatusChipProps) {
  const analogs = useReferenceAnalogs()
  const status = data.status === 'loading' ? 'loading' : data.snapshot ? 'ready' : 'error'
  // Se cuentan los ◆ que se dibujan como tarjeta: uno que coincide con un sector evaluado va como
  // insignia de ese sector (§1 #16), igual que en el carrusel.
  const candidates = data.snapshot?.candidates
  const pending = useMemo(
    () => (analogs.status === 'ready' && candidates ? classifyReferences(analogs.analogs, candidates).references.length : null),
    [analogs, candidates],
  )
  return (
    <span className="status-chip" data-state={status}>
      {status === 'error' ? <span aria-hidden="true">{GLYPH.fail}</span> : <span className="status-dot" />}
      {chipText({
        status,
        version: data.snapshot?.manifest.snapshot_version ?? null,
        evaluated: candidates ? candidates.filter((site) => site.role !== 'reference').length : 0,
        references: candidates ? candidates.filter((site) => site.role === 'reference').length : 0,
        pendingAnalogs: pending,
      })}
    </span>
  )
}
