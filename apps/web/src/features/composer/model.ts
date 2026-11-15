/**
 * Modelo puro del composer (sin stores ni React). Nada aquí inventa cifras: el orden, los estados
 * y los puestos vienen de `MissionEvaluation` (motor determinista del equipo, ADR-009) y la
 * similitud es la del snapshot v3, sin recalcular.
 */
import type { CandidateSite } from '../../domain/contracts'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import type { MissionEvaluation } from '../../mission/types'

/** Nombre corto del lugar («Pampa Yungay», sin «— sector de screening»). */
export function placeName(name: string): string {
  return shortCandidateName(name).split(' — ')[0]?.trim() || name
}

const OUTCOME_TEXT: Readonly<Record<Exclude<MissionEvaluation['outcome'], 'evaluated'>, string>> = {
  needs_window_selection: 'Hay evidencia de una ventana, no del punto: falta elegirla',
  insufficient_coverage: 'Evidencia insuficiente para esta geometría: diagnóstico exportable',
  unsupported_target: 'Objetivo no soportado: se conserva el pedido sin cálculo',
}

/**
 * Línea de resultado del composer: «2 priorizados · #1 Puna Norte · similitud v3 82,4 (sin
 * recalcular)», «Ninguna opción priorizada» o el diagnóstico del alcance.
 */
export function resultLineText(evaluation: MissionEvaluation, candidates: readonly CandidateSite[]): string {
  if (evaluation.outcome !== 'evaluated') return OUTCOME_TEXT[evaluation.outcome]
  const prioritized = evaluation.options.filter((option) => option.status === 'priorizado_para_reconocimiento')
  if (evaluation.none_prioritized || prioritized.length === 0) return `Ninguna opción priorizada de ${evaluation.options.length}`
  const first = prioritized.find((option) => option.rank === 1) ?? prioritized[0]!
  const candidate = candidates.find((item) => item.site_id === first.site_id)
  const name = placeName(candidate?.name ?? first.name)
  const similarity = first.snapshot_scores.similarity
  return [
    `${prioritized.length} ${prioritized.length === 1 ? 'priorizado' : 'priorizados'} de ${evaluation.options.length}`,
    `#1 ${name}${first.role === 'reference' ? ' (REF)' : ''}`,
    similarity === null ? 'sin similitud v3' : `similitud v3 ${formatScore(similarity)} (sin recalcular)`,
  ].join(' · ')
}

/** Anuncio único por evaluación (mismo texto que la línea, con contexto). */
export function resultAnnouncement(evaluation: MissionEvaluation, candidates: readonly CandidateSite[]): string {
  return `Evaluación lista. ${resultLineText(evaluation, candidates)}. Factibilidad territorial pendiente.`
}

export interface TextSegment {
  text: string
  /** 'quote' = cita del brief en un requisito; 'unmeasured' = tema que el snapshot no mide. */
  mark: 'quote' | 'unmeasured' | null
}

export interface TextMark {
  start: number
  end: number
  mark: 'quote' | 'unmeasured'
}

/** Ubica cada fragmento literal en el texto (primera aparición, sin distinguir mayúsculas). */
export function locateMarks(text: string, fragments: ReadonlyArray<{ text: string; mark: TextMark['mark'] }>): TextMark[] {
  const lower = text.toLocaleLowerCase('es')
  const out: TextMark[] = []
  for (const fragment of fragments) {
    const needle = fragment.text.trim().toLocaleLowerCase('es')
    if (!needle) continue
    const start = lower.indexOf(needle)
    if (start >= 0) out.push({ start, end: start + needle.length, mark: fragment.mark })
  }
  return out
}

/** Parte el texto en tramos con y sin marca; los solapados se descartan (gana el primero). */
export function highlightSegments(text: string, marks: readonly TextMark[] | null): TextSegment[] {
  if (!marks || marks.length === 0) return [{ text, mark: null }]
  const sorted = [...marks]
    .filter((item) => Number.isInteger(item.start) && Number.isInteger(item.end) && item.start >= 0 && item.end <= text.length && item.start < item.end)
    .sort((a, b) => a.start - b.start)
  const out: TextSegment[] = []
  let cursor = 0
  for (const item of sorted) {
    if (item.start < cursor) continue
    if (item.start > cursor) out.push({ text: text.slice(cursor, item.start), mark: null })
    out.push({ text: text.slice(item.start, item.end), mark: item.mark })
    cursor = item.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), mark: null })
  return out
}
