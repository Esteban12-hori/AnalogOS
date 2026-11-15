/**
 * Pure reading of a team's `MissionEvaluation` (ADR-009) for the carousel, the globe, the
 * rail and the lines. It computes nothing: it only groups by the status that `evaluateMission` has already decided
 * and marks as "out of scope" the sites that the evaluation did not include. No Ajv or engine: it can go
 * in the main chunk (it only imports types).
 */
import { getLocale, type Locale } from '../i18n/core'
import { tCommon } from '../i18n/messages/common'
import type { MissionEvaluation, OptionEvaluation, OptionStatus, RequirementResult } from '../mission/types'
import { localizedRecord } from './localizedLabels'

/** Status of a site in Mission: that of the evaluation or "out of scope". */
export type SiteMissionStatus = OptionStatus | 'fuera_de_alcance'

/** Order of the groups: that of the team's ResultView, plus "out of scope" at the end. */
export const MISSION_STATUS_ORDER: readonly SiteMissionStatus[] = [
  'priorizado_para_reconocimiento',
  'no_cumple_requisitos',
  'evidencia_insuficiente',
  'objetivo_no_soportado',
  'fuera_de_alcance',
]

/** Label of each status in the current language (the status code itself is never translated). */
export const MISSION_STATUS_LABEL: Readonly<Record<SiteMissionStatus, string>> = localizedRecord(MISSION_STATUS_ORDER, (status) => tCommon(`missionStatus.${status}`))

export interface MissionSiteView {
  siteId: string
  status: SiteMissionStatus
  /** Rank from the evaluation (prioritized only); never a %. */
  rank: number | null
  option: OptionEvaluation | null
}

/** Per-site view of the evaluation. Without an evaluation, an empty map (Explore or Mission without evaluation). */
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
 * Order of the sites in Mission: groups by status; within the prioritized ones, the rank from the
 * evaluation; in the other groups, the order in which the evaluation delivers them and then site_id.
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

/** ✓ meets · ✕ does not meet · ○ not evaluable (same vocabulary as the team's table). */
export const REQUIREMENT_MARK: Readonly<Record<RequirementResult['status'], string>> = {
  cumple: '✓',
  no_cumple: '✕',
  no_evaluable: '○',
}

const REQUIREMENT_STATUSES: readonly RequirementResult['status'][] = ['cumple', 'no_cumple', 'no_evaluable']

export const REQUIREMENT_STATUS_LABEL: Readonly<Record<RequirementResult['status'], string>> = localizedRecord(REQUIREMENT_STATUSES, (status) => tCommon(`requirementStatus.${status}`))

/** “3 of 4 preferences” / “3 de 4 preferencias” (no preferences: null). */
export function preferencesText(option: Pick<OptionEvaluation, 'preferences'>, locale: Locale = getLocale()): string | null {
  const { met, total, unknown } = option.preferences
  if (total === 0) return null
  const t = tCommon.in(locale)
  const text = t('preferences', { met, count: total })
  return unknown > 0 ? t('preferences.unknown', { text, unknown }) : text
}

/**
 * Count of prioritized sites WITHOUT the REF: the known reference is not a candidate of the search
 * (ADR-008). If the team's engine prioritizes it, this is stated separately ("REF also prioritized").
 */
export function prioritizedCount(evaluation: MissionEvaluation): { candidates: number; of: number; reference: boolean } {
  const prioritized = evaluation.options.filter((option) => option.status === 'priorizado_para_reconocimiento')
  return {
    candidates: prioritized.filter((option) => option.role !== 'reference').length,
    of: evaluation.options.filter((option) => option.role !== 'reference').length,
    reference: prioritized.some((option) => option.role === 'reference'),
  }
}
