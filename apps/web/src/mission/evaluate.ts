import type { CandidateSite } from '../domain/contracts'
import { LIMITS, METRICS, ORDERING_RULE, RULES_VERSION, SUPPORTED_PROFILE_ID, UNMEASURED_TOPICS } from './catalog'
import { describeCondition, describeEffective, fmtObserved } from './format'
import { fingerprint } from './fingerprint'
import { resolveScope } from './geometry'
import {
  MissionInputError,
  type DataRequest,
  type EvaluationOutcome,
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

const describeRequirement = (r: MeasurableRequirement): string => `${r.label}: ${describeEffective(r)}`

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

function observe(r: MeasurableRequirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>): Observation {
  const spec = METRICS[r.metric_id]
  const empty: Observation = { value: null, unit: null, evidence_ids: [], scale_note: spec.scale_note, period: null }
  if (spec.source.kind === 'criterion') {
    const item = site.score_breakdown.find((b) => b.criterion_id === (spec.source as { criterion_id: string }).criterion_id)
    if (!item || item.status !== 'valid' || typeof item.raw_value !== 'number' || !Number.isFinite(item.raw_value)) return empty
    const ev = site.evidence.find((e) => e.dataset_id === item.dataset_id)
    if (ev) registry.set(ev.evidence_id, { evidence_id: ev.evidence_id, kind: 'artifact', site_id: site.site_id, dataset_id: ev.dataset_id, claim: ev.claim, source_url: ev.source_url })
    return {
      value: item.raw_value,
      unit: spec.canonical_unit,
      evidence_ids: ev ? [ev.evidence_id] : [],
      scale_note: `${spec.scale_note} Snapshot: ${item.explanation}`,
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
    claim: 'Área y país del polígono tal como figuran en candidate-details.json del snapshot.',
    source_url: null,
  })
  return { value, unit: spec.canonical_unit, evidence_ids: [id], scale_note: spec.scale_note, period: null }
}

function evaluateMeasurable(r: MeasurableRequirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>): RequirementResult {
  const common = { requirement_id: r.requirement_id, label: r.label, importance: r.importance, kind: 'measurable' as const, required: describeRequirement(r) }
  if (r.scale === 'point') {
    return {
      ...common,
      status: 'no_evaluable',
      observed_value: null,
      observed_unit: null,
      reason: 'El requisito es de escala puntual; el snapshot solo mide estadísticos de la ventana completa y no se sustituye por una mediana regional.',
      evidence_ids: [],
      scale_note: METRICS[r.metric_id].scale_note,
      period: null,
      conversion: null,
    }
  }
  const obs = observe(r, site, bundle, registry)
  if (obs.value === null) {
    return { ...common, status: 'no_evaluable', observed_value: null, observed_unit: null, reason: 'Sin valor válido de esta métrica para la ventana en el snapshot.', evidence_ids: obs.evidence_ids, scale_note: obs.scale_note, period: obs.period, conversion: null }
  }
  let conversion: string | null = null
  let threshold = r.value
  if (r.metric_id === 'nonvegetated_fraction' && r.unit === 'percent') {
    threshold = Array.isArray(r.value) ? ((r.value as unknown[]).map((v) => (v as number) / 100) as [number, number]) : (r.value as number) / 100
    conversion = 'Umbral en % convertido a fracción 0–1 dividiendo por 100; el snapshot guarda la fracción.'
  }
  let pass: boolean
  if (r.operator === 'in') pass = (threshold as string[]).includes(String(obs.value))
  else if (r.operator === 'between') pass = (obs.value as number) >= (threshold as [number, number])[0] && (obs.value as number) <= (threshold as [number, number])[1]
  else if (r.operator === '<=') pass = (obs.value as number) <= (threshold as number)
  else pass = (obs.value as number) >= (threshold as number)
  const shown = fmtObserved(obs.value, obs.unit)
  const cond = describeCondition(r)
  return {
    ...common,
    status: pass ? 'cumple' : 'no_cumple',
    observed_value: obs.value,
    observed_unit: obs.unit,
    reason: `Valor observado ${shown} ${pass ? 'cumple' : 'no cumple'} la condición ${cond}.`,
    evidence_ids: obs.evidence_ids,
    scale_note: obs.scale_note,
    period: obs.period,
    conversion,
  }
}

function evaluateUnmeasured(r: UnmeasuredRequirement): RequirementResult {
  const topic = UNMEASURED_TOPICS.find((t) => t.id === r.topic_id)?.label ?? 'Tema no catalogado'
  return {
    requirement_id: r.requirement_id,
    label: r.label,
    importance: r.importance,
    kind: 'unmeasured',
    status: 'no_evaluable',
    required: `${r.label}${r.detail ? ` — ${r.detail}` : ''}`,
    observed_value: null,
    observed_unit: null,
    reason: `«${topic}» no está medido en el snapshot v3: queda como pendiente y no se interpreta como otra métrica disponible.`,
    evidence_ids: [],
    scale_note: null,
    period: null,
    conversion: null,
  }
}

function evaluateRequirement(r: Requirement, site: CandidateSite, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>): RequirementResult {
  return r.kind === 'measurable' ? evaluateMeasurable(r, site, bundle, registry) : evaluateUnmeasured(r)
}

function whatWouldChange(results: RequirementResult[]): string[] {
  const out: string[] = []
  for (const r of results) {
    if (r.status === 'no_cumple') out.push(`Revisar si «${r.label}» es realmente necesario o elegir otro sector: observado ${fmtObserved(r.observed_value, r.observed_unit)}.`)
    else if (r.status === 'no_evaluable') out.push(`Medir «${r.label}» a la escala requerida (${r.importance === 'critical' ? 'imprescindible' : 'preferencia'}): ${r.reason}`)
  }
  return out
}

const STATUS_ORDER: Record<OptionStatus, number> = {
  priorizado_para_reconocimiento: 0,
  evidencia_insuficiente: 1,
  no_cumple_requisitos: 2,
  objetivo_no_soportado: 3,
}

function evaluateOption(site: CandidateSite, request: MissionRequest, bundle: EvidenceBundle, registry: Map<string, EvidenceRef>, supported: boolean): OptionEvaluation {
  const results = supported ? request.requirements.map((r) => evaluateRequirement(r, site, bundle, registry)) : []
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
    what_would_change: whatWouldChange(results),
    field_checks: [...site.field_checks],
    limitations: [...site.limitations],
  }
}

/** Fuentes externas del manifiesto, una por proveedor/enlace; las teselas NASADEM se agrupan. */
function plannedSources(bundle: EvidenceBundle): PlannedSource[] {
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
      product: isTile ? 'NASADEM_HGT.001 (teselas según la geometría)' : d.product,
      landing_url: d.landing_url,
    })
  }
  return [...out.values()].sort((a, b) => a.dataset_id.localeCompare(b.dataset_id))
}

/**
 * Evalúa una solicitud confirmada contra el snapshot. Puro y determinista: sin red, sin IA,
 * sin reloj. Lanza MissionInputError si la solicitud es inválida o no está confirmada.
 */
export function evaluateMission(input: unknown, bundle: EvidenceBundle): MissionEvaluation {
  const checked = validateMissionRequest(input, { requireConfirmed: true })
  if (!checked.ok) throw new MissionInputError(checked.issues)
  const request = checked.request
  const known = new Set(bundle.candidates.map((c) => c.site_id))
  if (request.scope.mode === 'sector' && !known.has(request.scope.site_id)) throw new MissionInputError([`El sector «${request.scope.site_id}» no existe en el snapshot.`])
  const chosen = request.scope.mode === 'point' || request.scope.mode === 'bbox' ? request.scope.window_site_id : null

  const resolution = resolveScope(request.scope, bundle.candidates)
  if (chosen && !resolution.matches.some((m) => m.site_id === chosen)) {
    throw new MissionInputError([`La ventana «${chosen}» no coincide geométricamente con la geometría pedida.`])
  }
  const supported = request.target.profile_id === SUPPORTED_PROFILE_ID && bundle.profile.id === SUPPORTED_PROFILE_ID
  const registry = new Map<string, EvidenceRef>()
  const sites = resolution.evaluated_site_ids.map((id) => bundle.candidates.find((c) => c.site_id === id)!)
  const options = sites.map((s) => evaluateOption(s, request, bundle, registry, supported))

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
          planned_sources: plannedSources(bundle),
          note: 'Solicitud de análisis reproducible. Esta versión no adquiere datos nuevos ni consulta satélites: no hay evidencia suficiente para esta geometría y no se estimó nada con ventanas vecinas.',
        }
      : null

  const hasPartial = ranked.some((o) => o.preferences.unknown > 0)
  const evidence = [...registry.values()].sort((a, b) => a.evidence_id.localeCompare(b.evidence_id))
  const evaluation: MissionEvaluation = {
    evaluation_version: '1.0.0',
    rules_version: RULES_VERSION,
    snapshot_version: bundle.manifest.snapshot_version,
    profile: { id: bundle.profile.id, version: bundle.profile.version, name: bundle.profile.name, status: bundle.profile.status },
    request_fingerprint: fingerprint(request),
    outcome,
    resolution,
    comparability: outcome !== 'evaluated' ? 'not_applicable' : hasPartial ? 'partial' : 'full',
    ordering_rule: ORDERING_RULE,
    options,
    recommended_site_ids: ranked.map((o) => o.site_id),
    none_prioritized: outcome === 'evaluated' && ranked.length === 0,
    pending_requirements: request.requirements.filter((r) => r.kind === 'unmeasured').map((r) => r.requirement_id),
    open_questions: request.open_questions,
    data_request,
    evidence,
    limits: [...LIMITS],
  }
  return evaluation
}

export function evaluationFingerprint(evaluation: MissionEvaluation): string {
  return fingerprint(evaluation)
}
