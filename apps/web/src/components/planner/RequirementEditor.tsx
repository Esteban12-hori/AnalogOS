import { useState } from 'react'
import {
  METRICS, UNMEASURED_TOPICS, defaultMetricRequirement, describeEditable, SCALE_LABEL, topicLabel, uncoveredMentions,
  type EditableMeasurable, type EditableRequirement, type EditableUnmeasured, type MetricId, type PlannerAction, type PlannerState,
} from '../../mission'

const OPERATORS: Record<string, string> = { '<=': 'at most (≤)', '>=': 'at least (≥)', between: 'between', in: 'one of' }
const UNITS: Record<string, string> = { degree: '° (degrees)', meter: 'm (meters)', ratio: '0–1 fraction', percent: '% (percent)', km2: 'km²', iso_alpha2: 'country code' }
const COMMON: MetricId[] = ['median_slope_degree', 'nonvegetated_fraction', 'country']
const MORE: MetricId[] = ['terrain_roughness_meter', 'local_relief_meter', 'polygon_area_km2']

interface Props {
  state: PlannerState
  dispatch: (a: PlannerAction) => void
}

const summary = (r: EditableRequirement): string => describeEditable(r, false)

function MeasurableCard({ r, dispatch }: { r: EditableMeasurable; dispatch: Props['dispatch'] }) {
  const spec = METRICS[r.metric_id]
  const up = (patch: Partial<EditableMeasurable>) => dispatch({ type: 'update_requirement', id: r.requirement_id, patch })
  const idp = `${r.requirement_id}-`
  return (
    <>
      <div className="pl-req-grid">
        {r.metric_id === 'country' ? (
          <fieldset className="pl-checks">
            <legend>Allowed countries</legend>
            {[['CL', 'Chile'], ['AR', 'Argentina']].map(([code, name]) => (
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
              <span>Condition</span>
              <select value={r.operator} onChange={(e) => up({ operator: e.target.value as EditableMeasurable['operator'] })}>
                {spec.operators.map((o) => <option key={o} value={o}>{OPERATORS[o]}</option>)}
              </select>
            </label>
            <label className="pl-field">
              <span>{r.operator === 'between' ? 'Minimum' : 'Value'}</span>
              <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[0]} onChange={(e) => up({ valueText: [e.target.value, r.valueText[1]] })} />
            </label>
            {r.operator === 'between' && (
              <label className="pl-field">
                <span>Maximum</span>
                <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[1]} onChange={(e) => up({ valueText: [r.valueText[0], e.target.value] })} />
              </label>
            )}
            <label className="pl-field">
              <span>Unit</span>
              <select value={r.unit} onChange={(e) => up({ unit: e.target.value })}>
                {spec.units.map((u) => <option key={u} value={u}>{UNITS[u]}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="pl-field">
          <span>Importance</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">Must-have</option>
            <option value="preference">Preference</option>
          </select>
        </label>
      </div>
      <details className="pl-more">
        <summary>More options</summary>
        <div className="pl-req-grid">
          <label className="pl-field">
            <span>Name</span>
            <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
          </label>
          <label className="pl-field">
            <span>Requirement scale</span>
            <select value={r.scale} onChange={(e) => up({ scale: e.target.value as 'window' | 'point' })}>
              <option value="window">{SCALE_LABEL.window}</option>
              <option value="point">{SCALE_LABEL.point}</option>
            </select>
          </label>
        </div>
        <p className="pl-hint" id={`${idp}scale`}>{spec.scale_note}</p>
      </details>
    </>
  )
}

function UnmeasuredCard({ r, dispatch }: { r: EditableUnmeasured; dispatch: Props['dispatch'] }) {
  const up = (patch: Partial<EditableUnmeasured>) => dispatch({ type: 'update_requirement', id: r.requirement_id, patch })
  return (
    <>
      <p className="pl-hint warn">This system does not measure this request. It is kept as pending: it never counts as met and never approves a sector.</p>
      <div className="pl-req-grid">
        <label className="pl-field">
          <span>Topic</span>
          <select value={r.topic_id} onChange={(e) => up({ topic_id: e.target.value, label: r.label === topicLabel(r.topic_id) ? topicLabel(e.target.value) : r.label })}>
            {UNMEASURED_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            <option value="other_unmeasured">Other unmeasured request</option>
          </select>
        </label>
        <label className="pl-field">
          <span>Name</span>
          <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
        </label>
        <label className="pl-field wide">
          <span>Detail (optional)</span>
          <input type="text" maxLength={300} value={r.detail} onChange={(e) => up({ detail: e.target.value })} />
        </label>
        <label className="pl-field">
          <span>Importance</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">Must-have (leaves the sector with insufficient evidence)</option>
            <option value="preference">Preference</option>
          </select>
        </label>
      </div>
    </>
  )
}

export function RequirementEditor({ state, dispatch }: Props) {
  const [choice, setChoice] = useState('')
  const nextId = () => `u${state.counter + 1}`
  const add = (value: string) => {
    setChoice('')
    if (!value) return
    if (value === 'unmeasured') {
      dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: 'Unmeasured request', importance: 'preference', origin: 'user', source_quote: null, topic_id: 'other_unmeasured', detail: '' } })
    } else {
      dispatch({ type: 'add_requirement', requirement: defaultMetricRequirement(value as MetricId, nextId()) })
    }
  }
  const mentions = uncoveredMentions(state)
  return (
    <div className="pl-reqs">
      <div className="pl-reqs-head">
        <h3>Your test requirements</h3>
        <label className="pl-add">
          <span className="pl-sr">Add requirement</span>
          <select value={choice} onChange={(e) => add(e.target.value)}>
            <option value="">+ Add requirement…</option>
            <optgroup label="Common">{COMMON.map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}</optgroup>
            <optgroup label="More measurements">{MORE.map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}</optgroup>
            <optgroup label="Not measured"><option value="unmeasured">Request the system does not measure (traction, permits…)</option></optgroup>
          </select>
        </label>
      </div>
      <p className="pl-hint">The calculation uses only the requirements in this list, once confirmed. The brief text is context and is not interpreted as evaluated requirements.</p>
      {state.requirements.length === 0 && <p className="pl-empty">There are no requirements yet. Without them, every area would be prioritized by similarity alone.</p>}
      <ul className="pl-req-list">
        {state.requirements.map((r) => (
          <li key={r.requirement_id} className={`pl-req-card ${r.kind}`}>
            <div className="pl-req-top">
              <strong>{summary(r)}</strong>
              <span className={`pl-tag ${r.origin === 'ai' ? 'ai' : ''}`}>{r.origin === 'ai' ? 'Proposed by AI' : 'You'}</span>
              <span className={`pl-tag ${r.importance === 'critical' ? 'crit' : ''}`}>{r.importance === 'critical' ? 'Must-have' : 'Preference'}</span>
              <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'remove_requirement', id: r.requirement_id })} aria-label={`Remove requirement ${r.label}`}>Remove</button>
            </div>
            {r.source_quote && <blockquote className="pl-quote">Quote from the brief: “{r.source_quote}”</blockquote>}
            {r.kind === 'measurable' ? <MeasurableCard r={r} dispatch={dispatch} /> : <UnmeasuredCard r={r} dispatch={dispatch} />}
          </li>
        ))}
      </ul>
      {(mentions.length > 0 || state.openQuestions.length > 0) && (
        <div className="pl-pending">
          <h4>Pending items detected</h4>
          <p className="pl-hint">They are kept in the request and in the report even if you do not turn them into requirements.</p>
          <ul>
            {state.openQuestions.map((q) => <li key={q}>{q}</li>)}
            {mentions.map((m) => (
              <li key={m.topic_id}>
                The brief mentions “{m.matched_text}” — {m.label} (not measured).
                <button type="button" onClick={() => dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: m.label, importance: 'preference', origin: 'user', source_quote: null, topic_id: m.topic_id, detail: '' } })}>Add as a pending requirement</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
