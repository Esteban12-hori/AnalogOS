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

type GuidanceSite = GeologyGuidanceView['sites'][number]
type SiteBrief = GuidanceSite['brief']
type BriefUnit = SiteBrief['units'][number]

const safe = (u: string): string | null => (/^https:\/\//.test(u) ? u : null)

/**
 * Textos y piezas compartidos por la pantalla y el informe impreso (M11): la versión imprimible
 * repite la MISMA evidencia geológica (cobertura, unidades, fuente, límites y excluidos), sin
 * interacción. Cartografía regional: nunca se presenta como aptitud del sector.
 */
export const GEOLOGY_LAYER_NOTE = 'Cartografía geológica oficial regional como apoyo para planificar el reconocimiento y las validaciones de campo. Es una capa aparte: no cambia estados, orden ni exclusiones, y no prueba tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos.'
export const UNITS_NOT_ADDITIVE = 'Los porcentajes de unidades no se suman: una zona compartida cuenta en cada unidad que la cubre. La capa no dice dónde está cada unidad dentro del sector.'

function SiteMeta({ brief }: { brief: SiteBrief }) {
  return (
    <>
      Cubierto {formatCoverage(brief.fractions.covered_total)} · sin polígono {formatCoverage(brief.fractions.unmapped)} · solape {formatCoverage(brief.fractions.covered_ambiguous)} · escala {formatScaleLabel(brief.scale_denominator)} · {brief.source.authority}
      {brief.applies_to === 'window_not_requested_geometry' && ' · ventana completa, no su geometría'}
    </>
  )
}

function ItemSupport({ unit, brief }: { unit: GuidanceSite['items'][number]['unit']; brief: SiteBrief }) {
  return (
    <>
      {unit ? `Respaldo: unidad ${unit.code ?? 'sin código'} · ${unit.name ?? 'sin nombre'} · ${formatCoverage(unit.fraction)} del sector incluyendo solapes (${formatCoverage(unit.fraction_unambiguous)} sin solape)` : 'Respaldo: cobertura y escala de la capa oficial'}
      {' · '}{safe(brief.source.dataset_url) ? <a href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_name} (fuente oficial)</a> : brief.source.dataset_name}
    </>
  )
}

function noItemsText(brief: SiteBrief): string {
  return brief.availability === 'no_coverage' ? 'Sin unidades cartografiadas en esta capa: nada que orientar desde la geología oficial.' : 'No se destacó ninguna comprobación geológica para este sector.'
}

function UnitItem({ u }: { u: BriefUnit }) {
  return (
    <li>
      <b>{u.code ?? 'sin código'} · {u.name ?? 'sin nombre'}</b> — {formatCoverage(u.fraction)} del sector incluyendo zonas compartidas con otras unidades; {formatCoverage(u.fraction_unambiguous)} sin solape{u.fraction_in_ambiguity > 1e-8 ? ` (${formatCoverage(u.fraction_in_ambiguity)} compartido)` : ''}.
      {' '}{u.description ?? 'Descripción original ausente en la fuente.'}
    </li>
  )
}

function SourceLine({ brief }: { brief: SiteBrief }) {
  return (
    <>
      Fuente: {brief.source.authority}, distribuido por {brief.source.distributor}. Capa «{brief.source.dataset_name}»: {safe(brief.source.dataset_url) ? <a className="pl-url" href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_url}</a> : 'sin enlace'}. Fecha del mapa: {brief.source.map_date ?? 'no informada'}.
    </>
  )
}

/** Orientación geológica de la prueba: capa SEPARADA del resultado determinista (no cambia estados ni orden). */
export function GeologyGuidance({ view, onExport, exportError }: { view: GeologyGuidanceView; onExport: () => void; exportError: string | null }) {
  const ai = view.source === 'anthropic'
  return (
    <section className="pl-geo" aria-labelledby="pl-geo-title">
      <h3 id="pl-geo-title">Orientación geológica para esta prueba <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? 'Selección por IA' : 'Orientación general sin IA'}</span></h3>
      <p className="pl-hint">{GEOLOGY_LAYER_NOTE}</p>
      <p className="pl-hint">{view.notice}</p>
      {view.scope_note && <p className="pl-notice">{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <article key={brief.site_id} className="pl-geo-site">
          <h4>
            {shortCandidateName(brief.name)}
            {brief.role === 'reference' && <b className="pl-tag ref">REF · referencia conocida</b>}
            <span className="pl-tag">{AVAILABILITY_LABEL[brief.availability]}</span>
          </h4>
          <p className="pl-geo-meta"><SiteMeta brief={brief} /></p>
          {items.length > 0 ? (
            <ul className="pl-geo-items" aria-label={`Qué comprobar en ${shortCandidateName(brief.name)}`}>
              {items.map(({ ref, unit, purpose_label }) => (
                <li key={ref.ref_id}>
                  <b>{purpose_label}</b>
                  <span className="pl-geo-src"><ItemSupport unit={unit} brief={brief} /></span>
                  <span>{ref.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-hint">{noItemsText(brief)}</p>
          )}
          <ul className="pl-geo-limits" aria-label="Límites de la evidencia geológica">
            {brief.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <details className="pl-nested">
            <summary>Unidades cartografiadas y fuente ({brief.units.length})</summary>
            <ul>
              {brief.units.map((u) => <UnitItem key={u.unit_id} u={u} />)}
            </ul>
            <p className="pl-hint">{UNITS_NOT_ADDITIVE}</p>
            {brief.units_omitted > 0 && <p className="pl-hint">Se omiten {brief.units_omitted} unidad(es) menores de esta lista.</p>}
            <p className="pl-hint"><SourceLine brief={brief} /></p>
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

/**
 * Versión imprimible: sin interacción y con la MISMA evidencia que la pantalla (M11): aviso de capa
 * aparte, cobertura, comprobaciones con su respaldo, límites siempre, unidades con descripción,
 * fuente completa con enlace y sectores sin orientación con su motivo.
 */
export function PrintGeology({ view }: { view: GeologyGuidanceView }) {
  return (
    <section className="pl-print-geo">
      <h2>Orientación geológica ({view.source === 'anthropic' ? 'selección por IA' : 'general, sin IA'})</h2>
      <p>{GEOLOGY_LAYER_NOTE}</p>
      <p>{view.notice} Capa aparte del resultado: no cambia estados, orden ni exclusiones.</p>
      {view.scope_note && <p>{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <section key={brief.site_id} className="pl-print-opt">
          <h3>{shortCandidateName(brief.name)}{brief.role === 'reference' ? ' (REF, referencia conocida)' : ''} — {AVAILABILITY_LABEL[brief.availability]}</h3>
          <p><SiteMeta brief={brief} /></p>
          {items.length > 0
            ? <ul>{items.map(({ ref, unit, purpose_label }) => <li key={ref.ref_id}><b>{purpose_label}</b> — <ItemSupport unit={unit} brief={brief} />. {ref.text}</li>)}</ul>
            : <p>{noItemsText(brief)}</p>}
          <p><b>Límites de la evidencia geológica</b></p>
          <ul>{brief.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          <p><b>Unidades cartografiadas ({brief.units.length})</b></p>
          {brief.units.length > 0 && <ul>{brief.units.map((u) => <UnitItem key={u.unit_id} u={u} />)}</ul>}
          <p>{UNITS_NOT_ADDITIVE}</p>
          {brief.units_omitted > 0 && <p>Se omiten {brief.units_omitted} unidad(es) menores de esta lista.</p>}
          <p><SourceLine brief={brief} /></p>
        </section>
      ))}
      {view.excluded.length > 0 && (
        <>
          <h3>Sectores sin orientación geológica ({view.excluded.length})</h3>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{shortCandidateName(e.name)}</b>: {e.reason}</li>)}</ul>
        </>
      )}
    </section>
  )
}
