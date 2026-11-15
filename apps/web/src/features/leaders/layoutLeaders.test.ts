import { describe, expect, it } from 'vitest'
import type { LeaderLayout, LeaderLayoutInput, Rect } from './index'
import { attachOffset, layoutLeaders, LEADER_GEOMETRY } from './layoutLeaders'
import { layoutMobileLeader, leaderPaths } from './leaderPaths'

const G = LEADER_GEOMETRY
// Desktop 1440×900 with the rail open: frame margins (topbar 78, rail 380+24, dock 256+24).
const SAFE: Rect = { x: 0, y: 78, width: 1440 - 404, height: 900 - 78 - 280 }
const LABELS = [
  { id: 'slope', width: 168, height: 62 },
  { id: 'terrain_roughness', width: 176, height: 62 },
  { id: 'bare_ground_fraction', width: 190, height: 74 },
  { id: 'local_relief', width: 164, height: 62 },
]
const HEADER = { width: 232, height: 30 }

function input(overrides: Partial<LeaderLayoutInput> = {}): LeaderLayoutInput {
  return {
    anchor: { x: 420, y: 340, radius: 14 },
    labels: LABELS,
    safeArea: SAFE,
    obstacles: [],
    previousSide: null,
    polygonWidthFraction: 0.02,
    compact: false,
    header: HEADER,
    chip: { width: 170, height: 28 },
    ...overrides,
  }
}

type Box = Rect & { id: string }

function boxes(layout: LeaderLayout, data: LeaderLayoutInput): Box[] {
  const sizes = new Map(data.labels.map((label) => [label.id, label]))
  const list: Box[] = layout.placements.map((placement) => {
    const size = sizes.get(placement.id)
    return { id: placement.id, x: placement.x, y: placement.y, width: size?.width ?? 0, height: size?.height ?? 0 }
  })
  if (layout.header && data.header) list.push({ id: '__header', ...layout.header, ...data.header })
  return list
}

const EPS = 1e-6
function inside(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x - EPS && inner.y >= outer.y - EPS && inner.x + inner.width <= outer.x + outer.width + EPS && inner.y + inner.height <= outer.y + outer.height + EPS
}
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS
}

type Segment = { x1: number; y1: number; x2: number; y2: number; id: string }

/** Straight segments of each line: O → bus (trunk), vertical bus, bus → label. */
function segments(layout: LeaderLayout, data: LeaderLayoutInput): Segment[] {
  const { origin, busX } = layout
  if (!origin || busX === undefined) return []
  return leaderPaths(layout, data.labels).flatMap((path) => [
    { id: path.id, x1: origin.x, y1: origin.y, x2: busX, y2: origin.y },
    { id: path.id, x1: busX, y1: origin.y, x2: busX, y2: path.attach.y },
    { id: path.id, x1: busX, y1: path.attach.y, x2: path.attach.x, y2: path.attach.y },
  ])
}

const between = (value: number, a: number, b: number) => value > Math.min(a, b) + EPS && value < Math.max(a, b) - EPS

/** Self-crossing: a horizontal segment and a vertical one that intersect in the interior of both. */
function crosses(a: Segment, b: Segment): boolean {
  const aHorizontal = Math.abs(a.y1 - a.y2) < EPS
  const bHorizontal = Math.abs(b.y1 - b.y2) < EPS
  if (aHorizontal === bHorizontal) return false
  const [h, v] = aHorizontal ? [a, b] : [b, a]
  return between(v.x1, h.x1, h.x2) && between(h.y1, v.y1, v.y2)
}

/** Does the segment pass through the interior of the box? (touching the edge, like the line's own attachment point, does not count). */
function pierces(segment: Segment, box: Rect): boolean {
  const inner = { x: box.x + 0.5, y: box.y + 0.5, width: box.width - 1, height: box.height - 1 }
  const minX = Math.min(segment.x1, segment.x2)
  const maxX = Math.max(segment.x1, segment.x2)
  const minY = Math.min(segment.y1, segment.y2)
  const maxY = Math.max(segment.y1, segment.y2)
  return minX < inner.x + inner.width && maxX > inner.x && minY < inner.y + inner.height && maxY > inner.y
}

/** Invariants of §3.4: no crossings, inside the safe area, no panels, and degradation 4/3/2/0. */
function expectInvariants(data: LeaderLayoutInput, layout: LeaderLayout) {
  const max = Math.min(data.compact ? 3 : 4, data.labels.length)
  expect([0, 2, 3, 4]).toContain(layout.count)
  expect(layout.count ?? 0).toBeLessThanOrEqual(max)
  if (layout.mode === 'chip') {
    expect(layout.placements).toHaveLength(0)
    if (layout.chip && data.chip) {
      const chipBox = { ...layout.chip, ...data.chip }
      expect(inside(chipBox, data.safeArea)).toBe(true)
      for (const obstacle of data.obstacles) expect(overlaps(chipBox, obstacle)).toBe(false)
    }
    return
  }
  expect(layout.placements).toHaveLength(layout.count ?? -1)
  const list = boxes(layout, data)
  for (const box of list) {
    expect(inside(box, data.safeArea), `${box.id} inside the safe area`).toBe(true)
    for (const obstacle of data.obstacles) expect(overlaps(box, obstacle), `${box.id} off panels`).toBe(false)
  }
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]
      const b = list[j]
      if (a && b) expect(overlaps(a, b), `${a.id} × ${b.id}`).toBe(false)
    }
  }
  // Priority order from top to bottom.
  const ys = layout.placements.map((placement) => placement.y)
  expect([...ys].sort((a, b) => a - b)).toEqual(ys)

  const segs = segments(layout, data)
  if (layout.mode === 'docked') {
    expect(layout.origin).toBeUndefined()
    expect(leaderPaths(layout, data.labels)).toEqual([])
    return
  }
  const { origin } = layout
  expect(origin).toBeDefined()
  if (!origin) return
  // Single origin on the ring's edge, on the column side.
  expect(origin.y).toBeCloseTo(data.anchor.y)
  expect(Math.abs(origin.x - data.anchor.x)).toBeCloseTo(data.anchor.radius)
  const safeBox = data.safeArea
  for (const segment of segs) {
    expect(inside({ x: Math.min(segment.x1, segment.x2), y: Math.min(segment.y1, segment.y2), width: Math.abs(segment.x2 - segment.x1), height: Math.abs(segment.y2 - segment.y1) }, safeBox)).toBe(true)
    for (const obstacle of data.obstacles) expect(pierces(segment, obstacle), 'line under a panel').toBe(false)
    for (const box of list) expect(pierces(segment, box), `line ${segment.id} crosses ${box.id}`).toBe(false)
  }
  for (const a of segs) for (const b of segs) if (a.id !== b.id) expect(crosses(a, b), `${a.id} cruza ${b.id}`).toBe(false)
}

describe('layoutLeaders · column with lines', () => {
  it('places 4 labels on the side with more room, without overlap and inside the safe area', () => {
    const data = input()
    const layout = layoutLeaders(data)
    expect(layout.mode).toBe('lines')
    expect(layout.side).toBe('right')
    expect(layout.count).toBe(4)
    expect(layout.placements.map((placement) => placement.id)).toEqual(LABELS.map((label) => label.id))
    expect(layout.header).toBeDefined()
    expectInvariants(data, layout)
  })

  it('with the ring near the right edge, the column goes left', () => {
    const data = input({ anchor: { x: 900, y: 340, radius: 14 } })
    const layout = layoutLeaders(data)
    expect(layout.side).toBe('left')
    expect(layout.count).toBe(4)
    expectInvariants(data, layout)
  })

  it('all lines leave from the same point on the ring edge and reach the title row', () => {
    const data = input()
    const layout = layoutLeaders(data)
    const paths = leaderPaths(layout, data.labels)
    expect(paths).toHaveLength(4)
    const starts = new Set(paths.map((path) => path.d.split('H')[0]))
    expect(starts.size).toBe(1)
    expect([...starts][0]).toBe(`M${data.anchor.x + data.anchor.radius} ${data.anchor.y}`)
    for (const path of paths) {
      const placement = layout.placements.find((item) => item.id === path.id)
      const size = data.labels.find((label) => label.id === path.id)
      expect(path.attach.x).toBe(placement?.x)
      expect(path.attach.y).toBe((placement?.y ?? 0) + attachOffset(size?.height ?? 0))
    }
  })

  it('avoids a panel by moving the column vertically or switching sides', () => {
    const panel = { x: 500, y: 200, width: 420, height: 200 }
    const data = input({ obstacles: [panel] })
    const layout = layoutLeaders(data)
    expect(layout.mode).toBe('lines')
    expectInvariants(data, layout)
  })
})

describe('layoutLeaders · hysteresis', () => {
  it('keeps the previous side as long as it shows as many labels as the other', () => {
    // Free: more space on the right; but the left side also fits with 4.
    const data = input({ anchor: { x: 470, y: 340, radius: 14 } })
    expect(layoutLeaders(data).side).toBe('right')
    const kept = layoutLeaders({ ...data, previousSide: 'left', previousCount: 4 })
    expect(kept.side).toBe('left')
    expect(kept.count).toBe(4)
    expectInvariants({ ...data, previousSide: 'left' }, kept)
  })

  it('does not alternate sides frame by frame while the ring crosses the center', () => {
    let side: 'left' | 'right' | null = null
    let count: number | undefined
    const sides: string[] = []
    for (let x = 300; x <= 740; x += 4) {
      const layout = layoutLeaders(input({ anchor: { x, y: 340, radius: 14 }, previousSide: side, previousCount: count }))
      side = layout.side
      count = layout.count
      sides.push(layout.side)
    }
    const flips = sides.filter((value, index) => index > 0 && value !== sides[index - 1]).length
    expect(flips).toBeLessThanOrEqual(1)
  })

  it('switches sides only when the other shows more labels', () => {
    const data = input({ anchor: { x: 160, y: 340, radius: 14 }, previousSide: 'left', previousCount: 4 })
    const layout = layoutLeaders(data)
    expect(layout.side).toBe('right')
    expect(layout.count).toBe(4)
  })

  it('growing from 3 to 4 requires slack: at the exact edge it stays at 3', () => {
    // Minimum height for 4 labels with no slack.
    const need = HEADER.height + G.headerGap + LABELS.reduce((sum, label) => sum + label.height, 0) + 3 * G.gap + 2 * G.margin
    const safe = (height: number): Rect => ({ x: 0, y: 78, width: SAFE.width, height })
    const anchor = (height: number) => ({ x: 420, y: 78 + height / 2, radius: 14 })
    expect(layoutLeaders(input({ safeArea: safe(need), anchor: anchor(need) })).count).toBe(4)
    expect(layoutLeaders(input({ safeArea: safe(need), anchor: anchor(need), previousSide: 'right', previousCount: 3 })).count).toBe(3)
    expect(layoutLeaders(input({ safeArea: safe(need + G.hysteresis), anchor: anchor(need + G.hysteresis), previousSide: 'right', previousCount: 3 })).count).toBe(4)
    // Moving down does not wait: if 4 no longer fit, it switches to 3 even if before there had been 4.
    expect(layoutLeaders(input({ safeArea: safe(need - 1), anchor: anchor(need - 1), previousSide: 'right', previousCount: 4 })).count).toBe(3)
  })

  it('leaving the chip also requires slack', () => {
    const anchor = { x: 40, y: 278, radius: 14 }
    const widest = Math.max(...LABELS.slice(0, 2).map((label) => label.width))
    // Width such that the ring→column distance falls between the minimum and the minimum + slack.
    const reach = G.reachMin + G.hysteresis / 2
    const tiny = { x: 0, y: 78, width: anchor.x + anchor.radius + reach + widest + G.margin, height: 400 }
    const two = { safeArea: tiny, anchor, header: null, labels: LABELS.slice(0, 2) }
    expect(layoutLeaders(input(two)).count).toBe(2)
    // The same space, coming from the chip: the extra slack is not reached.
    expect(layoutLeaders(input({ ...two, previousSide: 'right', previousCount: 0 })).mode).toBe('chip')
    expect(layoutLeaders(input({ ...two, safeArea: { ...tiny, width: tiny.width + G.hysteresis }, previousSide: 'right', previousCount: 0 })).count).toBe(2)
  })
})

describe('layoutLeaders · degradation 4 → 3 → 2 → 0', () => {
  it('shrinking the safe area drops one label at a time, never shows 1 and ends in the chip', () => {
    const counts: number[] = []
    for (let height = 420; height >= 60; height -= 10) {
      const data = input({ safeArea: { x: 0, y: 78, width: SAFE.width, height }, anchor: { x: 420, y: 78 + height / 2, radius: 14 } })
      const layout = layoutLeaders(data)
      expectInvariants(data, layout)
      counts.push(layout.count ?? -1)
    }
    expect(counts[0]).toBe(4)
    expect(counts.at(-1)).toBe(0)
    expect(counts).not.toContain(1)
    for (let i = 1; i < counts.length; i += 1) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1] ?? 4)
    expect(new Set(counts)).toEqual(new Set([4, 3, 2, 0]))
  })

  it('with compact height (<860 px) shows 3 at most', () => {
    const layout = layoutLeaders(input({ compact: true }))
    expect(layout.count).toBe(3)
    expect(layout.placements.map((placement) => placement.id)).toEqual(['slope', 'terrain_roughness', 'bare_ground_fraction'])
  })

  it('with a single metric it does not draw a lone label: chip', () => {
    expect(layoutLeaders(input({ labels: LABELS.slice(0, 1) })).mode).toBe('chip')
  })

  it('chip “Metrics in the panel →” if the sector is not visible or is outside the safe area', () => {
    const behind = layoutLeaders(input({ anchor: { x: 420, y: 340, radius: 14, visible: 0.2 } }))
    expect(behind.mode).toBe('chip')
    expect(behind.chip).toBeDefined()
    const outside = layoutLeaders(input({ anchor: { x: 1200, y: 340, radius: 14 } }))
    expect(outside.mode).toBe('chip')
    expectInvariants(input(), behind)
  })

  it('with the sector in view, the chip goes under the ring: it does not cover the pin label (“#1 … 94.9%”)', () => {
    const data = input({ labels: LABELS.slice(0, 1) })
    const layout = layoutLeaders(data)
    expect(layout.mode).toBe('chip')
    expect(layout.chip).toBeDefined()
    // The pin's label occupies the anchor row (≈ ±11 px): the chip starts below the ring.
    expect(layout.chip!.y).toBeGreaterThanOrEqual(data.anchor.y + data.anchor.radius)
    expectInvariants(data, layout)
  })

  it('the chip keeps the previous side so it does not jump back', () => {
    const layout = layoutLeaders(input({ anchor: { x: 420, y: 340, radius: 14, visible: 0 }, previousSide: 'left', previousCount: 4 }))
    expect(layout.mode).toBe('chip')
    expect(layout.side).toBe('left')
  })
})

describe('layoutLeaders · modo acoplado', () => {
  it('with the polygon wider than 45% of the width, labels against the edge and no lines', () => {
    const data = input({ polygonWidthFraction: 0.6, anchor: { x: 520, y: 340, radius: 300 } })
    const layout = layoutLeaders(data)
    expect(layout.mode).toBe('docked')
    expect(layout.origin).toBeUndefined()
    expect(layout.busX).toBeUndefined()
    expect(leaderPaths(layout, data.labels)).toEqual([])
    const edge = layout.side === 'right' ? SAFE.x + SAFE.width - G.margin : SAFE.x + G.margin
    for (const placement of layout.placements) {
      const size = LABELS.find((label) => label.id === placement.id)
      const touching = layout.side === 'right' ? placement.x + (size?.width ?? 0) : placement.x
      expect(touching).toBeCloseTo(edge)
    }
    expectInvariants(data, layout)
  })

  it('exactly at 45% it keeps the lines', () => {
    expect(layoutLeaders(input({ polygonWidthFraction: 0.45 })).mode).toBe('lines')
  })
})

/** Deterministic generator (LCG) for the property test. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

describe('layoutLeaders · properties (800 random scenarios with a fixed seed)', () => {
  it('no crossings, inside the safe area, off panels and with 4/3/2/0 labels', () => {
    const random = rng(20261114)
    const between = (min: number, max: number) => min + random() * (max - min)
    let lines = 0
    let docked = 0
    let chips = 0
    for (let run = 0; run < 800; run += 1) {
      const width = between(700, 2200)
      const height = between(480, 1300)
      const safe = { x: between(0, 400), y: between(50, 90), width: 0, height: 0 }
      safe.width = Math.max(120, width - safe.x - between(0, 520))
      safe.height = Math.max(120, height - safe.y - between(0, 320))
      const labels = Array.from({ length: Math.floor(between(1, 5)) }, (_, index) => ({ id: `c${index}`, width: between(120, 220), height: between(48, 90) }))
      const obstacles = Array.from({ length: Math.floor(between(0, 4)) }, () => ({ x: between(0, width), y: between(0, height), width: between(40, 420), height: between(30, 300) }))
      const data: LeaderLayoutInput = {
        anchor: { x: between(safe.x - 60, safe.x + safe.width + 60), y: between(safe.y - 60, safe.y + safe.height + 60), radius: between(4, 60), visible: random() < 0.9 ? 1 : random() },
        labels,
        safeArea: safe,
        obstacles,
        previousSide: random() < 0.4 ? null : random() < 0.5 ? 'left' : 'right',
        previousCount: random() < 0.5 ? undefined : [0, 2, 3, 4][Math.floor(random() * 4)],
        polygonWidthFraction: random() < 0.8 ? between(0, 0.3) : between(0.3, 1.4),
        compact: random() < 0.3,
        header: random() < 0.7 ? { width: between(150, 260), height: between(20, 42) } : null,
        chip: { width: 170, height: 28 },
      }
      const layout = layoutLeaders(data)
      expectInvariants(data, layout)
      if (layout.mode === 'lines') lines += 1
      else if (layout.mode === 'docked') docked += 1
      else chips += 1
      // Deterministic: the same input gives the same output.
      expect(layoutLeaders(data)).toEqual(layout)
    }
    // The sample exercises all three modes.
    expect(lines).toBeGreaterThan(100)
    expect(docked).toBeGreaterThan(20)
    expect(chips).toBeGreaterThan(20)
  })
})

describe('layoutMobileLeader · a single line to the sheet', () => {
  // Mobile 390×844 in S1: sheet of 456 px (54dvh), bar 74 px.
  const safe = { x: 0, y: 74, width: 390, height: 844 - 74 - 456 }
  const end = { x: 195, y: 844 - 456 }

  it('leaves the ring edge toward the top edge of the sheet, centered', () => {
    const line = layoutMobileLeader({ anchor: { x: 195, y: 230, radius: 12 }, safeArea: safe, end, obstacles: [] })
    expect(line).not.toBeNull()
    expect(line?.from).toEqual({ x: 195, y: 242 })
    expect(line?.to.x).toBeCloseTo(195)
    expect(line?.to.y).toBeCloseTo(end.y)
    expect(line?.d).toBe(`M195 242L195 ${end.y}`)
  })

  it('diagonally, the origin sits on the ring edge in the direction of the sheet', () => {
    const line = layoutMobileLeader({ anchor: { x: 80, y: 200, radius: 10 }, safeArea: safe, end, obstacles: [] })
    expect(line).not.toBeNull()
    if (!line) return
    expect(Math.hypot(line.from.x - 80, line.from.y - 200)).toBeCloseTo(10)
  })

  it('does not cross content: it stops before an intermediate panel; the target sheet does not count', () => {
    const strip = { x: 8, y: end.y - 48, width: 374, height: 40 }
    const sheet = { x: 0, y: end.y, width: 390, height: 456 }
    const line = layoutMobileLeader({ anchor: { x: 195, y: 160, radius: 12 }, safeArea: safe, end, obstacles: [strip, sheet] })
    expect(line).not.toBeNull()
    expect(line?.to.y).toBeCloseTo(strip.y - 4)
    const free = layoutMobileLeader({ anchor: { x: 195, y: 160, radius: 12 }, safeArea: safe, end, obstacles: [sheet] })
    expect(free?.to.y).toBeCloseTo(end.y)
  })

  it('nothing if the place is not visible, if the sheet is over the ring (S2) or if the line is too short', () => {
    expect(layoutMobileLeader({ anchor: { x: 195, y: 230, radius: 12, visible: 0.1 }, safeArea: safe, end, obstacles: [] })).toBeNull()
    expect(layoutMobileLeader({ anchor: { x: 195, y: 230, radius: 12 }, safeArea: safe, end: { x: 195, y: 74 }, obstacles: [] })).toBeNull()
    expect(layoutMobileLeader({ anchor: { x: 195, y: end.y - 20, radius: 12 }, safeArea: safe, end, obstacles: [] })).toBeNull()
    expect(layoutMobileLeader({ anchor: { x: 195, y: 600, radius: 12 }, safeArea: safe, end, obstacles: [] })).toBeNull()
  })

  it('with a side sheet the line goes sideways to its left edge', () => {
    const side = { x: 0, y: 74, width: 844 - 360, height: 390 - 74 }
    const line = layoutMobileLeader({ anchor: { x: 240, y: 220, radius: 12 }, safeArea: side, end: { x: 484, y: 220 }, obstacles: [] })
    expect(line?.from).toEqual({ x: 252, y: 220 })
    expect(line?.to).toEqual({ x: 484, y: 220 })
  })
})
