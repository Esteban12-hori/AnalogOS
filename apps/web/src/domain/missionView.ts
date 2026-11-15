/**
 * Lectura pura de una `MissionEvaluation` del equipo (ADR-009) para el carrusel, el globo, el
 * riel y las líneas. No calcula nada: solo agrupa por el estado que ya decidió `evaluateMission`
 * y marca «fuera del alcance» los sitios que la evaluación no incluyó. Sin Ajv ni motor: puede ir
 * en el chunk principal (solo importa tipos).
 */
import type { MissionEvaluation, OptionEvaluation, OptionStatus, RequirementResult } from '../mission/types'

/** Estado de un sitio en Misión: el de la evaluación o «fuera del alcance». */
export type SiteMissionStatus = OptionStatus | 'fuera_de_alcance'

export const MISSION_STATUS_LABEL: Readonly<Record<SiteMissionStatus, string>> = {
  priorizado_para_reconocimiento: 'Priorizado para reconocimiento',
  no_cumple_requisitos: 'No cumple requisitos',
  evidencia_insuficiente: 'Evidencia insuficiente',
  objetivo_no_soportado: 'Objetivo no soportado',
  fuera_de_alcance: 'Fuera del alcance',
}

/** Orden de los grupos: el de ResultView del equipo, más «fuera del alcance» al final. */
export const MISSION_STATUS_ORDER: readonly SiteMissionStatus[] = [
  'priorizado_para_reconocimiento',
  'no_cumple_requisitos',
  'evidencia_insuficiente',
  'objetivo_no_soportado',
  'fuera_de_alcance',
]

export interface MissionSiteView {
  siteId: string
  status: SiteMissionStatus
  /** Puesto de la evaluación (solo priorizados); nunca un %. */
  rank: number | null
  option: OptionEvaluation | null
}

/** Vista por sitio de la evaluación. Sin evaluación, mapa vacío (Explorar o Misión sin evaluar). */
export function missionSiteViews(evaluation: MissionEvaluation | null, siteIds: readonly string[]): Map<string, MissionSiteView> {
  const views = new Map<string, MissionSiteView>()
  if (!evaluation) return views
  const options = new Map(evaluation.options.map((option) => [option.site_id, option]))
  for (const siteId of siteIds) {
    const option = options.get(siteId) ?? null
    views.set(siteId, {
      siteId,
      status: option ? option.status : 'fuera_de_alcance',
      rank: option?.status === 'priorizado_para_reconocimiento' ? option.rank : null,
      option,
    })
  }
  return views
}

/**
 * Orden de los sitios en Misión: grupos por estado; dentro de los priorizados, el puesto de la
 * evaluación; en los demás grupos, el orden en que la evaluación los entrega y luego site_id.
 */
export function missionOrder(evaluation: MissionEvaluation, siteIds: readonly string[]): string[] {
  const views = missionSiteViews(evaluation, siteIds)
  const position = new Map(evaluation.options.map((option, index) => [option.site_id, index]))
  const group = (id: string) => MISSION_STATUS_ORDER.indexOf(views.get(id)?.status ?? 'fuera_de_alcance')
  return [...siteIds].sort((a, b) => {
    const byGroup = group(a) - group(b)
    if (byGroup !== 0) return byGroup
    const ra = views.get(a)?.rank ?? Infinity
    const rb = views.get(b)?.rank ?? Infinity
    if (ra !== rb) return ra - rb
    const pa = position.get(a) ?? Infinity
    const pb = position.get(b) ?? Infinity
    if (pa !== pb) return pa - pb
    return a < b ? -1 : a > b ? 1 : 0
  })
}

/** ✓ cumple · ✕ no cumple · ○ no evaluable (mismo vocabulario que la tabla del equipo). */
export const REQUIREMENT_MARK: Readonly<Record<RequirementResult['status'], string>> = {
  cumple: '✓',
  no_cumple: '✕',
  no_evaluable: '○',
}

export const REQUIREMENT_STATUS_LABEL: Readonly<Record<RequirementResult['status'], string>> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  no_evaluable: 'No evaluable',
}

/** «3 de 4 preferencias» (sin preferencias: null). */
export function preferencesText(option: Pick<OptionEvaluation, 'preferences'>): string | null {
  const { met, total, unknown } = option.preferences
  if (total === 0) return null
  return `${met} de ${total} ${total === 1 ? 'preferencia' : 'preferencias'}${unknown > 0 ? ` · ${unknown} sin dato` : ''}`
}
