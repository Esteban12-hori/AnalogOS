/**
 * Runtime diferido de la Lectura: arma la capa de hechos y el paquete de evidencia, y luego
 * agrega el texto validado (pregenerado o lktron). Se descarga con `import()` la primera vez que
 * se necesita una lectura: trae los validadores Ajv, el motor y las vistas de métricas.
 *
 * Orden: los hechos se publican primero (sin red, al instante); el texto llega encima.
 */
import { checkAiAnalysisEvent, checkEvidencePacket } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { isCriterionId } from '../../domain/criteria'
import { rankCandidates } from '../../domain/scoring'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { MissionState } from '../../state/mission'
import { sensitivity } from '../engine'
import type { MetricView } from '../metrics'
import { buildMetricViews } from '../metrics/buildMetricViews'
import { loadReferenceAnalogs } from '../places'
import { createEventGate, type GateOutcome } from './eventGate'
import { buildEvidencePacket, type EvidenceProfile } from './evidencePacket'
import { LKTRON_URL } from './lktron'
import { loadPregenerated, pickPregenerated } from './pregenerated'
import { missionReadingKey } from './readingStore'
import { PERTURBATION, sensitivityInputs, summarizeRobustness, type RobustnessSummary, type SiteSensitivity } from './robustness'
import type { AiLayer, Reading, ReadingContext } from './types'

export type MissionInput = Pick<MissionState, 'profile' | 'scoring' | 'interpretation' | 'revision'>

export interface BuildInput {
  snapshot: DemoSnapshot
  context: ReadingContext
  mission: MissionInput | null
}

export const MESSAGES = {
  stale: 'el análisis recibido corresponde a otros datos y se descartó; se muestran los hechos actuales.',
  noPregenerated: 'Sin análisis pregenerado disponible: se muestran solo los hechos.',
  pregeneratedMismatch: 'El análisis pregenerado no corresponde a estos datos: se muestran solo los hechos.',
  missionFactsOnly: 'Sin IA en esta sesión: la lectura muestra solo los hechos del motor.',
  invalidPacket: 'El paquete de evidencia no pasó su contrato: la IA no se usa y se muestran los hechos.',
  incomplete: 'El análisis terminó sin su cierre: puede estar incompleto.',
  empty: 'lktron cerró la conexión sin enviar un análisis.',
} as const

const AI_ERROR: Readonly<Record<'timeout' | 'invalid' | 'unavailable', string>> = {
  timeout: 'lktron no terminó a tiempo: se muestran los hechos del motor.',
  invalid: 'lktron no pudo producir un análisis válido: se muestran los hechos del motor.',
  unavailable: 'lktron no está disponible: se muestran los hechos del motor.',
}

const IDLE_AI: AiLayer = Object.freeze({ source: 'none', status: 'idle', stage: null, model: null, blocks: [], discards: [], message: null })

function withAi(reading: Reading, ai: AiLayer): Reading {
  return { ...reading, ai }
}

/** Hechos + paquete. Lanza si el contexto misión no tiene perfil y resultados del motor. */
export function buildReading({ snapshot, context, mission }: BuildInput): Reading {
  const base = snapshot.profile
  const missionProfile = context === 'mission' ? (mission?.profile ?? null) : null
  const scoring = context === 'mission' ? (mission?.scoring ?? null) : null
  if (context === 'mission' && (!missionProfile || !scoring || !mission)) throw new Error('La misión aún no tiene resultados del motor.')

  const baseWeights: Partial<Record<CriterionId, number>> = {}
  for (const criterion of base.criteria) if (isCriterionId(criterion.id)) baseWeights[criterion.id] = criterion.weight
  const profile: EvidenceProfile = missionProfile
    ? { id: missionProfile.id, origin: missionProfile.origin, status: missionProfile.status, weights: missionProfile.weights }
    : { id: base.id, origin: 'snapshot', status: base.status === 'validated' ? 'validated' : 'needs_calibration', weights: baseWeights }

  const scoredBySite = new Map((scoring?.sites ?? []).map((site) => [site.siteId, site]))
  const views = new Map<string, readonly MetricView[]>()
  for (const site of snapshot.candidates) {
    try {
      views.set(site.site_id, buildMetricViews({
        site,
        sites: snapshot.candidates,
        profile: base,
        weights: missionProfile ? missionProfile.weights : null,
        // Con perfil de misión el limitante sale del motor, nunca del snapshot (perfil base).
        contributions: missionProfile ? (scoredBySite.get(site.site_id)?.contributions ?? {}) : null,
        marsReference: snapshot.marsReference,
      }))
    } catch {
      views.set(site.site_id, [])
    }
  }

  let robustness: RobustnessSummary | null = null
  let robustnessReason: string | null = null
  try {
    const order = scoring ? scoring.sites.map((site) => site.siteId) : rankCandidates(snapshot.candidates).map((site) => site.site_id)
    const byId = new Map(snapshot.candidates.map((site) => [site.site_id, site]))
    robustness = summarizeRobustness(order.flatMap((siteId): SiteSensitivity[] => {
      const site = byId.get(siteId)
      if (!site) return []
      const baseScore = scoring ? (scoredBySite.get(siteId)?.similarity ?? null) : site.similarity
      if (baseScore === null) return [{ siteId, baseScore, result: null }]
      const inputs = sensitivityInputs(base, missionProfile ? missionProfile.weights : null, site)
      return [{ siteId, baseScore, result: sensitivity(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight, PERTURBATION) }]
    }))
  } catch {
    robustness = null
    robustnessReason = 'Robustez del orden por calcular: el motor de misión no pudo evaluar los escenarios.'
  }

  const { packet, facts } = buildEvidencePacket({
    snapshotVersion: snapshot.manifest.snapshot_version,
    base,
    candidates: snapshot.candidates,
    profile,
    missionSummary: missionProfile ? (mission?.interpretation?.mission_summary ?? null) : null,
    scoring,
    views,
    robustness,
    robustnessReason,
    unsupported: missionProfile ? (mission?.interpretation?.unsupported ?? []) : [],
  })

  return {
    key: missionProfile && mission ? missionReadingKey(missionProfile.id, mission.revision) : 'base',
    context,
    revision: mission?.revision ?? 0,
    profile: { id: profile.id, label: missionProfile?.label ?? 'Perfil base del snapshot', origin: profile.origin, status: profile.status },
    packet,
    packetValid: checkEvidencePacket(packet).ok,
    facts,
    ai: IDLE_AI,
  }
}

/** Aplica el resultado de la compuerta a la capa de IA (inmutable). */
export function applyOutcome(ai: AiLayer, outcome: GateOutcome): AiLayer {
  switch (outcome.kind) {
    case 'meta':
      return { ...ai, status: 'streaming', model: outcome.model }
    case 'stage':
      return { ...ai, stage: outcome.stage }
    case 'block':
      return { ...ai, blocks: [...ai.blocks, outcome.block] }
    case 'discard':
      return { ...ai, discards: [...ai.discards, { reason: outcome.reason, message: outcome.message }] }
    case 'done':
      return { ...ai, status: 'done', stage: null }
    case 'error':
      return { ...ai, status: 'error', stage: null, message: AI_ERROR[outcome.code] }
    case 'stale':
      return { ...ai, status: 'stale', stage: null, blocks: [], message: MESSAGES.stale }
    case 'fatal':
      return { ...ai, status: 'error', stage: null, blocks: [], message: `${outcome.reason} Se muestran los hechos del motor.` }
  }
}

function stops(outcome: GateOutcome): boolean {
  return outcome.kind === 'done' || outcome.kind === 'error' || outcome.kind === 'stale' || outcome.kind === 'fatal'
}

let analogs: Promise<ReadonlySet<string> | null> | null = null

function analogCatalog(): Promise<ReadonlySet<string> | null> {
  analogs ??= loadReferenceAnalogs().then(
    (state) => (state.status === 'ready' ? new Set(state.analogs.map((analog) => analog.id)) : null),
    () => null,
  )
  return analogs
}

function hasAnalogNotes(events: readonly unknown[]): boolean {
  return events.some((event) => typeof event === 'object' && event !== null && (event as { type?: unknown }).type === 'analog_note')
}

/** Reproduce un análisis (pregenerado) evento a evento por la misma compuerta que lktron. */
export function replayEvents(reading: Reading, events: readonly unknown[], analogIds: ReadonlySet<string> | null): AiLayer {
  const gate = createEventGate({ packet: reading.packet, expectedEngine: 'pregenerated', analogIds, checkSchema: checkAiAnalysisEvent })
  let ai: AiLayer = { ...IDLE_AI, source: 'pregenerated', status: 'waiting' }
  for (const event of events) {
    const outcome = gate.accept(event)
    ai = applyOutcome(ai, outcome)
    if (stops(outcome)) break
  }
  if (ai.status === 'waiting' || ai.status === 'streaming') ai = { ...ai, status: 'done', message: ai.blocks.length ? MESSAGES.incomplete : null }
  return ai
}

export interface PregeneratedOptions {
  fetchPregenerated?: () => Promise<unknown>
}

/** Análisis pregenerado si su huella coincide; si no, «solo hechos». */
export async function attachPregenerated(reading: Reading, options: PregeneratedOptions = {}): Promise<Reading> {
  if (!reading.packetValid) return withAi(reading, { ...IDLE_AI, status: 'facts_only', message: MESSAGES.invalidPacket })
  const file = await loadPregenerated(options.fetchPregenerated)
  const events = pickPregenerated(file, reading.packet.packet_hash)
  if (!events) {
    const message = reading.context === 'mission' ? MESSAGES.missionFactsOnly : file ? MESSAGES.pregeneratedMismatch : MESSAGES.noPregenerated
    return withAi(reading, { ...IDLE_AI, status: 'facts_only', message })
  }
  const analogIds = hasAnalogNotes(events) ? await analogCatalog() : null
  return withAi(reading, replayEvents(reading, events, analogIds))
}

export interface StreamOptions {
  baseUrl: string
  signal: AbortSignal
  publish: (reading: Reading) => void
  fetch?: typeof fetch
  analogIds?: ReadonlySet<string> | null
}

/** Pide el análisis a lktron y publica cada bloque validado según llega. */
export async function streamLktron(reading: Reading, options: StreamOptions): Promise<Reading> {
  if (!reading.packetValid) {
    const next = withAi(reading, { ...IDLE_AI, status: 'facts_only', message: MESSAGES.invalidPacket })
    options.publish(next)
    return next
  }
  const analogIds = options.analogIds !== undefined ? options.analogIds : await analogCatalog()
  const gate = createEventGate({ packet: reading.packet, expectedEngine: 'lktron', analogIds, checkSchema: checkAiAnalysisEvent })
  let current = withAi(reading, { ...IDLE_AI, source: 'lktron', status: 'waiting' })
  options.publish(current)
  // Cliente lktron diferido: con el flag apagado (sin VITE_LKTRON_URL) nunca se descarga.
  const { analyze } = await import('./lktronClient')
  const result = await analyze(reading.packet, {
    baseUrl: options.baseUrl,
    signal: options.signal,
    fetch: options.fetch,
    onLine: (line) => {
      let value: unknown
      try {
        value = JSON.parse(line)
      } catch {
        value = undefined
      }
      const outcome = gate.accept(value)
      current = withAi(current, applyOutcome(current.ai, outcome))
      if (!options.signal.aborted) options.publish(current)
      return !stops(outcome)
    },
  })
  if (!result.ok) {
    if (result.code === 'aborted') return current
    current = withAi(current, { ...current.ai, status: 'error', stage: null, message: `${result.message} Se muestran los hechos del motor.` })
  } else if (current.ai.status === 'waiting' || current.ai.status === 'streaming') {
    const some = current.ai.blocks.length > 0
    current = withAi(current, { ...current.ai, status: some ? 'done' : 'error', stage: null, message: some ? MESSAGES.incomplete : MESSAGES.empty })
  }
  if (!options.signal.aborted) options.publish(current)
  return current
}

export interface RunInput extends BuildInput, PregeneratedOptions {
  signal: AbortSignal
  /** true solo en la fase `analysis` de una misión (o al reintentar): nunca en Explorar. */
  allowLktron: boolean
  publish: (reading: Reading) => void
}

/** Hechos primero; luego lktron (si está activo y se permite) o el pregenerado. */
export async function runReading(input: RunInput): Promise<Reading> {
  const reading = buildReading(input)
  input.publish(reading)
  if (input.signal.aborted) return reading
  if (input.allowLktron && LKTRON_URL && reading.context === 'mission') {
    return streamLktron(reading, { baseUrl: LKTRON_URL, signal: input.signal, publish: input.publish })
  }
  const final = await attachPregenerated(reading, input)
  if (!input.signal.aborted) input.publish(final)
  return final
}
