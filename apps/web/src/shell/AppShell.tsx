/**
 * Fixed stage shell (ADR-014, docs/UX_REDESIGN.md §2.1 and §3.8).
 *
 *   center = where (stage + lines) · right = the place (rail) ·
 *   left = your mission and why (≥1440, Mission) · bottom = choose and write (dock).
 *   <1100 px: a single sheet S0/S1/S2.
 *
 * Each feature is mounted in its final slot (docs/BUILD_CONTRACTS.md). This file belongs to the
 * integrator: the builders do not edit it.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Composer, focusComposer, MissionCard, MissionPrintHost, registerMissionGeology, registerMissionSnapshot, useMissionOpenRequest, withController } from '../features/composer'
import { BootLayer, reportBootMilestone, StatusChip } from '../features/boot'
import { MapStage, type StageMilestone } from '../features/globe'
import { LeaderLayer, LeaderToggle } from '../features/leaders'
import { MetricRail } from '../features/metrics'
import { PlaceRail, ReferenceCard } from '../features/places'
import { ReadingPanel, ReadingPill } from '../features/analysis'
import { useMission } from '../state/mission'
import { searchWithMode, uiActions, uiStore, useUi } from '../state/ui'
import { SHELL_TEXT } from '../content/shell'
import { geologyStateOf, isFixtureSnapshot, type AppData } from './appData'
import { dataAttributionText } from './attribution'
import { FullDetail, type DetailTab } from './detail/FullDetail'
import { GLYPH } from './glyphs'
import { placeLabel } from './placeLabel'
import { baseStageInsets, layoutCssVars, sheetDetentHeights, stageInsetsFor, type DetentId } from './layout'
import { LiveRegion } from './LiveRegion'
import { MODE_PANEL_ID, ModeTabs } from './ModeTabs'
import { focusWhenReady, READING_TITLE_SELECTOR, readingRoute } from './readingRoute'
import { RightRail } from './RightRail'
import { Sheet } from './sheet/Sheet'
import { useKeyboardInset } from './sheet/useKeyboardInset'
import { tabId } from './Tabs'
import { prefersReducedMotion } from './useReducedMotion'
import { useViewportLayout } from './useViewportLayout'
import './shell.css'

/** --dur-4 (sheet, dock) + margin: the stage margins are published once they settle. */
const SETTLE_MS = 460
const SETTLE_REDUCED_MS = 170

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/** Does the event come from an open popover (Your mission, recent)? That Esc is closed by the popover. */
function insidePopover(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('[popover]')) return true
  try {
    return document.querySelector(':popover-open') !== null
  } catch {
    return false
  }
}

const cssEscape = (value: string): string => (typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value)

/** First element that exists and can receive focus, in order of preference. */
function focusFirst(scope: ParentNode, selectors: readonly string[]): boolean {
  for (const selector of selectors) {
    const el = scope.querySelector<HTMLElement>(selector)
    if (el && el.isConnected && !el.closest('[inert]')) {
      el.focus({ preventScroll: true })
      if (document.activeElement === el) return true
    }
  }
  return false
}

/** Closes the open popovers (e.g. "Your mission" <1440) before taking the user to the Reading. */
function hideOpenPopovers(): void {
  try {
    document.querySelectorAll<HTMLElement>(':popover-open').forEach((el) => el.hidePopover())
  } catch {
    // Without native popovers there is nothing to close.
  }
}

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

const SCIENCE_NOTE = ['PRELIMINARY SCIENTIFIC SCREENING · REAL DATA · NOT A TERRAIN AUTHORIZATION', 'PRELIMINARY · NOT A TERRAIN AUTHORIZATION'] as const
const FIXTURE_NOTE = ['TECHNICAL DEMO · SYNTHETIC DATA · NOT A SCIENTIFIC RESULT', 'DEMO · SYNTHETIC DATA'] as const

export function AppShell({ data, promise }: { data: AppData; promise?: string }) {
  const layout = useViewportLayout()
  const { width, height, tramo, compact, sideSheet } = layout
  const narrow = tramo === 'narrow'
  const mode = useUi((state) => state.mode)
  const selection = useUi((state) => state.selection)
  const settledInsets = useUi((state) => state.stageInsets)
  const revision = useMission((state) => state.revision)
  // Left panel (≥1440): with no current result, "Your mission" takes precedence; with a result, the Reading.
  const missionFocus = useMission((state) => state.evaluation === null || state.stale)
  const [seenRevision, setSeenRevision] = useState(revision)
  const [railFull, setRailFull] = useState(false)
  const [detent, setDetent] = useState<DetentId>('S0')
  const [focusSignal, setFocusSignal] = useState(0)
  // "Go to the Reading" (M11): S2 "Reading" view without ● and the detent to which it returns from there.
  const readingRequest = useUi((state) => state.readingRequest)
  const [sheetReading, setSheetReading] = useState<DetentId | null>(null)
  const [detailTabRequest, setDetailTabRequest] = useState<{ tab: DetailTab; nonce: number } | null>(null)
  const keyboardInset = useKeyboardInset(narrow)
  const pageHidden = usePageHidden()
  const root = useRef<HTMLDivElement>(null)
  const changeDetentRef = useRef<(next: DetentId) => void>(() => undefined)
  const snapshot = data.snapshot
  const site = selection?.kind === 'evaluated' ? snapshot?.candidates.find((item) => item.site_id === selection.siteId) ?? null : null

  // ---- Shared planner: the validated snapshot, untransformed (ADR-013) ------------
  useEffect(() => registerMissionSnapshot(data.status === 'ready' ? data.snapshot : null), [data.status, data.snapshot])
  // Official geological context (M10): the same validated object that the card sees reaches the planner.
  const geologyState = geologyStateOf(data)
  useEffect(() => registerMissionGeology(geologyState), [geologyState])
  // On entering Mission, the planner chunk is loaded and "Define a test" is opened (without AI).
  useEffect(() => {
    if (mode !== 'mision' || data.status !== 'ready') return
    withController((mission) => {
      if (mission.getState().journey === null) mission.dispatch({ type: 'set_journey', journey: 'test' })
    })
  }, [mode, data.status])

  // "Evaluate this sector" or "Send" request opening "Your mission": on the mobile sheet it lives in the S0 tray.
  const openRequest = useMissionOpenRequest()
  const seenOpenRequest = useRef(openRequest)
  useEffect(() => {
    if (openRequest === seenOpenRequest.current) return
    seenOpenRequest.current = openRequest
    if (narrow) changeDetentRef.current('S0')
  }, [openRequest, narrow])

  // ---- Mode: ?modo= with replaceState and new-results indicator -------------------------
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const next = searchWithMode(search, mode)
    if (next !== search) window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`)
    if (mode === 'mision') setSeenRevision(revision)
  }, [mode, revision])

  // ---- Selection → rail / sheet --------------------------------------------------------------
  const selectedKey = selection ? `${selection.kind}:${selection.siteId}:${selection.preview}` : ''
  useEffect(() => {
    if (!selection) {
      setRailFull(false)
      setDetent((current) => (current === 'S1' ? 'S0' : current))
      return
    }
    // The preview (#1 when results arrive) does not open the sheet or move focus.
    if (!selection.preview) setDetent((current) => (current === 'S0' ? 'S1' : current))
    // It only reacts to selection changes (selectedKey summarizes selection).
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- S2: pushState; Back returns to S1 ------------------------------------------------------
  const pushed = useRef(false)
  const detentRef = useRef(detent)
  detentRef.current = detent
  const sheetReadingRef = useRef(sheetReading)
  sheetReadingRef.current = sheetReading
  const changeDetent = useCallback((next: DetentId) => {
    // Leaving S2 via the UI consumes the history entry that was added on entering.
    if (detentRef.current === 'S2' && next !== 'S2' && pushed.current) {
      pushed.current = false
      window.history.back()
    }
    setDetent(next)
  }, [])
  changeDetentRef.current = changeDetent
  useEffect(() => {
    if (detent === 'S2' && narrow && !pushed.current) {
      window.history.pushState({ ...(window.history.state ?? {}), analogosSheet: 'S2' }, '')
      pushed.current = true
    }
  }, [detent, narrow])
  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return
      pushed.current = false
      setDetent((current) => (current === 'S2' ? sheetReadingRef.current ?? 'S1' : current))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ---- Esc: S2 → S1; full card → rail; rail → no selection ----------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isEditable(event.target)) return
      // A popover dialog (Your mission, recent) is closed by its own native Esc: the selection beneath it is not
      // canceled or cleared (APG, dialog pattern).
      if (insidePopover(event.target)) return
      if (narrow && detent === 'S2') changeDetent(sheetReading ?? 'S1')
      else if (!narrow && railFull) setRailFull(false)
      else if (uiStore.getState().selection) uiActions.clearSelection()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [narrow, detent, railFull, changeDetent, sheetReading])

  // The sheet's "Reading" view and the requested tab are only valid in S2 below 1100 px: on leaving, they are
  // discarded (the next "Card" opens again on Metrics).
  useEffect(() => {
    if (narrow && detent === 'S2') return
    setSheetReading(null)
    setDetailTabRequest(null)
  }, [narrow, detent])

  // ---- "Go to the Reading" (M11): surface according to width; the selection is not touched ----------
  const seenReadingRequest = useRef(readingRequest)
  const cancelReadingFocus = useRef<() => void>(() => undefined)
  useEffect(() => {
    if (readingRequest === seenReadingRequest.current) return
    seenReadingRequest.current = readingRequest
    hideOpenPopovers()
    const current = uiStore.getState().selection
    const found = current?.kind === 'evaluated' && (data.snapshot?.candidates.some((item) => item.site_id === current.siteId) ?? false)
    const route = readingRoute(tramo, current, found)
    if (route.surface === 'sheet-tab') {
      setSheetReading(null)
      setDetailTabRequest({ tab: 'lectura', nonce: readingRequest })
      changeDetent('S2')
    } else if (route.surface === 'sheet-reading') {
      setSheetReading(route.back)
      changeDetent('S2')
    }
    cancelReadingFocus.current()
    if (root.current) cancelReadingFocus.current = focusWhenReady(root.current, READING_TITLE_SELECTOR[route.surface])
  }, [readingRequest]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelReadingFocus.current(), [])

  // ---- Focus: no sheet or rail transition lets it fall onto <body> (WCAG 2.4.3) ----
  // The last focused element within the app is remembered; if a transition unmounts it, the
  // focus moves to the equivalent control in the new state (sheet title, card tab,
  // "Card", "View full card", the carousel option of the closed place, or the switcher).
  const lastFocused = useRef<HTMLElement | null>(null)
  const lastSite = useRef<string | null>(null)
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && root.current?.contains(event.target)) lastFocused.current = event.target
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])
  const transition = useRef({ detent, selectedKey, railFull })
  useLayoutEffect(() => {
    const previous = transition.current
    transition.current = { detent, selectedKey, railFull }
    const lost = lastFocused.current
    const app = root.current
    if (selection) lastSite.current = selection.siteId
    if (!app || !lost || lost.isConnected) return
    const active = document.activeElement
    if (active && active !== document.body && app.contains(active)) return
    const closedSite = previous.selectedKey !== '' && selectedKey === '' ? lastSite.current : null
    const option = closedSite ? `[role="option"][id$="-${cssEscape(closedSite)}"]` : null
    const targets: string[] = []
    if (closedSite) {
      targets.push(...(option ? [option] : []), '[role="option"][tabindex="0"]', '.places-tool')
    } else if (narrow) {
      if (detent === 'S2') targets.push('.full-detail [role="tab"][aria-selected="true"]', '.sheet-title')
      else if (detent === 'S1' && previous.detent === 'S2') targets.push('.sheet-more', '.sheet-title')
      else if (detent === 'S1') targets.push(selection ? '.sheet-title' : '.sheet [data-slot="sheet.list"] .places-tool', '.sheet-title')
      else targets.push('.sheet-tray .places-tool', '[role="option"][tabindex="0"]')
    } else {
      if (railFull) targets.push('.rail .full-detail [role="tab"][aria-selected="true"]')
      targets.push('.rail .rail-action', '.rail .rail-head h2')
    }
    targets.push('.sheet-title', `#${cssEscape(tabId('mode', mode))}`)
    focusFirst(app, targets)
  }, [detent, selectedKey, railFull, narrow, selection, mode])

  // ---- Stage margins: published when the layout settles ----------------------
  const railOpen = !narrow && selection !== null
  const target = useMemo(
    () => stageInsetsFor({ width, height, mode, railOpen, railFull: railFull && site !== null, detent }),
    [width, height, mode, railOpen, railFull, site, detent],
  )
  const baseInsets = useMemo(() => baseStageInsets(width, height), [width, height])
  const lastSize = useRef<{ width: number; height: number } | null>(null)
  const measureObstacles = useCallback(() => {
    const panels = root.current?.querySelectorAll<HTMLElement>('[data-obstacle]') ?? []
    uiActions.setObstacles([...panels].map((panel) => panel.getBoundingClientRect()))
  }, [])
  useLayoutEffect(() => {
    const resized = !lastSize.current || lastSize.current.width !== width || lastSize.current.height !== height
    lastSize.current = { width, height }
    if (resized) {
      uiActions.setStageInsets(target)
      measureObstacles()
      return
    }
    const timer = window.setTimeout(() => {
      uiActions.setStageInsets(target)
      measureObstacles()
    }, prefersReducedMotion() ? SETTLE_REDUCED_MS : SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [target, width, height, measureObstacles])
  // The HUD strip and the + − ⌂ stage controls are positioned using the settled margins:
  // they are measured again after the stage applies them (obstacles for the Tesla lines).
  useLayoutEffect(measureObstacles, [settledInsets, mode, measureObstacles])

  // ---- Stage milestones for the startup log --------------------------------------
  useEffect(() => {
    if (data.status === 'ready') reportBootMilestone('snapshot', 'ok')
    if (data.status === 'error') reportBootMilestone('snapshot', 'error')
  }, [data.status])
  const onMilestone = useCallback((milestone: StageMilestone, status: 'ok' | 'error') => reportBootMilestone(milestone, status), [])

  const selectSite = useCallback((siteId: string) => uiActions.select(siteId), [])
  const showOnMap = useCallback(() => {
    setFocusSignal((value) => value + 1)
    if (narrow) changeDetent('S1')
  }, [narrow, changeDetent])

  // "View list" of the carousel in the sheet: S1 with no selection draws sheet.list; closing it returns to S0.
  const openList = useCallback((open: boolean) => changeDetent(open ? 'S1' : 'S0'), [changeDetent])

  const fixture = isFixtureSnapshot(snapshot)
  const heights = sheetDetentHeights(width, height)
  const stageInert = narrow && !sideSheet && detent === 'S2'
  const cssVars = useMemo(() => layoutCssVars(width, height), [width, height])
  const credit = useMemo(() => dataAttributionText(snapshot?.manifest), [snapshot])

  return (
    <div
      ref={root}
      className="app"
      data-tramo={tramo}
      data-mode={mode}
      data-compact={compact ? '' : undefined}
      data-rail={railOpen ? (railFull && site ? 'full' : 'open') : 'closed'}
      data-detent={narrow ? detent : undefined}
      style={cssVars}
    >
      {/* The top bar comes first in the DOM (tab order = visual order); it is fixed. */}
      <header className="topbar" data-obstacle="">
        <h1 className="sr-only">{SHELL_TEXT.brand} · {SHELL_TEXT.brandTagline}</h1>
        <div className="brand" aria-hidden="true">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <strong>{SHELL_TEXT.brand}</strong>
            <small>{SHELL_TEXT.brandTagline}</small>
          </span>
        </div>
        <ModeTabs mode={mode} unseen={revision > seenRevision} />
        <div className="topbar-status" data-slot="topbar.status"><StatusChip data={data} /></div>
        <p className={`science-note${fixture ? ' is-fixture' : ''}`} role="note">
          <span aria-hidden="true" />
          <span className="note-long">{(fixture ? FIXTURE_NOTE : SCIENCE_NOTE)[0]}</span>
          {/* The long version is removed from the tree with display:none on narrow screens; the short one
              replaces it for everyone (including screen readers). */}
          <span className="note-short">{(fixture ? FIXTURE_NOTE : SCIENCE_NOTE)[1]}</span>
        </p>
      </header>

      <div className="stage" data-slot="stage" inert={stageInert}>
        {snapshot ? (
          <MapStage
            candidates={snapshot.candidates}
            outline={snapshot.outline}
            search={snapshot.search}
            precedents={snapshot.precedents}
            selectedId={selection?.kind === 'evaluated' ? selection.siteId : null}
            onSelect={selectSite}
            insets={settledInsets}
            baseInsets={baseInsets}
            visual={data.visual}
            focusSignal={focusSignal}
            paused={stageInert || pageHidden}
            onMilestone={onMilestone}
            hudSlot={<LeaderToggle />}
            creditSlot={credit ? <p className="stage-data-credit">{credit}</p> : null}
          />
        ) : (
          <div className="map-stage" aria-hidden="true" />
        )}
      </div>

      <div className="stage-overlay" data-slot="stage.overlay">
        <LeaderLayer data={data} />
        <BootLayer data={data} />
      </div>


      {/* Explore ≥1100 and Mission 1100–1439 (M11: "Go to the Reading" surface without a left panel). */}
      {!narrow && (mode === 'explorar' || tramo === 'medium') && (
        <div className="reading-pill-slot" data-slot="pill.reading" data-obstacle=""><ReadingPill data={data} openSignal={readingRequest} /></div>
      )}

      {tramo === 'wide' && mode === 'mision' && (
        <aside className="left-panel" aria-label="Your mission and reading" data-obstacle="" data-focus={missionFocus ? 'mission' : 'reading'}>
          <div data-slot="left.mission"><MissionCard data={data} placement="panel" promise={promise} /></div>
          <div data-slot="left.reading"><ReadingPanel data={data} placement="panel" /></div>
        </aside>
      )}

      {!narrow && (
        <RightRail
          data={data}
          tramo={tramo}
          selection={selection}
          full={railFull}
          onFullChange={setRailFull}
          onShowOnMap={showOnMap}
        />
      )}

      <main className="app-main">
      {!narrow && (
        <section id={MODE_PANEL_ID} role="tabpanel" aria-labelledby={tabId('mode', mode)} className="dock" data-obstacle="">
          <div className="dock-places" data-slot="dock.places"><PlaceRail data={data} placement="dock" promise={promise} /></div>
          <div className="dock-composer" data-slot="dock.composer"><Composer data={data} placement="dock" /></div>
        </section>
      )}

      {narrow && (
        <Sheet
          detent={detent}
          onDetentChange={changeDetent}
          heights={heights}
          side={sideSheet}
          label={sheetReading ? 'Reading' : site ? placeLabel(site.name) : 'Places'}
          labelledBy={tabId('mode', mode)}
          keyboardOpen={keyboardInset > 0}
          head={sheetHead({ detent, data, siteName: site ? placeLabel(site.name) : null, hasSelection: selection !== null, onDetent: changeDetent, readingBack: sheetReading })}
        >
          {sheetBody({ detent, data, site, selection, onShowOnMap: showOnMap, onListView: openList, promise, reading: sheetReading !== null, detailTabRequest })}
        </Sheet>
      )}
      </main>

      <LiveRegion />
      <MissionPrintHost data={data} />
    </div>
  )
}

interface SheetPartsArgs {
  detent: DetentId
  data: AppData
  siteName: string | null
  hasSelection: boolean
  onDetent: (detent: DetentId) => void
  /** S2 “Reading” view (M11): detent to return to; null outside that view. */
  readingBack?: DetentId | null
}

export function sheetHead({ detent, data, siteName, hasSelection, onDetent, readingBack = null }: SheetPartsArgs): ReactNode {
  if (detent === 'S0') return null
  if (detent === 'S2' && readingBack) {
    // Reading without ● (no selection or with ◆): going back or closing returns without clearing the selection.
    return (
      <>
        <button type="button" className="sheet-back" onClick={() => onDetent(readingBack)}>← Back</button>
        <h2 className="sheet-title" tabIndex={-1}>Reading</h2>
        <button type="button" className="sheet-close" aria-label="Close Reading" onClick={() => onDetent(readingBack)}>
          {GLYPH.fail}
        </button>
      </>
    )
  }
  return (
    <>
      {detent === 'S2' && (
        <button type="button" className="sheet-back" onClick={() => onDetent('S1')}>← Back</button>
      )}
      <h2 className="sheet-title" tabIndex={-1}>
        {siteName ? <><span aria-hidden="true">{GLYPH.evaluated}</span> {siteName}</> : hasSelection ? 'World reference' : 'Places'}
      </h2>
      {detent === 'S1' && siteName && (
        <>
          <span className="slot-contents" data-slot="sheet.head">
            <Composer
              data={data}
              placement="sheet-head"
              onRequestTray={() => {
                uiActions.setMode('mision')
                onDetent('S0')
                window.setTimeout(focusComposer, 0)
              }}
            />
          </span>
          <button type="button" className="sheet-more" onClick={() => onDetent('S2')}>Details</button>
        </>
      )}
      <button
        type="button"
        className="sheet-close"
        aria-label={hasSelection ? 'Close the place' : 'Back to the tray'}
        onClick={() => {
          if (hasSelection) uiActions.clearSelection()
          onDetent('S0')
        }}
      >
        {GLYPH.fail}
      </button>
    </>
  )
}

interface SheetBodyArgs {
  promise?: string
  detent: DetentId
  data: AppData
  site: NonNullable<AppData['snapshot']>['candidates'][number] | null
  selection: { siteId: string; kind: 'evaluated' | 'reference' } | null
  onShowOnMap: () => void
  onListView: (open: boolean) => void
  /** S2 "Reading" view without a selected ● (M11). */
  reading?: boolean
  detailTabRequest?: { tab: DetailTab; nonce: number } | null
}

export function sheetBody({ detent, data, site, selection, onShowOnMap, onListView, promise, reading = false, detailTabRequest = null }: SheetBodyArgs): ReactNode {
  if (detent === 'S0') {
    return (
      <div className="sheet-tray">
        <div className="sheet-tray-places" data-slot="sheet.tray.places"><PlaceRail data={data} placement="sheet" onListViewChange={onListView} promise={promise} /></div>
        <div className="sheet-tray-composer" data-slot="sheet.tray.composer"><Composer data={data} placement="sheet" /></div>
      </div>
    )
  }
  if (reading && detent === 'S2') return <div data-slot="sheet.reading" className="sheet-reading"><ReadingPanel data={data} placement="full" /></div>
  if (selection?.kind === 'reference') return <div data-slot="sheet.reference"><ReferenceCard data={data} analogId={selection.siteId} /></div>
  if (site && detent === 'S1') return <div data-slot="sheet.s1"><MetricRail data={data} site={site} variant="sheet" onShowOnMap={onShowOnMap} /></div>
  if (site) return <FullDetail data={data} site={site} placement="sheet" onShowOnMap={onShowOnMap} tabRequest={detailTabRequest} />
  return <div data-slot="sheet.list"><PlaceRail data={data} placement="sheet" listView onListViewChange={onListView} /></div>
}
