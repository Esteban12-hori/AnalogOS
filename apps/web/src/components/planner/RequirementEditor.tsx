import { useState } from 'react'
import {
  METRICS, UNMEASURED_TOPICS, defaultMetricRequirement, describeEditable, SCALE_LABEL, topicLabel, uncoveredMentions,
  type EditableMeasurable, type EditableRequirement, type EditableUnmeasured, type MetricId, type PlannerAction, type PlannerState,
} from '../../mission'

const OPERATORS: Record<string, string> = { '<=': 'como máximo (≤)', '>=': 'como mínimo (≥)', between: 'entre', in: 'uno de' }
const UNITS: Record<string, string> = { degree: '° (grados)', meter: 'm (metros)', ratio: 'fracción 0–1', percent: '% (porcentaje)', km2: 'km²', iso_alpha2: 'código de país' }
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
            <legend>Países permitidos</legend>
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
              <span>Condición</span>
              <select value={r.operator} onChange={(e) => up({ operator: e.target.value as EditableMeasurable['operator'] })}>
                {spec.operators.map((o) => <option key={o} value={o}>{OPERATORS[o]}</option>)}
              </select>
            </label>
            <label className="pl-field">
              <span>{r.operator === 'between' ? 'Mínimo' : 'Valor'}</span>
              <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[0]} onChange={(e) => up({ valueText: [e.target.value, r.valueText[1]] })} />
            </label>
            {r.operator === 'between' && (
              <label className="pl-field">
                <span>Máximo</span>
                <input type="text" inputMode="decimal" autoComplete="off" value={r.valueText[1]} onChange={(e) => up({ valueText: [r.valueText[0], e.target.value] })} />
              </label>
            )}
            <label className="pl-field">
              <span>Unidad</span>
              <select value={r.unit} onChange={(e) => up({ unit: e.target.value })}>
                {spec.units.map((u) => <option key={u} value={u}>{UNITS[u]}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="pl-field">
          <span>Importancia</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">Imprescindible</option>
            <option value="preference">Preferencia</option>
          </select>
        </label>
      </div>
      <details className="pl-more">
        <summary>Más opciones</summary>
        <div className="pl-req-grid">
          <label className="pl-field">
            <span>Nombre</span>
            <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
          </label>
          <label className="pl-field">
            <span>Escala del requisito</span>
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
      <p className="pl-hint warn">Este sistema no mide este pedido. Se conserva como pendiente: nunca cuenta como cumplido ni aprueba un sector.</p>
      <div className="pl-req-grid">
        <label className="pl-field">
          <span>Tema</span>
          <select value={r.topic_id} onChange={(e) => up({ topic_id: e.target.value, label: r.label === topicLabel(r.topic_id) ? topicLabel(e.target.value) : r.label })}>
            {UNMEASURED_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            <option value="other_unmeasured">Otro pedido sin medición</option>
          </select>
        </label>
        <label className="pl-field">
          <span>Nombre</span>
          <input type="text" maxLength={120} value={r.label} onChange={(e) => up({ label: e.target.value })} />
        </label>
        <label className="pl-field wide">
          <span>Detalle (opcional)</span>
          <input type="text" maxLength={300} value={r.detail} onChange={(e) => up({ detail: e.target.value })} />
        </label>
        <label className="pl-field">
          <span>Importancia</span>
          <select value={r.importance} onChange={(e) => up({ importance: e.target.value as 'critical' | 'preference' })}>
            <option value="critical">Imprescindible (deja el sector con evidencia insuficiente)</option>
            <option value="preference">Preferencia</option>
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
      dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: 'Pedido sin medición', importance: 'preference', origin: 'user', source_quote: null, topic_id: 'other_unmeasured', detail: '' } })
    } else {
      dispatch({ type: 'add_requirement', requirement: defaultMetricRequirement(value as MetricId, nextId()) })
    }
  }
  const mentions = uncoveredMentions(state)
  return (
    <div className="pl-reqs">
      <div className="pl-reqs-head">
        <h3>Requisitos de su ensayo</h3>
        <label className="pl-add">
          <span className="pl-sr">Añadir requisito</span>
          <select value={choice} onChange={(e) => add(e.target.value)}>
            <option value="">+ Añadir requisito…</option>
            <optgroup label="Frecuentes">{COMMON.map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}</optgroup>
            <optgroup label="Más medidas">{MORE.map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}</optgroup>
            <optgroup label="Sin medición"><option value="unmeasured">Pedido que el sistema no mide (tracción, permisos…)</option></optgroup>
          </select>
        </label>
      </div>
      <p className="pl-hint">El cálculo usa solo los requisitos de esta lista, una vez confirmados. El texto del brief es contexto y no se interpreta como requisitos evaluados.</p>
      {state.requirements.length === 0 && <p className="pl-empty">Todavía no hay requisitos. Sin ellos, todas las áreas quedarían priorizadas solo por similitud.</p>}
      <ul className="pl-req-list">
        {state.requirements.map((r) => (
          <li key={r.requirement_id} className={`pl-req-card ${r.kind}`}>
            <div className="pl-req-top">
              <strong>{summary(r)}</strong>
              <span className={`pl-tag ${r.origin === 'ai' ? 'ai' : ''}`}>{r.origin === 'ai' ? 'Propuesto por IA' : 'Usted'}</span>
              <span className={`pl-tag ${r.importance === 'critical' ? 'crit' : ''}`}>{r.importance === 'critical' ? 'Imprescindible' : 'Preferencia'}</span>
              <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'remove_requirement', id: r.requirement_id })} aria-label={`Quitar requisito ${r.label}`}>Quitar</button>
            </div>
            {r.source_quote && <blockquote className="pl-quote">Cita del brief: «{r.source_quote}»</blockquote>}
            {r.kind === 'measurable' ? <MeasurableCard r={r} dispatch={dispatch} /> : <UnmeasuredCard r={r} dispatch={dispatch} />}
          </li>
        ))}
      </ul>
      {(mentions.length > 0 || state.openQuestions.length > 0) && (
        <div className="pl-pending">
          <h4>Pendientes detectados</h4>
          <p className="pl-hint">Se conservan en la solicitud y en el informe aunque no los convierta en requisitos.</p>
          <ul>
            {state.openQuestions.map((q) => <li key={q}>{q}</li>)}
            {mentions.map((m) => (
              <li key={m.topic_id}>
                El brief menciona «{m.matched_text}» — {m.label} (no medido).
                <button type="button" onClick={() => dispatch({ type: 'add_requirement', requirement: { kind: 'unmeasured', requirement_id: nextId(), label: m.label, importance: 'preference', origin: 'user', source_quote: null, topic_id: m.topic_id, detail: '' } })}>Añadir como requisito pendiente</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
