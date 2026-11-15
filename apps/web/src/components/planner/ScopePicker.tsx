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
const pct = (x: number | null) => (x === null ? '' : `${Math.round(x * 100)} %`)

export function ScopePicker({ journey, scope, candidates, dispatch }: Props) {
  const set = (patch: Partial<ScopeInput>) => dispatch({ type: 'set_scope', scope: { ...scope, ...patch } })
  const modes: Array<{ id: ScopeMode; label: string; hint: string }> = [
    ...(journey === 'test' ? [{ id: 'catalog' as const, label: 'Comparar las siete áreas', hint: 'Todas las ventanas con evidencia, cada una con sus propias medidas.' }] : []),
    { id: 'sector', label: 'Una de las siete áreas', hint: 'Elija una ventana con evidencia.' },
    { id: 'point', label: 'Un punto (lon/lat)', hint: 'Solo hay evidencia de la ventana que lo contiene, no del punto exacto.' },
    { id: 'bbox', label: 'Un rectángulo (bbox)', hint: 'Solo hereda evidencia si coincide con una ventana completa.' },
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
        <legend>¿Qué geometría quiere evaluar?</legend>
        {modes.map((m) => (
          <label key={m.id} className={`pl-radio${scope.mode === m.id ? ' on' : ''}`}>
            <input type="radio" name="scope-mode" checked={scope.mode === m.id} onChange={() => set({ mode: m.id, windowSiteId: null })} />
            <span><strong>{m.label}</strong><small>{m.hint}</small></span>
          </label>
        ))}
      </fieldset>

      {scope.mode === 'sector' && (
        <fieldset className="pl-sectors">
          <legend>Las siete áreas con evidencia (ventanas de ~20 km)</legend>
          {ordered.map((c) => (
            <label key={c.site_id} className={`pl-sector${scope.siteId === c.site_id ? ' on' : ''}`}>
              <input type="radio" name="scope-sector" checked={scope.siteId === c.site_id} onChange={() => set({ siteId: c.site_id })} />
              <span>
                <strong>{shortCandidateName(c.name)}</strong>
                <small>{c.country === 'AR' ? 'Argentina' : 'Chile'} · {c.area_km2.toLocaleString('es-CL', { maximumFractionDigits: 0 })} km²</small>
              </span>
              <b className={`pl-tag ${c.role === 'reference' ? 'ref' : ''}`}>{c.role === 'reference' ? 'REF' : c.country}</b>
            </label>
          ))}
        </fieldset>
      )}

      {scope.mode === 'point' && (
        <div className="pl-coords">
          {field('lon', 'Longitud (°, oeste negativo)', '-69,7')}
          {field('lat', 'Latitud (°, sur negativo)', '-25,0')}
          <p className="pl-hint">Grados decimales WGS84. Puede usar coma o punto.</p>
        </div>
      )}
      {scope.mode === 'bbox' && (
        <div className="pl-coords four">
          {field('west', 'Oeste (lon mín.)', '-69,8')}
          {field('south', 'Sur (lat mín.)', '-25,1')}
          {field('east', 'Este (lon máx.)', '-69,6')}
          {field('north', 'Norte (lat máx.)', '-24,9')}
          <p className="pl-hint">Entre 0,001° y 10° por lado; oeste menor que este, sur menor que norte.</p>
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
              {resolution.state === 'covered' && 'Hay evidencia para esta geometría'}
              {resolution.state === 'window_selected' && 'Ventana elegida: evalúa la ventana completa, no su geometría'}
              {resolution.state === 'needs_window_selection' && 'Hay evidencia de una ventana, no del punto'}
              {resolution.state === 'partial_coverage' && 'Cobertura parcial: sin evidencia propia para esta geometría'}
              {resolution.state === 'no_coverage' && 'Sin evidencia para esta geometría'}
            </h4>
            {resolution.requested.approx_area_km2 !== null && resolution.mode === 'bbox' && <p className="pl-hint">Área pedida ≈ {resolution.requested.approx_area_km2.toLocaleString('es-CL')} km².</p>}
            <ul className="pl-notes">{resolution.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            {resolution.matches.length > 0 && scope.mode !== 'sector' && (
              <ul className="pl-matches">
                {resolution.matches.map((m) => (
                  <li key={m.site_id}>
                    <span><strong>{shortCandidateName(m.name)}</strong> · {RELATION[m.relation]}{m.request_covered_fraction !== null && ` · cubre ${pct(m.request_covered_fraction)} de lo pedido`}</span>
                    {resolution.state !== 'covered' && (scope.windowSiteId === m.site_id
                      ? <button type="button" className="pl-ghost" onClick={() => set({ windowSiteId: null })}>Quitar ventana elegida</button>
                      : <button type="button" onClick={() => set({ windowSiteId: m.site_id })}>Evaluar la ventana completa</button>)}
                  </li>
                ))}
              </ul>
            )}
            {(resolution.state === 'no_coverage' || resolution.state === 'partial_coverage' || resolution.state === 'needs_window_selection') && !scope.windowSiteId && (
              <p className="pl-hint">Puede continuar: se generará un informe de evidencia insuficiente, con la solicitud lista para exportar. Esta versión no descarga datos nuevos.</p>
            )}
          </div>
        </div>
      )}
      {!resolution && (scope.mode === 'catalog' || scope.mode === 'sector') && <GeometryFigure candidates={candidates} resolution={null} highlightIds={scope.mode === 'catalog' ? candidates.map((c) => c.site_id) : [scope.siteId]} />}
    </div>
  )
}
