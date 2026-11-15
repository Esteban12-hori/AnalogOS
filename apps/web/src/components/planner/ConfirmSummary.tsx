import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { useLocale, useT } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tPlanner } from '../../i18n/messages/planner'
import { buildScope, describeEditable, describeScope, resolveScope, validateBbox, validatePoint, type PlannerState } from '../../mission'
import { uiPack } from '../../mission/pack'
import { siteName } from '../../mission/siteName'

/**
 * Summary shown before confirming: it displays the EFFECTIVE conditions that the engine will use (threshold, unit,
 * scale, importance) and the requested geometry, so that they do not depend on the brief text, which may
 * retain an outdated value.
 */
export function ConfirmSummary({ state, candidates }: { state: PlannerState; candidates: CandidateSite[] }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const lines = useMemo(() => {
    const built = buildScope(state.scope)
    const issues = built.scope?.mode === 'point' ? validatePoint(built.scope.lon, built.scope.lat) : built.scope?.mode === 'bbox' ? validateBbox(built.scope.bbox) : []
    if (!built.scope || issues.length) return null
    const nameOf = (id: string) => siteName(candidates.find((c) => c.site_id === id)?.name ?? id, locale)
    return describeScope(resolveScope(built.scope, candidates), nameOf, uiPack(locale))
  }, [state.scope, candidates, locale])
  return (
    <dl className="pl-summary">
      <div><dt>{t('summary.objective')}</dt><dd>{state.target.kind === 'rover' ? tm('rover') : t('summary.unsupported', { stated: state.target.stated || '—' })}</dd></div>
      <div>
        <dt>{t('summary.geometry')}</dt>
        <dd>
          {lines ? (<><span>{lines.requested}</span><small className="pl-sumline">{lines.state}{state.scope.mode !== 'catalog' && lines.measured.length ? ` · ${lines.measured[0]}` : ''}</small></>) : t('summary.noGeometry')}
        </dd>
      </div>
      <div>
        <dt>{t('summary.conditions')}</dt>
        <dd>
          {state.requirements.length === 0 ? t('summary.none') : (
            <ul className="pl-sumlist">{state.requirements.map((r) => <li key={r.requirement_id}>{describeEditable(r, true, locale)}</li>)}</ul>
          )}
          <small className="pl-sumline">{t('summary.conditionsNote')}</small>
        </dd>
      </div>
      <div><dt>{t('summary.text')}</dt><dd>{state.brief ? `${state.brief.slice(0, 160)}${state.brief.length > 160 ? '…' : ''}` : t('summary.noText')}</dd></div>
    </dl>
  )
}
