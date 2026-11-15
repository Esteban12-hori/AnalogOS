/**
 * Detalle por criterio del riel de métricas (chunk diferido). Lo carga MetricRail.
 *
 *  - 'rail':  acordeón-carrusel (una métrica abierta; ⌃ ⌄ recorren; flechas mueven el foco).
 *  - 'full':  tarjetas completas con su visualización, en el orden del perfil activo.
 *  - 'sheet': pestañas APG + pista deslizable (scroll-snap) con región aria-live propia
 *             (única excepción permitida: patrón APG de carrusel en móvil).
 *
 * Sincroniza `ui.activeCriterionId` (métrica abierta/activa) y `ui.previewCriterionId`
 * (hover o foco) con las líneas y la Lectura. Nunca escribe en el store por cuadro.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { CandidateSite, DataManifest } from '../../domain/contracts'
import { formatArea } from '../../domain/formatting'
import { GLYPH, useReducedMotion, type AppData } from '../../shell/public'
import { uiActions, useUi } from '../../state/ui'
import { buildMetricViews, limitingView } from './buildMetricViews'
import { FadeNumber } from './FadeNumber'
import type { MetricRailProps, MetricView } from './index'
import type { MetricContext } from './metricContext'
import {
  contributionText,
  directionGlyph,
  METRIC_SHORT,
  pendingText,
  qualityText,
  siteShortName,
  similarityText,
  topographicWhy,
  vsMarsText,
  weightText,
} from './metricText'
import { RequirementRow } from './MetricRail'
import { MetricVisual, Ring } from './MetricViz'
import './metrics.css'

export interface MetricDetailsProps extends MetricRailProps {
  context: MetricContext
}

/** Siguiente índice para listas navegables con teclado (null si la tecla no aplica). */
export function nextIndex(key: string, index: number, count: number, orientation: 'vertical' | 'horizontal'): number | null {
  if (count <= 0) return null
  const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  const backward = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  if (key === forward) return Math.min(count - 1, index + 1)
  if (key === backward) return Math.max(0, index - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/** Métrica abierta por defecto: la limitante; si no hay, la de mayor peso. */
export function defaultCriterion(views: readonly MetricView[]): string | null {
  return limitingView(views)?.criterionId ?? views[0]?.criterionId ?? null
}

function domId(siteId: string, suffix: string): string {
  return `metrics-${siteId}-${suffix}`.replace(/[^A-Za-z0-9_-]/g, '-')
}

/** «Proveedor · resolución» del dataset en el manifiesto (null si no aplica). */
export function sourceLine(datasetId: string, manifest: DataManifest | null): string | null {
  if (datasetId === 'none') return null
  const entry = manifest?.datasets.find((dataset) => dataset.dataset_id === datasetId)
  return entry ? `${entry.provider} · ${entry.spatial_resolution}` : datasetId
}

/** Nombre accesible de una fila/pestaña: sin glifos, con la cifra y su significado. */
export function metricAriaLabel(view: MetricView): string {
  const parts = [view.label]
  const pending = pendingText(view)
  if (view.similarity !== null) parts.push(`similitud ${similarityText(view)}`)
  if (pending) parts.push(pending)
  else parts.push(`sector ${view.siteValue.text}`)
  if (view.marsValue) parts.push(`Jezero ${view.marsValue.text}`)
  if (view.rule?.satisfied) parts.push('cumple la regla del perfil')
  if (view.isLimiting) parts.push('limitante')
  return parts.join(', ')
}

/** Escribe `previewCriterionId` solo mientras esta vista lo controla; lo limpia al desmontar. */
function usePreview(): (criterionId: string | null) => void {
  const owned = useRef(false)
  useEffect(() => () => {
    if (owned.current) uiActions.setPreviewCriterion(null)
  }, [])
  return (criterionId) => {
    owned.current = criterionId !== null
    uiActions.setPreviewCriterion(criterionId)
  }
}

/* ---------- Piezas comunes --------------------------------------------------------------- */

function MarsReading({ view }: { view: MetricView }) {
  if (view.marsValue) {
    return (
      <span className="metrics-reading is-mars">
        <small><span aria-hidden="true">{GLYPH.jezero}</span> Jezero</small>
        <strong>{view.marsValue.text}</strong>
      </span>
    )
  }
  if (view.rule) {
    return (
      <span className="metrics-reading is-rule">
        <small><span aria-hidden="true">{GLYPH.rule}</span> Regla</small>
        <strong>{view.rule.satisfied ? <><span aria-hidden="true">{GLYPH.ok}</span> cumple</> : view.rule.satisfied === false ? 'no satura' : 'sin verificar'}</strong>
      </span>
    )
  }
  return (
    <span className="metrics-reading is-none">
      <small>Marte</small>
      <strong>sin medición comparable</strong>
    </span>
  )
}

function Readings({ view }: { view: MetricView }) {
  return (
    <div className="metrics-readings">
      <span className="metrics-reading is-site">
        <small><span aria-hidden="true">{GLYPH.evaluated}</span> Sector</small>
        <strong><FadeNumber value={view.siteValue.raw}>{view.siteValue.text}</FadeNumber></strong>
      </span>
      <MarsReading view={view} />
    </div>
  )
}

function Badges({ view }: { view: MetricView }) {
  if (!view.isLimiting && !view.saturates) return null
  return (
    <span className="metrics-badges">
      {view.isLimiting && <b className="metrics-badge is-limiting">Limitante</b>}
      {view.saturates && <b className="metrics-badge is-saturates">satura</b>}
    </span>
  )
}

interface BodyProps {
  view: MetricView
  context: MetricContext
  site: CandidateSite
  data: AppData
  /** 'full' añade la explicación del método del snapshot. */
  detail: 'rail' | 'full' | 'sheet'
}

function MetricBody({ view, context, site, data, detail }: BodyProps) {
  const item = site.score_breakdown.find((row) => row.criterion_id === view.criterionId) ?? null
  const pending = view.status !== 'valid'
  const excluded = view.weight <= 0 && view.baseWeight > 0
  const candidates = data.snapshot?.candidates ?? []
  const sharedNames = view.sharedRegionalWith.map((id) => {
    const other = candidates.find((candidate) => candidate.site_id === id)
    return other ? siteShortName(other.name) : id
  })
  const source = sourceLine(view.datasetId, data.snapshot?.manifest ?? null)
  const why = topographicWhy(view)
  const requirements = context.mission?.byCriterion.get(view.criterionId) ?? []

  return (
    <div className="metrics-body">
      {requirements.length > 0 && (
        <ul className="metrics-reqs" aria-label={`Requisitos de tu misión sobre ${view.label}`}>
          {requirements.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
        </ul>
      )}
      {pending ? (
        <div className="metrics-pending-box">
          <strong>{pendingText(view)}</strong>
          {item?.explanation && <span>{item.explanation}</span>}
        </div>
      ) : (
        <>
          <Readings view={view} />
          {view.vsMars && <p className="metrics-vs">{vsMarsText(view)}</p>}
          {detail !== 'sheet' && <MetricVisual view={view} />}
        </>
      )}

      {view.isLimiting && view.contribution !== null && (
        <p className="metrics-callout is-limiting">
          <b>Limitante</b> · es el criterio que más baja la similitud v3 de este lugar con el perfil base (aporte {contributionText(view.contribution)}).
        </p>
      )}

      {view.rule && !pending && (
        <div className="metrics-rule">
          <span className="metrics-rule-kicker"><span aria-hidden="true">{GLYPH.rule}</span> Regla del perfil</span>
          <p>{view.rule.text}</p>
          {view.saturates && (
            <p className="metrics-rule-sat">
              <b className="metrics-badge is-saturates">satura</b> cumple la regla · no significa igual a Marte
            </p>
          )}
        </div>
      )}

      {sharedNames.length > 0 && (
        <p className="metrics-callout is-shared">
          Mismo valor y misma fuente que {sharedNames.join(' y ')}: este criterio no distingue entre {sharedNames.length > 1 ? 'estos lugares' : 'ambos lugares'}.
        </p>
      )}

      {detail !== 'sheet' && !pending && why && <p className="metrics-why">{why}</p>}
      {detail === 'full' && !pending && item?.explanation && <p className="metrics-method">{item.explanation}</p>}

      <dl className="metrics-meta">
        <div className="metrics-meta-weight">
          <dt>Peso</dt>
          <dd>
            {excluded ? 'excluido (0 %)' : <FadeNumber value={view.weight}>{weightText(view.weight)}</FadeNumber>}
          </dd>
        </div>
        {!pending && (
          <div className="metrics-meta-quality">
            <dt>Calidad del dato</dt>
            <dd>
              <i className="metrics-quality-bar" aria-hidden="true"><em style={{ transform: `scaleX(${Math.max(0, Math.min(1, view.quality))})` }} /></i>
              {qualityText(view.quality)}
            </dd>
          </div>
        )}
        {source && detail !== 'sheet' && (
          <div className="metrics-meta-source">
            <dt>Fuente</dt>
            <dd>{source}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function RowValues({ view }: { view: MetricView }) {
  const pending = pendingText(view)
  if (pending) return <span className="metrics-row-values is-pending">{pending}</span>
  return (
    <span className="metrics-row-values">
      <span><span aria-hidden="true" className="is-site">{GLYPH.evaluated}</span> {view.siteValue.text}</span>
      {view.marsValue && <span className="is-mars"><span aria-hidden="true">{GLYPH.jezero}</span> {view.marsValue.text}</span>}
      {!view.marsValue && view.rule && <span className="is-rule"><span aria-hidden="true">{GLYPH.rule}</span> {view.rule.satisfied ? GLYPH.ok : 'regla'}</span>}
      {view.vsMars && directionGlyph(view) && <span className="is-dir" aria-hidden="true">{directionGlyph(view)}</span>}
    </span>
  )
}

function Header({ context, site, data, headingId }: { context: MetricContext; site: CandidateSite; data: AppData; headingId: string }) {
  const mars = data.snapshot?.marsReference ?? null
  return (
    <header className="metrics-head">
      <h3 id={headingId}>Métricas vs Jezero</h3>
      <p>
        Todo el sector · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)} · medianas · perfil base
        {context.kind === 'mission' ? ' · con tus requisitos (✓ ✕ ○)' : ''}
      </p>
      <ul className="metrics-legend" aria-label="Leyenda">
        <li><span aria-hidden="true" className="is-site">{GLYPH.evaluated}</span> Sector</li>
        {mars
          ? <li><span aria-hidden="true" className="is-mars">{GLYPH.jezero}</span> Jezero (MOLA)</li>
          : <li className="is-none">Sin referencia marciana en este snapshot</li>}
        <li><span aria-hidden="true" className="is-rule">{GLYPH.rule}</span> Regla del perfil</li>
      </ul>
    </header>
  )
}

function Warnings({ site }: { site: CandidateSite }) {
  const [first, ...rest] = site.warnings
  if (!first) return null
  return (
    <section className="metrics-warnings" aria-label="Advertencias del lugar">
      <p><strong>Advertencia</strong> {first}</p>
      {rest.length > 0 && (
        <details>
          <summary>{rest.length} {rest.length === 1 ? 'verificación pendiente' : 'verificaciones pendientes'}</summary>
          <ul>{rest.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
    </section>
  )
}

function ShowOnMap({ onShowOnMap }: { onShowOnMap?: () => void }) {
  if (!onShowOnMap) return null
  return (
    <button type="button" className="metrics-action" onClick={onShowOnMap}>
      <span aria-hidden="true">{GLYPH.sector}</span> Ver el sector en el mapa
    </button>
  )
}

/* ---------- Variante 'rail': acordeón-carrusel ------------------------------------------- */

function RailAccordion({ views, context, site, data, onShowOnMap }: VariantProps) {
  const active = useUi((state) => state.activeCriterionId)
  const reduced = useReducedMotion()
  const [collapsed, setCollapsed] = useState(false)
  const headers = useRef(new Map<string, HTMLButtonElement>())
  const rows = useRef(new Map<string, HTMLDivElement>())
  const preview = usePreview()
  const activeHere = views.some((view) => view.criterionId === active) ? active : null
  const expanded = activeHere ?? (collapsed ? null : defaultCriterion(views))
  const index = expanded === null ? -1 : views.findIndex((view) => view.criterionId === expanded)

  // Si la métrica activa cambia (aquí, desde las líneas o desde la Lectura), se trae a la vista.
  useEffect(() => {
    if (activeHere === null) return
    rows.current.get(activeHere)?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [activeHere, reduced])

  const open = (criterionId: string | null) => {
    setCollapsed(criterionId === null)
    uiActions.setActiveCriterion(criterionId)
  }
  const step = (delta: 1 | -1) => {
    const at = index < 0 ? (delta > 0 ? 0 : views.length - 1) : Math.max(0, Math.min(views.length - 1, index + delta))
    const target = views[at]
    if (target && at !== index) open(target.criterionId)
  }
  const onHeaderKey = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const next = nextIndex(event.key, at, views.length, 'vertical')
    if (next === null) return
    event.preventDefault()
    const target = views[next]
    if (target) headers.current.get(target.criterionId)?.focus()
  }
  const position = index < 0 ? '—' : `${index + 1} de ${views.length}`

  return (
    <section className="metrics-panel" aria-labelledby={domId(site.site_id, 'h')}>
      <Header context={context} site={site} data={data} headingId={domId(site.site_id, 'h')} />
      <div className="metrics-stepper">
        <button type="button" className="metrics-step" aria-label="Abrir la métrica anterior" aria-disabled={index <= 0} onClick={() => step(-1)}>⌃</button>
        <button type="button" className="metrics-step" aria-label="Abrir la métrica siguiente" aria-disabled={index >= views.length - 1} onClick={() => step(1)}>⌄</button>
        <span className="metrics-position" aria-hidden="true">{position}</span>
      </div>
      <div className="metrics-accordion">
        {views.map((view, at) => {
          const isOpen = view.criterionId === expanded
          const headerId = domId(site.site_id, `${view.criterionId}-h`)
          const panelId = domId(site.site_id, `${view.criterionId}-p`)
          return (
            <div
              key={view.criterionId}
              className="metrics-row"
              data-open={isOpen ? '' : undefined}
              data-limiting={view.isLimiting ? '' : undefined}
              data-pending={pendingText(view) ? '' : undefined}
              data-criterion={view.criterionId}
              ref={(element) => {
                if (element) rows.current.set(view.criterionId, element)
                else rows.current.delete(view.criterionId)
              }}
              onPointerEnter={() => preview(view.criterionId)}
              onPointerLeave={() => preview(null)}
            >
              <h4 className="metrics-row-h">
                <button
                  type="button"
                  id={headerId}
                  className="metrics-row-btn"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={metricAriaLabel(view)}
                  ref={(element) => {
                    if (element) headers.current.set(view.criterionId, element)
                    else headers.current.delete(view.criterionId)
                  }}
                  onClick={() => open(isOpen ? null : view.criterionId)}
                  onKeyDown={(event) => onHeaderKey(event, at)}
                  onFocus={() => preview(view.criterionId)}
                  onBlur={() => preview(null)}
                >
                  <Ring value={view.similarity} size="sm" excluded={view.weight <= 0} />
                  <span className="metrics-row-label">
                    {view.label}
                    <Badges view={view} />
                  </span>
                  <RowValues view={view} />
                </button>
              </h4>
              <div className="metrics-row-panel" id={panelId} role={isOpen ? 'region' : undefined} aria-labelledby={isOpen ? headerId : undefined}>
                <div className="metrics-row-inner">
                  {isOpen && <MetricBody view={view} context={context} site={site} data={data} detail="rail" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Warnings site={site} />
      <ShowOnMap onShowOnMap={onShowOnMap} />
    </section>
  )
}

/* ---------- Variante 'full': tarjetas completas ----------------------------------------- */

function FullCards({ views, context, site, data, onShowOnMap }: VariantProps) {
  const active = useUi((state) => state.activeCriterionId)
  const preview = usePreview()
  const valid = views.filter((view) => view.status === 'valid').length
  return (
    <section className="metrics-panel" aria-labelledby={domId(site.site_id, 'full-h')}>
      <Header context={context} site={site} data={data} headingId={domId(site.site_id, 'full-h')} />
      <p className="metrics-count">{valid}/{views.length} criterios válidos · ordenados por peso del perfil</p>
      <div className="metrics-cards">
        {views.map((view, at) => (
          <article
            key={view.criterionId}
            className="metrics-card"
            data-active={view.criterionId === active ? '' : undefined}
            data-limiting={view.isLimiting ? '' : undefined}
            data-pending={pendingText(view) ? '' : undefined}
            data-criterion={view.criterionId}
            style={{ '--metrics-i': Math.min(at, 6) } as CSSProperties}
            aria-labelledby={domId(site.site_id, `${view.criterionId}-card`)}
            onPointerEnter={() => preview(view.criterionId)}
            onPointerLeave={() => preview(null)}
          >
            <header className="metrics-card-head">
              <div>
                <h4 id={domId(site.site_id, `${view.criterionId}-card`)}>
                  {view.label}
                  <Badges view={view} />
                </h4>
                {view.measure && <p>{view.measure}</p>}
              </div>
              <Ring value={view.similarity} excluded={view.weight <= 0} />
            </header>
            <MetricBody view={view} context={context} site={site} data={data} detail="full" />
          </article>
        ))}
      </div>
      <p className="metrics-note">
        La calidad del dato la asigna el pipeline por tipo de fuente (ADR-003); no es una incertidumbre medida. La similitud por criterio se muestra en entero; el valor exacto está en «Método».
      </p>
      <Warnings site={site} />
      <ShowOnMap onShowOnMap={onShowOnMap} />
    </section>
  )
}

/* ---------- Variante 'sheet': pestañas + pista deslizable (APG) ------------------------- */

const SWIPE_VISIBLE = 0.6
const PROGRAMMATIC_GUARD_MS = 900

function SheetCarousel({ views, context, site, data, onShowOnMap }: VariantProps) {
  const active = useUi((state) => state.activeCriterionId)
  const reduced = useReducedMotion()
  const activeAt = views.findIndex((view) => view.criterionId === active)
  const fallbackId = defaultCriterion(views)
  const index = activeAt >= 0 ? activeAt : Math.max(0, views.findIndex((view) => view.criterionId === fallbackId))
  const track = useRef<HTMLDivElement>(null)
  const slides = useRef<Array<HTMLElement | null>>([])
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const indexRef = useRef(index)
  const fromSwipe = useRef(false)
  const programmatic = useRef<number | null>(null)
  const guardTimer = useRef<number | null>(null)
  const firstScroll = useRef(true)
  const [live, setLive] = useState('')
  useLayoutEffect(() => {
    indexRef.current = index
  }, [index])

  const go = (target: number, source: 'tab' | 'button' | 'swipe') => {
    const view = views[target]
    if (!view) return
    fromSwipe.current = source === 'swipe'
    uiActions.setActiveCriterion(view.criterionId)
    // Con las pestañas el cambio de foco ya lo anuncia: la región viva solo habla por botón o gesto.
    if (source !== 'tab') setLive(`${view.label}, ${target + 1} de ${views.length}`)
  }

  // La pista sigue a la métrica activa (pestaña, botón, líneas o Lectura), salvo si la movió el dedo.
  useLayoutEffect(() => {
    const element = track.current
    const slide = slides.current[index]
    if (!element || !slide) return
    if (fromSwipe.current) {
      fromSwipe.current = false
      return
    }
    const left = slide.offsetLeft - (element.clientWidth - slide.clientWidth) / 2
    if (Math.abs(element.scrollLeft - left) < 2) return
    programmatic.current = index
    if (guardTimer.current !== null) window.clearTimeout(guardTimer.current)
    guardTimer.current = window.setTimeout(() => {
      programmatic.current = null
      guardTimer.current = null
    }, PROGRAMMATIC_GUARD_MS)
    const behavior = reduced || firstScroll.current ? 'auto' : 'smooth'
    firstScroll.current = false
    if (typeof element.scrollTo === 'function') element.scrollTo({ left, behavior })
    else element.scrollLeft = left
  }, [index, reduced])

  useEffect(() => () => {
    if (guardTimer.current !== null) window.clearTimeout(guardTimer.current)
  }, [])

  // Deslizar con el dedo cambia la métrica activa al cruzar el 60 % visible (no por cuadro).
  useEffect(() => {
    const root = track.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < SWIPE_VISIBLE) continue
        const at = Number((entry.target as HTMLElement).dataset.index)
        if (!Number.isInteger(at)) continue
        if (programmatic.current !== null) {
          if (at === programmatic.current) programmatic.current = null
          continue
        }
        if (at !== indexRef.current) go(at, 'swipe')
      }
    }, { root, threshold: [SWIPE_VISIBLE] })
    for (const slide of slides.current) if (slide) observer.observe(slide)
    return () => observer.disconnect()
    // `go` solo usa refs, setLive y acciones del store; se reobserva cuando cambian las vistas.
  }, [views])

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextIndex(event.key, index, views.length, 'horizontal')
    if (next === null) return
    event.preventDefault()
    go(next, 'tab')
    tabs.current[next]?.focus()
  }
  const label = `Métricas de ${siteShortName(site.name)} vs Jezero`

  return (
    <section className="metrics-carousel" aria-roledescription="carrusel" aria-label={label}>
      <div className="metrics-tabs" role="tablist" aria-label="Elegir métrica" onKeyDown={onTabKey} style={{ '--metrics-n': views.length } as CSSProperties}>
        {views.map((view, at) => {
          const selected = at === index
          return (
            <button
              key={view.criterionId}
              type="button"
              role="tab"
              id={domId(site.site_id, `${view.criterionId}-tab`)}
              aria-selected={selected}
              aria-controls={domId(site.site_id, `${view.criterionId}-slide`)}
              aria-label={metricAriaLabel(view)}
              tabIndex={selected ? 0 : -1}
              className="metrics-tab"
              data-limiting={view.isLimiting ? '' : undefined}
              data-pending={pendingText(view) ? '' : undefined}
              ref={(element) => {
                tabs.current[at] = element
              }}
              onClick={() => go(at, 'tab')}
            >
              <Ring value={view.similarity} size="sm" excluded={view.weight <= 0} />
              <span aria-hidden="true">{METRIC_SHORT[view.criterionId] ?? view.label.slice(0, 3)}</span>
            </button>
          )
        })}
      </div>
      <p className="metrics-caption">
        Todo el sector · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)} · medianas · <span aria-hidden="true">{GLYPH.evaluated}</span> sector <span aria-hidden="true">{GLYPH.jezero}</span> Jezero <span aria-hidden="true">{GLYPH.rule}</span> regla
      </p>
      <div className="metrics-track" ref={track} tabIndex={-1}>
        {views.map((view, at) => {
          const selected = at === index
          return (
            <article
              key={view.criterionId}
              className="metrics-slide"
              role="tabpanel"
              id={domId(site.site_id, `${view.criterionId}-slide`)}
              aria-roledescription="métrica"
              aria-labelledby={domId(site.site_id, `${view.criterionId}-tab`)}
              aria-hidden={!selected}
              inert={!selected}
              data-index={at}
              data-active={selected ? '' : undefined}
              data-pending={pendingText(view) ? '' : undefined}
              ref={(element) => {
                slides.current[at] = element
              }}
            >
              <header className="metrics-slide-head">
                <h4>{view.label}</h4>
                <Badges view={view} />
              </header>
              <div className="metrics-slide-main">
                <Ring value={view.similarity} excluded={view.weight <= 0} />
                <MetricBody view={view} context={context} site={site} data={data} detail="sheet" />
              </div>
            </article>
          )
        })}
      </div>
      <div className="metrics-stepper is-sheet">
        <button type="button" className="metrics-step" aria-label="Métrica anterior" aria-disabled={index <= 0} onClick={() => index > 0 && go(index - 1, 'button')}>◀</button>
        <span className="metrics-position" aria-hidden="true">{index + 1} de {views.length}</span>
        <button type="button" className="metrics-step" aria-label="Métrica siguiente" aria-disabled={index >= views.length - 1} onClick={() => index < views.length - 1 && go(index + 1, 'button')}>▶</button>
      </div>
      {/* Excepción documentada (BUILD_CONTRACTS §1.8): carrusel APG en móvil con su propia región. */}
      <p className="metrics-sr" aria-live="polite" aria-atomic="true">{live}</p>
      <ShowOnMap onShowOnMap={onShowOnMap} />
    </section>
  )
}

/* ---------- Entrada --------------------------------------------------------------------- */

interface VariantProps {
  views: MetricView[]
  context: MetricContext
  site: CandidateSite
  data: AppData
  onShowOnMap?: () => void
}

export default function MetricDetails({ data, site, variant, context, onShowOnMap }: MetricDetailsProps): ReactNode {
  const views = useMemo(() => buildMetricViews(context.input), [context])
  if (views.length === 0) {
    return <p className="metrics-note">Este lugar no trae desglose por criterio en el snapshot.</p>
  }
  const props: VariantProps = { views, context, site, data, onShowOnMap }
  if (variant === 'full') return <FullCards {...props} />
  if (variant === 'sheet') return <SheetCarousel {...props} />
  return <RailAccordion {...props} />
}
