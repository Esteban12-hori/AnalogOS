import type { CandidateSite } from '../domain/contracts'
import { METRICS, RULES_VERSION, SUPPORTED_PROFILE_ID } from './catalog'
import { fingerprint } from './fingerprint'
import { resolveScope } from './geometry'
import { DEFAULT_EVALUATION_VERSION, missionText, topicLabelOf, type MissionText } from './text'
import {
  MissionInputError,
  type DataRequest,
  type EvaluationOutcome,
  type EvaluationVersion,
  type EvidenceBundle,
  type EvidenceRef,
  type MeasurableRequirement,
  type MissionEvaluation,
  type MissionRequest,
  type OptionEvaluation,
  type OptionStatus,
  type PlannedSource,
  type Requirement,
  type RequirementResult,
  type UnmeasuredRequirement,
} from './types'
import { validateMissionRequest } from './validate'

const SITE_RECORD = '#site-record'

const describeRequirement = (r: MeasurableRequirement, text: MissionText): string => `${r.label}: ${text.describeEffective(r)}`

function periodOf(bundle: EvidenceBundle, datasetId: string): string | null {
  const d = bundle.manifest.datasets.find((x) => x.dataset_id === datasetId)
  return d?.time_start && d?.time_end ? `${d.time_start} – ${d.time_end}` : null
}

interface Observation {
  value: number | string | null
  unit: string | null
  evidence_ids: string[]
  scale_note: string
  period: string | null
}

function observe(r: MeasurableRequirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>, text: MissionText): Observation {
  const spec = METRICS[r.metric_id]
  const scaleNote = text.metricScaleNote[r.metric_id]
  const empty: Observation = { value: null, unit: null, evidence_ids: [], scale_note: scaleNote, period: null }
  if (spec.source.kind === 'criterion') {
    const item = site.score_breakdown.find((b) => b.criterion_id === (spec.source as { criterion_id: string }).criterion_id)
    if (!item || item.status !== 'valid' || typeof item.raw_value !== 'number' || !Number.isFinite(item.raw_value)) return empty
    const ev = site.evidence.find((e) => e.dataset_id === item.dataset_id)
    if (ev) registry.set(ev.evidence_id, { evidence_id: ev.evidence_id, kind: 'artifact', site_id: site.site_id, dataset_id: ev.dataset_id, claim: ev.claim, source_url: ev.source_url })
    return {
      value: item.raw_value,
      unit: spec.canonical_unit,
      evidence_ids: ev ? [ev.evidence_id] : [],
      scale_note: text.snapshotScaleNote(scaleNote, item.explanation),
      period: periodOf(bundle, item.dataset_id),
    }
  }
  const field = spec.source.field
  const value = field === 'area_km2' ? site.area_km2 : (site.country ?? null)
  if (value === null || (typeof value === 'number' && !Number.isFinite(value))) return empty
  const id = `${site.site_id}${SITE_RECORD}`
  registry.set(id, {
    evidence_id: id,
    kind: 'app_derived',
    site_id: site.site_id,
    dataset_id: site.data_snapshot_version,
    claim: text.siteRecordClaim,
    source_url: null,
  })
  return { value, unit: spec.canonical_unit, evidence_ids: [id], scale_note: scaleNote, period: null }
}

function evaluateMeasurable(r: MeasurableRequirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>, text: MissionText): RequirementResult {
  const common = { requirement_id: r.requirement_id, label: r.label, importance: r.importance, kind: 'measurable' as const, required: describeRequirement(r, text) }
  if (r.scale === 'point') {
    return {
      ...common,
      status: 'no_evaluable',
      observed_value: null,
      observed_unit: null,
      reason: text.pointScaleReason,
      evidence_ids: [],
      scale_note: text.metricScaleNote[r.metric_id],
      period: null,
      conversion: null,
    }
  }
  const obs = observe(r, site, bundle, registry, text)
  if (obs.value === null) {
    return { ...common, status: 'no_evaluable', observed_value: null, observed_unit: null, reason: text.noValueReason, evidence_ids: obs.evidence_ids, scale_note: obs.scale_note, period: obs.period, conversion: null }
  }
  let conversion: string | null = null
  let threshold = r.value
  if (r.metric_id === 'nonvegetated_fraction' && r.unit === 'percent') {
    threshold = Array.isArray(r.value) ? ((r.value as unknown[]).map((v) => (v as number) / 100) as [number, number]) : (r.value as number) / 100
    conversion = text.percentConversion
  }
  let pass: boolean
  if (r.operator === 'in') pass = (threshold as string[]).includes(String(obs.value))
  else if (r.operator === 'between') pass = (obs.value as number) >= (threshold as [number, number])[0] && (obs.value as number) <= (threshold as [number, number])[1]
  else if (r.operator === '<=') pass = (obs.value as number) <= (threshold as number)
  else pass = (obs.value as number) >= (threshold as number)
  const shown = text.fmtObserved(obs.value, obs.unit)
  const cond = text.describeCondition(r)
  return {
    ...common,
    status: pass ? 'cumple' : 'no_cumple',
    observed_value: obs.value,
    observed_unit: obs.unit,
    reason: text.observedReason(shown, pass, cond),
    evidence_ids: obs.evidence_ids,
    scale_note: obs.scale_note,
    period: obs.period,
    conversion,
  }
}

function evaluateUnmeasured(r: UnmeasuredRequirement, text: MissionText): RequirementResult {
  const topic = topicLabelOf(text, r.topic_id)
  return {
    requirement_id: r.requirement_id,
    label: r.label,
    importance: r.importance,
    kind: 'unmeasured',
    status: 'no_evaluable',
    required: `${r.label}${r.detail ? ` — ${r.detail}` : ''}`,
    observed_value: null,
    observed_unit: null,
    reason: text.unmeasuredReason(topic),
    evidence_ids: [],
    scale_note: null,
    period: null,
    conversion: null,
  }
}

function evaluateRequirement(r: Requirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>, text: MissionText): RequirementResult {
  return r.kind === 'measurable' ? evaluateMeasurable(r, site, bundle, registry, text) : evaluateUnmeasured(r, text)
}

function whatWouldChange(results: RequirementResult[], text: MissionText): string[] {
  const out: string[] = []
  for (const r of results) {
    if (r.status === 'no_cumple') out.push(text.wouldChangeFailed(r.label, text.fmtObserved(r.observed_value, r.observed_unit)))
    else if (r.status === 'no_evaluable') out.push(text.wouldChangeMeasure(r.label, text.importanceLabel[r.importance], r.reason))
  }
  return out
}

const STATUS_ORDER: Record<OptionStatus, number> = {
  priorizado_para_reconocimiento: 0,
  evidencia_insuficiente: 1,
  no_cumple_requisitos: 2,
  objetivo_no_soportado: 3,
}

function evaluateOption(site: CandidateSite, request: MissionRequest, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>, supported: boolean, text: MissionText): OptionEvaluation {
  const results = supported ? request.requirements.map((r) => evaluateRequirement(r, site, bundle, registry, text)) : []
  const critical = results.filter((r) => r.importance === 'critical')
  const prefs = results.filter((r) => r.importance === 'preference')
  const critical_failed = critical.filter((r) => r.status === 'no_cumple').map((r) => r.requirement_id)
  const critical_unknown = critical.filter((r) => r.status === 'no_evaluable').map((r) => r.requirement_id)
  let status: OptionStatus
  if (!supported) status = 'objetivo_no_soportado'
  else if (critical_failed.length) status = 'no_cumple_requisitos'
  else if (critical_unknown.length || site.similarity === null || site.status === 'insufficient_data' || site.status === 'excluded') status = 'evidencia_insuficiente'
  else status = 'priorizado_para_reconocimiento'
  return {
    site_id: site.site_id,
    name: site.name,
    country: site.country ?? null,
    role: site.role ?? 'candidate',
    status,
    rank: null,
    critical_failed,
    critical_unknown,
    preferences: {
      met: prefs.filter((r) => r.status === 'cumple').length,
      unmet: prefs.filter((r) => r.status === 'no_cumple').length,
      unknown: prefs.filter((r) => r.status === 'no_evaluable').length,
      total: prefs.length,
    },
    requirement_results: results,
    snapshot_scores: { similarity: site.similarity, confidence: site.confidence, stability: site.stability },
    territorial_feasibility: 'pending',
    what_would_change: whatWouldChange(results, text),
    field_checks: [...site.field_checks],
    limitations: [...site.limitations],
  }
}

/** External manifest sources, one per provider/link; NASADEM tiles are grouped together. */
function plannedSources(bundle: EvidenceBundle, text: MissionText): PlannedSource[] {
  const out = new Map<string, PlannedSource>()
  for (const d of bundle.manifest.datasets) {
    if (/^(derived-|analogos-|analog-|natural-earth)/.test(d.dataset_id)) continue
    if (/-v1$/.test(d.dataset_id) && !d.dataset_id.startsWith('nasa-pds-mola') && !d.dataset_id.startsWith('nasadem-')) continue
    const isTile = d.dataset_id.startsWith('nasadem-')
    const key = `${d.provider}|${d.landing_url}`
    if (out.has(key)) continue
    out.set(key, {
      dataset_id: isTile ? 'nasadem-hgt-001' : d.dataset_id,
      provider: d.provider,
      product: isTile ? text.tileProduct : d.product,
      landing_url: d.landing_url,
    })
  }
  return [...out.values()].sort((a, b) => a.dataset_id.localeCompare(b.dataset_id))
}

/**
 * Evaluates a confirmed request against the snapshot. Pure and deterministic: no network, no AI,
 * no clock. Throws MissionInputError if the request is invalid or not confirmed.
 * `opts.version` selects the text pack of the record (default 1.1.0, English; 1.0.0 is the frozen Spanish pack used
 * to rebuild historical records). The version never changes statuses, ranks, values, evidence or geometry.
 * An unknown version throws UnsupportedVersionError.
 */
export function evaluateMission(input: unknown, bundle: EvidenceBundle, opts: { version?: EvaluationVersion } = {}): MissionEvaluation {
  const version = opts.version === undefined ? DEFAULT_EVALUATION_VERSION : opts.version
  const text = missionText(version)
  const checked = validateMissionRequest(input, { requireConfirmed: true })
  if (!checked.ok) throw new MissionInputError(checked.issues)
  const request = checked.request
  const known = new Set(bundle.candidates.map((c) => c.site_id))
  if (request.scope.mode === 'sector' && !known.has(request.scope.site_id)) throw new MissionInputError([`Sector “${request.scope.site_id}” does not exist in the snapshot.`])
  const chosen = request.scope.mode === 'point' || request.scope.mode === 'bbox' ? request.scope.window_site_id : null

  const resolution = resolveScope(request.scope, bundle.candidates, text.scopeNotes)
  if (chosen && !resolution.matches.some((m) => m.site_id === chosen)) {
    throw new MissionInputError([`Window “${chosen}” does not geometrically match the requested geometry.`])
  }
  const supported = request.target.profile_id === SUPPORTED_PROFILE_ID && bundle.profile.id === SUPPORTED_PROFILE_ID
  const registry = new Map<string, EvidenceRef>()
  const sites = resolution.evaluated_site_ids.map((id) => bundle.candidates.find((c) => c.site_id === id)!)
  const options = sites.map((s) => evaluateOption(s, request, bundle, registry, supported, text))

  const ranked = options
    .filter((o) => o.status === 'priorizado_para_reconocimiento')
    .sort((a, b) => b.preferences.met - a.preferences.met || (b.snapshot_scores.similarity ?? 0) - (a.snapshot_scores.similarity ?? 0) || a.site_id.localeCompare(b.site_id))
  ranked.forEach((o, i) => { o.rank = i + 1 })
  options.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.site_id.localeCompare(b.site_id))

  let outcome: EvaluationOutcome
  if (!supported) outcome = 'unsupported_target'
  else if (resolution.state === 'needs_window_selection') outcome = 'needs_window_selection'
  else if (!sites.length) outcome = 'insufficient_coverage'
  else outcome = 'evaluated'

  const data_request: DataRequest | null =
    outcome === 'insufficient_coverage' || outcome === 'needs_window_selection'
      ? {
          acquisition_status: 'no_adquirido_en_M8',
          requested_geometry: resolution.requested,
          requirements: request.requirements,
          planned_sources: plannedSources(bundle, text),
          note: text.dataRequestNote,
        }
      : null

  const hasPartial = ranked.some((o) => o.preferences.unknown > 0)
  const evidence = [...registry.values()].sort((a, b) => a.evidence_id.localeCompare(b.evidence_id))
  const evaluation: MissionEvaluation = {
    evaluation_version: version,
    rules_version: RULES_VERSION,
    snapshot_version: bundle.manifest.snapshot_version,
    profile: { id: bundle.profile.id, version: bundle.profile.version, name: bundle.profile.name, status: bundle.profile.status },
    request_fingerprint: fingerprint(request),
    outcome,
    resolution,
    comparability: outcome !== 'evaluated' ? 'not_applicable' : hasPartial ? 'partial' : 'full',
    ordering_rule: text.orderingRule,
    options,
    recommended_site_ids: ranked.map((o) => o.site_id),
    none_prioritized: outcome === 'evaluated' && ranked.length === 0,
    pending_requirements: request.requirements.filter((r) => r.kind === 'unmeasured').map((r) => r.requirement_id),
    open_questions: request.open_questions,
    data_request,
    evidence,
    limits: [...text.limits],
  }
  return evaluation
}

export function evaluationFingerprint(evaluation: MissionEvaluation): string {
  return fingerprint(evaluation)
}
