import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { shortCandidateName } from '../../domain/formatting'
import { buildScope, describeEditable, describeScope, resolveScope, validateBbox, validatePoint, type PlannerState } from '../../mission'

/**
 * Resumen previo a confirmar: muestra las condiciones EFECTIVAS que usará el motor (umbral, unidad,
 * escala, importancia) y la geometría pedida, para que no dependan del texto del brief, que puede
 * conservar un valor antiguo.
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
      <div><dt>Objetivo</dt><dd>{state.target.kind === 'rover' ? 'Rover marciano (referencia Jezero)' : `No soportado: ${state.target.stated || '—'}`}</dd></div>
      <div>
        <dt>Geometría</dt>
        <dd>
          {lines ? (<><span>{lines.requested}</span><small className="pl-sumline">{lines.state}{state.scope.mode !== 'catalog' && lines.measured.length ? ` · ${lines.measured[0]}` : ''}</small></>) : 'Sin elegir o incompleta'}
        </dd>
      </div>
      <div>
        <dt>Condiciones que se evaluarán</dt>
        <dd>
          {state.requirements.length === 0 ? 'Ninguna' : (
            <ul className="pl-sumlist">{state.requirements.map((r) => <li key={r.requirement_id}>{describeEditable(r)}</li>)}</ul>
          )}
          <small className="pl-sumline">El cálculo usa exactamente estas condiciones, no los números que aparezcan en el texto del brief.</small>
        </dd>
      </div>
      <div><dt>Texto</dt><dd>{state.brief ? `${state.brief.slice(0, 160)}${state.brief.length > 160 ? '…' : ''}` : 'Sin texto'}</dd></div>
    </dl>
  )
}
