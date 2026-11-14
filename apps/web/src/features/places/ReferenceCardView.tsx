/**
 * Tarjeta compacta de un ◆ seleccionado (slots rail.reference y sheet.reference), §1 #15:
 * «Referencia mundial · por calcular», con su fuente. Sin similitud, confianza ni ranking, sin
 * líneas Tesla; la ubicación es una zona aproximada o una región, nunca un pin.
 * Chunk diferido: lo carga `ReferenceCard` (Suspense) solo cuando hace falta.
 */
import { useMemo } from 'react'
import { formatDecimal } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import { classifyReferenceAnalogs } from './classify'
import type { ReferenceCardProps } from './index'
import { placeName } from './placeModel'
import { useReferenceAnalogs } from './referenceAnalogs'
import './reference-card.css'

const coord = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** «24,08° S, 69,92° W»: el punto citado, con 2 decimales (≈1 km); nunca se dibuja como pin. */
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

  const kicker = <p className="places-ref-kicker"><span aria-hidden="true">{GLYPH.reference}</span> Referencia mundial · por calcular</p>
  if (catalog.status === 'loading') return <div className="places-ref" aria-busy="true">{kicker}<p className="places-state">Cargando el catálogo de análogos…</p></div>
  if (catalog.status === 'unavailable') {
    return <div className="places-ref">{kicker}<p className="places-state"><span aria-hidden="true">{GLYPH.fail}</span> Catálogo no disponible: {catalog.reason}</p></div>
  }
  if (!analog) return <div className="places-ref">{kicker}<p className="places-state">Este análogo no está en el catálogo publicado.</p></div>

  const { location } = analog
  return (
    <article className="places-ref" aria-labelledby={`ref-${analog.id}`}>
      {kicker}
      <h3 id={`ref-${analog.id}`} className="places-ref-name">{analog.name}</h3>
      <p className="places-ref-meta">{analog.country}</p>
      <dl className="places-ref-facts">
        <dt>Ubicación</dt>
        <dd>
          {location.kind === 'approximate_point'
            ? <>Zona aproximada de radio ≈ {formatDecimal(location.radius_km)} km en torno al punto citado ({formatLatLon(location.lat, location.lon)}). No es un pin exacto.</>
            : <>Región aproximada entre {formatLatLon(location.bbox[1], location.bbox[0])} y {formatLatLon(location.bbox[3], location.bbox[2])}.</>}
          {analog.summary && <> {analog.summary}</>}
        </dd>
        <dt>Similitud, confianza y ranking</dt>
        <dd className="is-pending">Por calcular: este análogo no se ha medido con el perfil, así que no tiene %.</dd>
        {relation.coincides.length > 0 && (
          <>
            <dt>Coincide con</dt>
            <dd><span aria-hidden="true">{GLYPH.evaluated}</span> {relation.coincides.join(', ')} (el punto citado cae dentro del sector)</dd>
          </>
        )}
        {relation.contains.length > 0 && (
          <>
            <dt>Contiene</dt>
            <dd>{relation.contains.length} {relation.contains.length === 1 ? 'sector evaluado' : 'sectores evaluados'}: {relation.contains.join(', ')}</dd>
          </>
        )}
      </dl>
      <h4 className="places-ref-sources-title">Fuentes</h4>
      <ul className="places-ref-sources">
        {analog.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a>
            {source.publisher && <small> · {source.publisher}</small>}
          </li>
        ))}
      </ul>
    </article>
  )
}
