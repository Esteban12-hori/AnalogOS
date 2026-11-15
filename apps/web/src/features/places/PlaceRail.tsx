/**
 * PlaceRail (docs/UX_REDESIGN.md §3.5; ADR-008 y ADR-013): carrusel de lugares con scroll-snap nativo.
 *
 * - Un listbox horizontal (APG) con roving tabindex: flechas, Inicio/Fin, búsqueda por letras;
 *   Enter/Espacio o clic seleccionan. El foco y el puntero publican `hoverSiteId` para el globo.
 * - Explorar: «Candidatos de la búsqueda» en su puesto global (filtro por país que lo conserva),
 *   «Referencia conocida» (REF, sin puesto) y «◆ Emblemáticos · por calcular».
 * - Misión con evaluación: grupos por estado de la evaluación del equipo; diagnóstico exportable
 *   cuando el alcance no tiene evidencia.
 * - Globo → carrusel: cualquier selección nueva lleva su tarjeta a la vista.
 * - Hoja móvil: un barrido táctil (pointerType touch) deja la tarjeta centrada en vista previa.
 * - Edición tras evaluar: resultados previos a --o-busy con aria-busy, sin inert, hasta reevaluar.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { ReferenceAnalog } from '../../domain/contracts'
import { countryLabels, type CountryFilter } from '../../domain/discovery'
import { prioritizedCount } from '../../domain/missionView'
import { RULES_VERSION } from '../../mission/catalog'
import { GLYPH, useReducedMotion, type AppData } from '../../shell/public'
import { useMission } from '../../state/mission'
import { uiActions, useUi } from '../../state/ui'
import type { PlaceRailProps } from './index'
import { DiagnosisNote, EvaluatedOption, ReferenceOption } from './PlaceOption'
import { buildPlaceModel, nextOptionIndex, placeLabelOf, placeOrder, rangeLabel, typeaheadIndex, visibleRange, type Place } from './placeModel'
import { preloadReferenceCard } from './ReferenceCard'
import { classifyReferences, useReferenceAnalogs } from './referenceAnalogs'
import './places.css'

type Snapshot = NonNullable<AppData['snapshot']>
type Range = ReturnType<typeof visibleRange>

const NO_ANALOGS: readonly ReferenceAnalog[] = []
const TYPEAHEAD_MS = 500
const SWIPE_SETTLE_MS = 140

/** Lleva una opción a la vista moviendo SOLO el carrusel (scrollIntoView movería la hoja o el dock). */
function reveal(scroller: HTMLElement, el: HTMLElement, horizontal: boolean, center: boolean, smooth: boolean): void {
  const start = horizontal ? el.offsetLeft : el.offsetTop
  const size = horizontal ? el.offsetWidth : el.offsetHeight
  const pos = horizontal ? scroller.scrollLeft : scroller.scrollTop
  const view = horizontal ? scroller.clientWidth : scroller.clientHeight
  const target = center ? start + size / 2 - view / 2 : start < pos ? start : start + size > pos + view ? start + size - view : pos
  if (Math.abs(target - pos) < 1) return
  scroller.scrollTo({ [horizontal ? 'left' : 'top']: target, behavior: smooth ? 'smooth' : 'auto' })
}

function focusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true
  }
}

export function PlaceRail(props: PlaceRailProps) {
  const { data, placement } = props
  if (data.status === 'ready' && data.snapshot) return <PlaceCarousel {...props} snapshot={data.snapshot} />
  if (data.status === 'error') {
    return (
      <div className="places" data-placement={placement}>
        <p className="places-state"><span aria-hidden="true">{GLYPH.fail}</span> No se pudieron cargar los lugares{data.error ? `: ${data.error}` : '.'}</p>
      </div>
    )
  }
  return (
    <div className="places" data-placement={placement} aria-busy="true">
      <div className="places-head"><p className="places-title">Lugares</p></div>
      <p className="places-state">Cargando snapshot validado…</p>
      <div className="places-skeleton" aria-hidden="true"><i /><i /><i /></div>
    </div>
  )
}

function PlaceCarousel({ snapshot, placement, listView: listProp = false, onListViewChange, promise }: PlaceRailProps & { snapshot: Snapshot }) {
  const listboxId = useId()
  const reduced = useReducedMotion()
  const mission = useUi((state) => state.mode) === 'mision'
  const selection = useUi((state) => state.selection)
  const evaluation = useMission((state) => state.evaluation)
  const stale = useMission((state) => state.stale)
  const catalog = useReferenceAnalogs()
  const [localList, setLocalList] = useState(false)
  const [country, setCountry] = useState<CountryFilter>('all')
  const listView = listProp || localList
  const analogs = catalog.status === 'ready' ? catalog.analogs : NO_ANALOGS
  const classification = useMemo(() => classifyReferences(analogs, snapshot.candidates), [analogs, snapshot.candidates])
  const missionEvaluation = mission ? evaluation : null
  const busy = missionEvaluation !== null && stale
  const model = useMemo(
    () => buildPlaceModel({ candidates: snapshot.candidates, classification, evaluation: missionEvaluation, country }),
    [snapshot.candidates, classification, missionEvaluation, country],
  )
  const options = useMemo(() => placeOrder(model), [model])
  const selectedId = selection?.siteId ?? null
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = Math.max(0, options.findIndex((option) => option.id === (activeId ?? selectedId)))

  const track = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<string, HTMLElement>())
  const typed = useRef({ text: '', at: 0 })
  const touch = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const center = placement === 'sheet' && !listView
  const [range, setRange] = useState<Range>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const last = useRef({ range: null as Range, start: true, end: true })

  // ---- Contador «1–4 de 11» y flechas: solo cambia el estado cuando cambia el rango ----------
  const measure = useCallback(() => {
    const scroller = track.current
    if (!scroller) return
    const horizontal = !listView
    const boxes = optionsRef.current.map((option) => {
      const el = els.current.get(option.id)
      return el ? { start: horizontal ? el.offsetLeft : el.offsetTop, size: horizontal ? el.offsetWidth : el.offsetHeight } : { start: 0, size: 0 }
    })
    const pos = horizontal ? scroller.scrollLeft : scroller.scrollTop
    const view = horizontal ? scroller.clientWidth : scroller.clientHeight
    const max = (horizontal ? scroller.scrollWidth : scroller.scrollHeight) - view
    const next = visibleRange(boxes, pos, view)
    const start = pos <= 1
    const end = pos >= max - 1
    if (next?.first !== last.current.range?.first || next?.last !== last.current.range?.last) setRange(next)
    if (start !== last.current.start || end !== last.current.end) setEdges({ start, end })
    last.current = { range: next, start, end }
  }, [listView])

  useEffect(() => {
    const scroller = track.current
    if (!scroller) return
    let frame = 0
    let settle = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() })
      if (!center) return
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        // Solo un barrido táctil elige (vista previa): la rueda o el trackpad nunca seleccionan.
        if (!touch.current) return
        touch.current = false
        const middle = scroller.scrollLeft + scroller.clientWidth / 2
        let best: Place | null = null
        let distance = Infinity
        for (const option of optionsRef.current) {
          const el = els.current.get(option.id)
          const gap = el ? Math.abs(el.offsetLeft + el.offsetWidth / 2 - middle) : Infinity
          if (gap < distance) { best = option; distance = gap }
        }
        if (best && best.id !== selectedRef.current) {
          setActiveId(best.id)
          uiActions.select(best.id, best.kind, true)
        }
      }, SWIPE_SETTLE_MS)
    }
    // Al abrirse el riel el dock se estrecha DESPUÉS de seleccionar: al asentarse el tamaño, la
    // tarjeta elegida vuelve a quedar entera a la vista.
    let resized = 0
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() })
      window.clearTimeout(resized)
      resized = window.setTimeout(() => {
        const el = selectedRef.current ? els.current.get(selectedRef.current) : undefined
        if (el) reveal(scroller, el, !listView, center, !reducedRef.current)
      }, SWIPE_SETTLE_MS)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
    observer?.observe(scroller)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      window.clearTimeout(resized)
      scroller.removeEventListener('scroll', onScroll)
      observer?.disconnect()
    }
  }, [measure, center, listView])

  // ---- Globo → carrusel: la selección nueva entra en vista y recibe la parada de tabulación ----
  useEffect(() => {
    setActiveId(null)
    const scroller = track.current
    const el = selectedId ? els.current.get(selectedId) : undefined
    if (scroller && el) reveal(scroller, el, !listView, center, !reduced)
  }, [selectedId, listView, center, reduced])

  // Al desmontarse (S0 → S1 en la hoja) la tarjeta enfocada no emite blur: el hover que publicó
  // quedaría pegado en el globo (pin fuera de su grupo).
  useEffect(() => () => uiActions.setHover(null), [])

  // ---- FLIP al reordenar (resultados de la misión): solo transform, 400 ms ------------------
  const orderKey = options.map((option) => option.id).join('|')
  const positions = useRef({ list: listView, at: new Map<string, number>() })
  useLayoutEffect(() => {
    const read = () => {
      const at = new Map<string, number>()
      els.current.forEach((el, key) => at.set(key, listView ? el.offsetTop : el.offsetLeft))
      return at
    }
    // Primer montaje (sin posiciones previas) o sin animación: no hay nada que animar, así que no
    // se fuerza un layout síncrono en el arranque; se mide en el primer cuadro.
    if (positions.current.at.size === 0 || reduced) {
      const frame = requestAnimationFrame(() => {
        positions.current = { list: listView, at: read() }
        measure()
      })
      return () => cancelAnimationFrame(frame)
    }
    const at = read()
    if (positions.current.list === listView) {
      els.current.forEach((el, key) => {
        const before = positions.current.at.get(key)
        const after = at.get(key)
        if (before === undefined || after === undefined || before === after || typeof el.animate !== 'function') return
        el.animate([{ transform: `translate${listView ? 'Y' : 'X'}(${before - after}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.2, .8, .2, 1)' })
      })
    }
    positions.current = { list: listView, at }
    measure()
  }, [orderKey, listView, reduced, measure])

  const focusOption = (index: number) => {
    const option = options[index]
    const el = option ? els.current.get(option.id) : undefined
    if (!option || !el) return
    setActiveId(option.id)
    el.focus({ preventScroll: true })
    if (track.current) reveal(track.current, el, !listView, center, !reduced)
  }

  /** Canal ligero carrusel → globo; un ◆ además precarga su tarjeta del riel. */
  const hover = (option: Place) => {
    uiActions.setHover(option.id)
    if (option.kind === 'reference') preloadReferenceCard()
  }

  const choose = (option: Place) => {
    touch.current = false
    setActiveId(option.id)
    uiActions.select(option.id, option.kind)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const option = options[active]
    if ((event.key === 'Enter' || event.key === ' ') && option) {
      event.preventDefault()
      choose(option)
      return
    }
    const next = nextOptionIndex(event.key, active, options.length)
    if (next !== null) {
      event.preventDefault()
      focusOption(next)
      return
    }
    if (event.key.length !== 1) return
    const now = Date.now()
    typed.current = { text: now - typed.current.at < TYPEAHEAD_MS ? typed.current.text + event.key : event.key, at: now }
    const match = typeaheadIndex(options.map(placeLabelOf), typed.current.text, active)
    if (match !== null) {
      event.preventDefault()
      focusOption(match)
    }
  }

  const scrollPage = (direction: 1 | -1) => {
    const scroller = track.current
    if (scroller) scroller.scrollBy({ left: direction * scroller.clientWidth * 0.9, behavior: reduced ? 'auto' : 'smooth' })
  }

  const canList = placement === 'dock' || onListViewChange !== undefined
  const toggleList = () => (onListViewChange ? onListViewChange(!listView) : setLocalList(!localList))
  const fromMission = model.source === 'mission' && missionEvaluation !== null
  // La REF no cuenta como priorizado: no es un candidato de la búsqueda (se nombra aparte).
  const prioritized = missionEvaluation ? prioritizedCount(missionEvaluation) : { candidates: 0, of: 0, reference: false }
  // El modo se oculta en contenedores angostos (la hoja ya tiene las pestañas encima); el rótulo
  // de las reglas nunca se oculta: dice de dónde salen los estados.
  const title = fromMission
    ? `Tu misión · ${prioritized.candidates} ${prioritized.candidates === 1 ? 'priorizado' : 'priorizados'}${prioritized.reference ? ' + REF' : ''}`
    : <>Lugares<span className="places-suffix"> · {mission ? 'Misión' : 'Explorar'}</span></>
  const note = fromMission
    ? `${busy ? 'Editó la prueba: confirme y evalúe de nuevo · ' : ''}Estados del cálculo determinista (${RULES_VERSION}) · similitud v3 sin recalcular · factibilidad territorial pendiente`
    : mission
      ? 'Sin evaluar: defina y confirme los requisitos en «Tu misión». Similitud v3 del snapshot.'
      : promise ?? null
  // Cuenta lo que se ve: ◆ con tarjeta; los que coinciden con un sector van como insignia.
  const matched = new Set([...classification.badges.values()].flat().map((analog) => analog.id)).size
  const catalogNote =
    catalog.status === 'ready'
      ? `${model.references.length} por calcular${matched > 0 ? ` · ${matched} coincide con un sector` : ''}`
      : catalog.status === 'loading' ? 'cargando…' : 'sin catálogo'

  if (options.length === 0) {
    return (
      <div className="places" data-placement={placement}>
        <div className="places-head"><p className="places-title">{title}</p></div>
        <p className="places-state">No hay lugares para mostrar: el snapshot no trae sectores.</p>
      </div>
    )
  }

  const renderOption = (option: Place, index: number) => {
    const selected = option.id === selectedId
    return (
      <div
        key={option.id}
        ref={(el) => {
          if (el) els.current.set(option.id, el)
          else els.current.delete(option.id)
        }}
        id={`${listboxId}-${option.id}`}
        role="option"
        aria-selected={selected}
        tabIndex={index === active ? 0 : -1}
        className="places-card"
        data-kind={option.kind}
        data-role={option.kind === 'evaluated' ? option.role : undefined}
        data-status={option.kind === 'evaluated' ? option.mission?.status ?? option.status : 'por_calcular'}
        style={{ '--i': Math.min(index, 6) } as CSSProperties}
        onClick={() => choose(option)}
        onFocus={(event) => {
          // Solo el foco de teclado previsualiza en el globo: el foco que devuelve el armazón tras
          // un toque no debe dejar un hover pegado (pin fuera de su grupo).
          if (focusVisible(event.currentTarget)) hover(option)
        }}
        onBlur={() => uiActions.setHover(null)}
        onPointerEnter={(event) => {
          // En táctil no hay «hover»: un toque publicaría un hover que nadie limpia.
          if (event.pointerType !== 'touch') hover(option)
        }}
        onPointerLeave={() => uiActions.setHover(null)}
      >
        {option.kind === 'evaluated'
          ? <EvaluatedOption place={option} rankedCount={model.rankedCount} selected={selected} />
          : <ReferenceOption place={option} selected={selected} />}
      </div>
    )
  }

  const evaluatedCount = model.evaluated.length
  const candidateGroup = model.groups.find((group) => group.role === 'candidate')
  const filters: Array<[CountryFilter, string]> = [['all', 'Todos'], ...model.countries.map((code) => [code, countryLabels[code]] as [CountryFilter, string])]
  let offset = 0
  return (
    <div className="places" data-placement={placement} data-view={listView ? 'list' : 'carousel'} data-busy={busy ? '' : undefined} aria-busy={busy || undefined}>
      <div className="places-head">
        <p className="places-title">
          <span>{title}</span>
          <small className="places-counts"><span aria-hidden="true">{GLYPH.evaluated}</span> {model.rankedCount} candidatos · 1 REF</small>
          <small className="places-catalog" title={catalog.status === 'unavailable' ? catalog.reason : undefined}><span aria-hidden="true">{GLYPH.reference}</span> {catalogNote}</small>
          <small className="places-profile">{fromMission ? `estado · reglas ${RULES_VERSION}` : 'similitud v3'}</small>
        </p>
        <div className="places-tools">
          {!fromMission && model.countries.length > 1 && (
            <div className="country-filter places-filter" role="group" aria-label="Filtrar candidatos por país">
              {filters.map(([value, label]) => (
                <button type="button" key={value} aria-pressed={country === value} onClick={() => setCountry(value)}>{label}</button>
              ))}
            </div>
          )}
          <span className="places-count">{listView ? `${options.length} lugares` : rangeLabel(range, options.length)}</span>
          {canList && (
            <button type="button" className="places-tool" aria-controls={listboxId} onClick={toggleList}>
              {listView ? 'Ver carrusel' : 'Ver lista'}
            </button>
          )}
          {!listView && (
            <>
              <button type="button" className="places-tool places-arrow" aria-label="Lugares anteriores" aria-controls={listboxId} disabled={edges.start} onClick={() => scrollPage(-1)}>‹</button>
              <button type="button" className="places-tool places-arrow" aria-label="Lugares siguientes" aria-controls={listboxId} disabled={edges.end} onClick={() => scrollPage(1)}>›</button>
            </>
          )}
        </div>
      </div>
      {fromMission && missionEvaluation.outcome !== 'evaluated'
        ? <DiagnosisNote evaluation={missionEvaluation} />
        : note && <p className="places-note" title={note}>{note}</p>}
      <div
        ref={track}
        id={listboxId}
        role="listbox"
        aria-label="Lugares"
        aria-orientation={listView ? 'vertical' : 'horizontal'}
        className="places-track"
        onKeyDown={onKeyDown}
        onPointerDown={(event) => { touch.current = event.pointerType === 'touch' }}
      >
        {candidateGroup && candidateGroup.places.length === 0 && (
          <p className="places-empty" role="status">
            La búsqueda no dejó candidatos {country === 'all' ? 'elegibles' : `en ${countryLabels[country]}`}. No se completa la lista con sitios elegidos a mano.
          </p>
        )}
        {model.groups.map((group, groupIndex) => {
          const start = offset
          offset += group.places.length
          if (group.places.length === 0) return null
          return (
            <div
              key={group.key}
              role="group"
              aria-labelledby={`${listboxId}-g${groupIndex}`}
              className="places-group"
              data-role={group.role ?? undefined}
              data-status={group.status ?? undefined}
            >
              <span id={`${listboxId}-g${groupIndex}`} role="presentation" className="places-group-label">
                {group.role === 'reference' ? `Referencia conocida: ${group.places.map((item) => placeLabelOf(item)).join(', ')}` : group.label}
              </span>
              {group.places.map((option, index) => renderOption(option, start + index))}
            </div>
          )
        })}
        {model.references.length > 0 && (
          <div role="group" aria-labelledby={`${listboxId}-g2`} className="places-group" data-kind="reference">
            <span id={`${listboxId}-g2`} role="presentation" className="places-group-label">
              <span aria-hidden="true">{GLYPH.reference}</span> Emblemáticos · por calcular
            </span>
            {model.references.map((option, index) => renderOption(option, evaluatedCount + index))}
          </div>
        )}
      </div>
    </div>
  )
}
