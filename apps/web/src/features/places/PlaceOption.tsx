/**
 * Content of each carousel option (role=option: no nested controls).
 * ● candidate: v3 similarity ring (snapshot, not recalculated) with the word «similarity»
 *   always visible, confidence in a separate bar and feasibility as a chip: three separate things.
 * REF (known reference): same ring, no rank; «Not part of the search».
 * Mission: the status of the team's evaluation (and its rank if prioritized), the preferences
 *   met and «Territorial feasibility: pending». No mission %: it does not exist (ADR-009).
 * ◆ emblematic: no %, no ranking and no confidence; dashed ring «to be calculated».
 */
import type { CSSProperties } from 'react'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, preferencesText, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { GLYPH, useRecordText } from '../../shell/public'
import { useLocale, useT } from '../../i18n'
import { tCommon } from '../../i18n/messages/common'
import { tPlaces } from '../../i18n/messages/places'
import { scienceText } from '../../i18n/science'
import { placeName, type EvaluatedPlace, type ReferencePlace } from './placeModel'
import { similarityTone, similarityToneLabel } from '../../domain/similarityScale'

type Vars = CSSProperties & Record<`--${string}`, string | number>
type PlacesT = ReturnType<typeof tPlaces.in>
/** Texts longer than this switch to the short form as soon as the card is a carousel card (places.css). */
const LONG_CHARS = 20

/**
 * Chip with full text and short form. On narrow cards (places.css) the short form is shown and the
 * full form remains only for screen readers: feasibility is never reduced to «R…».
 */
function Chip({ full, short, title }: { full: string; short: string; title: string }) {
  return (
    <span className="places-chip" title={title} data-long={full.length > LONG_CHARS ? '' : undefined}>
      <span className="places-chip-full">{full}</span>
      <span className="places-chip-short" aria-hidden="true">{short}</span>
    </span>
  )
}

/** Similarity ring 0–100. The number appears in its final state: only the stroke is drawn. */
export function SimilarityRing({ value, caption, tag }: { value: number | null; caption: string; tag?: string }) {
  // The band title (similarityToneLabel) follows the language.
  useLocale()
  return (
    <span className="places-ring" data-empty={value === null ? '' : undefined} data-sim-tone={similarityTone(value) ?? undefined} title={similarityToneLabel(value) ?? undefined}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="places-ring-track" cx="20" cy="20" r="17" pathLength={100} />
        {value !== null && (
          <circle className="places-ring-value" cx="20" cy="20" r="17" pathLength={100} strokeDasharray={`${value} 100`} style={{ '--v': value } as Vars} />
        )}
      </svg>
      <b>{value === null ? '—' : formatScore(value)}</b>
      <small>{caption}</small>
      {tag && <small className="places-ring-tag">{tag}</small>}
    </span>
  )
}

interface EvaluatedProps {
  place: EvaluatedPlace
  /** Candidates with a rank (the «of 6»; never counts the REF). */
  rankedCount: number
  selected: boolean
}

/**
 * First line: what it is (● ○ ◆) or, if selected, «◉ on the globe» (§2.4: selection). On
 * narrow cards the short form is shown («#2 · Prioritized»); the full form remains for screen readers
 * (places.css), so the status never ends up as «PRIORITIZED PAR…».
 */
function Kicker({ glyph, label, short = label, selected }: { glyph: string; label: string; short?: string; selected: boolean }) {
  const t = useT(tPlaces)
  const full = selected ? t('kicker.onGlobe', { label }) : label
  return (
    <span
      className="places-kicker"
      data-selected={selected ? '' : undefined}
      data-short={short !== full ? kickerFit(full) : undefined}
    >
      <span aria-hidden="true">{selected ? GLYPH.onGlobe : glyph}</span>{' '}
      <span className="places-kicker-full">{full}</span>
      <span className="places-kicker-short" aria-hidden="true">{short}</span>
    </span>
  )
}

/**
 * Width (px) below which the full form of the header does not fit: mono small caps of
 * ~7 px per character plus the glyph (measured in Chrome). places.css switches to the short form when the
 * header is narrower than the first step (every 20 px) that reaches that width.
 */
export function kickerFit(text: string): string {
  const need = text.length * 7 + 14
  for (let step = 120; step <= 300; step += 20) if (need <= step) return String(step)
  return 'always'
}

/** Abbreviated Mission status for the short form of the card header (`status.<code>` in the places catalog). */
function statusShort(t: PlacesT, status: SiteMissionStatus): string {
  return t(`status.${status}`)
}

function kickerText(place: EvaluatedPlace, rankedCount: number, t: PlacesT): { label: string; short: string } {
  const { mission, role, rank, status } = place
  if (mission) {
    const ref = role === 'reference' ? ' · REF' : ''
    const head = mission.rank !== null ? `#${mission.rank}${ref} · ` : ''
    const tail = mission.rank !== null ? '' : ref
    return { label: `${head}${MISSION_STATUS_LABEL[mission.status]}${tail}`, short: `${head}${statusShort(t, mission.status)}${tail}` }
  }
  if (role === 'reference') return { label: tCommon('role.refKnownReference'), short: 'REF' }
  if (status === 'insufficient_data') return { label: tCommon('status.insufficientData'), short: tCommon('status.insufficientData') }
  return { label: t('kicker.candidate', { rank: rank ?? '—', count: rankedCount }), short: t('kicker.candidateShort', { rank: rank ?? '—', count: rankedCount }) }
}

function glyphOf(place: EvaluatedPlace): string {
  const status = place.mission?.status
  if (status === 'evidencia_insuficiente' || place.status === 'insufficient_data') return GLYPH.insufficient
  if (status === 'no_cumple_requisitos') return GLYPH.fail
  return GLYPH.evaluated
}

export function EvaluatedOption({ place, rankedCount, selected }: EvaluatedProps) {
  const locale = useLocale()
  const t = tPlaces.in(locale)
  const common = tCommon.in(locale)
  const { candidate, similarity, confidence, coincident, mission, role } = place
  const option = mission?.option ?? null
  const blocker = option?.critical_failed[0] ? option.requirement_results.find((result) => result.requirement_id === option.critical_failed[0]) : null
  const preferences = option ? preferencesText(option) : null
  // Unsupported objective: v3 similarity is for the Mars rover profile and does not apply to what was requested (ADR-009 §2).
  const unsupported = mission?.status === 'objetivo_no_soportado'
  return (
    <>
      <Kicker glyph={glyphOf(place)} {...kickerText(place, rankedCount, t)} selected={selected} />
      <strong className="places-name">{placeName(candidate.name, locale)}</strong>
      <span className="places-meta">
        {place.country ? `${countryLabels[place.country]} · ` : ''}
        <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(candidate.area_km2)}
        {role === 'reference' && !mission ? t('meta.notFromSearch') : ''}
      </span>
      {unsupported
        ? <SimilarityRing value={null} caption={t('ring.notApplicable')} />
        : <SimilarityRing value={similarity} caption={similarity === null ? t('ring.noPercent') : common('similarity.v3')} tag={mission ? t('ring.notRecalculated') : undefined} />}
      {unsupported ? (
        <span className="places-badge">{t('badge.unsupported')}</span>
      ) : blocker ? (
        <span className="places-badge" data-tone="fail">{t('badge.blocked', { label: blocker.label })}</span>
      ) : preferences ? (
        <span className="places-badge">{preferences}</span>
      ) : mission?.status === 'fuera_de_alcance' ? (
        <span className="places-badge">{t('badge.outOfScope')}</span>
      ) : coincident.length > 0 ? (
        <span className="places-badge">
          <span aria-hidden="true">{GLYPH.reference}</span> {t('badge.matches', { names: coincident.map((analog) => scienceText(analog.name, locale)).join(', ') })}
        </span>
      ) : null}
      <span className="places-foot">
        {confidence === null ? (
          <span className="places-conf is-pending">{t('confidence.none')}</span>
        ) : (
          <span className="places-conf">
            <span className="places-conf-word">{t('confidence')}</span><span className="places-conf-short" aria-hidden="true">{t('confidence.short')}</span>
            <i aria-hidden="true" style={{ '--v': Math.max(0, Math.min(1, confidence / 100)) } as Vars} /> <b>{formatScore(confidence)}</b>
          </span>
        )}
        {mission ? (
          <Chip full={common('feasibility.territorialPending')} short={t('feas.pending')} title={t('feas.pendingTitle')} />
        ) : (
          <Chip full={feasibilityLabels[candidate.feasibility]} short={t(`feas.${candidate.feasibility}`)} title={t('feas.title', { label: feasibilityLabels[candidate.feasibility] })} />
        )}
      </span>
    </>
  )
}

/**
 * Diagnostic when the scope has no evidence (or the window has yet to be chosen): nothing is estimated
 * from neighboring windows; the data request travels in the JSON exported from «Your mission».
 */
export function DiagnosisNote({ evaluation }: { evaluation: MissionEvaluation }) {
  const t = useT(tPlaces)
  // The note is record text (engine): shown in the interface language without touching the record (§5).
  const record = useRecordText()
  if (evaluation.outcome === 'evaluated') return null
  const note = evaluation.data_request?.note
  return (
    <div className="places-diagnosis" role="note">
      <strong><span aria-hidden="true">{GLYPH.insufficient}</span> {t(`outcome.${evaluation.outcome}`)}</strong>
      <span>{note ? record.text(note) : t('diagnosis.default')} {t('diagnosis.export')}</span>
    </div>
  )
}

export function ReferenceOption({ place, selected }: { place: ReferencePlace; selected: boolean }) {
  const locale = useLocale()
  const t = tPlaces.in(locale)
  const { analog, containsSectorIds } = place
  return (
    <>
      <Kicker glyph={GLYPH.reference} label={selected ? t('analog.kickerSelected') : t('analog.kicker')} short={t('analog.kickerShort')} selected={selected} />
      <strong className="places-name">{scienceText(analog.name, locale)}</strong>
      <span className="places-meta">{scienceText(analog.country, locale)} · {analog.location.kind === 'region' ? t('analog.region') : t('analog.area')}</span>
      <SimilarityRing value={null} caption={tCommon.in(locale)('status.notYetCalculated')} />
      {containsSectorIds.length > 0 && (
        <span className="places-badge">{t('analog.contains', { count: containsSectorIds.length })}</span>
      )}
      <span className="places-foot">
        <span className="places-conf is-pending">{t('analog.noRanking')}</span>
        <span className="places-source">{t('analog.source', { publisher: analog.sources[0]?.publisher ?? t('analog.sourceCited') })}</span>
      </span>
    </>
  )
}
