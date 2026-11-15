/**
 * “Origin” tab of the site sheet (ADR-008): where the site comes from and which published precedents
 * it has. It is the “Origin and precedents” block of the team's sheet (CandidateDetails, removed when
 * integrating; ADR-013) with the same content: origin in the search or known reference, topographic
 * priority (which only orders the preselection), literature review and matches with their source.
 * A fixture does not invent metadata.
 */
import type { CandidateSite, PrecedentCatalog } from '../../domain/contracts'
import { countryLabels, isReference, literatureLabels, matchDetails, relationLabels } from '../../domain/discovery'
import { formatArea, formatScore } from '../../domain/formatting'
import { getLocale, useLocale, type Locale } from '../../i18n'
import { tCommon } from '../../i18n/messages/common'
import { tDetail } from '../../i18n/messages/detail'
import { knownSpanishLang, scienceText } from '../../i18n/science'
import { SPANISH_SOURCE_TITLES } from '../../i18n/sourceText'

export function statusLabel(candidate: CandidateSite, locale: Locale = getLocale()): string {
  if (candidate.status === 'fixture') return 'Fixture'
  if (isReference(candidate)) return tCommon.in(locale)('role.knownReference')
  if (candidate.role === 'candidate') return tCommon.in(locale)('role.searchCandidate')
  return candidate.status === 'candidate' ? tDetail.in(locale)('origin.screening') : candidate.status
}

interface OriginSectionProps {
  candidate: CandidateSite
  precedents: PrecedentCatalog | null
  /** Global rank among the search candidates (the REF has none). */
  rank: number | null
}

export function OriginSection({ candidate, precedents, rank }: OriginSectionProps) {
  const locale = useLocale()
  const t = tDetail.in(locale)
  const reference = isReference(candidate)
  const discovery = candidate.discovery
  const review = candidate.literature_review
  const matches = matchDetails(candidate, precedents)
  return (
    <div className="origin-tab">
      <p className="origin-badge">
        <b>{reference ? 'REF' : rank ?? '—'}</b> <span>{statusLabel(candidate, locale)}</span>
      </p>
      <dl className="origin-list">
        {candidate.country && <div><dt>{t('origin.country')}</dt><dd>{countryLabels[candidate.country]}</dd></div>}
        <div><dt>{t('origin.area')}</dt><dd>{formatArea(candidate.area_km2, locale)}</dd></div>
        <div><dt>{t('origin.feasibility')}</dt><dd>{t('origin.feasibilityPending')}</dd></div>
      </dl>

      {discovery && review && (
        <section className="origin-section" aria-labelledby={`origin-heading-${candidate.site_id}`}>
          <div className="subheading-row">
            <h3 id={`origin-heading-${candidate.site_id}`}>{t('origin.heading')}</h3>
            <span>{literatureLabels[review.status]}</span>
          </div>
          <dl className="origin-list">
            <div>
              <dt>{t('origin.origin')}</dt>
              <dd>
                {reference
                  ? t('origin.reference', { snapshot: discovery.source_snapshot ?? t('origin.previous') })
                  : t('origin.grid', { window: discovery.window_id ?? '', rank: discovery.selection_rank ?? '' })}
              </dd>
            </div>
            {discovery.topographic_priority !== null && (
              <div>
                <dt>{t('origin.priority')}</dt>
                <dd>{t('origin.priorityValue', { value: formatScore(discovery.topographic_priority, locale) })}</dd>
              </div>
            )}
            <div><dt>{t('origin.note')}</dt><dd>{scienceText(discovery.note, locale)}</dd></div>
            <div>
              <dt>{t('origin.review')}</dt>
              <dd>{t('origin.reviewValue', { note: scienceText(review.note, locale), version: review.catalog_version, date: review.reviewed_at })}</dd>
            </div>
          </dl>
          {matches.length > 0 && (
            <ul className="precedent-list">
              {matches.map((match) => (
                <li key={match.precedent_id}>
                  <strong>{scienceText(match.name, locale)}</strong>
                  <span>
                    {relationLabels[match.relation]}
                    {match.points ? t('origin.points', { count: match.points.length }) : ''}
                    {match.distance_km !== undefined ? t('origin.distance', { km: formatScore(match.distance_km, locale), point: match.nearest_point ?? '' }) : ''}.
                  </span>
                  <small>{scienceText(match.spatialPrecision, locale)}</small>
                  {/* A known-Spanish title: `lang="es"` and the “original title” mark only in the English interface (§6). */}
                  <a href={match.sourceUrl} target="_blank" rel="noreferrer" lang={SPANISH_SOURCE_TITLES.has(match.sourceTitle) ? knownSpanishLang(locale) : undefined}>{scienceText(match.sourceTitle, locale)} ↗</a>
                  {SPANISH_SOURCE_TITLES.has(match.sourceTitle) && locale === 'en' && <small>{t('origin.originalTitle')}</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {candidate.warnings.length > 0 && (
        <details className="origin-warnings">
          <summary>{t('origin.warnings', { count: candidate.warnings.length })}</summary>
          <ul>{candidate.warnings.map((warning) => <li key={warning}>{scienceText(warning, locale)}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
