// Explicación: la IA solo SELECCIONA (requisitos, evidencias, verificaciones) entre IDs que
// la app ya calculó. El renderizador conserva valores, estados y exclusiones del motor.
import { validateSelectionShape } from './validate'
import type { EvidenceRef, MissionEvaluation, OptionStatus, RequirementResult } from './types'

export interface ExplanationSelection {
  options: Array<{ site_id: string; key_requirement_ids: string[]; evidence_ids: string[] }>
  verification_ids: string[]
}

export interface VerificationItem {
  id: string
  site_id: string
  text: string
}

/** Catálogo cerrado de verificaciones: el modelo solo puede elegir por ID. */
export function buildVerificationCatalog(evaluation: MissionEvaluation): VerificationItem[] {
  const items: VerificationItem[] = []
  for (const o of evaluation.options) {
    for (const r of o.requirement_results) {
      if (r.status === 'cumple') continue
      items.push({
        id: `${o.site_id}|req|${r.requirement_id}`,
        site_id: o.site_id,
        text: r.status === 'no_cumple' ? `Confirmar el incumplimiento de «${r.label}» o revisar si el requisito es indispensable.` : `Obtener una medición de «${r.label}» a la escala requerida.`,
      })
    }
    o.field_checks.forEach((text, i) => items.push({ id: `${o.site_id}|fc|${i}`, site_id: o.site_id, text }))
  }
  return items
}

export type SelectionCheck = { ok: true; selection: ExplanationSelection } | { ok: false; reason: string }

/** Validación semántica: todo ID debe existir en la evaluación calculada por el servidor. */
export function checkSelection(raw: unknown, evaluation: MissionEvaluation): SelectionCheck {
  const bad = (reason: string): SelectionCheck => ({ ok: false, reason })
  const shape = validateSelectionShape(raw)
  if (shape.length) return bad(`Selección fuera de contrato: ${shape[0]}`)
  const sel = raw as ExplanationSelection
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
  const seen = new Set<string>()
  for (const o of sel.options) {
    if (!o || typeof o.site_id !== 'string' || !strings(o.key_requirement_ids) || !strings(o.evidence_ids)) return bad('Opción mal formada.')
    const option = evaluation.options.find((x) => x.site_id === o.site_id)
    if (!option) return bad(`Sector ajeno a la evaluación: ${o.site_id}.`)
    if (seen.has(o.site_id)) return bad(`Sector repetido: ${o.site_id}.`)
    seen.add(o.site_id)
    const reqIds = new Set(option.requirement_results.map((r) => r.requirement_id))
    const evIds = new Set(option.requirement_results.flatMap((r) => r.evidence_ids))
    if (o.key_requirement_ids.length > 20 || o.evidence_ids.length > 20) return bad('Demasiadas referencias.')
    for (const id of o.key_requirement_ids) if (!reqIds.has(id)) return bad(`Requisito ajeno: ${id}.`)
    for (const id of o.evidence_ids) if (!evIds.has(id)) return bad(`Evidencia ajena: ${id}.`)
  }
  const catalog = new Set(buildVerificationCatalog(evaluation).map((v) => v.id))
  if (sel.verification_ids.length > 30 || !strings(sel.verification_ids)) return bad('Verificaciones mal formadas.')
  for (const id of sel.verification_ids) if (!catalog.has(id)) return bad(`Verificación ajena: ${id}.`)
  return { ok: true, selection: { options: sel.options as ExplanationSelection['options'], verification_ids: sel.verification_ids } }
}

/** Selección sin IA: todos los requisitos no cumplidos o no evaluables, primero los imprescindibles. */
export function deterministicSelection(evaluation: MissionEvaluation): ExplanationSelection {
  return {
    options: evaluation.options.map((o) => ({
      site_id: o.site_id,
      key_requirement_ids: [...o.requirement_results].sort((a, b) => Number(b.importance === 'critical') - Number(a.importance === 'critical')).filter((r) => r.status !== 'cumple').map((r) => r.requirement_id),
      evidence_ids: [],
    })),
    verification_ids: buildVerificationCatalog(evaluation).slice(0, 30).map((v) => v.id),
  }
}

export interface ExplanationView {
  source: 'anthropic' | 'deterministic_template'
  notice: string
  options: Array<{
    site_id: string
    name: string
    status: OptionStatus
    rank: number | null
    highlighted: RequirementResult[]
    evidence: EvidenceRef[]
  }>
  verifications: VerificationItem[]
}

/** Compone la vista: los hechos vienen siempre de la evaluación, nunca del texto del modelo. */
export function composeExplanation(evaluation: MissionEvaluation, selection: ExplanationSelection, source: ExplanationView['source']): ExplanationView {
  const evById = new Map(evaluation.evidence.map((e) => [e.evidence_id, e]))
  const catalog = new Map(buildVerificationCatalog(evaluation).map((v) => [v.id, v]))
  return {
    source,
    notice:
      source === 'anthropic'
        ? 'Interpretación asistida por IA (Anthropic): solo selecciona referencias del cálculo; no modifica estados, valores ni exclusiones.'
        : 'Plantilla determinista sin IA: selecciona los requisitos no cumplidos o no evaluables.',
    options: selection.options.map((s) => {
      const o = evaluation.options.find((x) => x.site_id === s.site_id)!
      const highlighted = s.key_requirement_ids.map((id) => o.requirement_results.find((r) => r.requirement_id === id)!)
      const ids = new Set([...s.evidence_ids, ...highlighted.flatMap((r) => r.evidence_ids)])
      return {
        site_id: o.site_id,
        name: o.name,
        status: o.status,
        rank: o.rank,
        highlighted,
        evidence: [...ids].map((id) => evById.get(id)).filter((e): e is EvidenceRef => !!e),
      }
    }),
    verifications: selection.verification_ids.map((id) => catalog.get(id)!).filter(Boolean),
  }
}
