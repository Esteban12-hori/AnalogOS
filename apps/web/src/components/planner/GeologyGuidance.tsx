import { composeGeologyGuidance, deterministicGeologyRefs, type GeologyGuidanceView, type GeologyCatalog } from '../../../../../shared/geology/guidance'
import { AVAILABILITY_LABEL, formatCoverage, formatScaleLabel } from '../../domain/geologyContext'
import { shortCandidateName } from '../../domain/formatting'
import { GLOSS_LABEL, ORIGINAL_LABEL, unitDescriptionEn, unitNameDisplay } from '../../i18n/geologyGloss'
import { ORIGINAL_WORDING_MARK, displaySource } from '../../i18n/sourceText'
import type { PlannerState } from '../../mission'

/** Current view: the AI selection if it corresponds exactly to this catalog; otherwise, deterministic guidance. */
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
 * Texts and components shared by the screen and the printed report (M11): the printable version
 * repeats the SAME geological evidence (coverage, units, source, limits, and exclusions), without
 * interaction. Regional cartography: it is never presented as suitability of the sector.
 */
export const GEOLOGY_LAYER_NOTE = 'Official regional geological mapping as support for planning reconnaissance and field validation. It is a separate layer: it does not change statuses, order or exclusions, and it does not prove traction, soil mechanics, Martian equivalence, safety or permits.'
export const UNITS_NOT_ADDITIVE = 'Unit percentages do not add up: a shared area counts in every unit that covers it. The layer does not say where each unit lies inside the sector.'
/** Language note for unit names and descriptions (official wording stays the record). */
export const UNIT_LANGUAGE_NOTE = 'Unit names are the official ones (Spanish), followed by an English gloss; descriptions are shown as an English editorial translation with the official original wording next to it. The JSON keeps the official wording.'

function SiteMeta({ brief }: { brief: SiteBrief }) {
  return (
    <>
      Covered {formatCoverage(brief.fractions.covered_total)} · without polygon {formatCoverage(brief.fractions.unmapped)} · overlap {formatCoverage(brief.fractions.covered_ambiguous)} · scale {formatScaleLabel(brief.scale_denominator)} · {brief.source.authority}
      {brief.applies_to === 'window_not_requested_geometry' && ' · full window, not your geometry'}
    </>
  )
}

function ItemSupport({ unit, brief }: { unit: GuidanceSite['items'][number]['unit']; brief: SiteBrief }) {
  return (
    <>
      {unit ? `Support: unit ${unit.code ?? 'no code'} · ${unitNameDisplay(unit.name, null)} · ${formatCoverage(unit.fraction)} of the sector including overlaps (${formatCoverage(unit.fraction_unambiguous)} without overlap)` : 'Support: coverage and scale of the official layer'}
      {' · '}{safe(brief.source.dataset_url) ? <a href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_name} (official source)</a> : brief.source.dataset_name}
    </>
  )
}

function noItemsText(brief: SiteBrief): string {
  return brief.availability === 'no_coverage' ? 'No mapped units in this layer: nothing to guide from the official geology.' : 'No geological check was highlighted for this sector.'
}

/** Official description as an English editorial gloss, with the original wording next to it (disclosure on screen, inline in print). */
function UnitDescription({ description, print }: { description: string | null; print: boolean }) {
  if (description === null) return <>Original description missing in the source.</>
  const en = unitDescriptionEn(description)
  if (en === null) return <span lang="es">{description}{ORIGINAL_WORDING_MARK}</span>
  if (print) return <>{GLOSS_LABEL}: {en}. {ORIGINAL_LABEL}: <span lang="es">“{description}”</span>.</>
  return (
    <>
      <span className="pl-gloss"><small>{GLOSS_LABEL}:</small> {en}</span>
      <details className="pl-original"><summary>{ORIGINAL_LABEL}</summary><span lang="es">{description}</span></details>
    </>
  )
}

function UnitItem({ u, print = false }: { u: BriefUnit; print?: boolean }) {
  return (
    <li>
      <b>{u.code ?? 'no code'} · {unitNameDisplay(u.name, null)}</b> — {formatCoverage(u.fraction)} of the sector including areas shared with other units; {formatCoverage(u.fraction_unambiguous)} without overlap{u.fraction_in_ambiguity > 1e-8 ? ` (${formatCoverage(u.fraction_in_ambiguity)} shared)` : ''}.
      {' '}<UnitDescription description={u.description} print={print} />
    </li>
  )
}

function SourceLine({ brief }: { brief: SiteBrief }) {
  return (
    <>
      Source: {brief.source.authority}, distributed by {displaySource(brief.source.distributor)}. Layer “{brief.source.dataset_name}”: {safe(brief.source.dataset_url) ? <a className="pl-url" href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_url}</a> : 'no link'}. Map date: {brief.source.map_date ?? 'not reported'}.
    </>
  )
}

/** Geological guidance for the test: a layer SEPARATE from the deterministic result (it does not change statuses or order). */
export function GeologyGuidance({ view, onExport, exportError }: { view: GeologyGuidanceView; onExport: () => void; exportError: string | null }) {
  const ai = view.source === 'anthropic'
  return (
    <section className="pl-geo" aria-labelledby="pl-geo-title">
      <h3 id="pl-geo-title">Geological guidance for this test <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? 'AI selection' : 'General guidance without AI'}</span></h3>
      <p className="pl-hint">{GEOLOGY_LAYER_NOTE}</p>
      <p className="pl-hint">{view.notice}</p>
      {view.scope_note && <p className="pl-notice">{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <article key={brief.site_id} className="pl-geo-site">
          <h4>
            {shortCandidateName(brief.name)}
            {brief.role === 'reference' && <b className="pl-tag ref">REF · known reference</b>}
            <span className="pl-tag">{AVAILABILITY_LABEL[brief.availability]}</span>
          </h4>
          <p className="pl-geo-meta"><SiteMeta brief={brief} /></p>
          {items.length > 0 ? (
            <ul className="pl-geo-items" aria-label={`What to check in ${shortCandidateName(brief.name)}`}>
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
          <ul className="pl-geo-limits" aria-label="Limits of the geological evidence">
            {brief.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <details className="pl-nested">
            <summary>Mapped units and source ({brief.units.length})</summary>
            <ul>
              {brief.units.map((u) => <UnitItem key={u.unit_id} u={u} />)}
            </ul>
            <p className="pl-hint">{UNITS_NOT_ADDITIVE}</p>
            {brief.units.length > 0 && <p className="pl-hint">{UNIT_LANGUAGE_NOTE}</p>}
            {brief.units_omitted > 0 && <p className="pl-hint">{brief.units_omitted} smaller unit(s) are left out of this list.</p>}
            <p className="pl-hint"><SourceLine brief={brief} /></p>
          </details>
        </article>
      ))}
      {view.excluded.length > 0 && (
        <details className="pl-more">
          <summary>Sectors without geological guidance ({view.excluded.length})</summary>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{shortCandidateName(e.name)}</b>: {e.reason}</li>)}</ul>
        </details>
      )}
      <button type="button" className="pl-ghost" onClick={onExport}>Download JSON with geological guidance</button>
      {exportError && <p className="pl-notice" role="alert">{exportError}</p>}
    </section>
  )
}

/**
 * Printable version: without interaction and with the SAME evidence as the screen (M11): separate layer
 * notice, coverage, checks with their supporting evidence, limits always shown, units with description,
 * full source with link, and sectors without guidance with their reason.
 */
export function PrintGeology({ view }: { view: GeologyGuidanceView }) {
  return (
    <section className="pl-print-geo">
      <h2>Geological guidance ({view.source === 'anthropic' ? 'AI selection' : 'general, without AI'})</h2>
      <p>{GEOLOGY_LAYER_NOTE}</p>
      <p>{view.notice} Separate layer from the result: it does not change statuses, order or exclusions.</p>
      {view.scope_note && <p>{view.scope_note}</p>}
      {view.sites.map(({ brief, items }) => (
        <section key={brief.site_id} className="pl-print-opt">
          <h3>{shortCandidateName(brief.name)}{brief.role === 'reference' ? ' (REF, known reference)' : ''} — {AVAILABILITY_LABEL[brief.availability]}</h3>
          <p><SiteMeta brief={brief} /></p>
          {items.length > 0
            ? <ul>{items.map(({ ref, unit, purpose_label }) => <li key={ref.ref_id}><b>{purpose_label}</b> — <ItemSupport unit={unit} brief={brief} />. {ref.text}</li>)}</ul>
            : <p>{noItemsText(brief)}</p>}
          <p><b>Limits of the geological evidence</b></p>
          <ul>{brief.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          <p><b>Mapped units ({brief.units.length})</b></p>
          {brief.units.length > 0 && <ul>{brief.units.map((u) => <UnitItem key={u.unit_id} u={u} print />)}</ul>}
          <p>{UNITS_NOT_ADDITIVE}</p>
          {brief.units.length > 0 && <p>{UNIT_LANGUAGE_NOTE}</p>}
          {brief.units_omitted > 0 && <p>{brief.units_omitted} smaller unit(s) are left out of this list.</p>}
          <p><SourceLine brief={brief} /></p>
        </section>
      ))}
      {view.excluded.length > 0 && (
        <>
          <h3>Sectors without geological guidance ({view.excluded.length})</h3>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{shortCandidateName(e.name)}</b>: {e.reason}</li>)}</ul>
        </>
      )}
    </section>
  )
}
