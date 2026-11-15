/**
 * Pestaña «Método» de la ficha completa: la comparación a la misma escala y «Cómo se buscaron»
 * (ADR-008): el alcance real de la búsqueda (`summarizeSearch` del equipo), las regiones, el mapa
 * SVG con las 50 ventanas y los antecedentes publicados (solo puntos con coordenadas; el resto
 * son topónimos y nunca se dibujan como pin), y los artefactos auditables.
 */
import { SNAPSHOT_PATH } from '../../data/loadDemoSnapshot'
import { rankMap, splitByRole, summarizeSearch } from '../../domain/discovery'
import { formatScore } from '../../domain/formatting'
import { CandidateMap } from '../../features/globe/CandidateMap'
import { uiActions, useUi } from '../../state/ui'
import type { AppData } from '../appData'

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

export function MethodTab({ data }: { data: AppData }) {
  const snapshot = data.snapshot
  const selection = useUi((state) => state.selection)
  const base = `${import.meta.env.BASE_URL}${SNAPSHOT_PATH}`
  const search = snapshot?.search ?? null
  const summary = search ? summarizeSearch(search) : null
  const ranked = snapshot ? splitByRole(snapshot.candidates).ranked : []
  return (
    <div className="method-tab">
      <h3>La comparación ocurre a la misma escala.</h3>
      <p>
        NASADEM se mosaica y agrega desde ~30 m a ~480 m antes de compararlo con MOLA. Sentinel-2 aporta doce observaciones
        mensuales de superficie y POWER solo contexto climático regional.
      </p>
      <ol className="method-steps">
        <li><b>01</b><strong>Referencia MOLA</strong><span>Entorno regional de Jezero · ~451 m nominal</span></li>
        <li><b>02</b><strong>Terreno NASADEM</strong><span>Mosaico multitesela · bloques 16×16 · ~480 m</span></li>
        <li><b>03</b><strong>Superficie Sentinel-2</strong><span>12 mosaicos mensuales · SCL, NDVI y BSI · ~30 m</span></li>
        <li><b>04</b><strong>Decisión separada</strong><span>Similitud ≠ confianza ≠ factibilidad</span></li>
      </ol>

      {summary && search && snapshot && (
        <section className="method-search" aria-labelledby="method-search-title">
          <h3 id="method-search-title">Cómo se buscaron</h3>
          <p>{search.scope_note}</p>
          <dl className="method-figures">
            <div><dt>Regiones de prueba</dt><dd>{summary.regions}</dd></div>
            <div><dt>Ventanas de ~20 km</dt><dd>{summary.evaluated} evaluadas de {summary.attempted} intentadas</dd></div>
            <div><dt>Área explorada</dt><dd>≈ {integer.format(summary.exploredAreaKm2)} km²</dd></div>
            <div><dt>Con coordenadas publicadas</dt><dd>{summary.excludedByPrecedent} excluidas del ranking</dd></div>
            <div><dt>Preseleccionadas</dt><dd>{summary.selected} · hasta {summary.maxPerCountry} por país</dd></div>
            <div><dt>Separación</dt><dd>Centros a ≥ {formatScore(summary.minDistanceKm)} km</dd></div>
          </dl>
          <ul className="region-list">
            {search.regions.map((region) => (
              <li key={region.region_id}>
                <strong>{region.name}</strong>
                <span>bbox {region.bbox.join(', ')} · {region.windows_evaluated} ventanas · {region.windows_selected} preseleccionadas</span>
              </li>
            ))}
          </ul>
          <div className="method-map">
            <CandidateMap
              candidates={snapshot.candidates}
              rankOf={rankMap(ranked)}
              outline={snapshot.outline}
              search={search}
              precedents={snapshot.precedents}
              selectedId={selection?.kind === 'evaluated' ? selection.siteId : ''}
              onSelect={(id) => uiActions.select(id)}
            />
          </div>
          <p className="method-note">Yungay conserva sus datos como referencia conocida (REF) y queda fuera del ranking.</p>
        </section>
      )}

      <p className="method-links">
        <a href={`${base}/analysis-summary.json`} target="_blank" rel="noreferrer">Abrir análisis auditable ↗</a>
        {search && <a href={`${base}/search-results.json`} target="_blank" rel="noreferrer">Abrir las 50 ventanas y sus motivos ↗</a>}
      </p>
    </div>
  )
}
