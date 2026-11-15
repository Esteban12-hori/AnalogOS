/**
 * Adaptadores puros de la Lectura en Misión (docs/INTEGRATION_PLAN.md §5.3). Convierten la vista
 * de explicación del equipo (`composeExplanation`, ADR-009) y la `MissionEvaluation` en las
 * secciones que dibuja la Lectura del rediseño.
 *
 * Regla: NINGUNA cifra sale de la selección (de la IA o de la plantilla). La selección solo aporta
 * IDs; cada texto y cada valor se resuelven contra `evaluation` (lo exigido, lo observado con
 * `fmtObserved`, el motivo y la evidencia que escribió el motor determinista).
 */
import { MISSION_STATUS_LABEL, MISSION_STATUS_ORDER, REQUIREMENT_MARK } from '../../domain/missionView'
import type { ExplanationView } from '../../mission/explanation'
import type { AiProvenance } from '../../mission/exportReport'
import { fmtObserved } from '../../mission/format'
import type { MissionEvaluation, OptionStatus, RequirementResult } from '../../mission/types'

export const RESULT_LABEL = (rulesVersion: string) => `Cálculo determinista · reglas ${rulesVersion} · similitud v3 sin recalcular`
export const TEMPLATE_LABEL = 'Plantilla determinista sin IA'
export const AI_LABEL = '✦ Motivos destacados con IA (Anthropic) · las cifras salen del cálculo determinista'
export const AI_SEND_NOTICE = 'Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief).'
export const STALE_AI_MESSAGE = 'La respuesta no corresponde al cálculo vigente: se mantiene la plantilla determinista.'

export interface ReadingLine {
  requirementId: string
  mark: string
  status: RequirementResult['status']
  /** «Mediana de pendiente regional: ≤ 3° · Ventana completa (~20 km) · observado 2,1°». */
  text: string
  reason: string
  evidence: ReadonlyArray<{ id: string; link: EvidenceLink }>
}

export interface ReadingOption {
  siteId: string
  name: string
  role: 'candidate' | 'reference'
  status: OptionStatus
  statusLabel: string
  rank: number | null
  lines: readonly ReadingLine[]
}

export interface ReadingModel {
  key: string
  result: {
    label: string
    outcome: MissionEvaluation['outcome']
    orderingRule: string
    groups: ReadonlyArray<{ status: OptionStatus; label: string; options: ReadonlyArray<{ siteId: string; name: string; role: 'candidate' | 'reference'; rank: number | null; blockers: readonly string[]; whatWouldChange: readonly string[] }> }>
    pending: readonly string[]
    openQuestions: readonly string[]
    limits: readonly string[]
    dataRequest: string | null
    nonePrioritized: boolean
  }
  highlights: {
    source: ExplanationView['source']
    /** Rótulo visible: plantilla (sin ✦) o IA (con ✦ y procedencia). */
    label: string
    notice: string
    /** «claude-… · 2026-11-14 · req_…» solo con IA. */
    provenance: string | null
    options: readonly ReadingOption[]
    verifications: readonly string[]
  }
}

export type EvidenceLink = { tab: 'fuentes'; anchor: string } | { url: string }

/** Une `evidence_ids` con la pestaña Fuentes (artefacto con URL) o con la ficha del sitio (`app_derived`). */
export function evidenceHref(evidenceId: string, evaluation: MissionEvaluation): EvidenceLink {
  const ref = evaluation.evidence.find((item) => item.evidence_id === evidenceId)
  if (ref?.kind === 'artifact' && ref.source_url && /^https:\/\//.test(ref.source_url)) return { url: ref.source_url }
  return { tab: 'fuentes', anchor: evidenceId.includes('#') ? evidenceId.slice(evidenceId.indexOf('#') + 1) : evidenceId }
}

/** Clave de la Lectura: otra solicitud u otra revisión descartan la anterior. */
export function readingKey(evaluation: Pick<MissionEvaluation, 'request_fingerprint'>, revision: number): string {
  return `mission:${evaluation.request_fingerprint}:${revision}`
}

/** Línea de un requisito con lo exigido y lo observado (ambos de la evaluación). */
export function requirementLine(result: RequirementResult, evaluation: MissionEvaluation): ReadingLine {
  const observed = result.kind === 'measurable' ? ` · observado ${fmtObserved(result.observed_value, result.observed_unit)}` : ''
  return {
    requirementId: result.requirement_id,
    mark: REQUIREMENT_MARK[result.status],
    status: result.status,
    text: `${result.required}${observed}`,
    reason: result.reason,
    evidence: result.evidence_ids.map((id) => ({ id, link: evidenceHref(id, evaluation) })),
  }
}

function provenanceText(provenance: AiProvenance | null): string | null {
  if (!provenance) return null
  return [provenance.model, provenance.created_at.slice(0, 10), provenance.request_id].filter(Boolean).join(' · ')
}

export function explanationToReading(
  view: ExplanationView,
  evaluation: MissionEvaluation,
  revision: number,
  provenance: AiProvenance | null = null,
): ReadingModel {
  const options = new Map(evaluation.options.map((option) => [option.site_id, option]))
  const ai = view.source === 'anthropic'
  return {
    key: readingKey(evaluation, revision),
    result: {
      label: RESULT_LABEL(evaluation.rules_version),
      outcome: evaluation.outcome,
      orderingRule: evaluation.ordering_rule,
      groups: MISSION_STATUS_ORDER.flatMap((status) => {
        if (status === 'fuera_de_alcance') return []
        const list = evaluation.options.filter((option) => option.status === status)
        return list.length
          ? [{
              status,
              label: MISSION_STATUS_LABEL[status],
              options: list.map((option) => ({
                siteId: option.site_id,
                name: option.name,
                role: option.role,
                rank: option.rank,
                blockers: option.requirement_results.filter((result) => result.importance === 'critical' && result.status !== 'cumple').map((result) => `${result.label}: ${result.reason}`),
                whatWouldChange: option.what_would_change,
              })),
            }]
          : []
      }),
      pending: evaluation.pending_requirements,
      openQuestions: evaluation.open_questions,
      limits: evaluation.limits,
      dataRequest: evaluation.data_request?.note ?? null,
      nonePrioritized: evaluation.none_prioritized,
    },
    highlights: {
      source: view.source,
      label: ai ? AI_LABEL : TEMPLATE_LABEL,
      notice: view.notice,
      provenance: ai ? provenanceText(provenance) : null,
      options: view.options.map((item) => {
        const option = options.get(item.site_id)
        // Solo IDs de la selección: el texto y las cifras se resuelven contra la evaluación.
        const lines = item.highlighted
          .map((highlighted) => option?.requirement_results.find((result) => result.requirement_id === highlighted.requirement_id))
          .filter((result): result is RequirementResult => result !== undefined)
          .map((result) => requirementLine(result, evaluation))
        return {
          siteId: item.site_id,
          name: option?.name ?? item.name,
          role: option?.role ?? 'candidate',
          status: option?.status ?? item.status,
          statusLabel: MISSION_STATUS_LABEL[option?.status ?? item.status],
          rank: option?.rank ?? null,
          lines,
        }
      }),
      verifications: view.verifications.map((item) => item.text),
    },
  }
}

/** Primer requisito destacado del sitio, para la píldora de la tarjeta del carrusel. */
export function snippetFor(view: ExplanationView | null, evaluation: MissionEvaluation | null, siteId: string): string | null {
  if (!view || !evaluation) return null
  const option = view.options.find((item) => item.site_id === siteId)
  const first = option?.highlighted[0]
  const result = first ? evaluation.options.find((item) => item.site_id === siteId)?.requirement_results.find((item) => item.requirement_id === first.requirement_id) : undefined
  return result ? `${REQUIREMENT_MARK[result.status]} ${result.label}: ${result.reason}` : null
}
