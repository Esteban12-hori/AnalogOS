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
/** Sin ✦: la Lectura lo antepone (aria-hidden) en la capa de IA; así no se repite. */
export const AI_LABEL = 'Motivos destacados con IA (Anthropic) · las cifras salen del cálculo determinista'
/**
 * Avisos literales de `ResultView` › `AiPanel` del equipo (M10): uno solo, condicional a la casilla del
 * canal geológico (`plannerGeology.test` y `ReadingView.test` comprueban que coinciden).
 */
export const AI_SEND_NOTICE = 'Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief ni cartografía geológica).'
export const AI_SEND_NOTICE_GEOLOGY = 'Al pulsar el botón se envían a Anthropic los requisitos confirmados, los resultados ya calculados, el objetivo confirmado (texto del brief, actividad y requisitos) y la cartografía geológica pública oficial de los sectores evaluados.'
export const GEOLOGY_OPT_LABEL = 'Incluir orientación geológica de la prueba (la IA solo elige entre comprobaciones calculadas por la app).'
export const geologyUnavailableNotice = (reason: string | null): string =>
  `Orientación geológica con IA no disponible: ${reason ?? 'falta el contexto geológico oficial.'} La explicación de requisitos funciona igual sin geología.`
export const GEOLOGY_RETRY_NOTICE = 'La orientación geológica no se pudo pedir. Puede reintentar la explicación sin geología (se enviarán solo los requisitos y resultados calculados, sin el texto del brief ni cartografía).'
export const GEOLOGY_RETRY_LABEL = 'Reintentar sin geología'
/** Dónde queda la orientación geológica en la interfaz integrada (la Lectura solo tiene el botón). */
export const GEOLOGY_WHERE = 'La orientación geológica de la prueba (general o elegida por la IA) se ve en «Tu misión», bajo el resultado.'
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

/** Lugar con requisitos no cumplidos o sin evaluar para el que la selección no destacó nada. */
export interface OmittedOption {
  siteId: string
  name: string
  role: 'candidate' | 'reference'
  rank: number | null
  statusLabel: string
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
    /** Lugares en el orden de la evaluación (nunca en el que devolvió la IA). */
    options: readonly ReadingOption[]
    /**
     * Lugares con algún requisito distinto de «cumple» sin motivos en la selección (solo puede
     * pasar con la IA: la plantilla los destaca todos). Se listan para no callarlos.
     */
    omitted: readonly OmittedOption[]
    /**
     * Nota cuando no hay motivos que mostrar, decidida con la EVALUACIÓN (nunca con lo que eligió
     * la IA): todo se cumple, el alcance no tiene cálculo por requisito o la selección omitió lugares.
     */
    emptyNote: string | null
    verifications: ReadonlyArray<{ id: string; text: string }>
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

/**
 * Qué decir cuando faltan motivos. Se decide con la evaluación: «todo se cumple» solo si ningún
 * resultado es distinto de «cumple»; si la IA dejó lugares sin motivos, se dice y se remite a
 * «Resultado», donde están los bloqueos del cálculo.
 */
export function emptyNote(evaluation: MissionEvaluation, shown: number, omitted: number, ai: boolean): string | null {
  if (evaluation.outcome !== 'evaluated') return shown === 0 ? 'Sin resultados por requisito en este alcance: el diagnóstico está en «Resultado».' : null
  if (omitted > 0) {
    const places = omitted === 1 ? '1 lugar' : `${omitted} lugares`
    return `${ai ? 'La IA no destacó' : 'La plantilla no destacó'} motivos para ${places}; los bloqueos del cálculo están en «Resultado».`
  }
  if (shown > 0) return null
  if (evaluation.options.every((option) => option.requirement_results.length === 0)) return 'La prueba no tiene requisitos: no hay motivos que destacar.'
  // Sin omitidos ni líneas: ningún resultado es distinto de «cumple».
  return 'Todos los requisitos se cumplen donde hay evidencia: no hay motivos que destacar.'
}

export function explanationToReading(
  view: ExplanationView,
  evaluation: MissionEvaluation,
  revision: number,
  provenance: AiProvenance | null = null,
): ReadingModel {
  const options = new Map(evaluation.options.map((option) => [option.site_id, option]))
  const ai = view.source === 'anthropic'
  // La IA no ordena: los lugares van en el orden de la evaluación, sea cual sea el de la selección.
  const position = new Map(evaluation.options.map((option, index) => [option.site_id, index]))
  const at = (siteId: string) => position.get(siteId) ?? evaluation.options.length
  const highlighted = [...view.options]
    .sort((a, b) => at(a.site_id) - at(b.site_id))
    .map((item) => {
      const option = options.get(item.site_id)
      // Solo IDs de la selección: el texto y las cifras se resuelven contra la evaluación.
      const lines = item.highlighted
        .map((entry) => option?.requirement_results.find((result) => result.requirement_id === entry.requirement_id))
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
      } satisfies ReadingOption
    })
  const withLines = new Set(highlighted.filter((option) => option.lines.length > 0).map((option) => option.siteId))
  const omitted: OmittedOption[] = evaluation.options
    .filter((option) => !withLines.has(option.site_id) && option.requirement_results.some((result) => result.status !== 'cumple'))
    .map((option) => ({ siteId: option.site_id, name: option.name, role: option.role, rank: option.rank, statusLabel: MISSION_STATUS_LABEL[option.status] }))
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
      options: highlighted,
      omitted,
      emptyNote: emptyNote(evaluation, withLines.size, omitted.length, ai),
      verifications: view.verifications.map((item) => ({ id: item.id, text: item.text })),
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
