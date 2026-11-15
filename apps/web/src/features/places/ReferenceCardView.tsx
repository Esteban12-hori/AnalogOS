/**
 * Compact card for a selected ◆ (slots rail.reference and sheet.reference), §1 #15:
* «World reference · to be calculated», with its source. No similarity, confidence or ranking, no
 * Tesla lines; the location is an approximate zone or a region, never a pin.
 * Deferred chunk: loaded by `ReferenceCard` (Suspense) only when needed.
 */
import { useMemo } from 'react'
import { formatDecimal } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import { classifyReferenceAnalogs } from './classify'
import type { ReferenceCardProps } from './index'
import { placeName } from './placeModel'
import { useReferenceAnalogs } from './referenceAnalogs'
import { displaySource } from '../../i18n/sourceText'
import './reference-card.css'

const coord = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** «24,08° S, 69,92° W»: the cited point, with 2 decimals (≈1 km); never drawn as a pin. */
export function formatLatLon(lat: number, lon: number): string {
  return `${coord.format(Math.abs(lat))}° ${lat < 0 ? 'S' : 'N'}, ${coord.format(Math.abs(lon))}° ${lon < 0 ? 'W' : 'E'}`
}

export default function ReferenceCardView({ data, analogId }: ReferenceCardProps) {
  const catalog = useReferenceAnalogs()
  const candidates = data.snapshot?.candidates
  const analog = catalog.status === 'ready' ? catalog.analogs.find((item) => item.id === analogId) ?? null : null
  const relation = useMemo(() => {
    if (!analog || !candidates) return { coincides: [] as string[], contains: [] as string[] }
    const { badges, references } = classifyReferenceAnalogs([analog], candidates)
    const names = (ids: readonly string[]) => candidates.filter((candidate) => ids.includes(candidate.site_id)).map((candidate) => placeName(candidate.name))
    return { coincides: names([...badges.keys()]), contains: names(references[0]?.containsSectorIds ?? []) }
  }, [analog, candidates])

  const kicker = <p className="places-ref-kicker"><span aria-hidden="true">{GLYPH.reference}</span> World reference · not yet calculated</p>
  if (catalog.status === 'loading') return <div className="places-ref" aria-busy="true">{kicker}<p className="places-state">Loading the analog catalog…</p></div>
  if (catalog.status === 'unavailable') {
    return <div className="places-ref">{kicker}<p className="places-state"><span aria-hidden="true">{GLYPH.fail}</span> Catalog not available: {catalog.reason}</p></div>
  }
  if (!analog) return <div className="places-ref">{kicker}<p className="places-state">This analog is not in the published catalog.</p></div>

  const { location } = analog
  return (
    <article className="places-ref" aria-labelledby={`ref-${analog.id}`}>
      {kicker}
      <h3 id={`ref-${analog.id}`} className="places-ref-name">{displaySource(analog.name)}</h3>
      <p className="places-ref-meta">{displaySource(analog.country)}</p>
      <dl className="places-ref-facts">
        <dt>Location</dt>
        <dd>
          {location.kind === 'approximate_point'
            ? <>Approximate area with a radius of ≈ {formatDecimal(location.radius_km)} km around the cited point ({formatLatLon(location.lat, location.lon)}). It is not an exact pin.</>
            : <>Approximate region between {formatLatLon(location.bbox[1], location.bbox[0])} and {formatLatLon(location.bbox[3], location.bbox[2])}.</>}
          {analog.summary && <> {displaySource(analog.summary)}</>}
        </dd>
        <dt>Similarity, confidence and ranking</dt>
        <dd className="is-pending">Not yet calculated: this analog has not been measured with the profile, so it has no %.</dd>
        {relation.coincides.length > 0 && (
          <>
            <dt>Matches</dt>
            <dd><span aria-hidden="true">{GLYPH.evaluated}</span> {relation.coincides.join(', ')} (the cited point falls inside the sector)</dd>
          </>
        )}
        {relation.contains.length > 0 && (
          <>
            <dt>Contains</dt>
            <dd>{relation.contains.length} {relation.contains.length === 1 ? 'evaluated sector' : 'evaluated sectors'}: {relation.contains.join(', ')}</dd>
          </>
        )}
      </dl>
      <h4 className="places-ref-sources-title">Sources</h4>
      <ul className="places-ref-sources">
        {analog.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer noopener">{displaySource(source.title)}</a>
            {source.publisher && <small> · {source.publisher}</small>}
          </li>
        ))}
      </ul>
    </article>
  )
}
