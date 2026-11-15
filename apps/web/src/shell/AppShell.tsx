/**
 * Armazón del escenario fijo (ADR-014, docs/UX_REDESIGN.md §2.1 y §3.8).
 *
 *   centro = dónde (escenario + líneas) · derecha = el lugar (riel) ·
 *   izquierda = tu misión y por qué (≥1440, Misión) · abajo = elegir y escribir (dock).
 *   <1100 px: una sola hoja S0/S1/S2.
 *
 * Cada feature se monta en su slot definitivo (docs/BUILD_CONTRACTS.md). Este archivo es del
 * integrador: los constructores no lo editan.
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
import { FullDetail } from './detail/FullDetail'
import { GLYPH } from './glyphs'
import { placeLabel } from './placeLabel'
import { baseStageInsets, layoutCssVars, sheetDetentHeights, stageInsetsFor, type DetentId } from './layout'
import { LiveRegion } from './LiveRegion'
import { MODE_PANEL_ID, ModeTabs } from './ModeTabs'
import { RightRail } from './RightRail'
import { Sheet } from './sheet/Sheet'
import { useKeyboardInset } from './sheet/useKeyboardInset'
import { tabId } from './Tabs'
import { prefersReducedMotion } from './useReducedMotion'
import { useViewportLayout } from './useViewportLayout'
import './shell.css'

/** --dur-4 (hoja, dock) + margen: los márgenes del escenario se publican al asentarse. */
const SETTLE_MS = 460
const SETTLE_REDUCED_MS = 170

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/** ¿El evento viene de un popover abierto (Tu misión, recientes)? Ese Esc lo cierra el popover. */
function insidePopover(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('[popover]')) return true
  try {
    return document.querySelector(':popover-open') !== null
  } catch {
    return false
  }
}

const cssEscape = (value: string): string => (typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value)

/** Primer elemento que existe y puede recibir el foco, en orden de preferencia. */
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

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

const SCIENCE_NOTE = ['SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO', 'PRELIMINAR · NO AUTORIZA TERRENO'] as const
const FIXTURE_NOTE = ['DEMOSTRACIÓN TÉCNICA · DATOS SINTÉTICOS · NO ES UN RESULTADO CIENTÍFICO', 'DEMO · DATOS SINTÉTICOS'] as const

export function AppShell({ data, promise }: { data: AppData; promise?: string }) {
  const layout = useViewportLayout()
  const { width, height, tramo, compact, sideSheet } = layout
  const narrow = tramo === 'narrow'
  const mode = useUi((state) => state.mode)
  const selection = useUi((state) => state.selection)
  const settledInsets = useUi((state) => state.stageInsets)
  const revision = useMission((state) => state.revision)
  // Panel izquierdo (≥1440): sin resultado vigente manda «Tu misión»; con resultado, la Lectura.
  const missionFocus = useMission((state) => state.evaluation === null || state.stale)
  const [seenRevision, setSeenRevision] = useState(revision)
  const [railFull, setRailFull] = useState(false)
  const [detent, setDetent] = useState<DetentId>('S0')
  const [focusSignal, setFocusSignal] = useState(0)
  const keyboardInset = useKeyboardInset(narrow)
  const pageHidden = usePageHidden()
  const root = useRef<HTMLDivElement>(null)
  const changeDetentRef = useRef<(next: DetentId) => void>(() => undefined)
  const snapshot = data.snapshot
  const site = selection?.kind === 'evaluated' ? snapshot?.candidates.find((item) => item.site_id === selection.siteId) ?? null : null

  // ---- Planificador compartido: el snapshot validado, sin transformar (ADR-013) ------------
  useEffect(() => registerMissionSnapshot(data.status === 'ready' ? data.snapshot : null), [data.status, data.snapshot])
  // Contexto geológico oficial (M10): el mismo objeto validado que ve la ficha llega al planificador.
  const geologyState = geologyStateOf(data)
  useEffect(() => registerMissionGeology(geologyState), [geologyState])
  // Al entrar a Misión se carga el chunk del planificador y se abre «Definir una prueba» (sin IA).
  useEffect(() => {
    if (mode !== 'mision' || data.status !== 'ready') return
    withController((mission) => {
      if (mission.getState().journey === null) mission.dispatch({ type: 'set_journey', journey: 'test' })
    })
  }, [mode, data.status])

  // «Evaluar este sector» o «Enviar» piden abrir «Tu misión»: en la hoja móvil vive en la bandeja S0.
  const openRequest = useMissionOpenRequest()
  const seenOpenRequest = useRef(openRequest)
  useEffect(() => {
    if (openRequest === seenOpenRequest.current) return
    seenOpenRequest.current = openRequest
    if (narrow) changeDetentRef.current('S0')
  }, [openRequest, narrow])

  // ---- Modo: ?modo= con replaceState y punto de resultados nuevos -------------------------
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const next = searchWithMode(search, mode)
    if (next !== search) window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`)
    if (mode === 'mision') setSeenRevision(revision)
  }, [mode, revision])

  // ---- Selección → riel / hoja --------------------------------------------------------------
  const selectedKey = selection ? `${selection.kind}:${selection.siteId}:${selection.preview}` : ''
  useEffect(() => {
    if (!selection) {
      setRailFull(false)
      setDetent((current) => (current === 'S1' ? 'S0' : current))
      return
    }
    // La vista previa (#1 al llegar resultados) no abre la hoja ni mueve el foco.
    if (!selection.preview) setDetent((current) => (current === 'S0' ? 'S1' : current))
    // Solo reacciona a cambios de selección (selectedKey resume selection).
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- S2: pushState; Atrás vuelve a S1 ------------------------------------------------------
  const pushed = useRef(false)
  const detentRef = useRef(detent)
  detentRef.current = detent
  const changeDetent = useCallback((next: DetentId) => {
    // Salir de S2 por la UI consume la entrada de historial que se agregó al entrar.
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
      setDetent((current) => (current === 'S2' ? 'S1' : current))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ---- Esc: S2 → S1; ficha completa → riel; riel → sin selección ----------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isEditable(event.target)) return
      // Un diálogo popover (Tu misión, recientes) se cierra con su propio Esc nativo: no se
      // cancela ni se borra la selección por debajo (APG, patrón de diálogo).
      if (insidePopover(event.target)) return
      if (narrow && detent === 'S2') changeDetent('S1')
      else if (!narrow && railFull) setRailFull(false)
      else if (uiStore.getState().selection) uiActions.clearSelection()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [narrow, detent, railFull, changeDetent])

  // ---- Foco: ninguna transición de la hoja o del riel lo deja caer en <body> (WCAG 2.4.3) ----
  // Se recuerda el último elemento enfocado dentro de la app; si una transición lo desmonta, el
  // foco pasa al control equivalente del estado nuevo (título de la hoja, pestaña de la ficha,
  // «Ficha», «Ver ficha completa», la opción del carrusel del lugar cerrado o el conmutador).
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

  // ---- Márgenes del escenario: se publican cuando el layout se asienta ----------------------
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
  // La franja del HUD y los controles + − ⌂ del escenario se ubican con los márgenes asentados:
  // se vuelven a medir después de que el escenario los aplica (obstáculos para las líneas Tesla).
  useLayoutEffect(measureObstacles, [settledInsets, mode, measureObstacles])

  // ---- Hitos del escenario para la bitácora de arranque --------------------------------------
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

  // «Ver lista» del carrusel en la hoja: S1 sin selección dibuja sheet.list; cerrarla vuelve a S0.
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
      {/* La barra superior va primero en el DOM (orden de tabulación = orden visual); es fija. */}
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
          {/* La versión larga sale del árbol con display:none en pantallas angostas; la corta la
              reemplaza para todos (también lectores de pantalla). */}
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


      {!narrow && mode === 'explorar' && (
        <div className="reading-pill-slot" data-slot="pill.reading" data-obstacle=""><ReadingPill data={data} /></div>
      )}

      {tramo === 'wide' && mode === 'mision' && (
        <aside className="left-panel" aria-label="Tu misión y lectura" data-obstacle="" data-focus={missionFocus ? 'mission' : 'reading'}>
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
          label={site ? placeLabel(site.name) : 'Lugares'}
          labelledBy={tabId('mode', mode)}
          keyboardOpen={keyboardInset > 0}
          head={sheetHead({ detent, data, siteName: site ? placeLabel(site.name) : null, hasSelection: selection !== null, onDetent: changeDetent })}
        >
          {sheetBody({ detent, data, site, selection, onShowOnMap: showOnMap, onListView: openList, promise })}
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
}

function sheetHead({ detent, data, siteName, hasSelection, onDetent }: SheetPartsArgs): ReactNode {
  if (detent === 'S0') return null
  return (
    <>
      {detent === 'S2' && (
        <button type="button" className="sheet-back" onClick={() => onDetent('S1')}>← Volver</button>
      )}
      <h2 className="sheet-title" tabIndex={-1}>
        {siteName ? <><span aria-hidden="true">{GLYPH.evaluated}</span> {siteName}</> : hasSelection ? 'Referencia mundial' : 'Lugares'}
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
          <button type="button" className="sheet-more" onClick={() => onDetent('S2')}>Ficha</button>
        </>
      )}
      <button
        type="button"
        className="sheet-close"
        aria-label={hasSelection ? 'Cerrar el lugar' : 'Volver a la bandeja'}
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
}

function sheetBody({ detent, data, site, selection, onShowOnMap, onListView, promise }: SheetBodyArgs): ReactNode {
  if (detent === 'S0') {
    return (
      <div className="sheet-tray">
        <div className="sheet-tray-places" data-slot="sheet.tray.places"><PlaceRail data={data} placement="sheet" onListViewChange={onListView} promise={promise} /></div>
        <div className="sheet-tray-composer" data-slot="sheet.tray.composer"><Composer data={data} placement="sheet" /></div>
      </div>
    )
  }
  if (selection?.kind === 'reference') return <div data-slot="sheet.reference"><ReferenceCard data={data} analogId={selection.siteId} /></div>
  if (site && detent === 'S1') return <div data-slot="sheet.s1"><MetricRail data={data} site={site} variant="sheet" onShowOnMap={onShowOnMap} /></div>
  if (site) return <FullDetail data={data} site={site} placement="sheet" onShowOnMap={onShowOnMap} />
  return <div data-slot="sheet.list"><PlaceRail data={data} placement="sheet" listView onListViewChange={onListView} /></div>
}
