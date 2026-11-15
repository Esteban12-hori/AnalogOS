import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import { formatPercent, formatRatio, shortCandidateName } from '../domain/formatting'
import { getLocale, useLocale, withPercent, type Locale } from '../i18n'
import { tDetailTabs } from '../i18n/messages/detailTabs'
import { scienceText } from '../i18n/science'
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

/** Fixed unavailability sentences of the visual loader (canonical English state) and their catalog keys. */
const VISUAL_REASONS = ['visual.reason.fixture', 'visual.reason.version', 'visual.reason.missing', 'visual.reason.read'] as const
const BUILD_REASON = /^This build does not include visual context \((\d+)\)\.$/

/**
 * Reason shown in the interface language. Fixed sentences are translated; a validator or network detail is technical
 * and shown as is (docs/I18N.md §11).
 */
export function visualReason(reason: string, locale: Locale = getLocale()): string {
  const english = tDetailTabs.in('en')
  const t = tDetailTabs.in(locale)
  const key = VISUAL_REASONS.find((candidate) => english(candidate) === reason)
  if (key) return t(key)
  const build = BUILD_REASON.exec(reason)
  return build ? t('visual.reason.build', { status: build[1] ?? '' }) : reason
}

/** Pure view of the panel: it receives the already-resolved state, so it can be tested without a browser. */
export function VisualContextView({ candidateName, selection, baseUrl, imageFailed, onImageError, onShowOnMap }: VisualContextViewProps) {
  const locale = useLocale()
  const t = tDetailTabs.in(locale)
  const day = (timestamp: string | null) => (timestamp ? timestamp.slice(0, 10) : t('visual.noDate'))
  const name = shortCandidateName(candidateName, locale)
  const heading = (
    <div className="subheading-row">
      <h3 id="visual-context-heading">{t('visual.title')}</h3>
      <span>{t('visual.tag')}</span>
    </div>
  )

  if (selection.status !== 'ready' || imageFailed) {
    const message = selection.status === 'loading'
      ? t('visual.loading')
      : t('visual.unavailable', { reason: selection.status === 'unavailable' ? visualReason(selection.reason, locale) : t('visual.fileFailed') })
    return (
      <section className="details-section visual-context" aria-labelledby="visual-context-heading">
        {heading}
        <p className="visual-unavailable">{message} {t('visual.independent')}</p>
      </section>
    )
  }

  const { index, site } = selection
  const imageUrl = visualContextUrl(baseUrl, site.image)
  const timeWindow = t('visual.window', { from: day(index.product.time_range.from), to: day(index.product.time_range.to) })
  const scenes = site.scenes_used === null
    ? t('visual.scenesUnknown', { count: site.scenes_considered })
    : t('visual.scenes', { count: site.scenes_considered, list: site.scenes_used.map((scene) => `${day(scene.date_from)} (${formatPercent(scene.fraction, locale)})`).join(', ') })
  const period = scienceText(index.product.period_label, locale)

  return (
    <section className="details-section visual-context" aria-labelledby="visual-context-heading">
      {heading}
      {onShowOnMap ? (
        <div className="visual-on-map">
          <button type="button" onClick={onShowOnMap}>{t('visual.showOnMap')}</button>
          <span><strong>{period}</strong> · {t('visual.perPixel', { m: formatRatio(site.approx_meters_per_pixel, locale) })}</span>
          <small>{scienceText(index.source.attribution, locale)}</small>
          <a href={imageUrl} target="_blank" rel="noreferrer">{t('visual.openImage')}</a>
        </div>
      ) : (
      <figure>
        <a href={imageUrl} target="_blank" rel="noreferrer" aria-label={t('visual.openAria', { name })}>
          <img
            key={site.site_id}
            src={imageUrl}
            width={site.width}
            height={site.height}
            alt={t('visual.alt', { name, width: formatRatio(site.extent_km.width, locale), height: formatRatio(site.extent_km.height, locale), period })}
            onError={onImageError}
          />
        </a>
        <figcaption>
          <strong>{period}</strong>
          <span>{t('visual.perPixelReduced', { m: formatRatio(site.approx_meters_per_pixel, locale) })}</span>
          <small>{scienceText(index.source.attribution, locale)}</small>
        </figcaption>
      </figure>
      )}
      <p className="visual-note">{t('visual.note')}</p>
      <details className="visual-provenance">
        <summary>{t('visual.provenance')}</summary>
        <dl>
          <div><dt>{t('visual.source')}</dt><dd>{t('visual.sourceValue', { collection: index.source.collection })}</dd></div>
          <div><dt>{t('visual.timeWindow')}</dt><dd>{timeWindow}</dd></div>
          <div><dt>{t('visual.mosaic')}</dt><dd>{t('visual.mosaicValue', { mosaicking: scienceText(index.product.mosaicking, locale), percent: withPercent(String(index.product.max_cloud_coverage_percent), locale) })}</dd></div>
          <div><dt>{t('visual.scenesLabel')}</dt><dd>{scenes}</dd></div>
          <div><dt>{t('visual.transformation')}</dt><dd>{scienceText(index.product.transformation, locale)}</dd></div>
          <div><dt>{t('visual.frame')}</dt><dd>bbox {site.bbox.join(', ')} (CRS84) · {site.width}×{site.height} px</dd></div>
          <div><dt>{t('visual.queried')}</dt><dd>{site.queried_at.replace('T', ' ').replace('Z', ' UTC')}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{site.sha256}</code></dd></div>
        </dl>
        <a href={visualContextUrl(baseUrl, 'index.json')} target="_blank" rel="noreferrer">
          {t('visual.index')}
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
