/**
 * STUB del carrusel de lugares (incremento 3): lista simple y accesible de los sectores
 * evaluados, en orden del snapshot. Sin ◆, sin anillos, sin scroll-snap.
 */
import { formatScore, shortCandidateName } from '../../domain/formatting'
import { rankCandidates } from '../../domain/scoring'
import { GLYPH } from '../../shell/public'
import { uiActions, useUi } from '../../state/ui'
import type { PlaceRailProps } from './index'
import './places.css'

export function PlaceRail({ data, placement }: PlaceRailProps) {
  const selectedId = useUi((state) => state.selection?.siteId ?? null)
  if (data.status === 'loading') {
    return (
      <div className="place-stub" data-placement={placement} aria-busy="true">
        <p className="place-stub-note">Cargando snapshot validado…</p>
      </div>
    )
  }
  const candidates = data.snapshot ? rankCandidates(data.snapshot.candidates) : []
  if (candidates.length === 0) {
    return (
      <div className="place-stub" data-placement={placement}>
        <p className="place-stub-note">No hay sectores para mostrar: verifica el snapshot.</p>
      </div>
    )
  }
  return (
    <div className="place-stub" data-placement={placement}>
      <p className="place-stub-head">
        <span>Lugares · Explorar</span>
        <small>{GLYPH.evaluated} {candidates.length} evaluados</small>
      </p>
      <ul className="place-stub-list" aria-label="Sectores evaluados">
        {candidates.map((candidate, index) => {
          const insufficient = candidate.similarity === null
          return (
            <li key={candidate.site_id}>
              <button
                type="button"
                aria-pressed={candidate.site_id === selectedId}
                onClick={() => uiActions.select(candidate.site_id)}
                onPointerEnter={() => uiActions.setHover(candidate.site_id)}
                onPointerLeave={() => uiActions.setHover(null)}
              >
                <span aria-hidden="true">{insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span>
                <span className="place-stub-name">#{index + 1} {shortCandidateName(candidate.name)}</span>
                <b>{insufficient ? 'datos insuficientes' : `${formatScore(candidate.similarity)} %`}</b>
                {!insufficient && <small>similitud</small>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
