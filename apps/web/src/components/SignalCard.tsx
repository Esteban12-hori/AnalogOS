/**
 * SignalCard: series card with glow, animated line, and odometer-style figure.
 * Adapted from "Market Card" (Louis Studios, studios.lou15.com) for AnalogOS:
 * Spanish text, decimal comma, no menu or background grid, and the ends of `data`
 * always treated as visual entry/exit (the marker never rests on them).
 *
 * The glow field is computed on the CPU at half resolution; line, marker, and guide on a sharp 2D
 * canvas; all text is DOM. A single rAF that pauses when offscreen or in hidden tabs.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

export interface SignalCardProps {
  /** Series with an entry value and an exit value at the ends (not selectable). */
  data: number[]
  /** Converts the value under the marker into the main figure. */
  format: (value: number) => string
  /** Top label; receives the displayed index to name the point (e.g. the month). */
  labelAt: (index: number) => string
  /** Bold text after the change, e.g. "compared to the previous month". */
  deltaLabel: string
  /** Text when the point has no real previous point. */
  firstLabel: string
  defaultIndex?: number
  accent?: string
  cardColor?: string
  textColor?: string
  lineColor?: string
  downColor?: string
  upColor?: string
  /** false animates the exit (the line retracts, the glow dims); true repeats the entry. */
  revealed?: boolean
  ariaLabel: string
  className?: string
  style?: CSSProperties
}

const CW = 499
const CH = 203
const RADIUS = 27
const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Arial, sans-serif'

const X0F = 0.455411
const X1F = 1.014863
const YTOPF = 0.444408
const YBOTF = 0.898283
const TENSION = 1.2
const LINE_W = 6.4
const RING_R = 7
const RING_W = 4

const BASE = 0.8555
const PAD_X = 26.5
const LABEL_SIZE = 16.5
const LABEL_BASE = 33
const FIG_SIZE = 80
const FIG_BASE = 131
const FIG_TRACK = -0.0217
const CAP_SIZE = 12.1
const CAP_LH = 13.4
const CAP_BASE = 170.5
const CHIP_SIZE = 11
const CHIP_H = 23
const CHIP_GAP = 27.5

const GX = 18
const GY = 8
const GLOW_T = [
  0.2, -0.052, -0.017, -0.038, 0.07, 0.249, 0.487, 0.647, 0.886, 1.019, 0.998, 1.008, 1.005, 1.004, 1.001, 1.002, 0.999, 0.999,
  0.012, 0.096, 0.12, 0.171, 0.243, 0.31, 0.573, 0.7, 0.85, 0.933, 0.948, 0.95, 0.957, 0.966, 0.979, 0.99, 0.996, 0.999,
  0.133, 0.126, 0.154, 0.171, 0.234, 0.261, 0.415, 0.619, 0.699, 0.772, 0.793, 0.81, 0.83, 0.865, 0.913, 0.949, 0.981, 0.997,
  0.072, 0.103, 0.128, 0.162, 0.212, 0.27, 0.357, 0.487, 0.576, 0.61, 0.619, 0.637, 0.672, 0.718, 0.79, 0.89, 0.947, 0.978,
  0.088, 0.089, 0.108, 0.136, 0.175, 0.218, 0.278, 0.35, 0.413, 0.461, 0.456, 0.495, 0.547, 0.612, 0.694, 0.815, 0.914, 0.98,
  0.098, 0.087, 0.097, 0.111, 0.133, 0.159, 0.188, 0.22, 0.254, 0.29, 0.325, 0.386, 0.498, 0.544, 0.668, 0.722, 0.787, 1.016,
  0.042, 0.076, 0.073, 0.075, 0.078, 0.086, 0.101, 0.149, 0.186, 0.23, 0.27, 0.439, 0.517, 0.567, 0.667, 0.726, 0.861, 1.032,
  0.12, -0.029, 0.017, -0.004, 0.004, 0, -0.008, -0.017, -0.013, 0.046, 0.121, 0.369, 0.442, 0.595, 0.659, 0.736, 0.809, 0.931,
]
const RAMP = [
  [-18.9, 1.328, 1.248], [-13.8, 1.357, 1.165], [-6.9, 1.315, 1.15], [-2.4, 1.27, 1.08], [0, 1.08, 0.98], [1.5, 0.93, 0.9],
  [3.5, 0.86, 0.8], [4, 0.751, 0.657], [5.3, 0.731, 0.478], [4.6, 0.624, 0.362], [8.6, 0.434, 0.279],
] as const
const RIM_GAIN = 0.3
const RIM_W = 9
const SHEEN_PAST = 0.45
const SHEEN_TOP = 0.1075
const SHEEN_TOP_W = 31
const SHEEN_BOT = 0.061
const SHEEN_BOT_W = 12
const SHEEN_RIGHT = 0.034
const SHEEN_RIGHT_W = 16
const UNDER_FROM = 0.735
const UNDER_MAX = 0.8

const T_END = 2.05
const BREATH_PERIOD = 5.4
const HALO_PERIOD = 2.7

type RGB = [number, number, number]

function parseHex(input: string, fallback: RGB): RGB {
  const match = /^#([0-9a-f]{6})$/i.exec(input.trim())
  if (!match) return fallback
  const h = match[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360
  s = Math.min(1, Math.max(0, s))
  l = Math.min(1, Math.max(0, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${+a.toFixed(4)})`
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
const backOut = (t: number) => 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2)
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))

interface Bez { x1: number; y1: number; x2: number; y2: number }
interface Curve {
  pts: { x: number; y: number }[]
  bez: Bez[]
  lens: number[]
  total: number
  lo: number
  hi: number
}

function bezAt(px: number, py: number, b: Bez, qx: number, qy: number, t: number): [number, number] {
  const u = 1 - t
  const a = u * u * u, c = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t
  return [a * px + c * b.x1 + d * b.x2 + e * qx, a * py + c * b.y1 + d * b.y2 + e * qy]
}

function buildCurve(data: number[]): Curve {
  const n = data.length
  const inner = n > 3 ? data.slice(1, -1) : data
  let mn = Math.min(...inner), mx = Math.max(...inner)
  if (!(mx > mn)) { mn -= 1; mx += 1 }
  const x0 = X0F * CW, x1 = X1F * CW
  const yt = YTOPF * CH, yb = YBOTF * CH
  const pts = data.map((v, i) => ({
    x: n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : (x0 + x1) / 2,
    y: yb - ((v - mn) / (mx - mn)) * (yb - yt),
  }))
  const tan = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    const k = i === 0 || i === n - 1 ? TENSION : TENSION / 2
    return { x: (b.x - a.x) * k, y: (b.y - a.y) * k }
  })
  const bez: Bez[] = []
  const lens = [0]
  for (let i = 0; i < n - 1; i++) {
    const p = pts[i], q = pts[i + 1]
    const b = { x1: p.x + tan[i].x / 3, y1: p.y + tan[i].y / 3, x2: q.x - tan[i + 1].x / 3, y2: q.y - tan[i + 1].y / 3 }
    bez.push(b)
    let L = 0, px = p.x, py = p.y
    for (let s = 1; s <= 24; s++) {
      const [x, y] = bezAt(p.x, p.y, b, q.x, q.y, s / 24)
      L += Math.hypot(x - px, y - py)
      px = x
      py = y
    }
    lens.push(lens[i] + L)
  }
  const margin = RING_R + RING_W / 2 + 2
  // The ends are visual entry/exit: they are never a selectable data point.
  let lo = n > 3 ? 1 : 0
  let hi = n > 3 ? n - 2 : n - 1
  const inside = (p: { x: number; y: number }) => p.x >= margin && p.x <= CW - margin && p.y >= margin && p.y <= CH - margin
  while (lo < hi && !inside(pts[lo])) lo++
  while (hi > lo && !inside(pts[hi])) hi--
  return { pts, bez, lens, total: lens[n - 1] || 0, lo, hi }
}

function curveAt(c: Curve, f: number): [number, number] {
  const n = c.pts.length
  if (n === 1) return [c.pts[0].x, c.pts[0].y]
  const i = clamp(Math.floor(f), 0, n - 2)
  const t = clamp(f - i, 0, 1)
  const p = c.pts[i], q = c.pts[i + 1]
  return bezAt(p.x, p.y, c.bez[i], q.x, q.y, t)
}

function arcAt(c: Curve, f: number): number {
  const n = c.pts.length
  if (n < 2) return 0
  const i = clamp(Math.floor(f), 0, n - 2)
  const t = clamp(f - i, 0, 1)
  return c.lens[i] + (c.lens[i + 1] - c.lens[i]) * t
}

function tracePath(ctx: CanvasRenderingContext2D, c: Curve) {
  const p = c.pts
  ctx.beginPath()
  ctx.moveTo(p[0].x, p[0].y)
  for (let i = 0; i < p.length - 1; i++) ctx.bezierCurveTo(c.bez[i].x1, c.bez[i].y1, c.bez[i].x2, c.bez[i].y2, p[i + 1].x, p[i + 1].y)
}

function crWeights(t: number, out: Float32Array, o: number) {
  const t2 = t * t, t3 = t2 * t
  out[o] = -0.5 * t3 + t2 - 0.5 * t
  out[o + 1] = 1.5 * t3 - 2.5 * t2 + 1
  out[o + 2] = -1.5 * t3 + 2 * t2 + 0.5 * t
  out[o + 3] = 0.5 * t3 - 0.5 * t2
}

class Field {
  w = 0
  h = 0
  img: ImageData | null = null
  tmap = new Float32Array(0)
  mxCached = -1
  lut = new Float32Array(0)
  surf = new Float32Array(0)
  rimAdd: RGB = [0, 0, 0]
  sheen = new Float32Array(0)
  colRight = new Float32Array(0)
  colRim = new Float32Array(0)
  key = ''

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    this.img = new ImageData(w, h)
    this.tmap = new Float32Array(w * h)
    this.mxCached = -1
    this.key = ''
  }

  palette(accent: RGB, card: RGB) {
    const key = `${accent.join(',')}|${card.join(',')}|${this.h}`
    if (key === this.key) return
    this.key = key
    const [h, s, l] = rgbToHsl(accent)
    const stops = RAMP.map(([dh, ks, kl]) => hslToRgb(h + dh, s * ks, l * kl))
    const N = 512
    this.lut = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const f = (i / (N - 1)) * (stops.length - 1)
      const j = Math.min(stops.length - 2, Math.floor(f))
      const c = mixRgb(stops[j], stops[j + 1], f - j)
      this.lut.set(c, i * 3)
    }
    this.surf = new Float32Array(this.h * 3)
    this.sheen = new Float32Array(this.h)
    for (let y = 0; y < this.h; y++) {
      const cy = ((y + 0.5) / this.h) * CH
      const a = SHEEN_TOP * Math.exp(-cy / SHEEN_TOP_W) + SHEEN_BOT * Math.exp(-(CH - cy) / SHEEN_BOT_W)
      for (let k = 0; k < 3; k++) this.surf[y * 3 + k] = card[k] + (255 - card[k]) * a
      this.sheen[y] = SHEEN_PAST * SHEEN_TOP * Math.exp(-cy / SHEEN_TOP_W)
    }
    const rim = stops[0]
    this.rimAdd = [rim[0] * RIM_GAIN, rim[1] * RIM_GAIN, rim[2] * RIM_GAIN]
    this.mxCached = -1
  }

  layout(mx: number) {
    if (Math.abs(mx - this.mxCached) < 0.02) return
    this.mxCached = mx
    const { w, h, tmap } = this
    const wx = new Float32Array(w * 4)
    const ix = new Int32Array(w)
    for (let x = 0; x < w; x++) {
      const cx = ((x + 0.5) / w) * CW
      const gx = clamp(cx / Math.max(mx, 1), 0, 1) * (GX - 1)
      const i = Math.min(GX - 2, Math.floor(gx))
      ix[x] = i
      crWeights(gx - i, wx, x * 4)
    }
    const wy = new Float32Array(4)
    for (let y = 0; y < h; y++) {
      const gy = ((y + 0.5) / h) * (GY - 1)
      const j = Math.min(GY - 2, Math.floor(gy))
      crWeights(gy - j, wy, 0)
      const rows = [Math.max(0, j - 1), j, j + 1, Math.min(GY - 1, j + 2)]
      for (let x = 0; x < w; x++) {
        const i = ix[x]
        const c0 = Math.max(0, i - 1), c1 = i, c2 = i + 1, c3 = Math.min(GX - 1, i + 2)
        const o = x * 4
        let t = 0
        for (let b = 0; b < 4; b++) {
          const r = rows[b] * GX
          t += wy[b] * (wx[o] * GLOW_T[r + c0] + wx[o + 1] * GLOW_T[r + c1] + wx[o + 2] * GLOW_T[r + c2] + wx[o + 3] * GLOW_T[r + c3])
        }
        tmap[y * w + x] = t
      }
    }
  }

  paint(mx: number, glow: number, breath: number, seedFrame: number) {
    const { w, h, tmap, lut, surf, img } = this
    if (!img) return
    const d = img.data
    const rim = this.rimAdd
    const lift = (1 - glow) * 1.15
    const tb = 1 + breath
    let seed = (seedFrame * 2654435761) >>> 0
    if (this.colRight.length !== w) {
      this.colRight = new Float32Array(w)
      this.colRim = new Float32Array(w)
      for (let x = 0; x < w; x++) {
        const cx = ((x + 0.5) / w) * CW
        this.colRight[x] = SHEEN_RIGHT * Math.exp(-(CW - cx) / SHEEN_RIGHT_W)
        this.colRim[x] = Math.exp(-cx / RIM_W)
      }
    }
    const { colRight, colRim } = this
    for (let y = 0; y < h; y++) {
      const sr = surf[y * 3], sg = surf[y * 3 + 1], sb = surf[y * 3 + 2]
      const sh = this.sheen[y]
      for (let x = 0; x < w; x++) {
        const right = colRight[x]
        const s0 = sr + (255 - sr) * right, s1 = sg + (255 - sg) * right, s2 = sb + (255 - sb) * right
        const px0 = (x / w) * CW, px1 = ((x + 1) / w) * CW
        const cov = clamp01((mx - px0) / (px1 - px0))
        let r = s0, g = s1, b = s2
        if (cov > 0) {
          let t = tmap[y * w + x] * tb + lift
          t = t < 0 ? 0 : t > 1 ? 1 : t
          let pr: number, pg: number, pb: number
          if (t < 0.9) {
            const k = Math.round((t / 0.9) * 511) * 3
            pr = lut[k]; pg = lut[k + 1]; pb = lut[k + 2]
            pr += (255 - pr) * sh; pg += (255 - pg) * sh; pb += (255 - pb) * sh
          } else {
            const f = (t - 0.9) / 0.1
            const k = 511 * 3
            const sf = sh * (1 - f)
            pr = lut[k] + (255 - lut[k]) * sf
            pg = lut[k + 1] + (255 - lut[k + 1]) * sf
            pb = lut[k + 2] + (255 - lut[k + 2]) * sf
            pr += (s0 - pr) * f; pg += (s1 - pg) * f; pb += (s2 - pb) * f
          }
          const e = colRim[x] * glow
          pr += rim[0] * e; pg += rim[1] * e; pb += rim[2] * e
          r = s0 + (pr - s0) * cov
          g = s1 + (pg - s1) * cov
          b = s2 + (pb - s2) * cov
        }
        seed = (seed * 1664525 + 1013904223) >>> 0
        const noise = (seed / 4294967296 - 0.5) * 1.2
        const o = (y * w + x) * 4
        d[o] = r + noise
        d[o + 1] = g + noise
        d[o + 2] = b + noise
        d[o + 3] = 255
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Final figure (docs/UX_REDESIGN.md §0.7 and §2.2.3): no figure is animated or passes through
// intermediate values. The text appears with its final value; when it changes, a fade with 4 px of
// displacement (like FadeNumber). Only the curve is animated.
// ---------------------------------------------------------------------------------------------

class FinalFigure {
  private text: string | null = null
  private readonly root: HTMLElement

  constructor(root: HTMLElement) {
    this.root = root
  }

  /** The size is set by the container; here only the scaled tracking. */
  setFont(_font: string, _size: number, track: number) {
    const spacing = `${track.toFixed(3)}px`
    if (this.root.style.letterSpacing !== spacing) this.root.style.letterSpacing = spacing
  }

  set(text: string, instant: boolean) {
    if (text === this.text) return
    const first = this.text === null
    this.text = text
    this.root.textContent = text
    if (first || instant || typeof this.root.animate !== 'function') return
    this.root.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2, 0, 0, 1)' })
  }

  /** Entry: only the block's opacity; the figure is already final from the first frame. */
  step(_dt: number, intro: number, _instant: boolean) {
    const opacity = String(clamp01(intro * 2.2))
    if (this.root.style.opacity !== opacity) this.root.style.opacity = opacity
  }
}

// ---------------------------------------------------------------------------------------------

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Percentage change against the previous point; null if the previous one is only the visual entry. */
function deltaOf(data: number[], i: number, lo: number): number | null {
  if (i <= lo) return null
  const ref = data[i - 1], v = data[i]
  if (!Number.isFinite(ref) || ref === 0 || !Number.isFinite(v)) return null
  return ((v - ref) / Math.abs(ref)) * 100
}

function fmtDelta(d: number | null) {
  if (d === null) return 'inicio'
  const r = Math.round(d * 10) / 10
  if (r === 0) return '0,0 %'
  return `${r < 0 ? '↓ −' : '↑ +'}${Math.abs(r).toFixed(1)}%`
}

export function SignalCard({
  data,
  format,
  labelAt,
  deltaLabel,
  firstLabel,
  defaultIndex,
  accent = '#0297DE',
  cardColor = '#050E15',
  textColor = '#F2F8FC',
  lineColor = '#FFFFFF',
  // Orange is Mars as data and red/orange are not used for alerts (§2.4): both
  // directions go in ice; the direction is conveyed by ↑/↓ in the text.
  downColor = '#CFE9F7',
  upColor = '#5CC8F5',
  revealed = true,
  ariaLabel,
  className,
  style,
}: SignalCardProps) {
  const reduced = usePrefersReducedMotion()
  const series = useMemo(() => data.map((v) => (Number.isFinite(v) ? v : 0)), [data])
  const curve = useMemo(() => buildCurve(series), [series])
  const [selfIndex, setSelfIndex] = useState(() => clamp(defaultIndex ?? curve.hi, curve.lo, curve.hi))
  const selected = clamp(selfIndex, curve.lo, curve.hi)
  const [shown, setShown] = useState(selected)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [focusVisible, setFocusVisible] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLCanvasElement>(null)
  const mainRef = useRef<HTMLCanvasElement>(null)
  const figRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const chipTextRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)
  const kickRef = useRef<() => void>(() => {})

  const accentRgb = parseHex(accent, [2, 151, 222])
  const cardRgb = parseHex(cardColor, [5, 14, 21])
  const textRgb = parseHex(textColor, [242, 248, 252])
  const lineRgb = parseHex(lineColor, [255, 255, 255])
  const downRgb = parseHex(downColor, [207, 233, 247])
  const upRgb = parseHex(upColor, [92, 200, 245])

  const delta = deltaOf(series, shown, curve.lo)
  const deltaText = fmtDelta(delta)
  const rounded = delta === null ? 0 : Math.round(delta * 10)
  const negative = rounded < 0
  const deltaRgb = negative ? downRgb : upRgb
  const figure = format(series[shown])
  const word = delta === null ? '' : rounded === 0 ? 'no change' : negative ? 'decrease' : 'increase'
  const tail = delta === null ? firstLabel : deltaLabel
  const label = labelAt(shown)

  const live = useRef({
    curve, selected, hover: null as number | null, reduced, revealed,
    accentRgb, cardRgb, textRgb, lineRgb, deltaRgb, figure, deltaText, focusVisible, size,
  })
  live.current = { ...live.current, curve, selected, reduced, revealed, accentRgb, cardRgb, textRgb, lineRgb, deltaRgb, figure, deltaText, focusVisible, size }

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height }))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cw = Math.max(0, Math.min(size.w, (size.h * CW) / CH))
  const s = cw / CW
  const left = (size.w - cw) / 2
  const top = (size.h - (cw * CH) / CW) / 2
  const labelPx = Math.max(11, LABEL_SIZE * s)
  const figPx = FIG_SIZE * s
  const capPx = Math.max(11, CAP_SIZE * s)
  const capLh = capPx * (CAP_LH / CAP_SIZE)
  const chipPx = Math.max(11, CHIP_SIZE * s)

  const shownRef = useRef(shown)
  shownRef.current = shown

  useEffect(() => {
    const root = rootRef.current, fieldCv = fieldRef.current, mainCv = mainRef.current
    const figEl = figRef.current, chipEl = chipRef.current, chipTxt = chipTextRef.current
    if (!root || !fieldCv || !mainCv || !figEl || !chipEl || !chipTxt) return
    const fctx = fieldCv.getContext('2d')
    const ctx = mainCv.getContext('2d')
    if (!fctx || !ctx) return
    const field = new Field()
    const fig = new FinalFigure(figEl)
    const chipRoll = new FinalFigure(chipTxt)
    const st = {
      idx: live.current.selected,
      vel: 0,
      rt: live.current.reduced ? T_END : 0,
      last: -1,
      start: performance.now(),
      raf: 0,
      visible: true,
      frame: 0,
      lastShown: shownRef.current,
    }

    const frame = () => {
      st.raf = 0
      const L = live.current
      const now = performance.now()
      const dt = st.last < 0 ? 0 : clamp((now - st.last) / 1000, 0, 0.05)
      st.last = now
      st.frame++
      const reducedMotion = L.reduced
      const time = (now - st.start) / 1000

      if (reducedMotion) st.rt = L.revealed ? T_END : 0
      else if (L.revealed) st.rt = Math.min(T_END, st.rt + dt)
      else st.rt = Math.max(0, st.rt - dt * 1.7)
      const rt = st.rt

      const c = L.curve
      const target = clamp(L.hover ?? L.selected, c.lo, c.hi)
      if (reducedMotion) { st.idx = target; st.vel = 0 }
      else {
        const k = 90, damp = 2 * Math.sqrt(k) * 1.02
        st.vel += (-(st.idx - target) * k - st.vel * damp) * dt
        st.idx += st.vel * dt
        if (Math.abs(st.idx - target) < 1e-4 && Math.abs(st.vel) < 1e-3) { st.idx = target; st.vel = 0 }
      }
      st.idx = clamp(st.idx, c.lo, c.hi)
      const di = clamp(Math.round(st.idx), c.lo, c.hi)
      if (di !== st.lastShown) {
        st.lastShown = di
        setShown(di)
      }

      const { w: W, h: H } = L.size
      const cardW = Math.max(0, Math.min(W, (H * CW) / CH))
      if (cardW < 10) return
      const sc = cardW / CW
      const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1))
      const pw = Math.round(cardW * dpr), ph = Math.round(((cardW * CH) / CW) * dpr)
      if (mainCv.width !== pw || mainCv.height !== ph) { mainCv.width = pw; mainCv.height = ph }
      const fw = clamp(Math.round(cardW / 2), 100, 340), fh = Math.max(8, Math.round((fw * CH) / CW))
      if (fieldCv.width !== fw || fieldCv.height !== fh) { fieldCv.width = fw; fieldCv.height = fh }
      field.resize(fw, fh)
      field.palette(L.accentRgb, L.cardRgb)

      const glow = easeInOut(seg(rt, 0.12, 1.75))
      const drawT = easeInOut(seg(rt, 0.22, 1.62))
      const [mxu, myu] = curveAt(c, st.idx)
      const markerArc = arcAt(c, st.idx) / (c.total || 1)
      const ringStart = 0.22 + 1.4 * markerArc * 0.92
      const ringIn = reducedMotion ? 1 : backOut(seg(rt, ringStart, ringStart + 0.4))
      const chipIn = reducedMotion ? 1 : seg(rt, 1.42, 1.92)
      const guideIn = reducedMotion ? 1 : easeOut(seg(rt, 1.3, 1.9))
      const textIn = seg(rt, 0.05, 0.75)
      const capIn = seg(rt, 0.75, 1.4)
      const figIn = seg(rt, 0.15, 1.75)
      const breath = reducedMotion ? 0 : 0.028 * Math.sin((time / BREATH_PERIOD) * Math.PI * 2) * glow

      field.layout(mxu)
      field.paint(mxu, glow, breath, reducedMotion ? 1 : st.frame)
      if (field.img) fctx.putImageData(field.img, 0, 0)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, pw, ph)
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0)
      const total = c.total
      const shownLen = total * drawT
      const pastLen = Math.min(shownLen, arcAt(c, st.idx))
      const tx = L.textRgb

      if (shownLen > 0.5) {
        const pastClip = () => { ctx.beginPath(); ctx.rect(-50, -50, mxu + 50, CH + 100); ctx.clip() }
        const futureClip = () => { ctx.beginPath(); ctx.rect(mxu, -50, CW + 100, CH + 100); ctx.clip() }
        const ux0 = UNDER_FROM * mxu
        const dark = mixRgb([0, 0, 0], L.accentRgb, 0.06)
        if (glow > 0.001) {
          ctx.save()
          pastClip()
          tracePath(ctx, c)
          const last = c.pts[c.pts.length - 1]
          ctx.lineTo(last.x, CH + 40)
          ctx.lineTo(c.pts[0].x, CH + 40)
          ctx.closePath()
          const g = ctx.createLinearGradient(ux0, 0, mxu, 0)
          for (let i = 0; i <= 8; i++) {
            const t = i / 8
            g.addColorStop(t, css(dark, UNDER_MAX * t * t * (3 - 2 * t) * glow * clamp01(drawT * 1.4 - 0.2)))
          }
          ctx.fillStyle = g
          ctx.fill()
          ctx.restore()
        }

        ctx.save()
        futureClip()
        tracePath(ctx, c)
        ctx.lineWidth = LINE_W
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.setLineDash([shownLen, total + 10])
        ctx.strokeStyle = css(tx, 0.12)
        ctx.stroke()
        ctx.restore()

        if (pastLen > 0.5) {
          ctx.save()
          pastClip()
          tracePath(ctx, c)
          ctx.lineWidth = LINE_W
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.setLineDash([pastLen, total + 10])
          ctx.shadowColor = css(mixRgb([0, 0, 0], L.accentRgb, 0.1), 0.95)
          ctx.shadowBlur = 8 * sc * dpr
          ctx.shadowOffsetY = 6 * sc * dpr
          ctx.strokeStyle = css(L.lineRgb, 1)
          ctx.stroke()
          ctx.shadowColor = 'rgba(0, 0, 0, 0)'
          ctx.stroke()
          ctx.restore()
        }
      }

      if (guideIn > 0.001 && ringIn > 0.01) {
        const y0 = myu + RING_R + RING_W / 2 + 3.4
        const y1 = y0 + (CH - y0) * guideIn
        if (y1 > y0) {
          ctx.save()
          const g = ctx.createLinearGradient(0, y0, 0, CH)
          g.addColorStop(0, css(tx, 0.2))
          g.addColorStop(1, css(tx, 0.3))
          ctx.strokeStyle = g
          ctx.lineWidth = 1.5
          ctx.setLineDash([5.6, 3.1])
          ctx.beginPath()
          ctx.moveTo(mxu, y0)
          ctx.lineTo(mxu, y1)
          ctx.stroke()
          ctx.restore()
        }
      }

      if (ringIn > 0.001) {
        const dc = L.deltaRgb
        if (!reducedMotion && rt >= T_END - 0.01) {
          const phase = ((time % HALO_PERIOD) + HALO_PERIOD) % HALO_PERIOD / HALO_PERIOD
          const a = phase < 0.62 ? Math.sin((phase / 0.62) * Math.PI) : 0
          if (a > 0.001) {
            const rr = RING_R + 2 + easeOut(phase / 0.62) * 11
            const g = ctx.createRadialGradient(mxu, myu, RING_R, mxu, myu, rr + 4)
            g.addColorStop(0, css(dc, 0))
            g.addColorStop(0.7, css(dc, 0.22 * a))
            g.addColorStop(1, css(dc, 0))
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(mxu, myu, rr + 4, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        ctx.save()
        ctx.translate(mxu, myu)
        ctx.scale(Math.max(0, ringIn), Math.max(0, ringIn))
        ctx.beginPath()
        ctx.arc(0, 0, RING_R + RING_W / 2 + 0.6, 0, Math.PI * 2)
        ctx.fillStyle = css(mixRgb([0, 0, 0], dc, 0.22), 0.85)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, 0, RING_R, 0, Math.PI * 2)
        ctx.fillStyle = css(mixRgb(L.cardRgb, dc, 0.06), 1)
        ctx.fill()
        ctx.lineWidth = RING_W
        ctx.strokeStyle = css(dc, 1)
        ctx.stroke()
        if (L.focusVisible) {
          ctx.beginPath()
          ctx.arc(0, 0, RING_R + RING_W / 2 + 4.5, 0, Math.PI * 2)
          ctx.lineWidth = 1.6
          ctx.strokeStyle = css(mixRgb(L.accentRgb, [255, 255, 255], 0.45), 0.95)
          ctx.stroke()
        }
        ctx.restore()
      }

      {
        const chipW = chipEl.offsetWidth, chipH = chipEl.offsetHeight
        const cardBox = mainCv.getBoundingClientRect()
        const figBox = figEl.getBoundingClientRect()
        const avoid = figBox.width > 0
          ? [{ l: figBox.left - cardBox.left - 4, t: figBox.top - cardBox.top, r: figBox.right - cardBox.left + 6, b: figBox.bottom - cardBox.top }]
          : []
        const hits = (x: number, y: number) => avoid.some((a) => x < a.r && x + chipW > a.l && y < a.b && y + chipH > a.t)
        const cxFor = (dx: number) => clamp(mxu * sc - chipW / 2 + dx, 6, cardW - chipW - 6)
        const reach = Math.max(0, chipW / 2 - 9)
        let cx = cxFor(0)
        let cy = (myu - CHIP_GAP) * sc - chipH
        let below = cy < 4
        if (!below && hits(cx, cy)) {
          let found = false
          for (let k = 1; k <= 8 && !found; k++) {
            for (const sg of [1, -1]) {
              const x = cxFor((sg * k * reach) / 8)
              if (Math.abs(x + chipW / 2 - mxu * sc) <= reach + 0.5 && !hits(x, cy)) { cx = x; found = true; break }
            }
          }
          if (!found) below = true
        }
        if (below) { cy = (myu + CHIP_GAP) * sc; cx = cxFor(0) }
        const pop = reducedMotion ? 1 : backOut(chipIn)
        chipEl.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) scale(${(0.6 + 0.4 * pop).toFixed(4)})`
        chipEl.style.transformOrigin = `${(mxu * sc - cx).toFixed(1)}px ${below ? 0 : chipH}px`
        chipEl.style.opacity = String(clamp01(chipIn * 1.8))
        const tailEl = chipEl.querySelector('svg')
        if (tailEl) {
          const th = tailEl.getBoundingClientRect().height / Math.max(0.001, 0.6 + 0.4 * pop)
          tailEl.style.bottom = below ? 'auto' : `${(-th + 1.5).toFixed(2)}px`
          tailEl.style.top = below ? `${(-th + 1.5).toFixed(2)}px` : 'auto'
          tailEl.style.transform = below ? 'translateX(-50%) rotate(180deg)' : 'translateX(-50%)'
          tailEl.style.left = `${clamp(mxu * sc - cx, 8, chipW - 8).toFixed(2)}px`
        }
      }

      const lab = labelRef.current, cap = capRef.current
      if (lab) {
        lab.style.opacity = String(easeOut(textIn))
        lab.style.transform = `translate3d(0, ${((1 - easeOut(textIn)) * 6 * sc).toFixed(2)}px, 0)`
      }
      if (cap) {
        cap.style.opacity = String(easeOut(capIn))
        cap.style.transform = `translate3d(0, ${((1 - easeOut(capIn)) * 6 * sc).toFixed(2)}px, 0)`
      }
      fig.setFont(`600 ${(FIG_SIZE * sc).toFixed(3)}px ${FONT}`, FIG_SIZE * sc, FIG_TRACK * FIG_SIZE * sc)
      fig.set(L.figure, reducedMotion)
      fig.step(dt, reducedMotion ? 1 : figIn, reducedMotion)
      const chipPx2 = Math.max(11, CHIP_SIZE * sc)
      chipRoll.setFont(`600 ${chipPx2.toFixed(3)}px ${FONT}`, chipPx2, 0)
      chipRoll.set(L.deltaText, reducedMotion)
      chipRoll.step(dt, 1, reducedMotion)

      if (st.visible && !document.hidden) st.raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!st.raf && st.visible && !document.hidden) { st.last = -1; st.raf = requestAnimationFrame(frame) }
    }
    kickRef.current = kick
    const io = new IntersectionObserver((entries) => {
      st.visible = entries.some((e) => e.isIntersecting)
      if (st.visible) kick()
    })
    io.observe(root)
    const onVisibility = () => { if (!document.hidden) kick() }
    document.addEventListener('visibilitychange', onVisibility)
    kick()
    return () => {
      if (st.raf) cancelAnimationFrame(st.raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      kickRef.current = () => {}
    }
  }, [])

  useEffect(() => { kickRef.current() })

  const select = useCallback((i: number) => {
    const c = live.current.curve
    setSelfIndex(clamp(Math.round(i), c.lo, c.hi))
  }, [])

  const hitLeft = (curve.pts[curve.lo].x - 16) * s
  const pointerToIndex = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const card = s > 0 ? (e.clientX - r.left + hitLeft) / s : 0
    const c = live.current.curve
    const n = c.pts.length
    const x0 = c.pts[0].x, x1 = c.pts[n - 1].x
    const f = n > 1 ? ((card - x0) / (x1 - x0)) * (n - 1) : 0
    const base = Math.round(f), d = f - base
    return clamp(base + (Math.sign(d) * Math.pow(Math.abs(d) * 2, 2.2)) / 2, c.lo, c.hi)
  }
  const dragging = useRef(false)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || dragging.current) {
      live.current.hover = pointerToIndex(e)
      kickRef.current()
    }
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* no capture available */ }
    live.current.hover = pointerToIndex(e)
    kickRef.current()
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      dragging.current = false
      select(pointerToIndex(e))
      if (e.pointerType !== 'mouse') live.current.hover = null
    }
    kickRef.current()
  }
  const onPointerLeave = () => {
    if (dragging.current) return
    live.current.hover = null
    kickRef.current()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = live.current.curve
    let j = selected
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = selected - 1
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = selected + 1
    else if (e.key === 'Home') j = c.lo
    else if (e.key === 'End') j = c.hi
    else return
    e.preventDefault()
    live.current.hover = null
    select(j)
  }

  const chipBg = mixRgb([0, 0, 0], deltaRgb, 0.19)
  const chipEdge = css(mixRgb(deltaRgb, [255, 255, 255], 0.55), 0.2)
  const labelTop = LABEL_BASE * s - BASE * labelPx
  const figTop = FIG_BASE * s - BASE * figPx
  const capTop = CAP_BASE * s - capLh / 2 - 0.3555 * capPx
  const valueText = `${label}: ${figure}. ${delta === null ? firstLabel : `${deltaText} ${word} ${deltaLabel}`}`

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative', width: '100%', overflow: 'visible', fontFamily: FONT, ...style }}>
      <div
        style={{
          position: 'absolute', left, top, width: cw, height: (cw * CH) / CW, borderRadius: RADIUS * s, overflow: 'hidden',
          background: cardColor,
          boxShadow: `0 0 0 1px rgba(2, 7, 10, 0.85), 0 ${18 * s}px ${48 * s}px rgba(0, 0, 0, 0.45)`,
          isolation: 'isolate', visibility: cw > 0 ? 'visible' : 'hidden',
        }}
      >
        <canvas ref={fieldRef} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        <canvas ref={mainRef} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

        <div ref={labelRef} style={{ position: 'absolute', left: PAD_X * s, top: labelTop, fontSize: labelPx, lineHeight: '1em', fontWeight: 450, letterSpacing: '-0.012em', color: css(textRgb, 0.74), whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {label}
        </div>

        <div aria-hidden style={{ position: 'absolute', left: PAD_X * s - 0.045 * figPx, top: figTop, fontSize: figPx, lineHeight: '1em', fontWeight: 600, color: css(textRgb, 1), whiteSpace: 'nowrap', pointerEvents: 'none', display: 'flex', fontFeatureSettings: '"kern" 0, "tnum" 1' }}>
          <div ref={figRef} style={{ position: 'relative', display: 'flex', height: '1em' }} />
        </div>

        <div ref={capRef} style={{ position: 'absolute', left: PAD_X * s, top: capTop, width: Math.max(150 * s, Math.min(capPx * 13.5, (225 - PAD_X) * s)), fontSize: capPx, lineHeight: `${capLh}px`, letterSpacing: '-0.02em', color: css(textRgb, 0.66), pointerEvents: 'none' }}>
          {delta === null ? tail : <><span style={{ color: css(textRgb, 1), fontWeight: 600 }}>{deltaText} {word}</span> {tail}</>}
        </div>

        <div
          ref={chipRef}
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: 0, height: Math.max(CHIP_H * s, chipPx * 1.95), padding: `0 ${Math.max(5.2 * s, chipPx * 0.5)}px`,
            display: 'flex', alignItems: 'center', borderRadius: 4.5 * s, background: css(chipBg, 1),
            boxShadow: `inset 0 0 0 1px ${chipEdge}`, color: css(deltaRgb, 1), fontSize: chipPx, fontWeight: 600,
            pointerEvents: 'none', opacity: 0, willChange: 'transform',
          }}
        >
          <span ref={chipTextRef} style={{ position: 'relative', display: 'flex', height: '1em', lineHeight: '1em' }} />
          <ChipTail s={s} bg={css(chipBg, 1)} edge={chipEdge} />
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={curve.lo}
          aria-valuemax={curve.hi}
          aria-valuenow={selected}
          aria-valuetext={valueText}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerLeave}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
          onFocus={(e) => setFocusVisible(e.currentTarget.matches(':focus-visible'))}
          onBlur={() => setFocusVisible(false)}
          style={{ position: 'absolute', left: hitLeft, top: 0, right: 0, bottom: 0, outline: 'none', cursor: 'crosshair', touchAction: 'pan-y' }}
        />

        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: `inset 0 0 0 ${Math.max(1, 1.2 * s)}px rgba(140, 190, 220, 0.22), inset 0 1px 0 rgba(255,255,255,.14)`, pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

function ChipTail({ s, bg, edge }: { s: number; bg: string; edge: string }) {
  const w = 7 * s, h = 3.6 * s
  return (
    <svg width={w} height={h + 1} viewBox={`0 0 ${w} ${h + 1}`} aria-hidden style={{ position: 'absolute', left: '50%', bottom: -h + 0.5, transform: 'translateX(-50%)', overflow: 'visible' }}>
      <path d={`M0 0 L${w / 2} ${h} L${w} 0 Z`} fill={bg} />
      <path d={`M0 0 L${w / 2} ${h} L${w} 0`} fill="none" stroke={edge} strokeWidth={1} />
    </svg>
  )
}
