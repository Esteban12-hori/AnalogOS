import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import { formatPercent, formatRatio, shortCandidateName } from '../domain/formatting'
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
  /** Si existe, la imagen ya se dibuja en el mapa 2D: se ofrece un botón en vez de repetirla. */
  onShowOnMap?: () => void
}

const day = (timestamp: string | null) => (timestamp ? timestamp.slice(0, 10) : 'fecha no informada')

/** Vista pura del panel: recibe el estado ya resuelto, para poder probarla sin navegador. */
export function VisualContextView({ candidateName, selection, baseUrl, imageFailed, onImageError, onShowOnMap }: VisualContextViewProps) {
  const name = shortCandidateName(candidateName)
  const heading = (
    <div className="subheading-row">
      <h3 id="visual-context-heading">Contexto satelital</h3>
      <span>Preliminar · no valida el sitio</span>
    </div>
  )

  if (selection.status !== 'ready' || imageFailed) {
    const message = selection.status === 'loading'
      ? 'Cargando contexto satelital…'
      : `Imagen satelital no disponible. ${selection.status === 'unavailable' ? selection.reason : 'No se pudo abrir el archivo de imagen local.'}`
    return (
      <section className="details-section visual-context" aria-labelledby="visual-context-heading">
        {heading}
        <p className="visual-unavailable">{message} El ranking y la ficha no dependen de ella.</p>
      </section>
    )
  }

  const { index, site } = selection
  const imageUrl = visualContextUrl(baseUrl, site.image)
  const timeWindow = `${day(index.product.time_range.from)} a ${day(index.product.time_range.to)} (UTC)`
  const scenes = site.scenes_used === null
    ? `${site.scenes_considered} órbitas consideradas; no fue posible certificar cuáles aportaron píxeles`
    : `${site.scenes_considered} órbitas consideradas; aportaron píxeles: ${site.scenes_used
      .map((scene) => `${day(scene.date_from)} (${formatPercent(scene.fraction)})`).join(', ')}`

  return (
    <section className="details-section visual-context" aria-labelledby="visual-context-heading">
      {heading}
      {onShowOnMap ? (
        <div className="visual-on-map">
          <button type="button" onClick={onShowOnMap}>Ver el sector en el mapa 2D</button>
          <span><strong>{index.product.period_label}</strong> · Sentinel-2 L2A · ≈ {formatRatio(site.approx_meters_per_pixel)} m por píxel</span>
          <small>{index.source.attribution}</small>
          <a href={imageUrl} target="_blank" rel="noreferrer">Abrir la imagen original ↗</a>
        </div>
      ) : (
      <figure>
        <a href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Abrir la imagen Sentinel-2 de ${name} en tamaño completo`}>
          <img
            key={site.site_id}
            src={imageUrl}
            width={site.width}
            height={site.height}
            alt={`Vista Sentinel-2 en color natural del sector ${name}, de unos ${formatRatio(site.extent_km.width)} por ${formatRatio(site.extent_km.height)} km. ${index.product.period_label}.`}
            onError={onImageError}
          />
        </a>
        <figcaption>
          <strong>{index.product.period_label}</strong>
          <span>Sentinel-2 L2A · ≈ {formatRatio(site.approx_meters_per_pixel)} m por píxel en esta vista reducida</span>
          <small>{index.source.attribution}</small>
        </figcaption>
      </figure>
      )}
      <p className="visual-note">
        Contexto preliminar para inspección visual. No cambia similitud, confianza ni factibilidad y no cierra ninguna
        verificación pendiente. El límite de nubes se aplica por escena: la vista puede incluir nubes o sombras.
      </p>
      <details className="visual-provenance">
        <summary>Procedencia de la imagen</summary>
        <dl>
          <div><dt>Fuente</dt><dd>Copernicus Sentinel Hub Process API · colección {index.source.collection}</dd></div>
          <div><dt>Ventana</dt><dd>{timeWindow}</dd></div>
          <div><dt>Mosaico</dt><dd>{index.product.mosaicking}; nubosidad máxima por escena {index.product.max_cloud_coverage_percent} %</dd></div>
          <div><dt>Escenas</dt><dd>{scenes}</dd></div>
          <div><dt>Transformación</dt><dd>{index.product.transformation}</dd></div>
          <div><dt>Encuadre</dt><dd>bbox {site.bbox.join(', ')} (CRS84) · {site.width}×{site.height} px</dd></div>
          <div><dt>Consulta</dt><dd>{site.queried_at.replace('T', ' ').replace('Z', ' UTC')}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{site.sha256}</code></dd></div>
        </dl>
        <a href={visualContextUrl(baseUrl, 'index.json')} target="_blank" rel="noreferrer">
          Abrir el índice de procedencia completo (JSON) ↗
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

/** Panel de la ficha: al cambiar de candidato cambia la imagen; si el archivo falla, se informa. */
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
