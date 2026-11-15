import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import {
  AVAILABILITY_HINT,
  AVAILABILITY_LABEL,
  buildGeologyExport,
  formatCoverage,
  formatScaleLabel,
  geologyExportFileName,
  selectGeologySite,
  type GeologyContextState,
  type GeologySelection,
} from '../domain/geologyContext'
import { shortCandidateName } from '../domain/formatting'
import { GLOSS_LABEL, ORIGINAL_LABEL, unitDescriptionEn, unitNameEn } from '../i18n/geologyGloss'
import { ORIGINAL_WORDING_MARK, displaySource } from '../i18n/sourceText'

interface GeologyContextViewProps {
  candidateName: string
  selection: GeologySelection
  onDownload?: () => void
  downloadError?: string | null
}

const stamp = (value: string) => value.replace('T', ' ').replace('Z', ' UTC')

/** Pure view of the record: receives the already-resolved state, so it can be tested without a browser. */
export function GeologyContextView({ candidateName, selection, onDownload, downloadError }: GeologyContextViewProps) {
  const heading = (
    <div className="subheading-row">
      <h3 id="geology-heading">Geological context</h3>
      <span>Regional mapping · does not measure the terrain</span>
    </div>
  )
  if (selection.status !== 'ready') {
    const message = selection.status === 'loading' ? 'Loading geological context…' : `Geological context not available. ${selection.reason}`
    return (
      <section className="details-section geology-context" aria-labelledby="geology-heading">
        {heading}
        <p className="geology-unavailable" role="status">{message} The ranking, the site sheet and the evaluation do not depend on it.</p>
      </section>
    )
  }

  const { site, source, context } = selection
  const f = site.area_fractions
  const scale = formatScaleLabel(source.scale_denominator)
  const cited = source.requests.filter((request) => site.request_ids.includes(request.request_id) || request.role === 'chile_catalog_metadata')
  const rejected = site.geometry_diagnostics.filter((item) => item.status === 'rejected')
  const repaired = site.geometry_diagnostics.filter((item) => item.status !== 'rejected')
  const bar = [
    ['unambiguous', f.covered_unambiguous, 'covered without ambiguity'],
    ['ambiguous', f.covered_ambiguous, 'covered with overlap between units'],
    ['unusable', f.unusable_upper_bound, 'unusable area (upper bound)'],
    ['unmapped', f.unmapped, 'no coverage'],
  ] as const

  return (
    <section className="details-section geology-context" aria-labelledby="geology-heading" data-availability={site.availability}>
      {heading}
      <div className={`geology-summary geology-state-${site.availability}`}>
        <div className="geology-state">
          <strong>{AVAILABILITY_LABEL[site.availability]}</strong>
          <span>Scale {scale}</span>
        </div>
        <p>{AVAILABILITY_HINT[site.availability]}</p>
        <div
          className="geology-bar"
          role="img"
          aria-label={`Area breakdown of ${shortCandidateName(candidateName)}: ${bar.map(([, value, label]) => `${label} ${formatCoverage(value)}`).join('; ')}.`}
        >
          {bar.map(([key, value]) => <span key={key} className={`geology-bar-${key}`} style={{ width: `${value * 100}%` }} />)}
        </div>
        <dl className="geology-figures">
          <div><dt>Covered by the layer</dt><dd>{formatCoverage(f.covered_total)}</dd></div>
          <div><dt>No coverage</dt><dd>{formatCoverage(f.unmapped)}</dd></div>
          <div><dt>Overlap between different units</dt><dd>{formatCoverage(f.covered_ambiguous)}</dd></div>
          <div><dt>With a unit lacking a description</dt><dd>{formatCoverage(f.covered_by_units_without_description)}</dd></div>
          {f.unusable_upper_bound > 0 && <div><dt>Unusable area (upper bound)</dt><dd>{formatCoverage(f.unusable_upper_bound)}</dd></div>}
        </dl>
        <p className="geology-source-line">
          {source.dataset_name} · Authority: {source.authority_original} · Distributor: {displaySource(source.distributor)}.
        </p>
      </div>
      <p className="geology-note">
        The percentage is map coverage, not precision, confidence or suitability, and it was not confirmed in the field. “No coverage”
        means this layer has no polygon there, not that there is no rock. The geology in the score is still not calibrated:
        this context does not imply calibrated planetary compatibility and does not change similarity, confidence or feasibility.
      </p>

      <details className="geology-details">
        <summary>Mapped units ({site.units.length})</summary>
        {site.units.length === 0 ? (
          <p className="geology-empty">This layer has no units inside the sector.</p>
        ) : (
          <ul className="geology-units">
            {site.units.map((unit) => (
              <li key={unit.unit_id}>
                <div className="geology-unit-head">
                  {unit.code && <code>{unit.code}</code>}
                  <strong lang="es">{unit.name ?? 'No name in the source'}</strong>
                  {unitNameEn(unit.name) && <span className="geology-unit-gloss"> — {unitNameEn(unit.name)}</span>}
                </div>
                <span className="geology-unit-share">
                  {formatCoverage(unit.fraction_including_overlap)} of the sector
                  {unit.fraction_in_ambiguity > 0 && ` (${formatCoverage(unit.fraction_unambiguous)} without overlap)`}
                </span>
                {unit.description === null ? <p>No description in the source: it is not filled in or inferred.</p>
                  : unitDescriptionEn(unit.description) === null ? <p lang="es">{unit.description}{ORIGINAL_WORDING_MARK}</p>
                  : (
                    <>
                      <p><small>{GLOSS_LABEL}:</small> {unitDescriptionEn(unit.description)}</p>
                      <details className="geology-original"><summary>{ORIGINAL_LABEL}</summary><p lang="es">{unit.description}</p></details>
                    </>
                  )}
                <small>
                  {unit.sheet ? `Sheet ${unit.sheet} · ` : ''}source features: {unit.source_features.map((item) => item.feature_id).join(', ')}
                </small>
              </li>
            ))}
          </ul>
        )}
        {site.units.length > 0 && <p className="geology-empty">Unit percentages can add up to more than the coverage because they include overlaps. Unit names and descriptions are the official ones (Spanish); English glosses are editorial translations.</p>}
      </details>

      <details className="geology-details">
        <summary>Source, scale and provenance</summary>
        <dl className="geology-provenance">
          <div><dt>Authority</dt><dd>{source.authority_original}</dd></div>
          <div><dt>Distributor</dt><dd>{displaySource(source.distributor)}</dd></div>
          <div><dt>Layer</dt><dd>{displaySource(source.layer)}</dd></div>
          <div><dt>Scale</dt><dd>{scale} (map scale denominator; not a resolution in meters)</dd></div>
          <div><dt>CRS</dt><dd>{source.crs_declared}</dd></div>
          <div><dt>License</dt><dd>{displaySource(source.license.name)}. {displaySource(source.license.scope)}</dd></div>
          <div><dt>Attribution</dt><dd>{displaySource(source.attribution)}</dd></div>
          <div><dt>Map date</dt><dd>Not reported by the source. {displaySource(source.map_date_note)}</dd></div>
          {source.catalog_modified_at && <div><dt>Catalog record</dt><dd>{source.catalog_modified_at} (not the survey date)</dd></div>}
          {cited.map((request) => (
            <div key={request.request_id}>
              <dt>Download</dt>
              <dd>
                {stamp(request.acquired_at)} · <a href={request.url} target="_blank" rel="noreferrer">request ↗</a>
                <br /><code>{request.response_sha256}</code>
              </dd>
            </div>
          ))}
          <div><dt>Processing</dt><dd>{source.transformations.map(displaySource).join(' ')}</dd></div>
          <div><dt>Limits</dt><dd>{[...source.limitations, ...context.limitations].map(displaySource).join(' ')}</dd></div>
          {site.geometry_diagnostics.length > 0 && (
            <div>
              <dt>Repaired geometries</dt>
              <dd>
                {repaired.length} accepted after comparing two repair methods; {rejected.length} rejected. Provisional engineering
                thresholds, not a scientific standard.
              </dd>
            </div>
          )}
        </dl>
      </details>

      <details className="geology-details">
        <summary>What to check in the field</summary>
        <ul className="geology-questions">
          {site.verification_questions.map((question) => <li key={question}>{displaySource(question)}</li>)}
        </ul>
        <p className="geology-empty">{displaySource(context.editorial_note)}</p>
      </details>

      {onDownload && (
        <div className="geology-actions">
          <button type="button" onClick={onDownload} aria-label={`Download the geological context of ${shortCandidateName(candidateName)} as JSON (${geologyExportFileName(site.site_id)}), the source record`}>
            Download geological context (JSON source record)
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
  const [error, setError] = useState<string | null>(null)
  const selection = selectGeologySite(state, candidate)
  const download = () => {
    if (selection.status !== 'ready') return
    try {
      const exported = buildGeologyExport(selection.context, candidate.site_id) // validates contract and semantics before handing off
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = geologyExportFileName(candidate.site_id)
      anchor.click()
      URL.revokeObjectURL(url)
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The geology export could not be generated.')
    }
  }
  return (
    <GeologyContextView
      candidateName={candidate.name}
      selection={selection}
      onDownload={selection.status === 'ready' ? download : undefined}
      downloadError={error}
    />
  )
}
