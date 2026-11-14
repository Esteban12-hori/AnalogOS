/**
 * Marcadores ●◆○ y chips de grupo, con el mismo estilo en el globo (capa DOM proyectada en
 * useFrame) y en el mapa 2D (dentro de los Marker de MapLibre). Cada marcador es un <button>
 * real: foco, teclado y lector de pantalla. Los rótulos visibles van aria-hidden porque la
 * etiqueta accesible del botón ya dice lo mismo.
 *
 * Lo que cambia en cada cuadro (posición, visibilidad, rótulo, agrupado) lo escribe el globo
 * directo en el DOM, con atributos `data-*` que React nunca gestiona.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  clusterAriaLabel,
  clusterParts,
  clusterStack,
  markerAriaLabel,
  markerGlyph,
  markerScoreText,
  markerStatusText,
  type MarkerCluster,
  type MarkerCounts,
  type MarkerKind,
  type MarkerModel,
} from './markers'
import './markers.css'

export type PinRef = (element: HTMLDivElement | null) => void

export interface MarkerPinProps {
  model: MarkerModel
  selected: boolean
  hover: boolean
  /** Rótulo dentro del presupuesto. En el globo lo decide el proyector por cuadro (sin esta prop). */
  labeled?: boolean
  onActivate: (model: MarkerModel) => void
  rootRef?: PinRef
  style?: CSSProperties
}

export function MarkerPin({ model, selected, hover, labeled, onActivate, rootRef, style }: MarkerPinProps) {
  const score = markerScoreText(model)
  const status = markerStatusText(model)
  const className = `globe-pin is-${model.kind}${selected ? ' is-selected' : ''}${hover ? ' is-hover' : ''}`
  return (
    <div ref={rootRef} className={className} data-pin={model.id} data-label={labeled ? '' : undefined} style={style}>
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
          <span className="globe-pin-glyph" aria-hidden="true">{markerGlyph(model.kind)}</span>
          <span className="globe-pin-label" aria-hidden="true">
            {model.rank !== null && <b className="globe-pin-rank">#{model.rank}</b>}
            <span className="globe-pin-name">{model.name}</span>
            {score && <span className="globe-pin-score">{score}</span>}
            {status && <span className="globe-pin-status">{status}</span>}
            {model.contains !== null && <span className="globe-pin-status">contiene {model.contains} {model.contains === 1 ? 'sector' : 'sectores'}</span>}
            {selected && model.kind === 'reference' && <span className="globe-pin-status">zona aproximada</span>}
            {model.coincides.length > 0 && <span className="globe-pin-badge">◆ coincide con {model.coincides.join(' · ')}</span>}
          </span>
        </button>
      </div>
    </div>
  )
}

/** Glifos del grupo a partir de sus conteos, en el orden ● ○ ◆. */
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
  /** Miembros ya resueltos (en el 2D llegan al abrir la lista). */
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
    // Esc cierra la lista antes que la selección (el armazón respeta defaultPrevented).
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
              <li className="globe-cluster-wait">Buscando lugares del grupo…</li>
            ) : (
              members.map((model) => {
                const detail = markerScoreText(model) ?? markerStatusText(model)
                return (
                  <li key={model.id}>
                    <button type="button" className={`globe-cluster-item is-${model.kind}`} aria-label={markerAriaLabel(model)} onClick={() => onActivate(model)}>
                      <span className="globe-pin-glyph" aria-hidden="true">{markerGlyph(model.kind)}</span>
                      <span aria-hidden="true">
                        {model.rank !== null && <b className="globe-pin-rank">#{model.rank}</b>} {model.name}
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
// Capa DOM del globo
// ---------------------------------------------------------------------------

/** Estado por cuadro de un marcador o grupo, tal como lo dejó el último cuadro. */
export interface PinFrame {
  x: number
  y: number
  opacity: number
  /** Grupo corrido bajo el lugar seleccionado: solo glifos. */
  compact?: boolean
}

/**
 * Puente mutable entre la capa DOM (fuera del Canvas) y el proyector (dentro del Canvas). No es
 * estado de React: el proyector escribe aquí y en el DOM sin re-renderizar nada.
 */
export interface GlobeMarkerRuntime {
  pins: Map<string, HTMLDivElement>
  clusters: Map<string, HTMLDivElement>
  lastPin: Map<string, PinFrame>
  lastCluster: Map<string, PinFrame>
  /** Última partición calculada: la capa la toma al montarse (puede llegar después del cuadro). */
  clusterList: MarkerCluster[]
  /** Lo registra la capa: el proyector lo llama solo cuando cambia la partición. */
  setClusters: ((clusters: MarkerCluster[]) => void) | null
  /** Lo registra el Canvas: pide un cuadro (frameloop «demand»). */
  invalidate: (() => void) | null
}

export function createGlobeMarkerRuntime(): GlobeMarkerRuntime {
  return { pins: new Map(), clusters: new Map(), lastPin: new Map(), lastCluster: new Map(), clusterList: [], setClusters: null, invalidate: null }
}

/** Aplica posición y opacidad al elemento (también lo usa el proyector en cada cuadro). */
export function applyPinFrame(element: HTMLElement, frame: PinFrame): void {
  const transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)`
  if (element.style.transform !== transform) element.style.transform = transform
  // El rótulo se acorta para no pasar bajo el riel ni fuera de pantalla (markers.css, max-width).
  const pinX = `${Math.round(frame.x)}px`
  if (element.style.getPropertyValue('--pin-x') !== pinX) element.style.setProperty('--pin-x', pinX)
  const opacity = frame.opacity >= 0.999 ? '' : frame.opacity.toFixed(3)
  if (element.style.opacity !== opacity) element.style.opacity = opacity
  setDataFlag(element, 'compact', frame.compact === true)
}

/** Activa o quita un atributo data-* sin tocarlo si ya está como corresponde. */
export function setDataFlag(element: HTMLElement, name: string, on: boolean): void {
  const present = name in element.dataset
  if (on && !present) element.dataset[name] = ''
  else if (!on && present) delete element.dataset[name]
}

/** Reinicia una animación CSS de un solo disparo ligada a un atributo data-*. */
function retrigger(element: HTMLElement, name: string, durationMs: number): void {
  delete element.dataset[name]
  void element.offsetWidth
  element.dataset[name] = ''
  window.setTimeout(() => delete element.dataset[name], durationMs)
}

/** Selección al llegar la cámara: el anillo emite un pulso (900 ms) y queda estático. */
export function pulsePin(element: HTMLElement): void {
  retrigger(element, 'pulse', 950)
}

/** Halos de zona en orden, cada `staggerMs` (coreografía D: orden nuevo de resultados). */
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

/** Retardos de la coreografía A: ● en orden 1→2→3 cada 120 ms tras 300 ms; luego ◆ y grupos. */
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
    // El proyector pudo calcular la partición antes de que esta capa existiera.
    setClusters(runtime.clusterList)
    return () => {
      runtime.setClusters = null
    }
  }, [runtime])
  useEffect(() => {
    if (openKey !== null && !clusters.some((cluster) => cluster.key === openKey)) setOpenKey(null)
  }, [clusters, openKey])

  // Un callback de ref estable por id: React no los vuelve a llamar en cada render.
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
          // Sin cuadro previo: oculto hasta que el proyector lo ubique.
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
