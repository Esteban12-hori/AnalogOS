/**
 * Capa de marcadores ●◆○ del escenario (incremento 4, docs/UX_REDESIGN.md §3.1). Funciones puras
 * compartidas por el globo (proyección en useFrame) y el mapa 2D (agrupación nativa de MapLibre):
 *
 *  - modelo de cada marcador a partir del snapshot, del motor de misión y del catálogo de ◆;
 *  - visibilidad continua según la orientación: smoothstep(.05, .25) sobre el horizonte;
 *  - agrupación en pantalla a menos de 36 px, con conteos por tipo (nunca promedios);
 *  - presupuesto de rótulos;
 *  - textos y etiquetas accesibles.
 *
 * Toda cifra viene del snapshot o del motor determinista; un ◆ nunca lleva %, puesto ni ranking.
 */
import type { CandidateSite, Position, ReferenceAnalog } from '../../domain/contracts'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import { geometryCenter, outerRings, type Vec3 } from '../../domain/globe'
import { rankCandidates } from '../../domain/scoring'
import type { MissionScoring } from '../engine'
import { GLYPH } from '../../shell/public'
import { analogCenter, approximateZoneRing, geometryInsideBbox, pointInGeometry } from './geometry'

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

/** ● evaluado · ○ datos insuficientes · ◆ análogo emblemático por calcular. */
export type MarkerKind = 'evaluated' | 'insufficient' | 'reference'

export interface MarkerModel {
  id: string
  kind: MarkerKind
  /** Tipo con que se escribe `ui.selection`. */
  selectionKind: 'evaluated' | 'reference'
  /** Ancla del marcador [lon, lat]: centro aproximado del sector o punto citado del ◆. */
  center: Position
  /** Nombre corto para el rótulo. */
  name: string
  /** Puesto 1..n; solo ● con %. */
  rank: number | null
  /** % 0–100 del snapshot (perfil base) o del motor (perfil de misión); null si no hay. */
  score: number | null
  scoreSource: 'snapshot' | 'mission' | null
  /** País compartido para rotular un grupo («Chile»); '' si no consta. */
  group: string
  /** Contorno: polígono del sector o zona aproximada del ◆ (siempre discontinua). */
  outline: Position[] | null
  /** Nombres de ◆ cuyo punto citado cae dentro de este sector: insignia «coincide con». */
  coincides: string[]
  /** ◆ región: sectores evaluados que contiene según punto-en-polígono; null si ninguno. */
  contains: number | null
  /** Prioridad estable 0..n-1: ● por puesto, ● por calcular, ○ y ◆ en orden alfabético. */
  order: number
}

export interface MarkerInput {
  candidates: readonly CandidateSite[]
  analogs: readonly ReferenceAnalog[]
  /** Con perfil de misión: puestos y % del motor. null = perfil base del snapshot. */
  scoring: MissionScoring | null
}

/** Nombre corto («Pampa Yungay», sin «— sector de screening» ni el rótulo de fixture). */
export function placeName(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}

/** País del sector evaluado: el snapshot es de Chile (ids «cl-»); si no, no se afirma. */
function candidateGroup(candidate: CandidateSite): string {
  return candidate.site_id.startsWith('cl-') ? 'Chile' : ''
}

const collator = new Intl.Collator('es-CL')

/** Marcadores del escenario en orden estable de prioridad. */
export function buildMarkerModels({ candidates, analogs, scoring }: MarkerInput): MarkerModel[] {
  const scored = scoring ? new Map(scoring.sites.map((site) => [site.siteId, site])) : null
  const snapshotRanks = new Map(
    rankCandidates(candidates).flatMap((candidate, index) => (candidate.similarity === null ? [] : [[candidate.site_id, index + 1] as const])),
  )

  const sectors: Array<MarkerModel & { tier: number }> = []
  for (const candidate of candidates) {
    const center = geometryCenter(candidate.geometry)
    if (!center) continue
    let kind: MarkerKind
    let rank: number | null
    let score: number | null
    let scoreSource: MarkerModel['scoreSource']
    if (scored) {
      const site = scored.get(candidate.site_id)
      score = site?.similarity ?? null
      rank = score === null ? null : (site?.rank ?? null)
      kind = site?.status === 'insufficient_data' ? 'insufficient' : 'evaluated'
      scoreSource = score === null ? null : 'mission'
    } else {
      score = candidate.similarity
      rank = snapshotRanks.get(candidate.site_id) ?? null
      kind = score === null ? 'insufficient' : 'evaluated'
      scoreSource = score === null ? null : 'snapshot'
    }
    sectors.push({
      id: candidate.site_id,
      kind,
      selectionKind: 'evaluated',
      center,
      name: placeName(candidate.name),
      rank,
      score,
      scoreSource,
      group: candidateGroup(candidate),
      outline: outerRings(candidate.geometry)[0] ?? null,
      coincides: [],
      contains: null,
      order: 0,
      tier: kind === 'insufficient' ? 2 : rank === null ? 1 : 0,
    })
  }

  const references: MarkerModel[] = []
  for (const analog of analogs) {
    if (analog.location.kind === 'approximate_point') {
      const point: Position = [analog.location.lon, analog.location.lat]
      const host = candidates.find((candidate) => pointInGeometry(point, candidate.geometry))
      const sector = host ? sectors.find((item) => item.id === host.site_id) : undefined
      if (sector) {
        // El punto citado cae dentro de un sector evaluado: insignia sobre ese ●, sin ◆ propio.
        sector.coincides.push(analog.name)
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
      name: analog.name,
      rank: null,
      score: null,
      scoreSource: null,
      group: analog.country,
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
// Visibilidad continua según la orientación
// ---------------------------------------------------------------------------

/** Bordes de la visibilidad continua (§3.1). */
export const VISIBILITY_EDGES = [0.05, 0.25] as const

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Orientación de un punto de la esfera respecto de la cámara, normalizada al horizonte:
 * 0 en el limbo (el punto queda justo en el borde visible), 1 bajo la cámara, <0 detrás.
 * Con la cámara en `d`, un punto de radio `r` es visible si cos(ángulo) > r/d.
 */
export function horizonFacing(point: Vec3, camera: Vec3, radius: number): number {
  const lp = Math.hypot(...point)
  const lc = Math.hypot(...camera)
  if (lp === 0 || lc === 0) return 0
  const cos = (point[0] * camera[0] + point[1] * camera[1] + point[2] * camera[2]) / (lp * lc)
  const horizon = Math.min(radius / lc, 0.999)
  return (cos - horizon) / (1 - horizon)
}

/** 0–1: opacidad del marcador según su orientación (smoothstep(.05, .25)). */
export function markerVisibility(facing: number): number {
  return smoothstep(VISIBILITY_EDGES[0], VISIBILITY_EDGES[1], facing)
}

// ---------------------------------------------------------------------------
// Agrupación en pantalla
// ---------------------------------------------------------------------------

export const CLUSTER_RADIUS_PX = 36
/** Bajo esta visibilidad el marcador está oculto (detrás del globo): ni se agrupa ni se enfoca. */
export const HIDDEN_BELOW = 0.02
export const CLUSTER_MIN_VISIBLE = HIDDEN_BELOW

export interface ScreenMarker {
  id: string
  kind: MarkerKind
  x: number
  y: number
  visible: number
  order: number
  group: string
  /** Ancho estimado del rótulo (px), para no encimar rótulos. */
  labelWidth?: number
}

export interface MarkerCounts {
  evaluated: number
  insufficient: number
  reference: number
}

export interface MarkerCluster {
  /** Ids de los miembros ordenados, unidos por «|»: estable entre cuadros. */
  key: string
  /** Ids en orden de prioridad. */
  members: string[]
  x: number
  y: number
  counts: MarkerCounts
  /** País común a todos los miembros, o '' si difieren o no consta. */
  group: string
  /** Visibilidad del miembro menos visible. */
  visible: number
}

export interface ClusterResult {
  clusters: MarkerCluster[]
  /** Ids que quedaron dentro de algún grupo. */
  clustered: ReadonlySet<string>
}

export interface ClusterOptions {
  radius?: number
  minVisible?: number
  /** Nunca se agrupan (selección y hover): conservan su anillo propio. */
  exclude?: Iterable<string | null | undefined>
}

export function countKinds(kinds: Iterable<MarkerKind>): MarkerCounts {
  const counts: MarkerCounts = { evaluated: 0, insufficient: 0, reference: 0 }
  for (const kind of kinds) counts[kind] += 1
  return counts
}

/**
 * Agrupación codiciosa y determinista: en orden de prioridad, cada marcador libre siembra un
 * grupo con todos los libres a menos de `radius` px de él. Un grupo necesita 2 miembros.
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

/** A menos de esta distancia del lugar seleccionado, un grupo taparía su rótulo. */
export const NEAR_SELECTION_PX = 44
const BELOW_RING_PX = 16

/**
 * Un grupo pegado al lugar seleccionado se corre justo bajo su anillo y queda compacto (solo
 * glifos): el rótulo del seleccionado y el anillo de las líneas Tesla quedan libres.
 */
export function placeNearSelection(
  cluster: { x: number; y: number },
  selected: { x: number; y: number; radius: number } | null,
): { x: number; y: number; compact: boolean } {
  if (!selected || Math.hypot(cluster.x - selected.x, cluster.y - selected.y) >= NEAR_SELECTION_PX) return { x: cluster.x, y: cluster.y, compact: false }
  return { x: selected.x, y: selected.y + selected.radius + BELOW_RING_PX, compact: true }
}

/** Huella de la partición: solo cuando cambia se vuelve a pintar la lista de grupos. */
export function clusterSignature(result: ClusterResult): string {
  return result.clusters.map((cluster) => cluster.key).join(';')
}

// ---------------------------------------------------------------------------
// Presupuesto de rótulos
// ---------------------------------------------------------------------------

/** Rótulos simultáneos como máximo: 5 desde 1100 px, 3 en la hoja móvil. */
export function labelBudget(narrow: boolean): number {
  return narrow ? 3 : 5
}

/** Cerca del horizonte el marcador sigue visible pero sin rótulo. */
export const LABEL_MIN_VISIBLE = 0.3

const LABEL_HALF_HEIGHT = 12
const LABEL_OFFSET_X = 11
const DEFAULT_LABEL_WIDTH = 120

/** Ancho aproximado del rótulo: ~7 px por carácter a 12 px, más relleno y línea guía. */
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
 * Qué marcadores sueltos llevan rótulo: selección, hover y luego por prioridad, sin pasar del
 * presupuesto y sin encimar un rótulo sobre otro ya ubicado (el que choca queda solo con su glifo).
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
// Anillo del lugar en pantalla (ancla de las líneas Tesla)
// ---------------------------------------------------------------------------

/** Radio mínimo del anillo del lugar (px): el sector puede medir menos de un píxel en la vista global. */
export const RING_MIN_PX = 14
const RING_PADDING_PX = 4

/** Radio del anillo: cubre el polígono proyectado más un margen, nunca menos de RING_MIN_PX. */
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

/** «75,7 %» con 1 decimal fijo; null si el marcador no tiene %. */
export function markerScoreText(model: Pick<MarkerModel, 'score'>): string | null {
  return model.score === null ? null : `${formatScore(model.score)} %`
}

/** Estado sin cifra: «datos insuficientes» (○) o «por calcular» (◆ y ● sin % del motor). */
export function markerStatusText(model: Pick<MarkerModel, 'kind' | 'score'>): string | null {
  if (model.kind === 'insufficient') return 'datos insuficientes'
  if (model.kind === 'reference' || model.score === null) return 'por calcular'
  return null
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Texto visible del rótulo (para estimar su ancho). */
export function markerLabelText(model: MarkerModel): string {
  return [
    model.rank !== null ? `#${model.rank}` : '',
    model.name,
    markerScoreText(model) ?? '',
    markerStatusText(model) ?? '',
    model.contains !== null ? `contiene ${model.contains} sectores` : '',
    model.coincides.length ? `◆ coincide con ${model.coincides.join(' · ')}` : '',
  ].filter(Boolean).join('  ')
}

/** Etiqueta accesible del botón del marcador (el rótulo visible queda aria-hidden). */
export function markerAriaLabel(model: MarkerModel): string {
  const parts = [model.name]
  if (model.kind === 'reference') {
    parts.push(`${model.group ? `${model.group}, ` : ''}análogo emblemático por calcular, zona aproximada`)
    if (model.contains) parts.push(`contiene ${plural(model.contains, 'sector evaluado', 'sectores evaluados')}`)
  } else if (model.kind === 'insufficient') {
    parts.push('datos insuficientes')
  } else if (model.score !== null) {
    parts.push(`${model.rank !== null ? `puesto ${model.rank}, ` : ''}similitud ${markerScoreText(model)}${model.scoreSource === 'mission' ? ' con tu perfil' : ''}`)
  } else {
    parts.push('por calcular con tu perfil')
  }
  if (model.coincides.length) parts.push(`coincide con ${model.coincides.join(' y ')}`)
  return parts.join(', ')
}

/** Conteos no nulos en el orden ● ○ ◆. */
export function clusterParts(counts: MarkerCounts): Array<{ kind: MarkerKind; count: number }> {
  return (['evaluated', 'insufficient', 'reference'] as const).filter((kind) => counts[kind] > 0).map((kind) => ({ kind, count: counts[kind] }))
}

/** Texto del chip de grupo: «Chile · 3 ● · 1 ◆». Solo conteos, nunca promedios. */
export function clusterText(counts: MarkerCounts, group: string): string {
  return [group, ...clusterParts(counts).map(({ kind, count }) => `${count} ${markerGlyph(kind)}`)].filter(Boolean).join(' · ')
}

export function clusterAriaLabel(counts: MarkerCounts, group: string, open: boolean): string {
  const total = counts.evaluated + counts.insufficient + counts.reference
  const parts = [
    counts.evaluated ? plural(counts.evaluated, 'evaluado', 'evaluados') : '',
    counts.insufficient ? plural(counts.insufficient, 'con datos insuficientes', 'con datos insuficientes') : '',
    counts.reference ? plural(counts.reference, 'análogo por calcular', 'análogos por calcular') : '',
  ].filter(Boolean)
  return `Grupo de ${total} lugares${group ? ` en ${group}` : ''}: ${parts.join(', ')}. ${open ? 'Ocultar' : 'Mostrar'} lista`
}

/** Glifos apilados del grupo (máx. 4), en orden de prioridad. */
export function clusterStack(kinds: readonly MarkerKind[]): string {
  return kinds.slice(0, 4).map(markerGlyph).join('')
}
