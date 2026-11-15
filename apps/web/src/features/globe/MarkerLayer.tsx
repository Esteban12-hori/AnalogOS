/**
 * ●◆○ markers and group chips, with the same style on the globe (DOM layer projected in
 * useFrame) and on the 2D map (inside MapLibre's Marker). Each marker is a real <button>:
 * focus, keyboard and screen reader. The visible labels are aria-hidden because the
 * button's accessible label already says the same thing.
 *
 * What changes on every frame (position, visibility, label, grouping) is written by the globe
 * directly to the DOM, with attributes `data-*` that React never manages.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  clusterAriaLabel,
  clusterParts,
  clusterStack,
  markerAriaLabel,
  markerGlyph,
  markerBadgeText,
  markerScoreText,
  markerStatusText,
  type MarkerCluster,
  type MarkerCounts,
  type MarkerKind,
  type MarkerModel,
} from './markers'
import { GLYPH } from '../../shell/public'
import './markers.css'
import { similarityTone } from '../../domain/similarityScale'

export type PinRef = (element: HTMLDivElement | null) => void

export interface MarkerPinProps {
  model: MarkerModel
  selected: boolean
  hover: boolean
  /** Label within the budget. On the globe the projector decides it per frame (without this prop). */
  labeled?: boolean
  onActivate: (model: MarkerModel) => void
  rootRef?: PinRef
  style?: CSSProperties
}

export function MarkerPin({ model, selected, hover, labeled, onActivate, rootRef, style }: MarkerPinProps) {
  const score = markerScoreText(model)
  const status = markerStatusText(model)
  const badge = markerBadgeText(model)
  const className = `globe-pin is-${model.kind}${selected ? ' is-selected' : ''}${hover ? ' is-hover' : ''}`
  return (
    <div
      ref={rootRef}
      className={className}
      data-pin={model.id}
      data-label={labeled ? '' : undefined}
      data-role={model.role}
      data-status={model.missionStatus ?? undefined}
      style={style}
    >
      <div className="globe-pin-body">
        <span className="globe-pin-halo" aria-hidden="true" />
        <span className="globe-pin-ring" aria-hidden="true" />
        <button
          type="button"
          className="globe-pin-button"
          aria-pressed={selected}
          aria-label={markerAriaLabel(model)}
          onClick={() => onActivate(model)}
        >
          <span className="globe-pin-glyph" aria-hidden="true">{model.missionStatus === 'no_cumple_requisitos' ? GLYPH.fail : markerGlyph(model.kind)}</span>
          <span className="globe-pin-label" aria-hidden="true">
            {badge && <b className="globe-pin-rank">{badge}</b>}
            <span className="globe-pin-name">{model.name}</span>
            {score && <span className="globe-pin-score" data-sim-tone={similarityTone(model.score) ?? undefined}>{score}</span>}
            {status && <span className="globe-pin-status">{status}</span>}
            {model.contains !== null && <span className="globe-pin-status">contains {model.contains} {model.contains === 1 ? 'sector' : 'sectors'}</span>}
            {selected && model.kind === 'reference' && <span className="globe-pin-status">approximate area</span>}
            {model.coincides.length > 0 && <span className="globe-pin-badge">◆ matches {model.coincides.join(' · ')}</span>}
          </span>
        </button>
      </div>
    </div>
  )
}

/** Group glyphs from their counts, in the order ● ○ ◆. */
export function kindsFromCounts(counts: MarkerCounts): MarkerKind[] {
  return [
    ...Array<MarkerKind>(counts.evaluated).fill('evaluated'),
    ...Array<MarkerKind>(counts.insufficient).fill('insufficient'),
    ...Array<MarkerKind>(counts.reference).fill('reference'),
  ]
}

export interface ClusterChipProps {
  clusterKey: string
  counts: MarkerCounts
  group: string
  /** Already-resolved members (in 2D they arrive when the list is opened). */
  members: readonly MarkerModel[] | null
  open: boolean
  hover: boolean
  onToggle: (open: boolean) => void
  onActivate: (model: MarkerModel) => void
  rootRef?: PinRef
  style?: CSSProperties
}

function listId(key: string): string {
  return `globe-cluster-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function ClusterChip({ clusterKey, counts, group, members, open, hover, onToggle, onActivate, rootRef, style }: ClusterChipProps) {
  const chip = useRef<HTMLButtonElement>(null)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return
    // Esc closes the list before the selection (the shell respects defaultPrevented).
    event.preventDefault()
    onToggle(false)
    chip.current?.focus()
  }
  const id = listId(clusterKey)
  return (
    <div ref={rootRef} className={`globe-cluster${open ? ' is-open' : ''}${hover ? ' is-hover' : ''}`} data-cluster={clusterKey} style={style} onKeyDown={onKeyDown}>
      <div className="globe-pin-body">
        <span className="globe-pin-halo" aria-hidden="true" />
        <button
          ref={chip}
          type="button"
          className="globe-cluster-chip"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-label={clusterAriaLabel(counts, group, open)}
          onClick={() => onToggle(!open)}
        >
          <span className="globe-cluster-stack" aria-hidden="true">{clusterStack(kindsFromCounts(counts))}</span>
          <span className="globe-cluster-text" aria-hidden="true">
            {group && <span>{group}</span>}
            {clusterParts(counts).map(({ kind, count }) => (
              <span key={kind} className={`globe-cluster-count is-${kind}`}>{count} <i>{markerGlyph(kind)}</i></span>
            ))}
            <span className="globe-cluster-caret">▸</span>
          </span>
        </button>
        {open && (
          <ul id={id} className="globe-cluster-list">
            {members === null ? (
              <li className="globe-cluster-wait">Finding the places in the group…</li>
            ) : (
              members.map((model) => {
                const detail = markerScoreText(model) ?? markerStatusText(model)
                return (
                  <li key={model.id}>
                    <button type="button" className={`globe-cluster-item is-${model.kind}`} aria-label={markerAriaLabel(model)} onClick={() => onActivate(model)}>
                      <span className="globe-pin-glyph" aria-hidden="true">{markerGlyph(model.kind)}</span>
                      <span aria-hidden="true">
                        {markerBadgeText(model) && <b className="globe-pin-rank">{markerBadgeText(model)}</b>} {model.name}
                        {detail && <em> · {detail}</em>}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Globe DOM layer
// ---------------------------------------------------------------------------

/** Per-frame state of a marker or group, as left by the last frame. */
export interface PinFrame {
  x: number
  y: number
  opacity: number
  /** Group shifted below the selected place: glyphs only. */
  compact?: boolean
}

/**
 * Mutable bridge between the DOM layer (outside the Canvas) and the projector (inside the Canvas). It is not
 * React state: the projector writes here and to the DOM without re-rendering anything.
 */
export interface GlobeMarkerRuntime {
  pins: Map<string, HTMLDivElement>
  clusters: Map<string, HTMLDivElement>
  lastPin: Map<string, PinFrame>
  lastCluster: Map<string, PinFrame>
  /** Last computed partition: the layer picks it up when it mounts (it may arrive after the frame). */
  clusterList: MarkerCluster[]
  /** Registered by the layer: the projector calls it only when the partition changes. */
  setClusters: ((clusters: MarkerCluster[]) => void) | null
  /** Registered by the Canvas: requests a frame (frameloop "demand"). */
  invalidate: (() => void) | null
}

export function createGlobeMarkerRuntime(): GlobeMarkerRuntime {
  return { pins: new Map(), clusters: new Map(), lastPin: new Map(), lastCluster: new Map(), clusterList: [], setClusters: null, invalidate: null }
}

/** Applies position and opacity to the element (also used by the projector on every frame). */
export function applyPinFrame(element: HTMLElement, frame: PinFrame): void {
  const transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)`
  if (element.style.transform !== transform) element.style.transform = transform
  // The label is shortened so it does not run under the rail or off screen (markers.css, max-width).
  const pinX = `${Math.round(frame.x)}px`
  if (element.style.getPropertyValue('--pin-x') !== pinX) element.style.setProperty('--pin-x', pinX)
  const opacity = frame.opacity >= 0.999 ? '' : frame.opacity.toFixed(3)
  if (element.style.opacity !== opacity) element.style.opacity = opacity
  setDataFlag(element, 'compact', frame.compact === true)
}

/** Sets or removes a data-* attribute without touching it if it is already as it should be. */
export function setDataFlag(element: HTMLElement, name: string, on: boolean): void {
  const present = name in element.dataset
  if (on && !present) element.dataset[name] = ''
  else if (!on && present) delete element.dataset[name]
}

/** Restarts a one-shot CSS animation tied to a data-* attribute. */
function retrigger(element: HTMLElement, name: string, durationMs: number): void {
  delete element.dataset[name]
  void element.offsetWidth
  element.dataset[name] = ''
  window.setTimeout(() => delete element.dataset[name], durationMs)
}

/** Selection when the camera arrives: the ring emits a pulse (900 ms) and then stays static. */
export function pulsePin(element: HTMLElement): void {
  retrigger(element, 'pulse', 950)
}

/** Zone halos in order, each `staggerMs` (choreography D: new order of results). */
export function playHalos(elements: ReadonlyMap<string, HTMLElement>, order: readonly string[], staggerMs: number): void {
  order.forEach((id, index) => {
    const element = elements.get(id)
    if (!element) return
    element.style.setProperty('--halo-delay', `${index * staggerMs}ms`)
    retrigger(element, 'halo', 950 + index * staggerMs)
  })
}

export type IntroState = 'pending' | 'play' | 'done'

export interface GlobeMarkerOverlayProps {
  runtime: GlobeMarkerRuntime
  models: readonly MarkerModel[]
  selectedId: string | null
  hoverId: string | null
  intro: IntroState
  onActivate: (model: MarkerModel) => void
}

/** Delays for choreography A: ● in order 1→2→3 every 120 ms after 300 ms; then ◆ and groups. */
export function landingDelays(models: readonly MarkerModel[]): { pins: Map<string, number>; after: number } {
  const pins = new Map<string, number>()
  let sectors = 0
  for (const model of models) if (model.kind !== 'reference') pins.set(model.id, 300 + 120 * sectors++)
  const after = 300 + 120 * sectors
  for (const model of models) if (model.kind === 'reference') pins.set(model.id, after)
  return { pins, after }
}

export function GlobeMarkerOverlay({ runtime, models, selectedId, hoverId, intro, onActivate }: GlobeMarkerOverlayProps) {
  const [clusters, setClusters] = useState<MarkerCluster[]>(() => runtime.clusterList)
  const [openKey, setOpenKey] = useState<string | null>(null)
  useLayoutEffect(() => {
    runtime.setClusters = setClusters
    // The projector may have computed the partition before this layer existed.
    setClusters(runtime.clusterList)
    return () => {
      runtime.setClusters = null
    }
  }, [runtime])
  useEffect(() => {
    if (openKey !== null && !clusters.some((cluster) => cluster.key === openKey)) setOpenKey(null)
  }, [clusters, openKey])

  // A stable ref callback per id: React does not call them again on every render.
  const pinRefs = useRef(new Map<string, PinRef>())
  const pinRef = useCallback((id: string): PinRef => {
    let ref = pinRefs.current.get(id)
    if (!ref) {
      ref = (element) => {
        if (!element) {
          runtime.pins.delete(id)
          return
        }
        runtime.pins.set(id, element)
        const last = runtime.lastPin.get(id)
        if (last) applyPinFrame(element, last)
        else {
          // No previous frame: hidden until the projector places it.
          element.dataset.hidden = ''
          runtime.invalidate?.()
        }
      }
      pinRefs.current.set(id, ref)
    }
    return ref
  }, [runtime])
  const clusterRefs = useRef(new Map<string, PinRef>())
  const clusterRef = useCallback((key: string): PinRef => {
    let ref = clusterRefs.current.get(key)
    if (!ref) {
      ref = (element) => {
        if (!element) {
          runtime.clusters.delete(key)
          clusterRefs.current.delete(key)
          return
        }
        runtime.clusters.set(key, element)
        const last = runtime.lastCluster.get(key)
        if (last) applyPinFrame(element, last)
      }
      clusterRefs.current.set(key, ref)
    }
    return ref
  }, [runtime])

  const byId = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const delays = useMemo(() => landingDelays(models), [models])
  const landing = (ms: number | undefined): CSSProperties | undefined => (ms === undefined ? undefined : ({ '--land-delay': `${ms}ms` } as CSSProperties))

  return (
    <div className="globe-pins" data-intro={intro} data-selection={selectedId ? '' : undefined}>
      {models.map((model) => (
        <MarkerPin
          key={model.id}
          model={model}
          selected={model.id === selectedId}
          hover={model.id === hoverId}
          onActivate={onActivate}
          rootRef={pinRef(model.id)}
          style={landing(delays.pins.get(model.id))}
        />
      ))}
      {clusters.map((cluster) => (
        <ClusterChip
          key={cluster.key}
          clusterKey={cluster.key}
          counts={cluster.counts}
          group={cluster.group}
          members={cluster.members.flatMap((id) => byId.get(id) ?? [])}
          open={openKey === cluster.key}
          hover={hoverId !== null && cluster.members.includes(hoverId)}
          onToggle={(open) => setOpenKey(open ? cluster.key : null)}
          onActivate={(model) => {
            setOpenKey(null)
            onActivate(model)
          }}
          rootRef={clusterRef(cluster.key)}
          style={landing(delays.after)}
        />
      ))}
    </div>
  )
}
