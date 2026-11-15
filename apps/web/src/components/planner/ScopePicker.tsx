import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { resolveScope, RELATION_LABEL, validateBbox, validatePoint, type JourneyId, type PlannerAction, type ScopeInput, type ScopeMode, buildScope } from '../../mission'
import { shortCandidateName } from '../../domain/formatting'
import { GeometryFigure } from './GeometryFigure'

interface Props {
  journey: JourneyId
  scope: ScopeInput
  candidates: CandidateSite[]
  dispatch: (a: PlannerAction) => void
}

const RELATION = RELATION_LABEL
const pct = (x: number | null) => (x === null ? '' : `${Math.round(x * 100)}%`)

export function ScopePicker({ journey, scope, candidates, dispatch }: Props) {
  const set = (patch: Partial<ScopeInput>) => dispatch({ type: 'set_scope', scope: { ...scope, ...patch } })
  const modes: Array<{ id: ScopeMode; label: string; hint: string }> = [
    ...(journey === 'test' ? [{ id: 'catalog' as const, label: 'Compare the seven areas', hint: 'Every window with evidence, each with its own measurements.' }] : []),
    { id: 'sector', label: 'One of the seven areas', hint: 'Choose a window with evidence.' },
    { id: 'point', label: 'A point (lon/lat)', hint: 'There is only evidence for the window that contains it, not for the exact point.' },
    { id: 'bbox', label: 'A rectangle (bbox)', hint: 'It only inherits evidence if it matches a full window.' },
  ]
  const built = useMemo(() => buildScope(scope), [scope])
  const semantic = useMemo(() => {
    if (!built.scope) return []
    if (built.scope.mode === 'point') return validatePoint(built.scope.lon, built.scope.lat)
    if (built.scope.mode === 'bbox') return validateBbox(built.scope.bbox)
    return []
  }, [built])
  const resolution = useMemo(() => (built.scope && !semantic.length ? resolveScope(built.scope, candidates) : null), [built, semantic, candidates])
  const ordered = [...candidates].sort((a, b) => Number(a.role === 'reference') - Number(b.role === 'reference') || a.site_id.localeCompare(b.site_id))
  const problems = [...built.issues, ...semantic]
  const showProblems = scope.mode === 'point' || scope.mode === 'bbox'

  const field = (id: keyof ScopeInput, label: string, hint: string) => (
    <label key={id} className="pl-field">
      <span>{label}</span>
      <input type="text" inputMode="decimal" autoComplete="off" value={String(scope[id] ?? '')} placeholder={hint}
        onChange={(e) => set({ [id]: e.target.value, windowSiteId: null } as Partial<ScopeInput>)} />
    </label>
  )

  return (
    <div className="pl-scope">
      <fieldset className="pl-modes">
        <legend>Which geometry do you want to evaluate?</legend>
        {modes.map((m) => (
          <label key={m.id} className={`pl-radio${scope.mode === m.id ? ' on' : ''}`}>
            <input type="radio" name="scope-mode" checked={scope.mode === m.id} onChange={() => set({ mode: m.id, windowSiteId: null })} />
            <span><strong>{m.label}</strong><small>{m.hint}</small></span>
          </label>
        ))}
      </fieldset>

      {scope.mode === 'sector' && (
        <fieldset className="pl-sectors">
          <legend>The seven areas with evidence (~20 km windows)</legend>
          {ordered.map((c) => (
            <label key={c.site_id} className={`pl-sector${scope.siteId === c.site_id ? ' on' : ''}`}>
              <input type="radio" name="scope-sector" checked={scope.siteId === c.site_id} onChange={() => set({ siteId: c.site_id })} />
              <span>
                <strong>{shortCandidateName(c.name)}</strong>
                <small>{c.country === 'AR' ? 'Argentina' : 'Chile'} · {c.area_km2.toLocaleString('en-US', { maximumFractionDigits: 0 })} km²</small>
              </span>
              <b className={`pl-tag ${c.role === 'reference' ? 'ref' : ''}`}>{c.role === 'reference' ? 'REF' : c.country}</b>
            </label>
          ))}
        </fieldset>
      )}

      {scope.mode === 'point' && (
        <div className="pl-coords">
          {field('lon', 'Longitude (°, west negative)', '-69.7')}
          {field('lat', 'Latitude (°, south negative)', '-25.0')}
          <p className="pl-hint">Decimal degrees, WGS84. You can use a point or a comma.</p>
        </div>
      )}
      {scope.mode === 'bbox' && (
        <div className="pl-coords four">
          {field('west', 'West (min. lon)', '-69.8')}
          {field('south', 'South (min. lat)', '-25.1')}
          {field('east', 'East (max. lon)', '-69.6')}
          {field('north', 'North (max. lat)', '-24.9')}
          <p className="pl-hint">Between 0.001° and 10° per side; west less than east, south less than north.</p>
        </div>
      )}
      {showProblems && problems.length > 0 && (
        <ul className="pl-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}

      {resolution && (
        <div className="pl-resolution" aria-live="polite">
          <GeometryFigure candidates={candidates} resolution={resolution} highlightIds={scope.mode === 'sector' ? [scope.siteId] : []} />
          <div>
            <h4>
              {resolution.state === 'covered' && 'There is evidence for this geometry'}
              {resolution.state === 'window_selected' && 'Window chosen: it evaluates the full window, not your geometry'}
              {resolution.state === 'needs_window_selection' && 'There is evidence for a window, not for the point'}
              {resolution.state === 'partial_coverage' && 'Partial coverage: no evidence of its own for this geometry'}
              {resolution.state === 'no_coverage' && 'No evidence for this geometry'}
            </h4>
            {resolution.requested.approx_area_km2 !== null && resolution.mode === 'bbox' && <p className="pl-hint">Requested area ≈ {resolution.requested.approx_area_km2.toLocaleString('en-US')} km².</p>}
            <ul className="pl-notes">{resolution.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            {resolution.matches.length > 0 && scope.mode !== 'sector' && (
              <ul className="pl-matches">
                {resolution.matches.map((m) => (
                  <li key={m.site_id}>
                    <span><strong>{shortCandidateName(m.name)}</strong> · {RELATION[m.relation]}{m.request_covered_fraction !== null && ` · covers ${pct(m.request_covered_fraction)} of the request`}</span>
                    {resolution.state !== 'covered' && (scope.windowSiteId === m.site_id
                      ? <button type="button" className="pl-ghost" onClick={() => set({ windowSiteId: null })}>Remove chosen window</button>
                      : <button type="button" onClick={() => set({ windowSiteId: m.site_id })}>Evaluate the full window</button>)}
                  </li>
                ))}
              </ul>
            )}
            {(resolution.state === 'no_coverage' || resolution.state === 'partial_coverage' || resolution.state === 'needs_window_selection') && !scope.windowSiteId && (
              <p className="pl-hint">You can continue: an insufficient-evidence report will be generated, with the request ready to export. This version does not download new data.</p>
            )}
          </div>
        </div>
      )}
      {!resolution && (scope.mode === 'catalog' || scope.mode === 'sector') && <GeometryFigure candidates={candidates} resolution={null} highlightIds={scope.mode === 'catalog' ? candidates.map((c) => c.site_id) : [scope.siteId]} />}
    </div>
  )
}
