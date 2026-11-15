import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import {
  buildGeologyExport,
  geologyExportFileName,
  selectGeologySite,
  type GeologyContextState,
  type GeologySelection,
} from '../domain/geologyContext'
import { availabilityHint, geologyDisplayText, geologyReasonText } from '../domain/geologyCopy'
import { shortCandidateName } from '../domain/formatting'
import { useLocale } from '../i18n'
import { GLOSS_LABEL, ORIGINAL_LABEL } from '../i18n/geologyGloss'
import { tScience } from '../i18n/messages/science'
import { knownSpanishLang, originalWordingMark, scienceText, scienceTexts, unitDescriptionGloss, unitNameGloss } from '../i18n/science'

interface GeologyContextViewProps {
  candidateName: string
  selection: GeologySelection
  onDownload?: () => void
  downloadError?: string | null
}

const stamp = (value: string) => value.replace('T', ' ').replace('Z', ' UTC')

/**
 * Pure view of the record: receives the already-resolved state, so it can be tested without a browser.
 * Language (ADR-017): interface text from the science catalog; official/artifact text through i18n/science — the
 * original in Spanish, the English rendering and labeled glosses in English. Coverage and scale use the geology pack
 * of the language (en-US / es-CL). Facts, fractions, units and the download are the same in both languages.
 */
export function GeologyContextView({ candidateName, selection, onDownload, downloadError }: GeologyContextViewProps) {
  const locale = useLocale()
  const t = tScience.in(locale)
  const geo = geologyDisplayText(locale)
  const heading = (
    <div className="subheading-row">
      <h3 id="geology-heading">{t('geology.heading')}</h3>
      <span>{t('geology.subheading')}</span>
    </div>
  )
  if (selection.status !== 'ready') {
    const message = selection.status === 'loading' ? t('geology.loading') : t('geology.unavailable', { reason: geologyReasonText(selection.reason, locale) })
    return (
      <section className="details-section geology-context" aria-labelledby="geology-heading">
        {heading}
        <p className="geology-unavailable" role="status">{`${message} ${t('geology.independent')}`}</p>
      </section>
    )
  }

  const { site, source, context } = selection
  const f = site.area_fractions
  const scale = geo.formatScaleLabel(source.scale_denominator)
  const cited = source.requests.filter((request) => site.request_ids.includes(request.request_id) || request.role === 'chile_catalog_metadata')
  const rejected = site.geometry_diagnostics.filter((item) => item.status === 'rejected')
  const repaired = site.geometry_diagnostics.filter((item) => item.status !== 'rejected')
  const bar = [
    ['unambiguous', f.covered_unambiguous, t('geology.bar.unambiguous')],
    ['ambiguous', f.covered_ambiguous, t('geology.bar.ambiguous')],
    ['unusable', f.unusable_upper_bound, t('geology.bar.unusable')],
    ['unmapped', f.unmapped, t('geology.bar.unmapped')],
  ] as const
  const shortName = shortCandidateName(candidateName)

  return (
    <section className="details-section geology-context" aria-labelledby="geology-heading" data-availability={site.availability}>
      {heading}
      <div className={`geology-summary geology-state-${site.availability}`}>
        <div className="geology-state">
          <strong>{geo.availabilityLabel[site.availability]}</strong>
          <span>{t('geology.scale', { scale })}</span>
        </div>
        <p>{availabilityHint(site.availability, locale)}</p>
        <div
          className="geology-bar"
          role="img"
          aria-label={t('geology.bar.aria', { name: shortName, parts: bar.map(([, value, label]) => `${label} ${geo.formatCoverage(value)}`).join('; ') })}
        >
          {bar.map(([key, value]) => <span key={key} className={`geology-bar-${key}`} style={{ width: `${value * 100}%` }} />)}
        </div>
        <dl className="geology-figures">
          <div><dt>{t('geology.fig.covered')}</dt><dd>{geo.formatCoverage(f.covered_total)}</dd></div>
          <div><dt>{t('geology.fig.unmapped')}</dt><dd>{geo.formatCoverage(f.unmapped)}</dd></div>
          <div><dt>{t('geology.fig.ambiguous')}</dt><dd>{geo.formatCoverage(f.covered_ambiguous)}</dd></div>
          <div><dt>{t('geology.fig.noDescription')}</dt><dd>{geo.formatCoverage(f.covered_by_units_without_description)}</dd></div>
          {f.unusable_upper_bound > 0 && <div><dt>{t('geology.fig.unusable')}</dt><dd>{geo.formatCoverage(f.unusable_upper_bound)}</dd></div>}
        </dl>
        <p className="geology-source-line">
          {t('geology.sourceLine', { dataset: source.dataset_name, authority: source.authority_original, distributor: scienceText(source.distributor, locale) })}
        </p>
      </div>
      <p className="geology-note">{t('geology.note')}</p>

      <details className="geology-details">
        <summary>{t('geology.units.summary', { count: site.units.length })}</summary>
        {site.units.length === 0 ? (
          <p className="geology-empty">{t('geology.units.empty')}</p>
        ) : (
          <ul className="geology-units">
            {site.units.map((unit) => {
              const nameGloss = unitNameGloss(unit.name, locale)
              const descriptionGloss = unitDescriptionGloss(unit.description, locale)
              return (
                <li key={unit.unit_id}>
                  <div className="geology-unit-head">
                    {unit.code && <code>{unit.code}</code>}
                    {/* The official name is Spanish; the “no name” fallback is interface text in the current language. */}
                    <strong lang={unit.name === null ? undefined : knownSpanishLang(locale)}>{unit.name ?? t('geology.units.noName')}</strong>
                    {nameGloss && <span className="geology-unit-gloss"> — {nameGloss}</span>}
                  </div>
                  <span className="geology-unit-share">
                    {t('geology.units.share', { share: geo.formatCoverage(unit.fraction_including_overlap) })}
                    {unit.fraction_in_ambiguity > 0 && t('geology.units.unambiguous', { share: geo.formatCoverage(unit.fraction_unambiguous) })}
                  </span>
                  {unit.description === null ? <p>{t('geology.units.noDescription')}</p>
                    : descriptionGloss === null ? <p lang={knownSpanishLang(locale)}>{unit.description}{originalWordingMark(locale)}</p>
                    : (
                      <>
                        <p><small>{GLOSS_LABEL}:</small> {descriptionGloss}</p>
                        <details className="geology-original"><summary>{ORIGINAL_LABEL}</summary><p lang="es">{unit.description}</p></details>
                      </>
                    )}
                  <small>
                    {unit.sheet ? t('geology.units.sheet', { sheet: unit.sheet }) : ''}
                    {t('geology.units.features', { ids: unit.source_features.map((item) => item.feature_id).join(', ') })}
                  </small>
                </li>
              )
            })}
          </ul>
        )}
        {site.units.length > 0 && <p className="geology-empty">{t('geology.units.footnote')}</p>}
      </details>

      <details className="geology-details">
        <summary>{t('geology.provenance.summary')}</summary>
        <dl className="geology-provenance">
          <div><dt>{t('geology.provenance.authority')}</dt><dd>{source.authority_original}</dd></div>
          <div><dt>{t('geology.provenance.distributor')}</dt><dd>{scienceText(source.distributor, locale)}</dd></div>
          <div><dt>{t('geology.provenance.layer')}</dt><dd>{scienceText(source.layer, locale)}</dd></div>
          <div><dt>{t('geology.provenance.scale')}</dt><dd>{t('geology.provenance.scaleValue', { scale })}</dd></div>
          <div><dt>{t('geology.provenance.crs')}</dt><dd>{source.crs_declared}</dd></div>
          <div><dt>{t('geology.provenance.license')}</dt><dd>{`${scienceText(source.license.name, locale)}. ${scienceText(source.license.scope, locale)}`}</dd></div>
          <div><dt>{t('geology.provenance.attribution')}</dt><dd>{scienceText(source.attribution, locale)}</dd></div>
          <div><dt>{t('geology.provenance.mapDate')}</dt><dd>{`${t('geology.provenance.mapDateMissing')} ${scienceText(source.map_date_note, locale)}`}</dd></div>
          {source.catalog_modified_at && <div><dt>{t('geology.provenance.catalog')}</dt><dd>{t('geology.provenance.catalogValue', { date: source.catalog_modified_at })}</dd></div>}
          {cited.map((request) => (
            <div key={request.request_id}>
              <dt>{t('geology.provenance.download')}</dt>
              <dd>
                {stamp(request.acquired_at)} · <a href={request.url} target="_blank" rel="noreferrer">{t('geology.provenance.request')}</a>
                <br /><code>{request.response_sha256}</code>
              </dd>
            </div>
          ))}
          <div><dt>{t('geology.provenance.processing')}</dt><dd>{scienceTexts(source.transformations, locale).join(' ')}</dd></div>
          <div><dt>{t('geology.provenance.limits')}</dt><dd>{scienceTexts([...source.limitations, ...context.limitations], locale).join(' ')}</dd></div>
          {site.geometry_diagnostics.length > 0 && (
            <div>
              <dt>{t('geology.provenance.repaired')}</dt>
              <dd>{t('geology.provenance.repairedValue', { accepted: repaired.length, rejected: rejected.length })}</dd>
            </div>
          )}
        </dl>
      </details>

      <details className="geology-details">
        <summary>{t('geology.verify.summary')}</summary>
        <ul className="geology-questions">
          {site.verification_questions.map((question) => <li key={question}>{scienceText(question, locale)}</li>)}
        </ul>
        <p className="geology-empty">{scienceText(context.editorial_note, locale)}</p>
      </details>

      {onDownload && (
        <div className="geology-actions">
          <button type="button" onClick={onDownload} aria-label={t('geology.download.aria', { name: shortName, file: geologyExportFileName(site.site_id) })}>
            {t('geology.download.button')}
          </button>
          {downloadError && <p className="geology-error" role="alert">{downloadError}</p>}
        </div>
      )}
    </section>
  )
}

interface GeologyContextProps {
  candidate: CandidateSite
  state: GeologyContextState
}

/** Record panel. In case of any problem it shows "not available" without affecting the rest of the record. */
export function GeologyContext({ candidate, state }: GeologyContextProps) {
  // null = no error; '' = a failure without a technical detail (its text is translated when shown, not stored).
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()
  const selection = selectGeologySite(state, candidate)
  const download = () => {
    if (selection.status !== 'ready') return
    try {
      // Validates contract and semantics before handing off. The export is the same record in every interface language.
      const exported = buildGeologyExport(selection.context, candidate.site_id)
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = geologyExportFileName(candidate.site_id)
      anchor.click()
      URL.revokeObjectURL(url)
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '')
    }
  }
  return (
    <GeologyContextView
      candidateName={candidate.name}
      selection={selection}
      onDownload={selection.status === 'ready' ? download : undefined}
      downloadError={error === null ? null : error || tScience.in(locale)('geology.download.failed')}
    />
  )
}
