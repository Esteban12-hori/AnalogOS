/**
 * Riel de métricas (docs/UX_REDESIGN.md §3.6; ADR-008/009/013). Tres variantes:
 *  - 'rail'  (≥1100, 340–380 px): cifras del lugar + acordeón-carrusel por criterio.
 *  - 'full'  (ficha de 520 px o S2): cifras del lugar + tarjetas completas con visualización.
 *  - 'sheet' (<1100, S1): «‹ % ›» para cambiar de lugar + pestañas y pista deslizable.
 *
 * Este archivo va en el chunk principal y pinta al instante lo que no depende del detalle:
 * similitud, confianza, estabilidad y factibilidad, cada una por separado (nunca se combinan),
 * siempre del snapshot. En Misión con evaluación añade el estado del lugar y la capa de
 * requisitos (✓ cumple · ✕ no cumple · ○ no evaluable) de la evaluación del equipo.
 * El detalle por criterio (MetricDetails) se carga en diferido.
 */
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore, formatWhole } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, REQUIREMENT_MARK, REQUIREMENT_STATUS_LABEL, preferencesText } from '../../domain/missionView'
import { fmtObserved } from '../../mission/format'
import type { RequirementResult } from '../../mission/types'
import { announce, GLYPH, type AppData } from '../../shell/public'
import { uiActions } from '../../state/ui'
import { FadeNumber } from './FadeNumber'
import type { MetricRailProps } from './index'
import { useMetricContext, type MetricContext, type MissionLayer } from './metricContext'
import { coverageText, siteShortName, siteSimilarityText } from './summaryText'
import './metric-rail.css'

const loadDetails = () => import('./MetricDetails')
const MetricDetails = lazy(loadDetails)

/** Precarga el detalle cuando la página terminó de cargar y el hilo está libre. */
function preloadWhenIdle(): void {
  const idle = (callback: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(callback, { timeout: 4000 })
    else window.setTimeout(callback, 1500)
  }
  const start = () => idle(() => void loadDetails().catch(() => undefined))
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') preloadWhenIdle()

class DetailsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    void info
    console.error('features/metrics: no se pudo cargar el detalle por criterio', error)
  }
  render(): ReactNode {
    if (this.state.failed) {
      return (
        <p className="metrics-note metrics-error" role="alert">
          <span aria-hidden="true">{GLYPH.fail}</span> No se pudo cargar el detalle por criterio. Las cifras del lugar siguen siendo válidas; recarga la página para reintentar.
        </p>
      )
    }
    return this.props.children
  }
}

function DetailsPending() {
  return <p className="metrics-note metrics-pending" aria-busy="true">Cargando el detalle por criterio…</p>
}

function profileLine(context: MetricContext): string {
  const calibration = context.profileStatus === 'needs_calibration' ? ' · necesita calibración' : ''
  return `${context.profileLabel.replace(/^perfil/, 'Perfil')}${calibration} · similitud v3 del snapshot`
}

/** «Candidato · Chile» / «REF · Referencia conocida · Chile» y el enlace a la pestaña Origen. */
function RoleLine({ context }: { context: MetricContext }) {
  const country = context.country ? countryLabels[context.country] : null
  return (
    <p className="metrics-role">
      {context.role === 'reference' ? <b className="metrics-ref">REF · Referencia conocida</b> : <span>Candidato de la búsqueda</span>}
      {country && <span> · {country}</span>}
      <span> · Factibilidad territorial: pendiente</span>
    </p>
  )
}

/** Una fila de requisito: ✓/✕/○, lo exigido, lo observado y el motivo (todo de la evaluación). */
export function RequirementRow({ result }: { result: RequirementResult }) {
  return (
    <li className="metrics-req" data-status={result.status}>
      <span className="metrics-req-mark" aria-hidden="true">{REQUIREMENT_MARK[result.status]}</span>
      <span className="metrics-req-body">
        <b>{result.label}</b> <small>({result.importance === 'critical' ? 'imprescindible' : 'preferencia'} · {REQUIREMENT_STATUS_LABEL[result.status]})</small>
        <span className="metrics-req-line">Exigido: {result.required}{result.kind === 'measurable' ? ` · observado: ${fmtObserved(result.observed_value, result.observed_unit)}` : ''}</span>
        <span className="metrics-req-reason">{result.reason}</span>
      </span>
    </li>
  )
}

/** Estado del lugar en la evaluación y requisitos del sitio (área, país) y no medidos. */
function MissionSummary({ layer, rank, reference }: { layer: MissionLayer; rank: number | null; reference: boolean }) {
  const option = layer.option
  const preferences = option ? preferencesText(option) : null
  return (
    <section className="metrics-mission" aria-label="Resultado de tu misión" data-stale={layer.stale ? '' : undefined}>
      <p className="metrics-mission-status" data-status={layer.status}>
        {rank !== null && <b>#{rank} · </b>}
        {reference && <b>REF · </b>}
        {MISSION_STATUS_LABEL[layer.status]}
        {preferences && <small> · {preferences}</small>}
      </p>
      {layer.stale && <p className="metrics-note">Editó la prueba: este estado es de la evaluación anterior hasta que confirme y evalúe de nuevo.</p>}
      {layer.siteRows.length + layer.unmeasured.length > 0 && (
        <ul className="metrics-reqs" aria-label="Requisitos del sitio y sin medición">
          {layer.siteRows.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
          {layer.unmeasured.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
        </ul>
      )}
      <p className="metrics-coverage">Cálculo determinista · reglas {layer.rulesVersion} · los pesos del riel son los del snapshot</p>
    </section>
  )
}

/** Cifras del lugar (riel y ficha): similitud · confianza · estabilidad · factibilidad. */
function Summary({ context, site }: { context: MetricContext; site: CandidateSite }) {
  const figures = context.figures
  const scored = figures.similarity !== null
  const confidence = figures.confidence
  return (
    <section className="metrics-summary" aria-label="Cifras del lugar">
      <div className="metrics-score">
        <span className="metrics-score-glyph" aria-hidden="true">{scored ? GLYPH.evaluated : GLYPH.insufficient}</span>
        <strong className={scored ? 'metrics-score-value' : 'metrics-score-value is-empty'}>
          <FadeNumber value={figures.similarity}>{siteSimilarityText(figures)}</FadeNumber>
          {scored && <small> %</small>}
        </strong>
        <span className="metrics-score-label">
          similitud v3{context.kind === 'base' && context.rank !== null ? ` · #${context.rank} de ${context.rankedCount}` : ''}
          {context.mission?.status === 'objetivo_no_soportado' ? ' · perfil rover Marte · no aplica a este objetivo' : context.kind === 'mission' ? ' · sin recalcular' : ''}
        </span>
      </div>
      {figures.similarityState === 'insufficient' && (
        <p className="metrics-note">
          Peso válido bajo el mínimo del perfil ({formatWhole(context.minimumValidWeight * 100)} %): no se calcula un % para este lugar.
        </p>
      )}
      <p className="metrics-profile">{profileLine(context)}</p>
      <RoleLine context={context} />
      {context.mission && <MissionSummary layer={context.mission} rank={context.rank} reference={context.role === 'reference'} />}
      <dl className="metrics-figures">
        <div className="metrics-fig metrics-fig-confidence">
          <dt>Confianza</dt>
          <dd>{confidence === null ? <span className="metrics-fig-pending">sin calcular</span> : <FadeNumber value={confidence}>{formatScore(confidence)}</FadeNumber>}</dd>
          {confidence !== null && <i className="metrics-confidence-bar" aria-hidden="true"><em style={{ transform: `scaleX(${Math.max(0, Math.min(1, confidence / 100))})` }} /></i>}
        </div>
        <div className="metrics-fig">
          <dt>Estabilidad</dt>
          <dd>{figures.stability === null ? <span className="metrics-fig-pending">sin calcular</span> : <FadeNumber value={figures.stability}>{formatScore(figures.stability)}</FadeNumber>}</dd>
        </div>
        <div className="metrics-fig">
          <dt>Factibilidad</dt>
          <dd>{feasibilityLabels[figures.feasibility]}</dd>
        </div>
      </dl>
      <p className="metrics-coverage">
        {coverageText(figures)} · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)}
      </p>
    </section>
  )
}

/** S1: «‹ #1 de 3 · 75,7 % ›» para recorrer los lugares en el orden vigente. */
function SheetSummary({ context, site, data }: { context: MetricContext; site: CandidateSite; data: AppData }) {
  const figures = context.figures
  const order = context.order
  const index = order.indexOf(site.site_id)
  const candidates = data.snapshot?.candidates ?? []
  const byId = (id: string | undefined) => (id === undefined ? null : candidates.find((candidate) => candidate.site_id === id) ?? null)
  const previous = index > 0 ? byId(order[index - 1]) : null
  const next = index >= 0 ? byId(order[index + 1]) : null
  const go = (target: CandidateSite | null) => {
    if (!target) return
    uiActions.select(target.site_id, 'evaluated')
    const position = order.indexOf(target.site_id) + 1
    announce(`${siteShortName(target.name)}, lugar ${position} de ${order.length}`)
  }
  const confidence = figures.confidence
  const stability = figures.stability
  return (
    <section className="metrics-summary metrics-summary-sheet" aria-label="Cifras del lugar">
      <div className="metrics-sitenav" role="group" aria-label="Cambiar de lugar">
        <button
          type="button"
          className="metrics-step"
          aria-disabled={previous === null}
          aria-label={previous ? `Lugar anterior: ${siteShortName(previous.name)}` : 'No hay lugar anterior'}
          onClick={() => go(previous)}
        >
          ‹
        </button>
        <p className="metrics-sitenav-score">
          <strong>
            {context.rank !== null && <span className="metrics-rank">#{context.rank}{context.kind === 'base' ? ` de ${context.rankedCount}` : ''} · </span>}
            {/* La REF nunca aparece sin su rótulo: en Misión el motor del equipo puede darle puesto. */}
            {context.role === 'reference' && <span className="metrics-rank">REF · </span>}
            <FadeNumber value={figures.similarity}>{siteSimilarityText(figures)}</FadeNumber>
            {figures.similarity !== null && ' %'}
          </strong>
          <small>{context.mission ? MISSION_STATUS_LABEL[context.mission.status] : 'similitud v3 · perfil base'}</small>
        </p>
        <button
          type="button"
          className="metrics-step"
          aria-disabled={next === null}
          aria-label={next ? `Lugar siguiente: ${siteShortName(next.name)}` : 'No hay lugar siguiente'}
          onClick={() => go(next)}
        >
          ›
        </button>
      </div>
      <p className="metrics-figline">
        <span>Confianza {confidence === null ? 'sin calcular' : formatScore(confidence)}</span>
        <span>Estabilidad {stability === null ? 'sin calcular' : formatScore(stability)}</span>
        <span>{feasibilityLabels[figures.feasibility]}</span>
        <span>Factibilidad territorial: pendiente</span>
      </p>
    </section>
  )
}

export function MetricRail({ data, site, variant, onShowOnMap }: MetricRailProps) {
  const context = useMetricContext(data, site)
  // Tras una edición, la capa de Misión queda a --o-busy (sin inert) hasta reevaluar.
  const busy = context?.mission?.stale === true
  if (!context) {
    return <p className="metrics-note" aria-busy="true">Cargando snapshot validado…</p>
  }
  return (
    <div className="metrics" data-variant={variant} data-busy={busy ? '' : undefined} aria-busy={busy || undefined}>
      {variant === 'sheet' ? <SheetSummary context={context} site={site} data={data} /> : <Summary context={context} site={site} />}
      <DetailsBoundary>
        <Suspense fallback={<DetailsPending />}>
          <MetricDetails data={data} site={site} variant={variant} context={context} onShowOnMap={onShowOnMap} />
        </Suspense>
      </DetailsBoundary>
    </div>
  )
}
