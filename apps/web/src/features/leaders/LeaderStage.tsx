/**
 * DOM of the Tesla lines. React mounts it once per content; on each camera frame the
 * controller moves it (transform and `d`) without going through React. The entire layer is aria-hidden:
 * it duplicates the metrics rail, which is the accessible path (and the one the screen reader reads).
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
  /** Active or previewed criterion in the rail: its label and its line are highlighted. */
  activeId: string | null
  /** Mission in progress: results prior to --o-busy. */
  busy: boolean
  /** Changes with each new selection or result: it waits again for the camera and redraws. */
  drawKey: string
  /** Per-frame channel of the stage (features/globe), injected by LeaderLayer. */
  bridge: LeaderStageBridge
}

function measure(element: HTMLElement | null | undefined): Size | null {
  return element ? { width: element.offsetWidth, height: element.offsetHeight } : null
}

function indexStyle(index: number): CSSProperties {
  return { '--i': index } as CSSProperties
}

/**
 * Stage slots that cover the layer without being `data-obstacle` of the frame: the HUD strip
 * (the positioned box that hosts the "Lines" toggle, slot `stage.hud`) and the "✦ Reading"
 * pill (slot `pill.reading`). Neither labels nor lines may cross them.
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

  // New selection or result: hide and wait for the camera to arrive.
  useLayoutEffect(() => {
    controller.restart()
  }, [controller, props.drawKey])

  // Content or layout settled: measure once (never per frame) and recalculate.
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
    // One frame later: the HUD repositions itself using the stage's margin variables.
    const frame = requestAnimationFrame(refresh)
    return () => cancelAnimationFrame(frame)
  }, [refresh, siteId, geometry, labels, header, narrow, sideSheet, compact, width, height, insets, obstacles])
  // The HUD grows in 2D (fonts) and the pill changes text: it is remeasured when the size changes.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => refresh())
    for (const host of slotHosts()) observer.observe(host)
    return () => observer.disconnect()
  }, [refresh])

  // Each camera frame goes straight to the controller.
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
                // pathLength normalizes the progressive stroke; the dashed line (no data) does not use it.
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
              Whole sector
              {header.area && <> · {header.area}</>}
              {header.scale ? <> · medians {header.scale}</> : <> · medians</>}
              {header.vsMars && (
                <> · vs <span className="leaders-mars-glyph">{GLYPH.jezero}</span> Jezero (MOLA)</>
              )}
              {header.mission && <> · with your requirements</>}
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
            <span className="leaders-chip-card">Metrics in the panel <span className="leaders-chip-arrow">→</span></span>
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
        {label.limiting && <span className="leaders-tag">limiting</span>}
      </div>
      <div className="leaders-values">
        <span className="leaders-site"><span className="leaders-site-glyph">{GLYPH.evaluated}</span> {label.siteText}</span>
        {reference.kind === 'mars' && (
          <span className="leaders-mars"><span className="leaders-mars-glyph">{GLYPH.jezero}</span> {reference.text}</span>
        )}
        {reference.kind === 'rule' && <span className="leaders-rule">{GLYPH.rule} rule</span>}
        {reference.kind === 'none' && <span className="leaders-nomars">{NO_MARS_TEXT}</span>}
      </div>
      <div className="leaders-sim" data-sim-tone={similarityTone(label.similarity, 0) ?? undefined}>
        {label.similarity !== null ? (
          <>
            <span className="leaders-bar"><span style={{ transform: `scaleX(${label.similarity / 100})` }} /></span>
            <span className="leaders-pct">{label.similarityText}</span>
            <span className="leaders-sim-word">similarity</span>
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
