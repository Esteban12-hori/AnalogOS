/**
 * Top-bar status chip (slot `topbar.status`): "● Snapshot v2 · 3 evaluated ·
 * 8 pending calculation". When startup finishes, the log collapses into here. The ◆ "pending calculation" ones are only
 * counted if the published catalog is available; they are never invented.
 */
import { useMemo } from 'react'
import { useLocale } from '../../i18n'
import { GLYPH } from '../../shell/public'
import { classifyReferences, useReferenceAnalogs } from '../places'
import { chipText } from './bootModel'
import type { StatusChipProps } from './index'

export function StatusChip({ data }: StatusChipProps) {
  const locale = useLocale()
  const analogs = useReferenceAnalogs()
  const status = data.status === 'loading' ? 'loading' : data.snapshot ? 'ready' : 'error'
  // The ◆ items drawn as a card are counted: one that matches an evaluated sector goes as a
  // badge of that sector (§1 #16), just as in the carousel.
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
      }, locale)}
    </span>
  )
}
