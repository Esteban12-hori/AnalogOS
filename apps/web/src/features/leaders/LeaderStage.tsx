/**
 * DOM de las líneas Tesla. React lo monta una vez por contenido; cada cuadro de cámara lo
 * mueve el controlador (transform y `d`) sin pasar por React. Toda la capa es aria-hidden:
 * duplica el riel de métricas, que es la ruta accesible (y la que lee el lector de pantalla).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { CandidateGeometry } from '../../domain/contracts'
import { GLYPH } from '../../shell/public'
import type { StageInsets } from '../../state/ui'
import { createLeaderController, type LeaderController, type LeaderTargets } from './controller'
import type { Size } from './frame'
import { NO_MARS_TEXT, type LeaderHeaderModel, type LeaderLabelModel } from './labelModel'
import { toRects, type LeaderStageBridge } from './projector'
import './leaders.css'
import { similarityTone } from '../../domain/similarityScale'

export interface LeaderStageProps {
  siteId: string
  geometry: CandidateGeometry
  labels: readonly LeaderLabelModel[]
  header: LeaderHeaderModel
  narrow: boolean
  sideSheet: boolean
  compact: boolean
  width: number
  height: number
  insets: StageInsets
  obstacles: ReadonlyArray<{ x: number; y: number; width: number; height: number }>
  /** Criterio activo o en vista previa en el riel: se resalta su etiqueta y su línea. */
  activeId: string | null
  /** Misión en curso: resultados previos a --o-busy. */
  busy: boolean
  /** Cambia con cada selección o resultado nuevo: vuelve a esperar a la cámara y a trazar. */
  drawKey: string
  /** Canal por cuadro del escenario (features/globe), inyectado por LeaderLayer. */
  bridge: LeaderStageBridge
}

function measure(element: HTMLElement | null | undefined): Size | null {
  return element ? { width: element.offsetWidth, height: element.offsetHeight } : null
}

function indexStyle(index: number): CSSProperties {
  return { '--i': index } as CSSProperties
}

/**
 * Slots del escenario que tapan la capa sin ser `data-obstacle` del armazón: la franja del HUD
 * (la caja posicionada que aloja el interruptor «Líneas», slot `stage.hud`) y la píldora
 * «✦ Lectura» (slot `pill.reading`). Ni etiquetas ni líneas pueden cruzarlos.
 */
function slotHosts(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const hosts: HTMLElement[] = []
  let hud = document.querySelector<HTMLElement>('.leaders-toggle')?.parentElement ?? null
  while (hud && hud !== document.body && getComputedStyle(hud).position === 'static') hud = hud.parentElement
  if (hud && hud !== document.body) hosts.push(hud)
  const pill = document.querySelector<HTMLElement>('[data-slot="pill.reading"]')
  if (pill) hosts.push(pill)
  return hosts
}

export function LeaderStage(props: LeaderStageProps) {
  const { labels, header, narrow, activeId } = props
  const root = useRef<HTMLDivElement>(null)
  const labelEls = useRef(new Map<string, HTMLDivElement>())
  const pathEls = useRef(new Map<string, SVGPathElement>())
  const headerEl = useRef<HTMLDivElement>(null)
  const chipEl = useRef<HTMLDivElement>(null)
  const originEl = useRef<SVGCircleElement>(null)
  const mobileEl = useRef<SVGPathElement>(null)
  const mobileEndEl = useRef<SVGCircleElement>(null)
  const controllerRef = useRef<LeaderController | null>(null)
  const { bridge } = props
  if (!controllerRef.current) {
    controllerRef.current = createLeaderController({
      readStage: bridge.read,
      targets: (): LeaderTargets => ({
        root: root.current,
        labels: labelEls.current,
        paths: pathEls.current,
        header: headerEl.current,
        chip: chipEl.current,
        origin: originEl.current,
        mobile: mobileEl.current,
        mobileEnd: mobileEndEl.current,
      }),
    })
  }
  const controller = controllerRef.current

  // Selección o resultado nuevo: ocultar y esperar a que la cámara llegue.
  useLayoutEffect(() => {
    controller.restart()
  }, [controller, props.drawKey])

  // Contenido o layout asentado: medir una vez (nunca por cuadro) y recalcular.
  const latest = useRef(props)
  latest.current = props
  const refresh = useCallback(() => {
    const current = latest.current
    controller.setScene({
      siteId: current.siteId,
      geometry: current.geometry,
      narrow: current.narrow,
      sideSheet: current.sideSheet,
      compact: current.compact,
      viewport: { width: current.width, height: current.height },
      insets: current.insets,
      obstacles: [...toRects(current.obstacles), ...toRects(slotHosts().map((host) => host.getBoundingClientRect()))],
      labels: current.narrow
        ? []
        : current.labels.flatMap((label) => {
            const size = measure(labelEls.current.get(label.id))
            return size ? [{ id: label.id, ...size }] : []
          }),
      header: current.narrow ? null : measure(headerEl.current),
      chip: current.narrow ? null : measure(chipEl.current),
    })
  }, [controller])
  const { siteId, geometry, sideSheet, compact, width, height, insets, obstacles } = props
  useLayoutEffect(() => {
    refresh()
    // Un cuadro después: el HUD se reubica con las variables de márgenes del escenario.
    const frame = requestAnimationFrame(refresh)
    return () => cancelAnimationFrame(frame)
  }, [refresh, siteId, geometry, labels, header, narrow, sideSheet, compact, width, height, insets, obstacles])
  // El HUD crece en 2D (fuentes) y la píldora cambia de texto: se remide al cambiar de tamaño.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => refresh())
    for (const host of slotHosts()) observer.observe(host)
    return () => observer.disconnect()
  }, [refresh])

  // Cada cuadro de cámara va directo al controlador.
  useEffect(() => {
    const unsubscribe = bridge.subscribe(controller.frame)
    return () => {
      unsubscribe()
    }
  }, [bridge, controller])
  useEffect(() => () => controller.dispose(), [controller])

  return (
    <div
      ref={root}
      className="leaders-layer"
      data-mode="off"
      data-phase="waiting"
      data-narrow={narrow ? '' : undefined}
      data-busy={props.busy ? '' : undefined}
      data-active={activeId ? '' : undefined}
      aria-hidden="true"
    >
      <svg className="leaders-svg" width="100%" height="100%" focusable="false">
        {narrow ? (
          <g className="leaders-mobile">
            <path ref={mobileEl} className="leaders-path" pathLength={1} d="" />
            <circle ref={mobileEndEl} className="leaders-dot" r={2.5} cx={-99} cy={-99} />
          </g>
        ) : (
          <g className="leaders-lines">
            {labels.map((label, index) => (
              <path
                key={label.id}
                ref={(element) => {
                  if (element) pathEls.current.set(label.id, element)
                  else pathEls.current.delete(label.id)
                }}
                className="leaders-path"
                data-pending={label.pending ? '' : undefined}
                data-active={activeId === label.id ? '' : undefined}
                // pathLength normaliza el trazo progresivo; la línea discontinua (sin dato) no lo usa.
                pathLength={label.pending ? undefined : 1}
                style={indexStyle(index)}
                d=""
              />
            ))}
            <circle ref={originEl} className="leaders-dot" r={2.5} cx={-99} cy={-99} />
          </g>
        )}
      </svg>

      {!narrow && (
        <>
          <div ref={headerEl} className="leaders-header" data-placed="0">
            <div className="leaders-header-text">
              Todo el sector
              {header.area && <> · {header.area}</>}
              {header.scale ? <> · medianas {header.scale}</> : <> · medianas</>}
              {header.vsMars && (
                <> · vs <span className="leaders-mars-glyph">{GLYPH.jezero}</span> Jezero (MOLA)</>
              )}
              {header.mission && <> · con tus requisitos</>}
            </div>
          </div>

          {labels.map((label, index) => (
            <div
              key={label.id}
              ref={(element) => {
                if (element) labelEls.current.set(label.id, element)
                else labelEls.current.delete(label.id)
              }}
              className="leaders-label"
              data-placed="0"
              data-pending={label.pending ? '' : undefined}
              data-active={activeId === label.id ? '' : undefined}
              style={indexStyle(index)}
            >
              <LeaderCard label={label} />
            </div>
          ))}

          <div ref={chipEl} className="leaders-chip" data-placed="0">
            <span className="leaders-chip-card">Métricas en el panel <span className="leaders-chip-arrow">→</span></span>
          </div>
        </>
      )}
    </div>
  )
}

function LeaderCard({ label }: { label: LeaderLabelModel }) {
  const { reference } = label
  return (
    <div className="leaders-card">
      <div className="leaders-title">
        <span>{label.title}</span>
        {label.limiting && <span className="leaders-tag">limitante</span>}
      </div>
      <div className="leaders-values">
        <span className="leaders-site"><span className="leaders-site-glyph">{GLYPH.evaluated}</span> {label.siteText}</span>
        {reference.kind === 'mars' && (
          <span className="leaders-mars"><span className="leaders-mars-glyph">{GLYPH.jezero}</span> {reference.text}</span>
        )}
        {reference.kind === 'rule' && <span className="leaders-rule">{GLYPH.rule} regla</span>}
        {reference.kind === 'none' && <span className="leaders-nomars">{NO_MARS_TEXT}</span>}
      </div>
      <div className="leaders-sim" data-sim-tone={similarityTone(label.similarity, 0) ?? undefined}>
        {label.similarity !== null ? (
          <>
            <span className="leaders-bar"><span style={{ transform: `scaleX(${label.similarity / 100})` }} /></span>
            <span className="leaders-pct">{label.similarityText}</span>
            <span className="leaders-sim-word">similitud</span>
          </>
        ) : (
          <>
            <span className="leaders-bar is-pending" />
            <span className="leaders-pct is-pending">{label.similarityText}</span>
          </>
        )}
      </div>
      {label.requirement && (
        <div className="leaders-req" data-status={label.requirement.status}>
          <b aria-hidden="true">{label.requirement.mark}</b> {label.requirement.text}
        </div>
      )}
      {label.note && <div className="leaders-note">{label.note}</div>}
    </div>
  )
}
