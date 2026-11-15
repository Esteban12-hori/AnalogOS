import type { CandidateSite } from '../../domain/contracts'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import {
  composeExplanation, describeEffective, describeScope, evaluationFingerprint, fmtObserved, fmtQuantity, SCOPE_STATE_LABEL, siteMeasures, type EvidenceRef, type MissionEvaluation, type MissionRequest,
  type OptionEvaluation, type OptionStatus, type PlannerState, type RequirementResult,
} from '../../mission'
import { GeometryFigure } from './GeometryFigure'

const STATUS: Record<OptionStatus, string> = {
  priorizado_para_reconocimiento: 'Priorizado para reconocimiento',
  no_cumple_requisitos: 'No cumple requisitos',
  evidencia_insuficiente: 'Evidencia insuficiente',
  objetivo_no_soportado: 'Objetivo no soportado',
}
const REQ_STATUS: Record<RequirementResult['status'], string> = { cumple: 'Cumple', no_cumple: 'No cumple', no_evaluable: 'No evaluable' }
const SCOPE_STATE = SCOPE_STATE_LABEL
const OUTCOME_COPY: Record<MissionEvaluation['outcome'], string> = {
  evaluated: '', unsupported_target: 'Este objetivo no tiene un perfil soportado',
  needs_window_selection: 'Hay evidencia de una ventana, no del punto: falta elegirla',
  insufficient_coverage: 'Evidencia insuficiente para esta geometría',
}

const safeUrl = (u: string | null): string | null => (u && /^https:\/\//.test(u) ? u : null)
const country = (c: string | null) => (c === 'AR' ? 'Argentina' : c === 'CL' ? 'Chile' : '—')

function EvidenceLinks({ ids, map }: { ids: string[]; map: Map<string, EvidenceRef> }) {
  if (!ids.length) return <span className="pl-muted">—</span>
  return (
    <>
      {ids.map((id) => {
        const url = safeUrl(map.get(id)?.source_url ?? null)
        return url ? <a key={id} href={url} target="_blank" rel="noreferrer noopener" className="pl-evid">{id}</a> : <code key={id} className="pl-evid">{id}</code>
      })}
    </>
  )
}

export function CriteriaTable({ results, map }: { results: RequirementResult[]; map: Map<string, EvidenceRef> }) {
  if (!results.length) return <p className="pl-muted">No hay requisitos que evaluar.</p>
  return (
    <div className="pl-table-wrap">
      <table className="pl-table">
        <thead><tr><th>Requisito</th><th>Exigido</th><th>Observado</th><th>Resultado</th><th>Escala · periodo</th><th>Evidencia</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.requirement_id} className={r.status}>
              <th scope="row">{r.label}<small>{r.importance === 'critical' ? 'Imprescindible' : 'Preferencia'}</small></th>
              <td>{r.required}{r.conversion && <small>{r.conversion}</small>}</td>
              <td>{fmtObserved(r.observed_value, r.observed_unit)}</td>
              <td><b className={`pl-res ${r.status}`}>{REQ_STATUS[r.status]}</b><small>{r.reason}</small></td>
              <td><small>{r.scale_note ?? '—'}{r.period ? ` · ${r.period}` : ''}</small></td>
              <td><EvidenceLinks ids={r.evidence_ids} map={map} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Measures({ site }: { site: CandidateSite }) {
  return (
    <div className="pl-table-wrap">
      <table className="pl-table compact">
        <caption>Medidas del snapshot para esta ventana (estadísticos de la ventana completa)</caption>
        <thead><tr><th>Medida</th><th>Valor</th><th>Escala</th></tr></thead>
        <tbody>
          {siteMeasures(site).map((m) => (
            <tr key={m.metric_id}><th scope="row">{m.label}</th><td>{m.value === null ? 'sin dato' : typeof m.value === 'number' ? fmtQuantity(m.value, m.unit) : m.value}</td><td><small>{m.scale_note}</small></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OptionCard({ o, site, map }: { o: OptionEvaluation; site: CandidateSite | undefined; map: Map<string, EvidenceRef> }) {
  const crit = o.requirement_results.filter((r) => r.importance === 'critical')
  const blockers = o.requirement_results.filter((r) => r.importance === 'critical' && r.status !== 'cumple')
  return (
    <article className={`pl-opt ${o.status}`}>
      <header>
        {o.rank !== null && <span className="pl-rank" aria-label={`Puesto ${o.rank}`}>{o.rank}</span>}
        <div>
          <h4>{shortCandidateName(o.name)}</h4>
          <small>{country(o.country)}{o.role === 'reference' && <b className="pl-tag ref">REF · referencia conocida</b>}</small>
        </div>
        <span className={`pl-status ${o.status}`}>{STATUS[o.status]}</span>
      </header>
      {o.status !== 'objetivo_no_soportado' && (
        <p className="pl-counts">
          Imprescindibles: {crit.filter((r) => r.status === 'cumple').length} cumplidos · {o.critical_failed.length} incumplidos · {o.critical_unknown.length} no evaluables.
          {' '}Preferencias: {o.preferences.met} de {o.preferences.total} cumplidas{o.preferences.unknown > 0 && `, ${o.preferences.unknown} desconocida(s)`}.
        </p>
      )}
      {blockers.length > 0 && (
        <ul className="pl-blockers" aria-label="Qué lo impide">
          {blockers.map((b) => <li key={b.requirement_id}><b className={`pl-res ${b.status}`}>{REQ_STATUS[b.status]}</b> {b.label}: {b.reason}</li>)}
        </ul>
      )}
      <details>
        <summary>Detalle por criterio, medidas y verificaciones</summary>
        <CriteriaTable results={o.requirement_results} map={map} />
        {site && <Measures site={site} />}
        <p className="pl-scores">
          Valores originales del snapshot v3, sin recalcular: similitud {o.snapshot_scores.similarity === null ? 'sin score' : formatScore(o.snapshot_scores.similarity)} · confianza {formatScore(o.snapshot_scores.confidence)} · estabilidad {o.snapshot_scores.stability === null ? '—' : formatScore(o.snapshot_scores.stability)}.
          La similitud no es probabilidad de éxito.
        </p>
        <p className="pl-scores">Factibilidad territorial: <b>pendiente</b> (permisos, acceso, áreas protegidas, propiedad). Es independiente de este resultado.</p>
        {o.what_would_change.length > 0 && <><h5>Qué evidencia cambiaría la decisión</h5><ul>{o.what_would_change.map((t) => <li key={t}>{t}</li>)}</ul></>}
        {o.field_checks.length > 0 && <><h5>Verificaciones de campo</h5><ul>{o.field_checks.map((t) => <li key={t}>{t}</li>)}</ul></>}
        <details className="pl-nested"><summary>Límites del snapshot para esta ventana</summary><ul>{o.limitations.map((t) => <li key={t}>{t}</li>)}</ul></details>
      </details>
    </article>
  )
}

function AiPanel({ state, evaluation, onExplain }: { state: PlannerState; evaluation: MissionEvaluation; onExplain: () => void }) {
  const e = state.explain
  const view = e.record ? composeExplanation(evaluation, e.record.selection, 'anthropic') : null
  return (
    <section className="pl-ai" aria-labelledby="pl-ai-title">
      <h3 id="pl-ai-title">Interpretación con IA <span className="pl-tag ai">Opcional</span></h3>
      <p className="pl-hint">
        Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief).
        La IA solo destaca motivos de hechos ya calculados: no cambia estados, valores ni exclusiones, y los bloqueos se muestran siempre.
      </p>
      <button type="button" disabled={e.status === 'pending'} onClick={onExplain} aria-busy={e.status === 'pending'}>
        {e.status === 'pending' ? 'Consultando a la IA…' : view ? 'Pedir otra selección a la IA' : 'Destacar motivos con IA'}
      </button>
      <div aria-live="polite" className="pl-ai-status">
        {(e.status === 'error' || e.status === 'unavailable') && <p className="pl-notice">{e.message} El resultado calculado no cambió.</p>}
      </div>
      {view && e.record && (
        <div className="pl-ai-view">
          <p className="pl-hint">{view.notice} Modelo {e.record.provenance.model} · {e.record.provenance.created_at.slice(0, 10)}{e.record.provenance.request_id ? ` · ${e.record.provenance.request_id}` : ''}.</p>
          <ul>
            {view.options.map((o) => (
              <li key={o.site_id}>
                <strong>{shortCandidateName(o.name)}</strong> — {STATUS[o.status]}
                <ul>{o.highlighted.map((r) => <li key={r.requirement_id}><b className={`pl-res ${r.status}`}>{REQ_STATUS[r.status]}</b> {r.label}: {r.reason}</li>)}</ul>
              </li>
            ))}
          </ul>
          {view.verifications.length > 0 && <><h5>Verificaciones en el orden que sugiere la IA</h5><ol>{view.verifications.map((v) => <li key={v.id}>{v.text}</li>)}</ol></>}
        </div>
      )}
    </section>
  )
}

function GeometryText({ ev, byId }: { ev: MissionEvaluation; byId: Map<string, CandidateSite> }) {
  const lines = describeScope(ev.resolution, (id) => shortCandidateName(byId.get(id)?.name ?? id))
  return (
    <div className="pl-geotext">
      <p><b>Pedida:</b> {lines.requested}</p>
      <p><b>Estado:</b> {lines.state}.</p>
      <p><b>Medida:</b></p>
      <ul>{lines.measured.map((m) => <li key={m}>{m}</li>)}</ul>
      {lines.matches.length > 0 && <><p><b>Ventanas con intersección:</b></p><ul>{lines.matches.map((m) => <li key={m}>{m}</li>)}</ul></>}
      <ul>{ev.resolution.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  )
}

interface Props {
  evaluation: MissionEvaluation
  request: MissionRequest
  state: PlannerState
  candidates: CandidateSite[]
  onExplain: () => void
  onExport: () => void
  exportError: string | null
  onEdit: () => void
  /**
   * Variante de «Tu misión» en la interfaz integrada (ADR-013): titular, bloqueos, regla de orden,
   * pendientes, límites y exportación. El detalle por criterio vive en el riel, los motivos y el
   * botón de IA en la Lectura, y el informe imprimible lo monta una sola vez el controlador de
   * misión. Sin esta prop, la vista es la del equipo.
   */
  compact?: boolean
}

/** Resumen compacto de una opción: estado, puesto y lo que la bloquea (sin tablas). */
function CompactOption({ o }: { o: OptionEvaluation }) {
  const blockers = o.requirement_results.filter((r) => r.importance === 'critical' && r.status !== 'cumple')
  return (
    <li className={`pl-copt ${o.status}`}>
      <span className="pl-copt-head">
        {o.rank !== null && <b className="pl-rank" aria-label={`Puesto ${o.rank}`}>{o.rank}</b>}
        <strong>{shortCandidateName(o.name)}</strong>
        {o.role === 'reference' && <b className="pl-tag ref">REF</b>}
        <small>{country(o.country)}</small>
      </span>
      {o.status !== 'objetivo_no_soportado' && o.preferences.total > 0 && (
        <small className="pl-copt-prefs">Preferencias: {o.preferences.met} de {o.preferences.total}{o.preferences.unknown > 0 ? ` · ${o.preferences.unknown} sin dato` : ''}</small>
      )}
      {blockers.length > 0 && (
        <ul className="pl-blockers" aria-label="Qué lo impide">
          {blockers.map((b) => <li key={b.requirement_id}><b className={`pl-res ${b.status}`}>{REQ_STATUS[b.status]}</b> {b.label}: {b.reason}</li>)}
        </ul>
      )}
    </li>
  )
}

export function ResultView({ evaluation: ev, request, state, candidates, onExplain, onExport, exportError, onEdit, compact = false }: Props) {
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  const group = (s: OptionStatus) => ev.options.filter((o) => o.status === s)
  const prior = group('priorizado_para_reconocimiento')
  const headline = ev.outcome === 'evaluated'
    ? (prior.length ? `${prior.length} de ${ev.options.length} áreas quedan priorizadas para reconocimiento` : 'Ninguna área queda priorizada con estos requisitos')
    : OUTCOME_COPY[ev.outcome]
  const top = prior[0]

  return (
    <div className="pl-result">
      <div className="pl-screen-only">
        <h3 id="pl-result-title" tabIndex={-1} className="pl-headline">{headline}</h3>
        <p className="pl-lead">
          {ev.outcome === 'evaluated' && top && <>Primera por orden: <strong>{shortCandidateName(top.name)}</strong>. Es una priorización de screening para reconocimiento; no aprueba ni autoriza el sector.</>}
          {ev.outcome === 'evaluated' && !top && <>Es un resultado válido: ningún sector cumple todo lo imprescindible con evidencia suficiente. Revise los motivos abajo.</>}
          {ev.outcome !== 'evaluated' && <>No se estimó nada con ventanas vecinas ni se consultaron satélites. Puede exportar la solicitud como diagnóstico.</>}
        </p>
        <p className="pl-chips">
          <span className="pl-tag">{SCOPE_STATE[ev.resolution.state]}</span>
          {ev.comparability === 'partial' && <span className="pl-tag warn">Comparación parcial: hay preferencias que no se pudieron medir</span>}
          <span className="pl-tag">Factibilidad territorial pendiente</span>
        </p>

        {!compact && <GeometryFigure candidates={candidates} resolution={ev.resolution} />}
        <details className="pl-more"><summary>Geometría pedida y medida</summary>
          <GeometryText ev={ev} byId={byId} />
        </details>

        {ev.data_request && (
          <section className="pl-diag" aria-labelledby="pl-diag-title">
            <h3 id="pl-diag-title">Informe de evidencia insuficiente</h3>
            <p>{ev.data_request.note}</p>
            <h5>Fuentes previstas para un análisis futuro</h5>
            <ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}><a href={safeUrl(s.landing_url) ?? undefined} target="_blank" rel="noreferrer noopener">{s.product}</a> · {s.provider}</li>)}</ul>
            <p className="pl-hint">La solicitud (geometría, requisitos y fuentes) viaja en el JSON exportado.</p>
          </section>
        )}

        {ev.options.length > 0 && (
          <>
            {(['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado'] as OptionStatus[]).map((s) => {
              const list = group(s)
              if (!list.length) return null
              return compact ? (
                <section key={s} className="pl-group">
                  <h4>{STATUS[s]} <small>({list.length})</small></h4>
                  <ul className="pl-clist">{list.map((o) => <CompactOption key={o.site_id} o={o} />)}</ul>
                </section>
              ) : (
                <section key={s} className="pl-group">
                  <h3>{STATUS[s]} <small>({list.length})</small></h3>
                  {list.map((o) => <OptionCard key={o.site_id} o={o} site={byId.get(o.site_id)} map={map} />)}
                </section>
              )
            })}
          </>
        )}

        <details className="pl-more"><summary>Cómo se ordena y qué significan los estados</summary><p>{ev.ordering_rule}</p></details>
        {ev.pending_requirements.length > 0 && <p className="pl-notice">Hay {ev.pending_requirements.length} requisito(s) sin medición en esta evaluación: se conservaron como pendientes y nunca cuentan como cumplidos.</p>}
        {ev.open_questions.length > 0 && <details className="pl-more"><summary>Preguntas abiertas ({ev.open_questions.length})</summary><ul>{ev.open_questions.map((q) => <li key={q}>{q}</li>)}</ul></details>}

        {ev.outcome === 'evaluated' && !compact && <AiPanel state={state} evaluation={ev} onExplain={onExplain} />}

        <section className="pl-export" aria-label="Exportar">
          <button type="button" onClick={onExport}>Descargar JSON</button>
          <button type="button" onClick={() => window.print()}>Imprimir informe</button>
          <button type="button" className="pl-ghost" onClick={onEdit}>Volver a editar</button>
          {exportError && <p className="pl-notice" role="alert">{exportError}</p>}
        </section>

        <details className="pl-more"><summary>Límites, evidencias y detalle técnico</summary>
          <h5>Límites</h5><ul>{ev.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          <h5>Evidencias citadas</h5>
          <ul>{ev.evidence.map((e) => <li key={e.evidence_id}><EvidenceLinks ids={[e.evidence_id]} map={map} /> — {e.claim}</li>)}</ul>
          <h5>Versiones</h5>
          <p>Snapshot {ev.snapshot_version} · perfil {ev.profile.id} {ev.profile.version} · reglas {ev.rules_version}</p>
          <p className="pl-mono">solicitud {ev.request_fingerprint}<br />evaluación {evaluationFingerprint(ev)}</p>
        </details>
      </div>

      {!compact && <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={headline} />}
    </div>
  )
}

/** Titular del resultado (mismo texto en pantalla e informe). */
export function resultHeadline(ev: MissionEvaluation): string {
  const prior = ev.options.filter((o) => o.status === 'priorizado_para_reconocimiento')
  return ev.outcome === 'evaluated'
    ? (prior.length ? `${prior.length} de ${ev.options.length} áreas quedan priorizadas para reconocimiento` : 'Ninguna área queda priorizada con estos requisitos')
    : OUTCOME_COPY[ev.outcome]
}

/** Informe imprimible para montar fuera de ResultView (interfaz integrada: uno solo por página). */
export function MissionPrintReport({ evaluation: ev, request, state, candidates }: { evaluation: MissionEvaluation; request: MissionRequest; state: PlannerState; candidates: CandidateSite[] }) {
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  return <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={resultHeadline(ev)} />
}

/** Informe imprimible: contenido completo y sin elementos interactivos (solo visible con @media print). */
function PrintReport({ ev, request, state, byId, map, headline }: { ev: MissionEvaluation; request: MissionRequest; state: PlannerState; byId: Map<string, CandidateSite>; map: Map<string, EvidenceRef>; headline: string }) {
  const draft = state.draft.record
  const expl = state.explain.record
  return (
    <article className="pl-print-only">
      <h1>AnalogOS · Informe de recomendación para una prueba</h1>
      <p><strong>{headline}</strong>. Screening de escritorio sobre el snapshot {ev.snapshot_version}: no aprueba ni autoriza ningún sector.</p>
      <h2>Prueba</h2>
      <p><b>Actividad:</b> {request.activity || '—'}<br /><b>Objetivo:</b> {request.target.profile_id === 'unsupported' ? `No soportado — ${request.target.stated}` : `Rover marciano, referencia Jezero (perfil ${ev.profile.id} ${ev.profile.version})`}</p>
      <h3>Texto completo del brief</h3>
      <p className="pl-pre">{request.brief || '(sin texto)'}</p>
      <h3>Requisitos confirmados</h3>
      <table className="pl-table"><thead><tr><th>Requisito</th><th>Condición efectiva</th><th>Importancia</th><th>Origen</th><th>Cita del brief</th></tr></thead>
        <tbody>{request.requirements.map((r) => <tr key={r.requirement_id}><td>{r.label}</td><td>{describeEffective(r)}</td><td>{r.importance === 'critical' ? 'Imprescindible' : 'Preferencia'}</td><td>{r.origin === 'ai' ? 'Propuesto por IA' : 'Usuario'}</td><td>{r.source_quote ?? '—'}</td></tr>)}</tbody></table>
      {request.requirements.length === 0 && <p>Sin requisitos.</p>}
      {ev.open_questions.length > 0 && <><h3>Pendientes y preguntas abiertas</h3><ul>{ev.open_questions.map((q) => <li key={q}>{q}</li>)}</ul></>}
      <h2>Geometría</h2>
      <GeometryText ev={ev} byId={byId} />
      <GeometryFigure candidates={[...byId.values()]} resolution={ev.resolution} />
      <h2>Resultado</h2>
      {ev.options.map((o) => (
        <section key={o.site_id} className="pl-print-opt">
          <h3>{o.rank !== null ? `${o.rank}. ` : ''}{shortCandidateName(o.name)} — {STATUS[o.status]}{o.role === 'reference' ? ' (REF, referencia conocida)' : ''}</h3>
          <CriteriaTable results={o.requirement_results} map={map} />
          <p>Snapshot v3 (sin recalcular): similitud {o.snapshot_scores.similarity === null ? 'sin score' : formatScore(o.snapshot_scores.similarity)} · confianza {formatScore(o.snapshot_scores.confidence)} · estabilidad {o.snapshot_scores.stability === null ? '—' : formatScore(o.snapshot_scores.stability)}. Factibilidad territorial: pendiente.</p>
          {o.what_would_change.length > 0 && <ul>{o.what_would_change.map((t) => <li key={t}>{t}</li>)}</ul>}
          {o.field_checks.length > 0 && <><b>Verificaciones de campo</b><ul>{o.field_checks.map((t) => <li key={t}>{t}</li>)}</ul></>}
        </section>
      ))}
      {ev.data_request && <><h2>Solicitud de datos</h2><p>{ev.data_request.note}</p><ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}>{s.product} · {s.provider} · {s.landing_url}</li>)}</ul></>}
      <h2>Regla de orden</h2><p>{ev.ordering_rule}</p>
      <h2>Límites</h2><ul>{ev.limits.map((l) => <li key={l}>{l}</li>)}</ul>
      <h2>Evidencias</h2><ul>{ev.evidence.map((e) => <li key={e.evidence_id}><code>{e.evidence_id}</code> — {e.claim} {e.source_url ?? ''}</li>)}</ul>
      <h2>Procedencia y versiones</h2>
      <p>Snapshot {ev.snapshot_version} · perfil {ev.profile.id} {ev.profile.version} · reglas {ev.rules_version}.<br />
        Borrador con IA: {draft ? `sí (${draft.provenance.model}, ${draft.provenance.created_at.slice(0, 10)}, ${draft.provenance.request_id ?? 'sin id'}); el usuario editó o confirmó los requisitos.` : 'no'}.<br />
        Interpretación con IA: {expl ? `sí (${expl.provenance.model}, ${expl.provenance.created_at.slice(0, 10)}, ${expl.provenance.request_id ?? 'sin id'}); solo selecciona referencias.` : 'no'}.</p>
      <p className="pl-mono">solicitud {ev.request_fingerprint} · evaluación {evaluationFingerprint(ev)}</p>
    </article>
  )
}
