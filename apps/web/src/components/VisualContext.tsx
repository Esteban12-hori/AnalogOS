import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import { formatPercent, formatRatio, shortCandidateName } from '../domain/formatting'
import { displaySource } from '../i18n/sourceText'
import {
  selectVisualSite,
  visualContextUrl,
  type VisualContextState,
  type VisualSelection,
} from '../data/loadVisualContext'

interface VisualContextViewProps {
  candidateName: string
  selection: VisualSelection
  baseUrl: string
  imageFailed: boolean
  onImageError: () => void
  /** If it exists, the image is already drawn on the 2D map: a button is offered instead of repeating it. */
  onShowOnMap?: () => void
}

const day = (timestamp: string | null) => (timestamp ? timestamp.slice(0, 10) : 'date not reported')

/** Pure view of the panel: it receives the already-resolved state, so it can be tested without a browser. */
export function VisualContextView({ candidateName, selection, baseUrl, imageFailed, onImageError, onShowOnMap }: VisualContextViewProps) {
  const name = shortCandidateName(candidateName)
  const heading = (
    <div className="subheading-row">
      <h3 id="visual-context-heading">Satellite context</h3>
      <span>Preliminary · does not validate the site</span>
    </div>
  )

  if (selection.status !== 'ready' || imageFailed) {
    const message = selection.status === 'loading'
      ? 'Loading satellite context…'
      : `Satellite image not available. ${selection.status === 'unavailable' ? selection.reason : 'The local image file could not be opened.'}`
    return (
      <section className="details-section visual-context" aria-labelledby="visual-context-heading">
        {heading}
        <p className="visual-unavailable">{message} The ranking and the site sheet do not depend on it.</p>
      </section>
    )
  }

  const { index, site } = selection
  const imageUrl = visualContextUrl(baseUrl, site.image)
  const timeWindow = `${day(index.product.time_range.from)} to ${day(index.product.time_range.to)} (UTC)`
  const scenes = site.scenes_used === null
    ? `${site.scenes_considered} orbits considered; it was not possible to certify which ones contributed pixels`
    : `${site.scenes_considered} orbits considered; contributed pixels: ${site.scenes_used
      .map((scene) => `${day(scene.date_from)} (${formatPercent(scene.fraction)})`).join(', ')}`

  return (
    <section className="details-section visual-context" aria-labelledby="visual-context-heading">
      {heading}
      {onShowOnMap ? (
        <div className="visual-on-map">
          <button type="button" onClick={onShowOnMap}>Show the sector on the 2D map</button>
          <span><strong>{displaySource(index.product.period_label)}</strong> · Sentinel-2 L2A · ≈ {formatRatio(site.approx_meters_per_pixel)} m per pixel</span>
          <small>{displaySource(index.source.attribution)}</small>
          <a href={imageUrl} target="_blank" rel="noreferrer">Open the original image ↗</a>
        </div>
      ) : (
      <figure>
        <a href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Open the Sentinel-2 image of ${name} at full size`}>
          <img
            key={site.site_id}
            src={imageUrl}
            width={site.width}
            height={site.height}
            alt={`Natural-color Sentinel-2 view of sector ${name}, about ${formatRatio(site.extent_km.width)} by ${formatRatio(site.extent_km.height)} km. ${displaySource(index.product.period_label)}.`}
            onError={onImageError}
          />
        </a>
        <figcaption>
          <strong>{displaySource(index.product.period_label)}</strong>
          <span>Sentinel-2 L2A · ≈ {formatRatio(site.approx_meters_per_pixel)} m per pixel in this reduced view</span>
          <small>{displaySource(index.source.attribution)}</small>
        </figcaption>
      </figure>
      )}
      <p className="visual-note">
        Preliminary context for visual inspection. It does not change similarity, confidence or feasibility and does not close any
        pending check. The cloud limit is applied per scene: the view may include clouds or shadows.
      </p>
      <details className="visual-provenance">
        <summary>Image provenance</summary>
        <dl>
          <div><dt>Source</dt><dd>Copernicus Sentinel Hub Process API · collection {index.source.collection}</dd></div>
          <div><dt>Time window</dt><dd>{timeWindow}</dd></div>
          <div><dt>Mosaic</dt><dd>{displaySource(index.product.mosaicking)}; maximum cloud cover per scene {index.product.max_cloud_coverage_percent}%</dd></div>
          <div><dt>Scenes</dt><dd>{scenes}</dd></div>
          <div><dt>Transformation</dt><dd>{displaySource(index.product.transformation)}</dd></div>
          <div><dt>Frame</dt><dd>bbox {site.bbox.join(', ')} (CRS84) · {site.width}×{site.height} px</dd></div>
          <div><dt>Queried</dt><dd>{site.queried_at.replace('T', ' ').replace('Z', ' UTC')}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{site.sha256}</code></dd></div>
        </dl>
        <a href={visualContextUrl(baseUrl, 'index.json')} target="_blank" rel="noreferrer">
          Open the full provenance index (JSON source record) ↗
        </a>
      </details>
    </section>
  )
}

interface VisualContextProps {
  candidate: CandidateSite
  state: VisualContextState
  onShowOnMap?: () => void
}

/** Record panel: when the candidate changes, the image changes; if the file fails, the user is informed. */
export function VisualContext({ candidate, state, onShowOnMap }: VisualContextProps) {
  const [failedSiteId, setFailedSiteId] = useState<string | null>(null)
  return (
    <VisualContextView
      candidateName={candidate.name}
      selection={selectVisualSite(state, candidate)}
      baseUrl={import.meta.env.BASE_URL}
      imageFailed={failedSiteId === candidate.site_id}
      onImageError={() => setFailedSiteId(candidate.site_id)}
      onShowOnMap={onShowOnMap}
    />
  )
}
