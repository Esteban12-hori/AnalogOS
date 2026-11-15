import { composeGeologyGuidance, deterministicGeologyRefs, type GeologyGuidanceView, type GeologyCatalog } from '../../../../../shared/geology/guidance'
import { AVAILABILITY_LABEL, formatCoverage, formatScaleLabel } from '../../domain/geologyContext'
import { shortCandidateName } from '../../domain/formatting'
import type { PlannerState } from '../../mission'

/** Vista vigente: selección de la IA si corresponde exactamente a este catálogo; si no, orientación determinista. */
export function guidanceView(catalog: GeologyCatalog | null, state: PlannerState): GeologyGuidanceView | null {
  if (!catalog || (!catalog.sites.length && !catalog.excluded.length)) return null
  const rec = state.explain.geologyRecord
  if (rec && rec.catalog_fingerprint === catalog.catalog_fingerprint) return composeGeologyGuidance(catalog, rec.selection.ref_ids, 'anthropic')
  return composeGeologyGuidance(catalog, deterministicGeologyRefs(catalog).ref_ids, 'deterministic_template')
}

/** Orientación geológica de la prueba: capa SEPARADA del resultado determinista (no cambia estados ni orden). */
export function GeologyGuidance({ view, onExport, exportError }: { view: GeologyGuidanceView; onExport: () => void; exportError: string | null }) {
  const ai = view.source === 'anthropic'
  const safe = (u: string): string | null => (/^https:\/\//.test(u) ? u : null)
  return (
    <section className="pl-geo" aria-labelledby="pl-geo-title">
      <h3 id="pl-geo-title">Orientación geológica para esta prueba <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? 'Selección por IA' : 'Orientación general sin IA'}</span></h3>
      <p className="pl-hint">
        Cartografía geológica oficial regional como apoyo para planificar el reconocimiento y las validaciones de campo. Es una capa aparte:
        no cambia estados, orden ni exclusiones, y no prueba tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos.
      </p>
      <p className="pl-hint">{view.notice}</p>
      {view.scope_note && <p className="pl-notice">{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <article key={brief.site_id} className="pl-geo-site">
          <h4>
            {shortCandidateName(brief.name)}
            {brief.role === 'reference' && <b className="pl-tag ref">REF · referencia conocida</b>}
            <span className="pl-tag">{AVAILABILITY_LABEL[brief.availability]}</span>
          </h4>
          <p className="pl-geo-meta">
            Cubierto {formatCoverage(brief.fractions.covered_total)} · sin polígono {formatCoverage(brief.fractions.unmapped)} · solape {formatCoverage(brief.fractions.covered_ambiguous)} · escala {formatScaleLabel(brief.scale_denominator)} · {brief.source.authority}
            {brief.applies_to === 'window_not_requested_geometry' && ' · ventana completa, no su geometría'}
          </p>
          {items.length > 0 ? (
            <ul className="pl-geo-items" aria-label={`Qué comprobar en ${shortCandidateName(brief.name)}`}>
              {items.map(({ ref, unit, purpose_label }) => (
                <li key={ref.ref_id}>
                  <b>{purpose_label}</b>
                  <span className="pl-geo-src">
                    {unit ? `Respaldo: unidad ${unit.code ?? 'sin código'} · ${unit.name ?? 'sin nombre'} · ${formatCoverage(unit.fraction)} del sector incluyendo solapes (${formatCoverage(unit.fraction_unambiguous)} sin solape)` : 'Respaldo: cobertura y escala de la capa oficial'}
                    {' · '}{safe(brief.source.dataset_url) ? <a href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_name} (fuente oficial)</a> : brief.source.dataset_name}
                  </span>
                  <span>{ref.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-hint">{brief.availability === 'no_coverage' ? 'Sin unidades cartografiadas en esta capa: nada que orientar desde la geología oficial.' : 'No se destacó ninguna comprobación geológica para este sector.'}</p>
          )}
          <ul className="pl-geo-limits" aria-label="Límites de la evidencia geológica">
            {brief.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <details className="pl-nested">
            <summary>Unidades cartografiadas y fuente ({brief.units.length})</summary>
            <ul>
              {brief.units.map((u) => (
                <li key={u.unit_id}>
                  <b>{u.code ?? 'sin código'} · {u.name ?? 'sin nombre'}</b> — {formatCoverage(u.fraction)} del sector incluyendo zonas compartidas con otras unidades; {formatCoverage(u.fraction_unambiguous)} sin solape{u.fraction_in_ambiguity > 1e-8 ? ` (${formatCoverage(u.fraction_in_ambiguity)} compartido)` : ''}.
                  {' '}{u.description ?? 'Descripción original ausente en la fuente.'}
                </li>
              ))}
            </ul>
            <p className="pl-hint">Los porcentajes de unidades no se suman: una zona compartida cuenta en cada unidad que la cubre. La capa no dice dónde está cada unidad dentro del sector.</p>
            {brief.units_omitted > 0 && <p className="pl-hint">Se omiten {brief.units_omitted} unidad(es) menores de esta lista.</p>}
            <p className="pl-hint">Fuente: {brief.source.authority}, distribuido por {brief.source.distributor}. Capa «{brief.source.dataset_name}»: {safe(brief.source.dataset_url) ? <a href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_url}</a> : 'sin enlace'}. Fecha del mapa: {brief.source.map_date ?? 'no informada'}.</p>
          </details>
        </article>
      ))}
      {view.excluded.length > 0 && (
        <details className="pl-more">
          <summary>Sectores sin orientación geológica ({view.excluded.length})</summary>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{shortCandidateName(e.name)}</b>: {e.reason}</li>)}</ul>
        </details>
      )}
      <button type="button" className="pl-ghost" onClick={onExport}>Descargar JSON con orientación geológica</button>
      {exportError && <p className="pl-notice" role="alert">{exportError}</p>}
    </section>
  )
}

/** Versión imprimible: sin interacción; incluye siempre los límites. */
export function PrintGeology({ view }: { view: GeologyGuidanceView }) {
  return (
    <>
      <h2>Orientación geológica ({view.source === 'anthropic' ? 'selección por IA' : 'general, sin IA'})</h2>
      <p>{view.notice} Capa aparte del resultado: no cambia estados, orden ni exclusiones.</p>
      {view.scope_note && <p>{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <section key={brief.site_id} className="pl-print-opt">
          <h3>{shortCandidateName(brief.name)} — {AVAILABILITY_LABEL[brief.availability]} · escala {formatScaleLabel(brief.scale_denominator)} · {brief.source.authority} · {brief.source.dataset_url}</h3>
          {items.length > 0 && <ul>{items.map(({ ref, unit, purpose_label }) => <li key={ref.ref_id}><b>{purpose_label}</b>{unit ? ` (${unit.code ?? 'sin código'} · ${unit.name ?? 'sin nombre'})` : ''}: {ref.text}</li>)}</ul>}
          <b>Límites</b>
          <ul>{brief.limits.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      ))}
    </>
  )
}
