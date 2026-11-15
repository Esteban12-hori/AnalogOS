import { useState } from 'react'
import { useLocale, useT, type Locale } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tPlanner } from '../../i18n/messages/planner'
import {
  METRICS, UNMEASURED_TOPICS, defaultMetricRequirement, describeEditable, isDefaultTopicLabel, topicLabel, uncoveredMentions,
  type EditableMeasurable, type EditableRequirement, type EditableUnmeasured, type MetricId, type PlannerAction, type PlannerState,
} from '../../mission'
import { displayMissionMessage } from '../../mission/messages'
import { uiPack } from '../../mission/pack'

const UNIT_IDS = ['degree', 'meter', 'ratio', 'percent', 'km2', 'iso_alpha2'] as const
type UnitId = (typeof UNIT_IDS)[number]
const isUnitId = (unit: string): unit is UnitId => (UNIT_IDS as readonly string[]).includes(unit)
const COMMON: MetricId[] = ['median_slope_degree', 'nonvegetated_fraction', 'country']
const MORE: MetricId[] = ['terrain_roughness_meter', 'local_relief_meter', 'polygon_area_km2']

interface Props {
  state: PlannerState
  dispatch: (a: PlannerAction) => void
}

const summary = (r: EditableRequirement, locale: Locale): string => describeEditable(r, false, locale)

function MeasurableCard({ r, dispatch }: { r: EditableMeasurable; dispatch: Props['dispatch'] }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const pack = uiPack(locale)
  const spec = METRICS[r.metric_id]
  const up = (patch: Partial<EditableMeasurable>) => dispatch({ type: 'update_requirement', id: r.requirement_id, patch })
  const idp = `${r.requirement_id}-`
  return (
    <>
      <div className="pl-req-grid">
        {r.metric_id === 'country' ? (
          <fieldset className="pl-checks">
            <legend>{t('req.countries')}</legend>
            {(['CL', 'AR'] as const).map((code) => [code, tm(`country.${code}`)] as const).map(([code, name]) => (
              <label key={code}>
                <input type="checkbox" checked={r.countries.includes(code)}
                  onChange={(e) => up({ countries: e.target.checked ? [...r.countries, code].sort() : r.countries.filter((c) => c !== code) })} />
                {name} ({code})
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <label className="pl-field">
              <span>{t('req.condition')}</span>
              <select value={r.operator} onChange={(e) => up({ operator: e.target.value as EditableMeasurable['operator'] })}>
                {spec.operators.map((o) => <option key={o} value={o}>{t(`op.${o}`)}</option>)}
              </select>
            </label>
            <label className="pl-field">
              <span>{r.operator === 'between' ? t('req.minimum') : t('req.value')}</span>
              <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[0]} onChange={(e) => up({ valueText: [e.target.value, r.valueText[1]] })} />
            </label>
            {r.operator === 'between' && (
              <label className="pl-field">
                <span>{t('req.maximum')}</span>
                <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[1]} onChange={(e) => up({ valueText: [r.valueText[0], e.target.value] })} />
              </label>
            )}
            <label className="pl-field">
              <span>{t('req.unit')}</span>
              <select value={r.unit} onChange={(e) => up({ unit: e.target.value })}>
                {spec.units.map((u) => <option key={u} value={u}>{isUnitId(u) ? t(`unit.${u}`) : u}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="pl-field">
          <span>{t('req.importance')}</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">{tm('importance.critical')}</option>
            <option value="preference">{tm('importance.preference')}</option>
          </select>
        </label>
      </div>
      <details className="pl-more">
        <summary>{t('req.more')}</summary>
        <div className="pl-req-grid">
          <label className="pl-field">
            <span>{t('req.name')}</span>
            <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
          </label>
          <label className="pl-field">
            <span>{t('req.scale')}</span>
            <select value={r.scale} onChange={(e) => up({ scale: e.target.value as 'window' | 'point' })}>
              <option value="window">{pack.scaleLabel.window}</option>
              <option value="point">{pack.scaleLabel.point}</option>
            </select>
          </label>
        </div>
        <p className="pl-hint" id={`${idp}scale`}>{locale === 'en' ? spec.scale_note : pack.metricScaleNote[r.metric_id]}</p>
      </details>
    </>
  )
}

function UnmeasuredCard({ r, dispatch }: { r: EditableUnmeasured; dispatch: Props['dispatch'] }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const up = (patch: Partial<EditableUnmeasured>) => dispatch({ type: 'update_requirement', id: r.requirement_id, patch })
  return (
    <>
      <p className="pl-hint warn">{t('req.unmeasuredNote')}</p>
      <div className="pl-req-grid">
        <label className="pl-field">
          <span>{t('req.topic')}</span>
          <select value={r.topic_id} onChange={(e) => up({ topic_id: e.target.value, label: isDefaultTopicLabel(r.label, r.topic_id) ? topicLabel(e.target.value, locale) : r.label })}>
            {UNMEASURED_TOPICS.map((topic) => <option key={topic.id} value={topic.id}>{topicLabel(topic.id, locale)}</option>)}
            <option value="other_unmeasured">{tm('topic.other')}</option>
          </select>
        </label>
        <label className="pl-field">
          <span>{t('req.name')}</span>
          <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
        </label>
        <label className="pl-field wide">
          <span>{t('req.detail')}</span>
          <input type="text" maxLength={300} value={r.detail} onChange={(e) => up({ detail: e.target.value })} />
        </label>
        <label className="pl-field">
          <span>{t('req.importance')}</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">{t('req.criticalUnmeasured')}</option>
            <option value="preference">{tm('importance.preference')}</option>
          </select>
        </label>
      </div>
    </>
  )
}

export function RequirementEditor({ state, dispatch }: Props) {
  const [choice, setChoice] = useState('')
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const nextId = () => `u${state.counter + 1}`
  const add = (value: string) => {
    setChoice('')
    if (!value) return
    if (value === 'unmeasured') {
      dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: tm('requirement.newUnmeasured'), importance: 'preference', origin: 'user', source_quote: null, topic_id: 'other_unmeasured', detail: '' } })
    } else {
      dispatch({ type: 'add_requirement', requirement: defaultMetricRequirement(value as MetricId, nextId(), locale) })
    }
  }
  const mentions = uncoveredMentions(state)
  return (
    <div className="pl-reqs">
      <div className="pl-reqs-head">
        <h3>{t('req.heading')}</h3>
        <label className="pl-add">
          <span className="pl-sr">{t('req.add')}</span>
          <select value={choice} onChange={(e) => add(e.target.value)}>
            <option value="">{t('req.addPlaceholder')}</option>
            <optgroup label={t('req.groupCommon')}>{COMMON.map((m) => <option key={m} value={m}>{tm(`metric.${m}`)}</option>)}</optgroup>
            <optgroup label={t('req.groupMore')}>{MORE.map((m) => <option key={m} value={m}>{tm(`metric.${m}`)}</option>)}</optgroup>
            <optgroup label={t('req.groupUnmeasured')}><option value="unmeasured">{t('req.addUnmeasured')}</option></optgroup>
          </select>
        </label>
      </div>
      <p className="pl-hint">{t('req.hint')}</p>
      {state.requirements.length === 0 && <p className="pl-empty">{t('req.empty')}</p>}
      <ul className="pl-req-list">
        {state.requirements.map((r) => (
          <li key={r.requirement_id} className={`pl-req-card ${r.kind}`}>
            <div className="pl-req-top">
              <strong>{summary(r, locale)}</strong>
              <span className={`pl-tag ${r.origin === 'ai' ? 'ai' : ''}`}>{r.origin === 'ai' ? tm('origin.ai') : tm('origin.you')}</span>
              <span className={`pl-tag ${r.importance === 'critical' ? 'crit' : ''}`}>{tm(`importance.${r.importance}`)}</span>
              <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'remove_requirement', id: r.requirement_id })} aria-label={t('req.removeLabel', { label: r.label })}>{t('req.remove')}</button>
            </div>
            {r.source_quote && <blockquote className="pl-quote">{t('req.quote', { quote: r.source_quote })}</blockquote>}
            {r.kind === 'measurable' ? <MeasurableCard r={r} dispatch={dispatch} /> : <UnmeasuredCard r={r} dispatch={dispatch} />}
          </li>
        ))}
      </ul>
      {(mentions.length > 0 || state.openQuestions.length > 0) && (
        <div className="pl-pending">
          <h4>{t('req.pendingTitle')}</h4>
          <p className="pl-hint">{t('req.pendingHint')}</p>
          <ul>
            {state.openQuestions.map((q) => <li key={q}>{displayMissionMessage(q, locale)}</li>)}
            {mentions.map((m) => (
              <li key={m.topic_id}>
                {t('req.mention', { text: m.matched_text, label: topicLabel(m.topic_id, locale) })}
                <button type="button" onClick={() => dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: topicLabel(m.topic_id, locale), importance: 'preference', origin: 'user', source_quote: null, topic_id: m.topic_id, detail: '' } })}>{t('req.addPending')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
