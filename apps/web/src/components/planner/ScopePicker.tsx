import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { formatInteger, formatNumber, useLocale, useT, withPercent } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tPlanner } from '../../i18n/messages/planner'
import { resolveScope, relationLabel, validateBbox, validatePoint, type JourneyId, type PlannerAction, type ScopeInput, type ScopeMode, buildScope } from '../../mission'
import { displayMissionMessage } from '../../mission/messages'
import { siteName } from '../../mission/siteName'
import { displayRecordText } from '../../i18n/recordText'
import { GeometryFigure } from './GeometryFigure'

interface Props {
  journey: JourneyId
  scope: ScopeInput
  candidates: CandidateSite[]
  dispatch: (a: PlannerAction) => void
}

export function ScopePicker({ journey, scope, candidates, dispatch }: Props) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const pct = (x: number | null) => (x === null ? '' : withPercent(String(Math.round(x * 100)), locale))
  const set = (patch: Partial<ScopeInput>) => dispatch({ type: 'set_scope', scope: { ...scope, ...patch } })
  const modes: Array<{ id: ScopeMode; label: string; hint: string }> = [
    ...(journey === 'test' ? [{ id: 'catalog' as const, label: t('scope.catalog'), hint: t('scope.catalogHint') }] : []),
    { id: 'sector', label: t('scope.sector'), hint: t('scope.sectorHint') },
    { id: 'point', label: t('scope.point'), hint: t('scope.pointHint') },
    { id: 'bbox', label: t('scope.bbox'), hint: t('scope.bboxHint') },
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
        <legend>{t('scope.legend')}</legend>
        {modes.map((m) => (
          <label key={m.id} className={`pl-radio${scope.mode === m.id ? ' on' : ''}`}>
            <input type="radio" name="scope-mode" checked={scope.mode === m.id} onChange={() => set({ mode: m.id, windowSiteId: null })} />
            <span><strong>{m.label}</strong><small>{m.hint}</small></span>
          </label>
        ))}
      </fieldset>

      {scope.mode === 'sector' && (
        <fieldset className="pl-sectors">
          <legend>{t('scope.sectorsLegend')}</legend>
          {ordered.map((c) => (
            <label key={c.site_id} className={`pl-sector${scope.siteId === c.site_id ? ' on' : ''}`}>
              <input type="radio" name="scope-sector" checked={scope.siteId === c.site_id} onChange={() => set({ siteId: c.site_id })} />
              <span>
                <strong>{siteName(c.name, locale)}</strong>
                <small>{tm(c.country === 'AR' ? 'country.AR' : 'country.CL')} · {formatInteger(c.area_km2, locale)} km²</small>
              </span>
              <b className={`pl-tag ${c.role === 'reference' ? 'ref' : ''}`}>{c.role === 'reference' ? 'REF' : c.country}</b>
            </label>
          ))}
        </fieldset>
      )}

      {scope.mode === 'point' && (
        <div className="pl-coords">
          {field('lon', t('scope.lon'), t('scope.lonPlaceholder'))}
          {field('lat', t('scope.lat'), t('scope.latPlaceholder'))}
          <p className="pl-hint">{t('scope.pointNote')}</p>
        </div>
      )}
      {scope.mode === 'bbox' && (
        <div className="pl-coords four">
          {field('west', t('scope.west'), t('scope.westPlaceholder'))}
          {field('south', t('scope.south'), t('scope.southPlaceholder'))}
          {field('east', t('scope.east'), t('scope.eastPlaceholder'))}
          {field('north', t('scope.north'), t('scope.northPlaceholder'))}
          <p className="pl-hint">{t('scope.bboxNote')}</p>
        </div>
      )}
      {showProblems && problems.length > 0 && (
        <ul className="pl-problems" role="alert">{problems.map((p) => <li key={p}>{displayMissionMessage(p, locale)}</li>)}</ul>
      )}

      {resolution && (
        <div className="pl-resolution" aria-live="polite">
          <GeometryFigure candidates={candidates} resolution={resolution} highlightIds={scope.mode === 'sector' ? [scope.siteId] : []} />
          <div>
            <h4>
              {t(`scope.state.${resolution.state}`)}
            </h4>
            {resolution.requested.approx_area_km2 !== null && resolution.mode === 'bbox' && <p className="pl-hint">{t('scope.requestedArea', { area: formatNumber(resolution.requested.approx_area_km2, {}, locale) })}</p>}
            <ul className="pl-notes">{resolution.notes.map((n) => <li key={n}>{displayRecordText(n, locale)}</li>)}</ul>
            {resolution.matches.length > 0 && scope.mode !== 'sector' && (
              <ul className="pl-matches">
                {resolution.matches.map((m) => (
                  <li key={m.site_id}>
                    <span><strong>{siteName(m.name, locale)}</strong> · {relationLabel(m.relation, locale)}{m.request_covered_fraction !== null && t('scope.covers', { percent: pct(m.request_covered_fraction) })}</span>
                    {resolution.state !== 'covered' && (scope.windowSiteId === m.site_id
                      ? <button type="button" className="pl-ghost" onClick={() => set({ windowSiteId: null })}>{t('scope.removeWindow')}</button>
                      : <button type="button" onClick={() => set({ windowSiteId: m.site_id })}>{t('scope.useWindow')}</button>)}
                  </li>
                ))}
              </ul>
            )}
            {(resolution.state === 'no_coverage' || resolution.state === 'partial_coverage' || resolution.state === 'needs_window_selection') && !scope.windowSiteId && (
              <p className="pl-hint">{t('scope.continueHint')}</p>
            )}
          </div>
        </div>
      )}
      {!resolution && (scope.mode === 'catalog' || scope.mode === 'sector') && <GeometryFigure candidates={candidates} resolution={null} highlightIds={scope.mode === 'catalog' ? candidates.map((c) => c.site_id) : [scope.siteId]} />}
    </div>
  )
}
