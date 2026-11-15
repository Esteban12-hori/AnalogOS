/**
 * ●◆○ marker layer of the scene (increment 4, docs/UX_REDESIGN.md §3.1). Pure functions
 * shared by the globe (projection in useFrame) and the 2D map (native MapLibre clustering):
 *
 *  - model of each marker based on the v3 snapshot (candidates with a global rank; the REF without a
 *    number), the team's Mission evaluation (status and rank, never a %) and the ◆ catalog;
 *  - continuous visibility according to orientation: smoothstep(.05, .25) over the horizon;
 *  - on-screen clustering below 36 px, with counts by type (never averages);
 *  - label budget;
 *  - accessible texts and labels.
 *
 * Every figure comes from the snapshot; in Mission the marker encodes status or role, never suitability.
 * A ◆ never carries a %, rank or ranking.
 */
import type { CandidateSite, Position, ReferenceAnalog } from '../../domain/contracts'
import { countryLabels, rankMap, splitByRole } from '../../domain/discovery'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import { geometryCenter, outerRings, type Vec3 } from '../../domain/globe'
import { MISSION_STATUS_LABEL, MISSION_STATUS_ORDER, missionSiteViews, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { GLYPH } from '../../shell/public'
import { displaySource } from '../../i18n/sourceText'
import { analogCenter, approximateZoneRing, geometryInsideBbox, pointInGeometry } from './geometry'

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

/** ● evaluated · ○ insufficient data · ◆ emblematic analog pending calculation. */
export type MarkerKind = 'evaluated' | 'insufficient' | 'reference'

export interface MarkerModel {
  id: string
  kind: MarkerKind
  /** Type with which `ui.selection` is written. */
  selectionKind: 'evaluated' | 'reference'
  /** Marker anchor [lon, lat]: approximate center of the sector or cited point of the ◆. */
  center: Position
  /** Short name for the label. */
  name: string
  /** Explore: global rank among candidates. Mission: rank from the evaluation (prioritized). */
  rank: number | null
  /** 0–100 similarity from the snapshot (Explore only); null if there is none or in Mission (no %). */
  score: number | null
  scoreSource: 'snapshot' | null
  /** Search candidate, known reference (label «REF», never a number) or ◆. */
  role: 'candidate' | 'reference' | 'analog'
  /** Status in the Mission evaluation; null in Explore or without evaluation. */
  missionStatus: SiteMissionStatus | null
  /** Country to label a cluster («Chile», «Argentina»); '' if not recorded. */
  group: string
  /** Outline: sector polygon or approximate zone of the ◆ (always dashed). */
  outline: Position[] | null
  /** Names of ◆ whose cited point falls inside this sector: «coincides with» badge. */
  coincides: string[]
  /** ◆ region: evaluated sectors it contains according to point-in-polygon; null if none. */
  contains: number | null
  /** Stable priority 0..n-1: ● by rank, ● pending calculation, ○ and ◆ in alphabetical order. */
  order: number
}

export interface MarkerInput {
  candidates: readonly CandidateSite[]
  analogs: readonly ReferenceAnalog[]
  /** Mission evaluation (team statuses and ranks); null = Explore (snapshot). */
  evaluation: MissionEvaluation | null
}

/** Short name («Pampa Yungay», without «— screening sector» or the fixture label). */
export function placeName(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}

/** Sector country according to the snapshot (`country`); if not recorded, none is asserted. */
function candidateGroup(candidate: CandidateSite): string {
  return candidate.country ? countryLabels[candidate.country] : ''
}

const collator = new Intl.Collator('es-CL')

/** Scene markers in stable priority order. */
export function buildMarkerModels({ candidates, analogs, evaluation }: MarkerInput): MarkerModel[] {
  // Global search rank (the same as the carousel, Compare and the team's SVG map).
  const ranks = rankMap(splitByRole(candidates).ranked)
  const views = missionSiteViews(evaluation, candidates.map((candidate) => candidate.site_id))

  const sectors: Array<MarkerModel & { tier: number }> = []
  for (const candidate of candidates) {
    const center = geometryCenter(candidate.geometry)
    if (!center) continue
    const role = candidate.role === 'reference' ? 'reference' : 'candidate'
    const view = views.get(candidate.site_id) ?? null
    let kind: MarkerKind
    let rank: number | null
    let tier: number
    if (view) {
      kind = view.status === 'evidencia_insuficiente' ? 'insufficient' : 'evaluated'
      rank = view.rank
      tier = MISSION_STATUS_ORDER.indexOf(view.status)
    } else {
      kind = candidate.similarity === null ? 'insufficient' : 'evaluated'
      // Without a % there is no rank (○); the REF never has one.
      rank = role === 'reference' || kind === 'insufficient' ? null : ranks.get(candidate.site_id) ?? null
      tier = kind === 'insufficient' ? 2 : rank === null ? 1 : 0
    }
    const score = view ? null : candidate.similarity
    sectors.push({
      id: candidate.site_id,
      kind,
      selectionKind: 'evaluated',
      center,
      name: placeName(candidate.name),
      rank,
      score,
      scoreSource: score === null ? null : 'snapshot',
      role,
      missionStatus: view?.status ?? null,
      group: candidateGroup(candidate),
      outline: outerRings(candidate.geometry)[0] ?? null,
      coincides: [],
      contains: null,
      order: 0,
      tier,
    })
  }

  const references: MarkerModel[] = []
  for (const analog of analogs) {
    if (analog.location.kind === 'approximate_point') {
      const point: Position = [analog.location.lon, analog.location.lat]
      const host = candidates.find((candidate) => pointInGeometry(point, candidate.geometry))
      const sector = host ? sectors.find((item) => item.id === host.site_id) : undefined
      if (sector) {
        // The cited point falls inside an evaluated sector: badge on that ●, no ◆ of its own.
        sector.coincides.push(displaySource(analog.name))
        continue
      }
    }
    const bbox = analog.location.kind === 'region' ? analog.location.bbox : null
    const contained = bbox ? candidates.filter((candidate) => geometryInsideBbox(candidate.geometry, bbox)).length : 0
    references.push({
      id: analog.id,
      kind: 'reference',
      selectionKind: 'reference',
      center: analogCenter(analog),
      name: displaySource(analog.name),
      rank: null,
      score: null,
      scoreSource: null,
      role: 'analog',
      missionStatus: null,
      group: displaySource(analog.country),
      outline: approximateZoneRing(analog),
      coincides: [],
      contains: contained > 0 ? contained : null,
      order: 0,
    })
  }

  sectors.sort((a, b) => a.tier - b.tier || (a.rank ?? 0) - (b.rank ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  references.sort((a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : 1))
  return [...sectors.map(({ tier, ...model }) => { void tier; return model }), ...references].map((model, order) => ({ ...model, order }))
}

// ---------------------------------------------------------------------------
// Continuous visibility according to orientation
// ---------------------------------------------------------------------------

/** Edges of the continuous visibility (§3.1). */
export const VISIBILITY_EDGES = [0.05, 0.25] as const

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Orientation of a point on the sphere relative to the camera, normalized to the horizon:
 * 0 at the limb (the point sits right at the visible edge), 1 below the camera, <0 behind.
 * With the camera at `d`, a point of radius `r` is visible if cos(angle) > r/d.
 */
export function horizonFacing(point: Vec3, camera: Vec3, radius: number): number {
  const lp = Math.hypot(...point)
  const lc = Math.hypot(...camera)
  if (lp === 0 || lc === 0) return 0
  const cos = (point[0] * camera[0] + point[1] * camera[1] + point[2] * camera[2]) / (lp * lc)
  const horizon = Math.min(radius / lc, 0.999)
  return (cos - horizon) / (1 - horizon)
}

/** 0–1: marker opacity according to its orientation (smoothstep(.05, .25)). */
export function markerVisibility(facing: number): number {
  return smoothstep(VISIBILITY_EDGES[0], VISIBILITY_EDGES[1], facing)
}

// ---------------------------------------------------------------------------
// On-screen clustering
// ---------------------------------------------------------------------------

export const CLUSTER_RADIUS_PX = 36
/** Below this visibility the marker is hidden (behind the globe): it is neither clustered nor focused. */
export const HIDDEN_BELOW = 0.02
export const CLUSTER_MIN_VISIBLE = HIDDEN_BELOW
/**
 * Below this visibility (almost at the horizon) the marker is visible but does not receive focus: its ring
 * and its label would end up under 3:1. It remains reachable from the carousel and the list (WCAG 2.4.11).
 */
export const FOCUS_MIN_VISIBLE = 0.25

export interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Is the marker anchor under the UI (bar, dock, rail, sheet, HUD strip)? Then it must not
 * receive keyboard focus: it would be hidden behind the panel (WCAG 2.4.11). Pure function.
 */
export function pinOccluded(x: number, y: number, obstacles: readonly ScreenRect[]): boolean {
  return obstacles.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
}

/** A marker or cluster is removed from the focus order if it is hidden, almost at the horizon or covered. */
export function pinUnfocusable(x: number, y: number, visible: number, obstacles: readonly ScreenRect[]): boolean {
  return visible < FOCUS_MIN_VISIBLE || pinOccluded(x, y, obstacles)
}

export interface ScreenMarker {
  id: string
  kind: MarkerKind
  x: number
  y: number
  visible: number
  order: number
  group: string
  /** Estimated label width (px), to avoid overlapping labels. */
  labelWidth?: number
}

export interface MarkerCounts {
  evaluated: number
  insufficient: number
  reference: number
}

export interface MarkerCluster {
  /** Sorted member ids, joined by «|»: stable across frames. */
  key: string
  /** Ids in priority order. */
  members: string[]
  x: number
  y: number
  counts: MarkerCounts
  /** Country common to all members, or '' if they differ or it is not recorded. */
  group: string
  /** Visibility of the least visible member. */
  visible: number
}

export interface ClusterResult {
  clusters: MarkerCluster[]
  /** Ids that ended up inside some cluster. */
  clustered: ReadonlySet<string>
}

export interface ClusterOptions {
  radius?: number
  minVisible?: number
  /** Never clustered (selection and hover): they keep their own ring. */
  exclude?: Iterable<string | null | undefined>
}

export function countKinds(kinds: Iterable<MarkerKind>): MarkerCounts {
  const counts: MarkerCounts = { evaluated: 0, insufficient: 0, reference: 0 }
  for (const kind of kinds) counts[kind] += 1
  return counts
}

/**
 * Greedy, deterministic clustering: in priority order, each free marker seeds a
 * cluster with all free markers within `radius` px of it. A cluster needs 2 members.
 */
export function clusterMarkers(markers: readonly ScreenMarker[], options: ClusterOptions = {}): ClusterResult {
  const radius = options.radius ?? CLUSTER_RADIUS_PX
  const minVisible = options.minVisible ?? CLUSTER_MIN_VISIBLE
  const excluded = new Set<string>()
  for (const id of options.exclude ?? []) if (id) excluded.add(id)
  const eligible = markers
    .filter((marker) => marker.visible >= minVisible && !excluded.has(marker.id))
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const assigned = new Set<string>()
  const clusters: MarkerCluster[] = []
  for (const seed of eligible) {
    if (assigned.has(seed.id)) continue
    const members = eligible.filter((other) => !assigned.has(other.id) && (other === seed || Math.hypot(other.x - seed.x, other.y - seed.y) < radius))
    if (members.length < 2) continue
    for (const member of members) assigned.add(member.id)
    const groups = new Set(members.map((member) => member.group))
    clusters.push({
      key: members.map((member) => member.id).sort().join('|'),
      members: members.map((member) => member.id),
      x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
      y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
      counts: countKinds(members.map((member) => member.kind)),
      group: groups.size === 1 ? [...groups][0] ?? '' : '',
      visible: Math.min(...members.map((member) => member.visible)),
    })
  }
  return { clusters, clustered: assigned }
}

/** Within this distance of the selected place, a cluster would cover its label. */
export const NEAR_SELECTION_PX = 44
const BELOW_RING_PX = 16

/**
 * A group attached to the selected place is shifted just below its ring and stays compact (glyphs
 * only): the selected place's label and the ring of the Tesla lines are left clear.
 */
export function placeNearSelection(
  cluster: { x: number; y: number },
  selected: { x: number; y: number; radius: number } | null,
): { x: number; y: number; compact: boolean } {
  if (!selected || Math.hypot(cluster.x - selected.x, cluster.y - selected.y) >= NEAR_SELECTION_PX) return { x: cluster.x, y: cluster.y, compact: false }
  return { x: selected.x, y: selected.y + selected.radius + BELOW_RING_PX, compact: true }
}

/** Partition fingerprint: the group list is repainted only when it changes. */
export function clusterSignature(result: ClusterResult): string {
  return result.clusters.map((cluster) => cluster.key).join(';')
}

// ---------------------------------------------------------------------------
// Label budget
// ---------------------------------------------------------------------------

/** Maximum simultaneous labels: 5 from 1100 px, 3 on the mobile sheet. */
export function labelBudget(narrow: boolean): number {
  return narrow ? 3 : 5
}

/** Near the horizon the marker remains visible but without a label. */
export const LABEL_MIN_VISIBLE = 0.3

const LABEL_HALF_HEIGHT = 12
const LABEL_OFFSET_X = 11
const DEFAULT_LABEL_WIDTH = 120

/** Approximate label width: ~7 px per character at 12 px, plus padding and leader line. */
export function estimateLabelWidth(text: string): number {
  return Math.round(text.length * 7 + 34)
}

interface Box { x0: number; y0: number; x1: number; y1: number }

function labelBox(marker: ScreenMarker): Box {
  const x0 = marker.x + LABEL_OFFSET_X
  return { x0, y0: marker.y - LABEL_HALF_HEIGHT, x1: x0 + (marker.labelWidth ?? DEFAULT_LABEL_WIDTH), y1: marker.y + LABEL_HALF_HEIGHT }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Which standalone markers get a label: selection, hover, and then by priority, without exceeding the
 * budget and without overlapping a label on top of another one already placed (the one that collides keeps only its glyph).
 */
export function assignLabels(
  markers: readonly ScreenMarker[],
  { budget, clustered, selectedId, hoverId }: { budget: number; clustered: ReadonlySet<string>; selectedId: string | null; hoverId: string | null },
): Set<string> {
  const candidates = markers.filter((marker) => marker.visible >= LABEL_MIN_VISIBLE && !clustered.has(marker.id))
  const priority = (marker: ScreenMarker) => (marker.id === selectedId ? -2 : marker.id === hoverId ? -1 : marker.order)
  const labeled = new Set<string>()
  const boxes: Box[] = []
  for (const marker of [...candidates].sort((a, b) => priority(a) - priority(b))) {
    if (labeled.size >= budget) break
    const box = labelBox(marker)
    if (boxes.some((other) => overlaps(other, box))) continue
    boxes.push(box)
    labeled.add(marker.id)
  }
  return labeled
}

// ---------------------------------------------------------------------------
// Place ring on screen (anchor of the Tesla lines)
// ---------------------------------------------------------------------------

/** Minimum radius of the place ring (px): the sector may measure less than a pixel in the global view. */
export const RING_MIN_PX = 14
const RING_PADDING_PX = 4

/** Ring radius: covers the projected polygon plus a margin, never less than RING_MIN_PX. */
export function ringRadius(center: { x: number; y: number }, outline: ReadonlyArray<{ x: number; y: number }>): number {
  let max = 0
  for (const point of outline) max = Math.max(max, Math.hypot(point.x - center.x, point.y - center.y))
  return Math.max(RING_MIN_PX, max + RING_PADDING_PX)
}

// ---------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------

export function markerGlyph(kind: MarkerKind): string {
  return kind === 'reference' ? GLYPH.reference : kind === 'insufficient' ? GLYPH.insufficient : GLYPH.evaluated
}

/** "75,7 %" with 1 fixed decimal (v3 similarity from the snapshot); null if the marker has no %. */
export function markerScoreText(model: Pick<MarkerModel, 'score'>): string | null {
  return model.score === null ? null : `${formatScore(model.score)}%`
}

/** Label badge: "#2" for a rank, "REF" for the known reference, null if there is none. */
export function markerBadgeText(model: Pick<MarkerModel, 'rank' | 'role'>): string | null {
  if (model.rank !== null) return `#${model.rank}${model.role === 'reference' ? ' · REF' : ''}`
  return model.role === 'reference' ? 'REF' : null
}

/** Status without a figure: that of the Mission evaluation, "insufficient data" (○) or "to be calculated" (◆). */
export function markerStatusText(model: Pick<MarkerModel, 'kind' | 'score'> & Partial<Pick<MarkerModel, 'missionStatus'>>): string | null {
  if (model.missionStatus) return MISSION_STATUS_LABEL[model.missionStatus].toLocaleLowerCase('en')
  if (model.kind === 'insufficient') return 'insufficient data'
  if (model.kind === 'reference' || model.score === null) return 'not yet calculated'
  return null
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Visible label text (to estimate its width). */
export function markerLabelText(model: MarkerModel): string {
  return [
    markerBadgeText(model) ?? '',
    model.name,
    markerScoreText(model) ?? '',
    markerStatusText(model) ?? '',
    model.contains !== null ? `contains ${model.contains} sectors` : '',
    model.coincides.length ? `◆ matches ${model.coincides.join(' · ')}` : '',
  ].filter(Boolean).join('  ')
}

/** Accessible label of the marker button (the visible label stays aria-hidden). */
export function markerAriaLabel(model: MarkerModel): string {
  const parts = [model.name]
  if (model.kind === 'reference') {
    parts.push(`${model.group ? `${model.group}, ` : ''}emblematic analog not yet calculated, approximate area`)
    if (model.contains) parts.push(`contains ${plural(model.contains, 'evaluated sector', 'evaluated sectors')}`)
  } else if (model.missionStatus) {
    if (model.role === 'reference') parts.push('known reference')
    parts.push(`${model.rank !== null ? `rank ${model.rank}, ` : ''}${MISSION_STATUS_LABEL[model.missionStatus].toLocaleLowerCase('en')}`)
  } else if (model.kind === 'insufficient') {
    parts.push('insufficient data')
  } else {
    if (model.role === 'reference') parts.push('known reference, outside the ranking')
    if (model.score !== null) parts.push(`${model.rank !== null ? `rank ${model.rank}, ` : ''}similarity ${markerScoreText(model)}`)
  }
  if (model.group && model.kind !== 'reference') parts.push(model.group)
  if (model.coincides.length) parts.push(`matches ${model.coincides.join(' and ')}`)
  return parts.join(', ')
}

/** Non-zero counts in the order ● ○ ◆. */
export function clusterParts(counts: MarkerCounts): Array<{ kind: MarkerKind; count: number }> {
  return (['evaluated', 'insufficient', 'reference'] as const).filter((kind) => counts[kind] > 0).map((kind) => ({ kind, count: counts[kind] }))
}

/** Group chip text: "Chile · 3 ● · 1 ◆". Counts only, never averages. */
export function clusterText(counts: MarkerCounts, group: string): string {
  return [group, ...clusterParts(counts).map(({ kind, count }) => `${count} ${markerGlyph(kind)}`)].filter(Boolean).join(' · ')
}

export function clusterAriaLabel(counts: MarkerCounts, group: string, open: boolean): string {
  const total = counts.evaluated + counts.insufficient + counts.reference
  const parts = [
    counts.evaluated ? plural(counts.evaluated, 'evaluated', 'evaluated') : '',
    counts.insufficient ? plural(counts.insufficient, 'with insufficient data', 'with insufficient data') : '',
    counts.reference ? plural(counts.reference, 'analog not yet calculated', 'analogs not yet calculated') : '',
  ].filter(Boolean)
  return `Group of ${total} places${group ? ` in ${group}` : ''}: ${parts.join(', ')}. ${open ? 'Hide' : 'Show'} list`
}

/** Stacked glyphs of the group (max. 4), in priority order. */
export function clusterStack(kinds: readonly MarkerKind[]): string {
  return kinds.slice(0, 4).map(markerGlyph).join('')
}
