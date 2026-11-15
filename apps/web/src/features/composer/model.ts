/**
 * Pure composer model (no stores or React). Nothing here makes up figures: the order, statuses
 * and rankings come from `MissionEvaluation` (the team's deterministic engine, ADR-009) and the
 * similarity is that of the v3 snapshot, without recalculation.
 */
import type { CandidateSite } from '../../domain/contracts'
import { prioritizedCount } from '../../domain/missionView'
import { formatScore, getLocale, type Locale } from '../../i18n/core'
import { tComposer } from '../../i18n/messages/composer'
import { siteName } from '../../mission/siteName'
import type { MissionEvaluation } from '../../mission/types'

/** Short name of the place ("Pampa Yungay", without "— screening sector"), in the interface language. */
export function placeName(name: string, locale: Locale = getLocale()): string {
  return siteName(name, locale).split(' — ')[0]?.trim() || name
}

/**
 * Composer result line: "2 of 6 prioritized candidates · #1 Puna Norte · v3 similarity
 * 82,4 (not recalculated)", "No prioritized option" or the scope diagnosis. The REF does not
 * count in "N of M candidates"; if it ended up prioritized, it is named separately.
 */
export function resultLineText(evaluation: MissionEvaluation, candidates: readonly CandidateSite[], locale: Locale = getLocale()): string {
  const t = tComposer.in(locale)
  if (evaluation.outcome !== 'evaluated') return t(`outcome.${evaluation.outcome}`)
  const prioritized = evaluation.options.filter((option) => option.status === 'priorizado_para_reconocimiento')
  if (evaluation.none_prioritized || prioritized.length === 0) return t('line.none', { total: evaluation.options.length })
  const first = prioritized.find((option) => option.rank === 1) ?? prioritized[0]!
  const candidate = candidates.find((item) => item.site_id === first.site_id)
  const name = placeName(candidate?.name ?? first.name, locale)
  const similarity = first.snapshot_scores.similarity
  const count = prioritizedCount(evaluation)
  return [
    count.of > 0 ? t('line.prioritized', { prioritized: count.candidates, count: count.of }) : '',
    count.reference ? (count.of > 0 ? t('line.refAlso') : t('line.ref')) : '',
    `#1 ${name}${first.role === 'reference' ? ' (REF)' : ''}`,
    similarity === null ? t('line.noSimilarity') : t('line.similarity', { score: formatScore(similarity, locale) }),
  ].filter(Boolean).join(' · ')
}

/** Single announcement per evaluation (same text as the line, with context), in the interface language. */
export function resultAnnouncement(evaluation: MissionEvaluation, candidates: readonly CandidateSite[], locale: Locale = getLocale()): string {
  return tComposer.in(locale)('line.announcement', { line: resultLineText(evaluation, candidates, locale) })
}

export interface TextSegment {
  text: string
  /** 'quote' = quote from the brief in a requirement; 'unmeasured' = topic that the snapshot does not measure. */
  mark: 'quote' | 'unmeasured' | null
}

export interface TextMark {
  start: number
  end: number
  mark: 'quote' | 'unmeasured'
}

/** Locates each literal fragment in the text (first occurrence, case-insensitive). */
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

/** Splits the text into marked and unmarked spans; overlapping ones are discarded (the first wins). */
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
