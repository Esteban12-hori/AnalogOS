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
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, preferencesText, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { GLYPH } from '../../shell/public'
import { displaySource } from '../../i18n/sourceText'
import { placeName, type EvaluatedPlace, type ReferencePlace } from './placeModel'
import { similarityTone, similarityToneLabel } from '../../domain/similarityScale'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** Short form of feasibility for narrow cards (the full form remains for screen readers). */
const FEASIBILITY_SHORT: Readonly<Record<CandidateSite['feasibility'], string>> = {
  unknown: 'Feas.: not evaluated',
  requires_review: 'Feas.: review',
  potentially_feasible: 'Feas.: possible',
  excluded: 'Feas.: excluded',
}
export const TERRITORIAL_PENDING = 'Territorial feasibility: pending'
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
  const full = selected ? `On the globe · ${label}` : label
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

/** Abbreviated Mission status for the short form of the card header. */
const STATUS_SHORT: Readonly<Record<SiteMissionStatus, string>> = {
  priorizado_para_reconocimiento: 'Prioritized',
  no_cumple_requisitos: 'Not met',
  evidencia_insuficiente: 'Insuff. evidence',
  objetivo_no_soportado: 'Not supported',
  fuera_de_alcance: 'Out of scope',
}

function kickerText(place: EvaluatedPlace, rankedCount: number): { label: string; short: string } {
  const { mission, role, rank, status } = place
  if (mission) {
    const ref = role === 'reference' ? ' · REF' : ''
    const head = mission.rank !== null ? `#${mission.rank}${ref} · ` : ''
    const tail = mission.rank !== null ? '' : ref
    return { label: `${head}${MISSION_STATUS_LABEL[mission.status]}${tail}`, short: `${head}${STATUS_SHORT[mission.status]}${tail}` }
  }
  if (role === 'reference') return { label: 'REF · Known reference', short: 'REF' }
  if (status === 'insufficient_data') return { label: 'Insufficient data', short: 'Insufficient data' }
  return { label: `Candidate · #${rank ?? '—'} of ${rankedCount}`, short: `#${rank ?? '—'} of ${rankedCount}` }
}

function glyphOf(place: EvaluatedPlace): string {
  const status = place.mission?.status
  if (status === 'evidencia_insuficiente' || place.status === 'insufficient_data') return GLYPH.insufficient
  if (status === 'no_cumple_requisitos') return GLYPH.fail
  return GLYPH.evaluated
}

export function EvaluatedOption({ place, rankedCount, selected }: EvaluatedProps) {
  const { candidate, similarity, confidence, coincident, mission, role } = place
  const option = mission?.option ?? null
  const blocker = option?.critical_failed[0] ? option.requirement_results.find((result) => result.requirement_id === option.critical_failed[0]) : null
  const preferences = option ? preferencesText(option) : null
  // Unsupported objective: v3 similarity is for the Mars rover profile and does not apply to what was requested (ADR-009 §2).
  const unsupported = mission?.status === 'objetivo_no_soportado'
  return (
    <>
      <Kicker glyph={glyphOf(place)} {...kickerText(place, rankedCount)} selected={selected} />
      <strong className="places-name">{placeName(candidate.name)}</strong>
      <span className="places-meta">
        {place.country ? `${countryLabels[place.country]} · ` : ''}
        <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(candidate.area_km2)}
        {role === 'reference' && !mission ? ' · not from the search' : ''}
      </span>
      {unsupported
        ? <SimilarityRing value={null} caption="not applicable" />
        : <SimilarityRing value={similarity} caption={similarity === null ? 'no %' : 'v3 similarity'} tag={mission ? 'not recalculated' : undefined} />}
      {unsupported ? (
        <span className="places-badge">No % for this objective: v3 similarity belongs to the Mars rover profile</span>
      ) : blocker ? (
        <span className="places-badge" data-tone="fail">Blocked by: {blocker.label}</span>
      ) : preferences ? (
        <span className="places-badge">{preferences}</span>
      ) : mission?.status === 'fuera_de_alcance' ? (
        <span className="places-badge">Not in the requested scope</span>
      ) : coincident.length > 0 ? (
        <span className="places-badge">
          <span aria-hidden="true">{GLYPH.reference}</span> Matches {coincident.map((analog) => displaySource(analog.name)).join(', ')}
        </span>
      ) : null}
      <span className="places-foot">
        {confidence === null ? (
          <span className="places-conf is-pending">Confidence no data</span>
        ) : (
          <span className="places-conf">
            <span className="places-conf-word">Confidence</span><span className="places-conf-short" aria-hidden="true">Conf.</span>
            <i aria-hidden="true" style={{ '--v': Math.max(0, Math.min(1, confidence / 100)) } as Vars} /> <b>{formatScore(confidence)}</b>
          </span>
        )}
        {mission ? (
          <Chip full={TERRITORIAL_PENDING} short="Feas.: pending" title="Permits, access, protected areas and ownership: independent of this result" />
        ) : (
          <Chip full={feasibilityLabels[candidate.feasibility]} short={FEASIBILITY_SHORT[candidate.feasibility]} title={`Feasibility: ${feasibilityLabels[candidate.feasibility]}`} />
        )}
      </span>
    </>
  )
}

const OUTCOME_TITLE: Readonly<Record<Exclude<MissionEvaluation['outcome'], 'evaluated'>, string>> = {
  needs_window_selection: 'There is evidence for a window, not for the point: it still needs to be chosen',
  insufficient_coverage: 'Insufficient evidence for this geometry',
  unsupported_target: 'This objective has no supported profile',
}

/**
 * Diagnostic when the scope has no evidence (or the window has yet to be chosen): nothing is estimated
 * from neighboring windows; the data request travels in the JSON exported from «Your mission».
 */
export function DiagnosisNote({ evaluation }: { evaluation: MissionEvaluation }) {
  if (evaluation.outcome === 'evaluated') return null
  return (
    <div className="places-diagnosis" role="note">
      <strong><span aria-hidden="true">{GLYPH.insufficient}</span> {OUTCOME_TITLE[evaluation.outcome]}</strong>
      <span>{evaluation.data_request?.note ?? 'Nothing was estimated from neighboring windows and no satellites were queried.'} Export the diagnostic (JSON) from “Your mission”.</span>
    </div>
  )
}

export function ReferenceOption({ place, selected }: { place: ReferencePlace; selected: boolean }) {
  const { analog, containsSectorIds } = place
  return (
    <>
      <Kicker glyph={GLYPH.reference} label={selected ? 'emblematic' : 'Emblematic analog'} short="Emblematic" selected={selected} />
      <strong className="places-name">{displaySource(analog.name)}</strong>
      <span className="places-meta">{displaySource(analog.country)} · {analog.location.kind === 'region' ? 'approx. region' : 'approx. area'}</span>
      <SimilarityRing value={null} caption="not yet calculated" />
      {containsSectorIds.length > 0 && (
        <span className="places-badge">Contains {containsSectorIds.length} {containsSectorIds.length === 1 ? 'evaluated sector' : 'evaluated sectors'}</span>
      )}
      <span className="places-foot">
        <span className="places-conf is-pending">no %, no ranking</span>
        <span className="places-source">Source: {analog.sources[0]?.publisher ?? 'cited'}</span>
      </span>
    </>
  )
}
