/**
 * Per-criterion detail of the metrics rail (deferred chunk). Loaded by MetricRail.
 *
 *  - 'rail':  accordion-carousel (one open metric; ⌃ ⌄ cycle through; arrow keys move focus).
 *  - 'full':  full cards with their visualization, in the order of the active profile.
 *  - 'sheet': APG tabs + swipeable track (scroll-snap) with its own aria-live region
 *             (the only allowed exception: APG carousel pattern on mobile).
 *
 * Synchronizes `ui.activeCriterionId` (open/active metric) and `ui.previewCriterionId`
 * (hover or focus) with the lines and the Reading. Never writes to the store per frame.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { CandidateSite, DataManifest } from '../../domain/contracts'
import { formatArea } from '../../domain/formatting'
import { criterionExplanation } from '../../domain/geologyCopy'
import { displaySource } from '../../i18n/sourceText'
import { GLYPH, hasGeologyFor, useReducedMotion, type AppData } from '../../shell/public'
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

/** Next index for keyboard-navigable lists (null if the key does not apply). */
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

/** Metric open by default: the limiting one; if there is none, the one with the highest weight. */
export function defaultCriterion(views: readonly MetricView[]): string | null {
  return limitingView(views)?.criterionId ?? views[0]?.criterionId ?? null
}

function domId(siteId: string, suffix: string): string {
  return `metrics-${siteId}-${suffix}`.replace(/[^A-Za-z0-9_-]/g, '-')
}

/** "Provider · resolution" of the dataset in the manifest (null if not applicable). */
export function sourceLine(datasetId: string, manifest: DataManifest | null): string | null {
  if (datasetId === 'none') return null
  const entry = manifest?.datasets.find((dataset) => dataset.dataset_id === datasetId)
  return entry ? `${displaySource(entry.provider)} · ${displaySource(entry.spatial_resolution)}` : datasetId
}

/** Accessible name of a row/tab: no glyphs, with the figure and its meaning. */
export function metricAriaLabel(view: MetricView): string {
  const parts = [view.label]
  const pending = pendingText(view)
  if (view.similarity !== null) parts.push(`similarity ${similarityText(view)}`)
  if (pending) parts.push(pending)
  else parts.push(`sector ${view.siteValue.text}`)
  if (view.marsValue) parts.push(`Jezero ${view.marsValue.text}`)
  if (view.rule?.satisfied) parts.push('meets the profile rule')
  if (view.isLimiting) parts.push('limiting factor')
  return parts.join(', ')
}

/** Writes `previewCriterionId` only while this view controls it; clears it on unmount. */
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
        <small><span aria-hidden="true">{GLYPH.rule}</span> Rule</small>
        <strong>{view.rule.satisfied ? <><span aria-hidden="true">{GLYPH.ok}</span> met</> : view.rule.satisfied === false ? 'does not saturate' : 'not verified'}</strong>
      </span>
    )
  }
  return (
    <span className="metrics-reading is-none">
      <small>Mars</small>
      <strong>no comparable measurement</strong>
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
      {view.isLimiting && <b className="metrics-badge is-limiting">Limiting</b>}
      {view.saturates && <b className="metrics-badge is-saturates">saturates</b>}
    </span>
  )
}

interface BodyProps {
  view: MetricView
  context: MetricContext
  site: CandidateSite
  data: AppData
  /** 'full' adds the explanation of the snapshot's method. */
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
        <ul className="metrics-reqs" aria-label={`Your mission requirements on ${view.label}`}>
          {requirements.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
        </ul>
      )}
      {pending ? (
        <div className="metrics-pending-box">
          <strong>{pendingText(view)}</strong>
          {/* With the official geological context of the sector, the geological criterion says it is available but uncalibrated (M9). */}
          {item?.explanation && <span>{criterionExplanation(view.criterionId, item.explanation, hasGeologyFor(data, site.site_id))}</span>}
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
          <b>Limiting factor</b> · the criterion that lowers this place's v3 similarity the most with the base profile (contribution {contributionText(view.contribution)}).
        </p>
      )}

      {view.rule && !pending && (
        <div className="metrics-rule">
          <span className="metrics-rule-kicker"><span aria-hidden="true">{GLYPH.rule}</span> Profile rule</span>
          <p>{view.rule.text}</p>
          {view.saturates && (
            <p className="metrics-rule-sat">
              <b className="metrics-badge is-saturates">saturates</b> meets the rule · does not mean equal to Mars
            </p>
          )}
        </div>
      )}

      {sharedNames.length > 0 && (
        <p className="metrics-callout is-shared">
          Same value and same source as {sharedNames.join(' and ')}: this criterion does not distinguish between {sharedNames.length > 1 ? 'these places' : 'both places'}.
        </p>
      )}

      {detail !== 'sheet' && !pending && why && <p className="metrics-why">{why}</p>}
      {detail === 'full' && !pending && item?.explanation && <p className="metrics-method">{displaySource(item.explanation)}</p>}

      <dl className="metrics-meta">
        <div className="metrics-meta-weight">
          <dt>Weight</dt>
          <dd>
            {excluded ? 'excluded (0%)' : <FadeNumber value={view.weight}>{weightText(view.weight)}</FadeNumber>}
          </dd>
        </div>
        {!pending && (
          <div className="metrics-meta-quality">
            <dt>Data quality</dt>
            <dd>
              <i className="metrics-quality-bar" aria-hidden="true"><em style={{ transform: `scaleX(${Math.max(0, Math.min(1, view.quality))})` }} /></i>
              {qualityText(view.quality)}
            </dd>
          </div>
        )}
        {source && detail !== 'sheet' && (
          <div className="metrics-meta-source">
            <dt>Source</dt>
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
      {!view.marsValue && view.rule && <span className="is-rule"><span aria-hidden="true">{GLYPH.rule}</span> {view.rule.satisfied ? GLYPH.ok : 'rule'}</span>}
      {view.vsMars && directionGlyph(view) && <span className="is-dir" aria-hidden="true">{directionGlyph(view)}</span>}
    </span>
  )
}

function Header({ context, site, data, headingId }: { context: MetricContext; site: CandidateSite; data: AppData; headingId: string }) {
  const mars = data.snapshot?.marsReference ?? null
  return (
    <header className="metrics-head">
      <h3 id={headingId}>Metrics vs Jezero</h3>
      <p>
        Whole sector · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)} · medians · base profile
        {context.kind === 'mission' ? ' · with your requirements (✓ ✕ ○)' : ''}
      </p>
      <ul className="metrics-legend" aria-label="Legend">
        <li><span aria-hidden="true" className="is-site">{GLYPH.evaluated}</span> Sector</li>
        {mars
          ? <li><span aria-hidden="true" className="is-mars">{GLYPH.jezero}</span> Jezero (MOLA)</li>
          : <li className="is-none">No Martian reference in this snapshot</li>}
        <li><span aria-hidden="true" className="is-rule">{GLYPH.rule}</span> Profile rule</li>
      </ul>
    </header>
  )
}

function Warnings({ site }: { site: CandidateSite }) {
  const [first, ...rest] = site.warnings
  if (!first) return null
  return (
    <section className="metrics-warnings" aria-label="Place warnings">
      <p><strong>Warning</strong> {displaySource(first)}</p>
      {rest.length > 0 && (
        <details>
          <summary>{rest.length} {rest.length === 1 ? 'pending check' : 'pending checks'}</summary>
          <ul>{rest.map((warning) => <li key={warning}>{displaySource(warning)}</li>)}</ul>
        </details>
      )}
    </section>
  )
}

function ShowOnMap({ onShowOnMap }: { onShowOnMap?: () => void }) {
  if (!onShowOnMap) return null
  return (
    <button type="button" className="metrics-action" onClick={onShowOnMap}>
      <span aria-hidden="true">{GLYPH.sector}</span> Show the sector on the map
    </button>
  )
}

/* ---------- 'rail' variant: accordion-carousel ------------------------------------------- */

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

  // If the active metric changes (here, from the lines or from the Reading), it is brought into view.
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
  const position = index < 0 ? '—' : `${index + 1} of ${views.length}`

  return (
    <section className="metrics-panel" aria-labelledby={domId(site.site_id, 'h')}>
      <Header context={context} site={site} data={data} headingId={domId(site.site_id, 'h')} />
      <div className="metrics-stepper">
        <button type="button" className="metrics-step" aria-label="Open the previous metric" aria-disabled={index <= 0} onClick={() => step(-1)}>⌃</button>
        <button type="button" className="metrics-step" aria-label="Open the next metric" aria-disabled={index >= views.length - 1} onClick={() => step(1)}>⌄</button>
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
      <p className="metrics-count">{valid}/{views.length} valid criteria · ordered by profile weight</p>
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
        Data quality is assigned by the pipeline per source type (ADR-003); it is not a measured uncertainty. Per-criterion similarity is shown as a whole number; the exact value is in “Method”.
      </p>
      <Warnings site={site} />
      <ShowOnMap onShowOnMap={onShowOnMap} />
    </section>
  )
}

/* ---------- 'sheet' variant: tabs + swipeable track (APG) ------------------------- */

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
    // With tabs, the focus change is already announced: the live region speaks only on button or gesture.
    if (source !== 'tab') setLive(`${view.label}, ${target + 1} of ${views.length}`)
  }

  // The track follows the active metric (tab, button, lines or Reading), unless the finger moved it.
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

  // Swiping with a finger changes the active metric when crossing the 60 % visible (not per frame).
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
    // `go` only uses refs, setLive and store actions; it re-observes when the views change.
  }, [views])

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextIndex(event.key, index, views.length, 'horizontal')
    if (next === null) return
    event.preventDefault()
    go(next, 'tab')
    tabs.current[next]?.focus()
  }
  const label = `Metrics of ${siteShortName(site.name)} vs Jezero`

  return (
    <section className="metrics-carousel" aria-roledescription="carousel" aria-label={label}>
      <div className="metrics-tabs" role="tablist" aria-label="Choose a metric" onKeyDown={onTabKey} style={{ '--metrics-n': views.length } as CSSProperties}>
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
        Whole sector · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)} · medians · <span aria-hidden="true">{GLYPH.evaluated}</span> sector <span aria-hidden="true">{GLYPH.jezero}</span> Jezero <span aria-hidden="true">{GLYPH.rule}</span> rule
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
              aria-roledescription="metric"
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
        <button type="button" className="metrics-step" aria-label="Previous metric" aria-disabled={index <= 0} onClick={() => index > 0 && go(index - 1, 'button')}>◀</button>
        <span className="metrics-position" aria-hidden="true">{index + 1} of {views.length}</span>
        <button type="button" className="metrics-step" aria-label="Next metric" aria-disabled={index >= views.length - 1} onClick={() => index < views.length - 1 && go(index + 1, 'button')}>▶</button>
      </div>
      {/* Documented exception (BUILD_CONTRACTS §1.8): APG carousel on mobile with its own region. */}
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
    return <p className="metrics-note">This place has no per-criterion breakdown in the snapshot.</p>
  }
  const props: VariantProps = { views, context, site, data, onShowOnMap }
  if (variant === 'full') return <FullCards {...props} />
  if (variant === 'sheet') return <SheetCarousel {...props} />
  return <RailAccordion {...props} />
}
