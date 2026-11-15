/**
 * Compact card for a selected ◆ (slots rail.reference and sheet.reference), §1 #15:
* «World reference · to be calculated», with its source. No similarity, confidence or ranking, no
 * Tesla lines; the location is an approximate zone or a region, never a pin.
 * Deferred chunk: loaded by `ReferenceCard` (Suspense) only when needed.
 */
import { useMemo } from 'react'
import { formatDecimal } from '../../domain/formatting'
import { getLocale, useLocale, type Locale } from '../../i18n'
import { formatNumber } from '../../i18n/format'
import { tReferenceCard } from '../../i18n/messages/referenceCard'
import { scienceText } from '../../i18n/science'
import { GLYPH } from '../../shell/public'
import { catalogReason } from './catalogReason'
import { classifyReferenceAnalogs } from './classify'
import type { ReferenceCardProps } from './index'
import { placeName } from './placeModel'
import { useReferenceAnalogs } from './referenceAnalogs'
import './reference-card.css'

const COORD: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

/** «24.08° S, 69.92° W» / «24,08° S, 69,92° W»: the cited point, with 2 decimals (≈1 km); never drawn as a pin. */
export function formatLatLon(lat: number, lon: number, locale: Locale = getLocale()): string {
  const coord = (value: number) => formatNumber(Math.abs(value), COORD, locale)
  return `${coord(lat)}° ${lat < 0 ? 'S' : 'N'}, ${coord(lon)}° ${lon < 0 ? 'W' : 'E'}`
}

export default function ReferenceCardView({ data, analogId }: ReferenceCardProps) {
  const locale = useLocale()
  const t = tReferenceCard.in(locale)
  const catalog = useReferenceAnalogs()
  const candidates = data.snapshot?.candidates
  const analog = catalog.status === 'ready' ? catalog.analogs.find((item) => item.id === analogId) ?? null : null
  const relation = useMemo(() => {
    if (!analog || !candidates) return { coincides: [] as string[], contains: [] as string[] }
    const { badges, references } = classifyReferenceAnalogs([analog], candidates)
    const names = (ids: readonly string[]) => candidates.filter((candidate) => ids.includes(candidate.site_id)).map((candidate) => placeName(candidate.name, locale))
    return { coincides: names([...badges.keys()]), contains: names(references[0]?.containsSectorIds ?? []) }
  }, [analog, candidates, locale])

  const kicker = <p className="places-ref-kicker"><span aria-hidden="true">{GLYPH.reference}</span> {t('ref.kicker')}</p>
  if (catalog.status === 'loading') return <div className="places-ref" aria-busy="true">{kicker}<p className="places-state">{t('ref.catalogLoading')}</p></div>
  if (catalog.status === 'unavailable') {
    return <div className="places-ref">{kicker}<p className="places-state"><span aria-hidden="true">{GLYPH.fail}</span> {t('ref.catalogUnavailable', { reason: catalogReason(catalog.reason, locale) })}</p></div>
  }
  if (!analog) return <div className="places-ref">{kicker}<p className="places-state">{t('ref.notInCatalog')}</p></div>

  const { location } = analog
  return (
    <article className="places-ref" aria-labelledby={`ref-${analog.id}`}>
      {kicker}
      <h3 id={`ref-${analog.id}`} className="places-ref-name">{scienceText(analog.name, locale)}</h3>
      <p className="places-ref-meta">{scienceText(analog.country, locale)}</p>
      <dl className="places-ref-facts">
        <dt>{t('ref.location')}</dt>
        <dd>
          {location.kind === 'approximate_point'
            ? t('ref.point', { radius: formatDecimal(location.radius_km, locale), point: formatLatLon(location.lat, location.lon, locale) })
            : t('ref.region', { from: formatLatLon(location.bbox[1], location.bbox[0], locale), to: formatLatLon(location.bbox[3], location.bbox[2], locale) })}
          {analog.summary && <> {scienceText(analog.summary, locale)}</>}
        </dd>
        <dt>{t('ref.figures')}</dt>
        <dd className="is-pending">{t('ref.figuresPending')}</dd>
        {relation.coincides.length > 0 && (
          <>
            <dt>{t('ref.matches')}</dt>
            <dd><span aria-hidden="true">{GLYPH.evaluated}</span> {t('ref.matchesText', { names: relation.coincides.join(', ') })}</dd>
          </>
        )}
        {relation.contains.length > 0 && (
          <>
            <dt>{t('ref.contains')}</dt>
            <dd>{t('ref.containsText', { count: relation.contains.length, names: relation.contains.join(', ') })}</dd>
          </>
        )}
      </dl>
      <h4 className="places-ref-sources-title">{t('ref.sources')}</h4>
      <ul className="places-ref-sources">
        {analog.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer noopener">{scienceText(source.title, locale)}</a>
            {source.publisher && <small> · {source.publisher}</small>}
          </li>
        ))}
      </ul>
    </article>
  )
}
