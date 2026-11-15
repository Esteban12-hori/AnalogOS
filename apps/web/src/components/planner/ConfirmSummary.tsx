import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { shortCandidateName } from '../../domain/formatting'
import { buildScope, describeEditable, describeScope, resolveScope, validateBbox, validatePoint, type PlannerState } from '../../mission'

/**
 * Summary shown before confirming: it displays the EFFECTIVE conditions that the engine will use (threshold, unit,
 * scale, importance) and the requested geometry, so that they do not depend on the brief text, which may
 * retain an outdated value.
 */
export function ConfirmSummary({ state, candidates }: { state: PlannerState; candidates: CandidateSite[] }) {
  const lines = useMemo(() => {
    const built = buildScope(state.scope)
    const issues = built.scope?.mode === 'point' ? validatePoint(built.scope.lon, built.scope.lat) : built.scope?.mode === 'bbox' ? validateBbox(built.scope.bbox) : []
    if (!built.scope || issues.length) return null
    const nameOf = (id: string) => shortCandidateName(candidates.find((c) => c.site_id === id)?.name ?? id)
    return describeScope(resolveScope(built.scope, candidates), nameOf)
  }, [state.scope, candidates])
  return (
    <dl className="pl-summary">
      <div><dt>Objective</dt><dd>{state.target.kind === 'rover' ? 'Mars rover (Jezero reference)' : `Not supported: ${state.target.stated || '—'}`}</dd></div>
      <div>
        <dt>Geometry</dt>
        <dd>
          {lines ? (<><span>{lines.requested}</span><small className="pl-sumline">{lines.state}{state.scope.mode !== 'catalog' && lines.measured.length ? ` · ${lines.measured[0]}` : ''}</small></>) : 'Not chosen or incomplete'}
        </dd>
      </div>
      <div>
        <dt>Conditions that will be evaluated</dt>
        <dd>
          {state.requirements.length === 0 ? 'None' : (
            <ul className="pl-sumlist">{state.requirements.map((r) => <li key={r.requirement_id}>{describeEditable(r)}</li>)}</ul>
          )}
          <small className="pl-sumline">The calculation uses exactly these conditions, not the numbers that appear in the brief text.</small>
        </dd>
      </div>
      <div><dt>Text</dt><dd>{state.brief ? `${state.brief.slice(0, 160)}${state.brief.length > 160 ? '…' : ''}` : 'No text'}</dd></div>
    </dl>
  )
}
