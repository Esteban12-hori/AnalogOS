import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection, PrecedentCatalog, ReferenceAnalog, SearchResults } from '../../domain/contracts'
import { rankMap, splitByRole } from '../../domain/discovery'
import { shortCandidateName } from '../../domain/formatting'
import { loadBasemaps, sourceIn, type ActiveSource, type Basemap, type BasemapManifest, type ContextPreview } from '../../data/loadBasemaps'
import type { VisualContextState } from '../../data/loadVisualContext'
import { useLocale, type Locale } from '../../i18n'
import { tCommon } from '../../i18n/messages/common'
import { tGlobe } from '../../i18n/messages/globe'
import { announce, GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { uiActions, useUi } from '../../state/ui'
import { useReferenceAnalogs } from '../places'
import { CandidateMap } from './CandidateMap'
import type { FlatCommand } from './CandidateFlatMap'
import type { FlatHandoff, FlyRequest, GlobeView, StageSelection } from './CandidateGlobe'
import type { MarkerInput, MarkerModel } from './markers'
import { selectionCamera } from './selectionCamera'
import { publishStageFrame } from './stageBridge'
import './MapStage.css'

import { GLOBE_TEXTURE_KM, hideBootStage, MAPLIBRE_WORKER_URL, prefetchToCache, whenIdle } from '../../data/preload'
import { flatThresholds, type ViewInsets } from '../../domain/mapZoom'
import { SIMILARITY_SCALE } from '../../domain/similarityScale'

// three.js and MapLibre are in separate chunks, but they are requested immediately: the globe when this
// module is evaluated (in parallel with the snapshot) and the 2D map as soon as the browser becomes idle.
const globeModule = import('./CandidateGlobe')
let flatModule: ReturnType<typeof importFlat> | null = null
function importFlat() {
  return import('./CandidateFlatMap')
}
const loadFlat = () => (flatModule ??= importFlat())
const CandidateGlobe = lazy(() => globeModule)
const CandidateFlatMap = lazy(loadFlat)

/** Center with which the invisible 2D map is mounted before it is used (central Atacama). */
const PREWARM_CENTER = { lon: -68.6, lat: -25 }
/** Step of the + / − buttons (zoom levels): the same as the keyboard. */
const ZOOM_STEP = 0.5
const NO_ANALOGS: readonly ReferenceAnalog[] = []

function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState(read)
  useEffect(() => {
    const onResize = () => setSize(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export type StageMilestone = 'globe' | 'texture'

export interface MapStageProps {
  candidates: CandidateSite[]
  /** Context outline (v3: Chile and Argentina; historical: Chile). Reference only, not an official boundary. */
  outline: GeoJsonFeatureCollection
  /** Search and background information from the v3 snapshot (used only by the SVG map without WebGL). */
  search?: SearchResults | null
  precedents?: PrecedentCatalog | null
  /** null = no selection (Explore starts this way). Only evaluated sectors (● ○). */
  selectedId: string | null
  onSelect: (siteId: string) => void
  /**
   * Settled margins covered by the UI (rail, dock, sheet, panel). They shift the framing
   * (globe: setViewOffset x/y; MapLibre: setPadding) without changing the scale.
   */
  insets: ViewInsets
  /** Base margins of the section (shell/stageGeometry.js): global framing, 2D thresholds and poster. */
  baseInsets: ViewInsets
  /** Sentinel-2 views per candidate (ADR-005): the best image over each polygon. */
  visual: VisualContextState
  /** Changes to request "view the selected sector on the map" from outside (detail card). */
  focusSignal: number
  /** true in S2 or with the tab hidden: the globe does not draw (frameloop "never"). */
  paused?: boolean
  /** Real startup milestones for the log (features/boot). */
  onMilestone?: (milestone: StageMilestone, status: 'ok' | 'error') => void
  /** Extra controls in the legend strip (e.g. the "Lines" switch). */
  hudSlot?: ReactNode
  /** Attribution of the data that produces the % values (always visible, at the foot of the strip). */
  creditSlot?: ReactNode
  /**
   * Selection of a ◆ analog from the stage. Optional: by default it writes
   * `ui.selection` with `kind: 'reference'`.
   */
  onSelectReference?: (analogId: string) => void
}

/** Converts the validated Sentinel-2 views into 2D map layers. */
export function contextLayers(visual: VisualContextState, previews: ContextPreview[] = []): Basemap[] {
  if (visual.status !== 'ready') return []
  const { index } = visual
  // The v3 images live in their own directory; the historical indexes, in visual-context/.
  const dir = index.snapshot_version === 'science-screening-v3' ? 'visual-context-v3' : 'visual-context'
  return index.sites.map((site) => {
    // Lightweight WebP only if it was derived from this same PNG (same SHA-256); otherwise, the original.
    const preview = previews.find((item) => item.site_id === site.site_id && item.source_sha256 === site.sha256)
    return {
    id: `s2-${site.site_id}`,
    kind: 'context' as const,
    label: `Copernicus Sentinel-2 L2A · ≈${Math.round(site.approx_meters_per_pixel)} m`,
    bounds: site.bbox,
    image: preview?.image ?? `${dir}/${site.image}`,
    layers: [index.source.collection],
    dates: [],
    resolution_m: site.approx_meters_per_pixel,
    gap_fraction: 0,
    source: `${index.product.period_label} · contexto revisado (ADR-005)`,
    }
  })
}

type Mode = 'globe' | 'flat'

const globeSource = (locale: Locale): { label: string; detail: string } => ({
  label: `NASA Blue Marble · ~${GLOBE_TEXTURE_KM} km`,
  detail: tGlobe.in(locale)('source.globeDetail'),
})

const GLOBE_SOURCE: ActiveSource = { id: 'globe', ...globeSource('en'), describe: globeSource }

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

class StageErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function StageLoading({ text }: { text: string }) {
  return (
    <div className="globe-loading globe-loading-page">
      <span className="loader" aria-hidden="true" />
      {text}
    </div>
  )
}

/** Margins as CSS variables: the legend, the controls and the focus are placed in the free area. */
function insetVars(insets: ViewInsets): CSSProperties {
  return {
    ['--inset-top' as string]: `${insets.top}px`,
    ['--inset-right' as string]: `${insets.right}px`,
    ['--inset-bottom' as string]: `${insets.bottom}px`,
    ['--inset-left' as string]: `${insets.left}px`,
  }
}

/** Short name of the place for the chip "Center on ‹#1›". */
function shortName(name: string, locale: Locale): string {
  return shortCandidateName(name, locale).split(' — ')[0] ?? name
}

const selectReference = (analogId: string) => uiActions.select(analogId, 'reference')
const touchCamera = () => uiActions.touchCamera()

/**
 * Site background stage: a 3D globe that, when zoomed in, automatically yields to a 2D map
 * with official NASA imagery, and returns to the globe when zooming out. ●◆○ markers with clustering,
 * camera flight, keyboard and per-frame channel for the Tesla lines (increment 4).
 * Without WebGL (ADR-001) the local SVG map is used.
 */
export function MapStage({
  candidates,
  outline,
  search = null,
  precedents = null,
  selectedId,
  onSelect,
  insets,
  baseInsets,
  visual,
  focusSignal,
  paused = false,
  onMilestone,
  hudSlot,
  creditSlot,
  onSelectReference = selectReference,
}: MapStageProps) {
  // Stage texts (legend, sources, controls) and marker models follow the language (docs/I18N.md §4.5).
  const locale = useLocale()
  const t = tGlobe.in(locale)
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode>('globe')
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
  const [flatCommand, setFlatCommand] = useState<FlatCommand | null>(null)
  const [fly, setFly] = useState<FlyRequest | null>(null)
  const [centerChip, setCenterChip] = useState<string | null>(null)
  const [entry, setEntry] = useState<FlatHandoff | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [pendingFocus, setPendingFocus] = useState(false)
  const [manifest, setManifest] = useState<BasemapManifest | null>(null)
  const [flatSources, setFlatSources] = useState<ActiveSource[]>([])
  const [prewarm, setPrewarm] = useState(false)
  const viewport = useViewport()
  const thresholds = useMemo(
    () => flatThresholds(viewport.width, viewport.height, baseInsets),
    [viewport.width, viewport.height, baseInsets],
  )
  const narrow = viewport.width < 1100
  const milestone = useRef(onMilestone)
  milestone.current = onMilestone
  const prewarmEntry = useMemo<FlatHandoff>(() => ({ ...PREWARM_CENTER, zoom: thresholds.enter }), [thresholds.enter])

  // ---- Shared state consumed by the stage (docs/BUILD_CONTRACTS.md §2.2) --------------
  const storeSelection = useUi((state) => state.selection)
  const hoverId = useUi((state) => state.hoverSiteId)
  const intro = useUi((state) => state.introPhase)
  const uiMode = useUi((state) => state.mode)
  const cameraTouched = useUi((state) => state.cameraTouchedAt !== null)
  const evaluation = useMission((state) => state.evaluation)
  const revision = useMission((state) => state.revision)
  const analogsState = useReferenceAnalogs()
  const analogs = analogsState.status === 'ready' ? analogsState.analogs : NO_ANALOGS
  // In Mission, states and rankings from the team's evaluation; in Explore, the snapshot's global ranking.
  const missionEvaluation = uiMode === 'mision' ? evaluation : null
  const markerInput = useMemo<MarkerInput>(() => ({ candidates, analogs, evaluation: missionEvaluation, locale }), [candidates, analogs, missionEvaluation, locale])

  const referenceId = storeSelection?.kind === 'reference' ? storeSelection.siteId : null
  const selection = useMemo<StageSelection | null>(
    () => (selectedId !== null ? { id: selectedId, kind: 'evaluated' } : referenceId !== null ? { id: referenceId, kind: 'reference' } : null),
    [selectedId, referenceId],
  )
  const preview = storeSelection !== null && selection !== null && storeSelection.siteId === selection.id && storeSelection.preview

  const onActivate = useCallback((model: MarkerModel) => {
    if (model.selectionKind === 'reference') onSelectReference(model.id)
    else onSelect(model.id)
  }, [onSelect, onSelectReference])

  // Preloading in two phases, without competing with the globe:
  // 1) with the globe ready and the browser idle: code, worker and images into the HTTP
  //    cache, without executing or decoding (index.html already prefetched the chunk);
  // 2) when the user starts to zoom in: MapLibre is instantiated hidden, so that
  //    when the threshold is crossed the 2D is already drawn.
  const [globeReady, setGlobeReady] = useState(false)
  const markGlobeReady = useCallback(() => {
    setGlobeReady(true)
    milestone.current?.('globe', 'ok')
  }, [])
  const markDetailReady = useCallback(() => {
    hideBootStage()
    milestone.current?.('texture', 'ok')
  }, [])
  const markFailed = useCallback(() => {
    setFailed(true)
    milestone.current?.('globe', 'error')
  }, [])
  const mountFlat = useCallback(() => {
    void loadFlat()
    setPrewarm(true)
  }, [])

  useEffect(() => {
    let alive = true
    void loadBasemaps().then((loaded) => {
      if (alive) setManifest(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  const enterFlat = useCallback((handoff: FlatHandoff) => {
    setEntry(handoff)
    setMode('flat')
  }, [])

  // The framing requested from the globe is applied when the 2D map is already active.
  useEffect(() => {
    if (mode === 'flat' && pendingFocus) {
      setPendingFocus(false)
      setFocusRequest((value) => value + 1)
    }
  }, [mode, pendingFocus])

  // The 2D map style is built once: it is mounted when both indexes are resolved.
  const layers = useMemo(
    () => (manifest === null || visual.status === 'loading' ? null : [...manifest.basemaps, ...contextLayers(visual, manifest.previews)]),
    [manifest, visual],
  )

  useEffect(() => {
    if (!globeReady || !layers) return
    whenIdle(() => {
      prefetchToCache(MAPLIBRE_WORKER_URL)
      for (const layer of layers) prefetchToCache(`${import.meta.env.BASE_URL}${layer.image}`)
    }, 2000)
  }, [globeReady, layers])

  const exitFlat = useCallback((handoff: FlatHandoff) => {
    setView((current) => ({ kind: 'at', nonce: current.nonce + 1, at: handoff }))
    setMode('globe')
  }, [])

  const goGlobal = useCallback(() => {
    setMode('globe')
    setView((current) => ({ kind: 'global', nonce: current.nonce + 1 }))
  }, [])

  const goHome = useCallback(() => {
    touchCamera()
    goGlobal()
  }, [goGlobal])

  const zoomBy = (delta: number) => {
    touchCamera()
    if (mode === 'flat') setFlatCommand((current) => ({ kind: 'zoom', delta, nonce: (current?.nonce ?? 0) + 1 }))
    else setView((current) => ({ kind: 'zoom', delta, nonce: current.nonce + 1 }))
  }

  const goClose = useCallback(() => {
    if (mode === 'flat') {
      setFocusRequest((value) => value + 1)
      return
    }
    mountFlat()
    setPendingFocus(true)
    setView((current) => ({ kind: 'close', nonce: current.nonce + 1 }))
  }, [mode, mountFlat])

  const lastSignal = useRef(focusSignal)
  useEffect(() => {
    if (focusSignal === lastSignal.current) return
    lastSignal.current = focusSignal
    goClose()
  }, [focusSignal, goClose])

  // ---- Selection → flight (choreographies B and D) ------------------------------------------------
  // Manual selection: the camera flies in parallel. Preview of #1 (results): only if the
  // user did not touch the camera during the wait; if they did, "Center on ‹#1›" appears.
  const touchedRef = useRef(cameraTouched)
  touchedRef.current = cameraTouched
  const selectionKey = selection ? `${selection.kind}:${selection.id}:${preview ? 'preview' : 'manual'}` : ''
  useEffect(() => {
    if (!selection) {
      setCenterChip(null)
      return
    }
    if (selectionCamera(preview, touchedRef.current) === 'chip') {
      setCenterChip(selection.id)
      return
    }
    setCenterChip(null)
    setFly((current) => ({ id: selection.id, nonce: (current?.nonce ?? 0) + 1 }))
    // It only reacts to selection changes (selectionKey summarizes selection and preview).
  }, [selectionKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chipSite = centerChip ? candidates.find((candidate) => candidate.site_id === centerChip) ?? null : null
  const centerOnChip = () => {
    if (!centerChip) return
    setFly((current) => ({ id: centerChip, nonce: (current?.nonce ?? 0) + 1 }))
    setCenterChip(null)
  }

  // ---- Globe ↔ 2D transition: one announcement via the global region (no aria-live of its own) -------------------
  const lastMode = useRef(mode)
  useEffect(() => {
    if (lastMode.current === mode) return
    lastMode.current = mode
    announce(mode === 'flat' ? tGlobe('announce.flat') : tGlobe('announce.globe'))
  }, [mode])

  const fixtureMode = candidates.every((candidate) => candidate.status === 'fixture')

  // The static poster covers the stage until the sharp globe is ready; it is removed
  // earlier if the user interacts, if it switches to 2D or if there is no globe (SVG or error).
  useEffect(() => {
    if (!webgl) milestone.current?.('globe', 'error')
  }, [webgl])

  useEffect(() => {
    if (!webgl || failed || mode === 'flat') {
      hideBootStage()
      return
    }
    const onInteract = () => hideBootStage()
    window.addEventListener('pointerdown', onInteract, { once: true, capture: true })
    window.addEventListener('wheel', onInteract, { once: true, capture: true, passive: true })
    window.addEventListener('keydown', onInteract, { once: true, capture: true })
    const fallback = window.setTimeout(hideBootStage, 8000)
    return () => {
      window.removeEventListener('pointerdown', onInteract, { capture: true })
      window.removeEventListener('wheel', onInteract, { capture: true })
      window.removeEventListener('keydown', onInteract, { capture: true })
      window.clearTimeout(fallback)
    }
  }, [webgl, failed, mode])

  // Without WebGL there is no projection for the Tesla lines.
  useEffect(() => {
    if (!webgl || failed) publishStageFrame({ projection: null, anchor: null })
  }, [webgl, failed])

  if (!webgl || failed) {
    return (
      <div className="map-stage map-stage-fallback">
        <CandidateMap
          candidates={candidates}
          rankOf={rankMap(splitByRole(candidates).ranked)}
          outline={outline}
          search={search}
          precedents={precedents}
          selectedId={selectedId ?? ''}
          onSelect={onSelect}
        />
        <p className="view-note stage-note">{t('noWebgl')}</p>
      </div>
    )
  }

  const sources = mode === 'flat' ? flatSources : [GLOBE_SOURCE]
  // The list is kept with its facts; label and detail are re-rendered in the current language.
  const shownSources = sources.map((source) => sourceIn(source, locale))

  return (
    <div className="map-stage" data-mode={mode} style={insetVars(insets)}>
      <StageErrorBoundary onError={markFailed}>
        <div className="stage-layer stage-globe" hidden={mode !== 'globe'}>
          <Suspense fallback={<StageLoading text={t('loading.globe')} />}>
            <CandidateGlobe
              candidates={candidates}
              outline={outline}
              markerInput={markerInput}
              selection={selection}
              hoverId={hoverId}
              onActivate={onActivate}
              view={view}
              fly={fly}
              active={mode === 'globe' && !paused}
              insets={insets}
              baseInsets={baseInsets}
              thresholds={thresholds}
              narrow={narrow}
              intro={intro}
              resultsRevision={revision}
              onReady={markGlobeReady}
              onApproach={mountFlat}
              onDetailReady={markDetailReady}
              onEnterFlat={enterFlat}
              onContextLost={markFailed}
              onCameraInput={touchCamera}
              onHome={goHome}
            />
          </Suspense>
        </div>
        {!layers && mode === 'flat' && <StageLoading text={t('loading.imagery')} />}
        {(entry || prewarm) && layers && (
          <div className={`stage-layer stage-flat${mode === 'flat' ? '' : ' is-dormant'}`} aria-hidden={mode !== 'flat'}>
            <Suspense fallback={<StageLoading text={t('loading.flat')} />}>
              <CandidateFlatMap
                candidates={candidates}
                outline={outline}
                basemaps={layers}
                markerInput={markerInput}
                selection={selection}
                hoverId={hoverId}
                onActivate={onActivate}
                fly={fly}
                command={flatCommand}
                entry={entry ?? prewarmEntry}
                focusRequest={focusRequest}
                active={mode === 'flat'}
                insets={insets}
                thresholds={thresholds}
                narrow={narrow}
                resultsRevision={revision}
                onExit={exitFlat}
                onSourcesChange={setFlatSources}
                onCameraInput={touchCamera}
                onHome={goHome}
              />
            </Suspense>
          </div>
        )}
      </StageErrorBoundary>

      {chipSite && (
        <button type="button" className="stage-center-chip" onClick={centerOnChip}>
          {t('centerOn', { name: shortName(chipSite.name, locale) })}
        </button>
      )}

      <div className="stage-controls" role="group" aria-label={t('camera')} data-obstacle="">
        <button type="button" aria-label={t('zoomIn')} title={t('zoomInTitle')} onClick={() => zoomBy(ZOOM_STEP)}>+</button>
        <button type="button" aria-label={t('zoomOut')} title={t('zoomOutTitle')} onClick={() => zoomBy(-ZOOM_STEP)}>−</button>
        <button type="button" aria-label={t('home')} title={t('homeTitle')} onClick={goHome}>⌂</button>
      </div>

      <div className="stage-dock" role="group" aria-label={t('dock')} data-obstacle="">
        <div className="stage-legend">
          {missionEvaluation ? (
            <>
              <span><b aria-hidden="true">{GLYPH.evaluated}</b> {t('legend.prioritized')}</span>
              <span><b className="is-insufficient" aria-hidden="true">{GLYPH.insufficient}</b> {t('legend.insufficientEvidence')}</span>
              <span><b className="is-fail" aria-hidden="true">{GLYPH.fail}</b> {t('legend.notMet')}</span>
              <span><b className="is-reference" aria-hidden="true">{GLYPH.reference}</b> {tCommon.in(locale)('status.notYetCalculated')}</span>
            </>
          ) : (
            <>
              <span><b aria-hidden="true">{GLYPH.evaluated}</b> {fixtureMode ? t('legend.fixture') : t('legend.candidate')}</span>
              <span><b className="is-reference" aria-hidden="true">{GLYPH.reference}</b> {t('legend.analog')}</span>
              <span><b className="is-insufficient" aria-hidden="true">{GLYPH.insufficient}</b> {tCommon.in(locale)('status.insufficientDataLower')}</span>
            </>
          )}
          <span className="legend-sim" title={t('legend.simTitle')}>
            {t('legend.sim')}
            {SIMILARITY_SCALE.map((step, index) => {
              const next = SIMILARITY_SCALE[index + 1]
              return (
                <span key={step.tone} className="legend-sim-step">
                  <i data-sim-tone={step.tone} aria-hidden="true" />
                  {next ? `${step.min}–${next.min - 1}` : `≥${step.min}`}
                </span>
              )
            })}
            <span className="legend-sim-note">{t('legend.simNote')}</span>
          </span>
          <span className="legend-outline">{t('legend.outline')}</span>
        </div>
        <div className="stage-source">
          <small>{mode === 'globe' ? t('stage.globe') : t('stage.flat')}</small>
          {shownSources[0] ? (
            <>
              <span>
                <strong>{shownSources[0].label}</strong>
                <em>{shownSources[0].detail}</em>
              </span>
              {shownSources.length > 1 && (
                <em className="source-rest">
                  {t('source.rest', { sources: shownSources.slice(1).map((source) => source.label).join(' · ') })}
                </em>
              )}
            </>
          ) : (
            <span><strong>{t('source.none')}</strong><em>{t('source.noneDetail')}</em></span>
          )}
          <em className="legend-credit">{t('source.credit')}</em>
        </div>
        {hudSlot}
        {creditSlot}
      </div>
    </div>
  )
}
