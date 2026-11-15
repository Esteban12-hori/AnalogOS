import { composeGeologyGuidance, deterministicGeologyRefs, type GeologyGuidanceView, type GeologyCatalog } from '../../../../../shared/geology/guidance'
import { useLocale, useT, type Locale } from '../../i18n'
import { GLOSS_LABEL, ORIGINAL_LABEL } from '../../i18n/geologyGloss'
import { tPlanner } from '../../i18n/messages/planner'
import { displayGeologyPack, displayRecordText } from '../../i18n/recordText'
import { knownSpanishLang, originalWordingMark, scienceText, unitDescriptionGloss, unitNameGloss } from '../../i18n/science'
import type { PlannerState } from '../../mission'
import { displayMissionMessage } from '../../mission/messages'
import { siteName } from '../../mission/siteName'

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
 *
 * Language (ADR-017): interface text from the `planner` catalog; guidance texts, limits, notices and exclusion reasons
 * are record text (displayRecordText); coverage and scale labels with the geology pack of the language; official unit
 * names and descriptions keep their official wording (English gloss only in the English interface).
 */
export const GEOLOGY_LAYER_NOTE = tPlanner.in('en')('geo.layerNote')
export const UNITS_NOT_ADDITIVE = tPlanner.in('en')('geo.unitsNotAdditive')
/** Language note for unit names and descriptions (official wording stays the record). English. */
export const UNIT_LANGUAGE_NOTE = tPlanner.in('en')('geo.unitLanguage')

/** Official unit name: in English followed by its gloss (“Original — English”); in Spanish the official name alone. */
function unitName(name: string | null, locale: Locale): string {
  if (name === null) return tPlanner.in(locale)('geo.unnamedUnit')
  const gloss = unitNameGloss(name, locale)
  return gloss && gloss !== name ? `${name} — ${gloss}` : name
}

function SiteMeta({ brief }: { brief: SiteBrief }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const geo = displayGeologyPack(locale)
  return (
    <>
      {t('geo.meta', {
        covered: geo.formatCoverage(brief.fractions.covered_total),
        unmapped: geo.formatCoverage(brief.fractions.unmapped),
        ambiguous: geo.formatCoverage(brief.fractions.covered_ambiguous),
        scale: geo.formatScaleLabel(brief.scale_denominator),
        authority: brief.source.authority,
      })}
      {brief.applies_to === 'window_not_requested_geometry' && t('geo.metaWindow')}
    </>
  )
}

function ItemSupport({ unit, brief }: { unit: GuidanceSite['items'][number]['unit']; brief: SiteBrief }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const geo = displayGeologyPack(locale)
  const dataset = t('geo.officialSource', { dataset: brief.source.dataset_name })
  return (
    <>
      {unit
        ? t('geo.support', { code: unit.code ?? t('geo.noCode'), name: unitName(unit.name, locale), fraction: geo.formatCoverage(unit.fraction), unambiguous: geo.formatCoverage(unit.fraction_unambiguous) })
        : t('geo.supportLayer')}
      {' · '}{safe(brief.source.dataset_url) ? <a href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{dataset}</a> : brief.source.dataset_name}
    </>
  )
}

function noItemsText(brief: SiteBrief, locale: Locale): string {
  return tPlanner.in(locale)(brief.availability === 'no_coverage' ? 'geo.noItemsNoCoverage' : 'geo.noItems')
}

/**
 * Official description. English interface: English editorial gloss with the original wording next to it (disclosure
 * on screen, inline in print). Spanish interface: the official wording itself, without gloss or mark.
 */
function UnitDescription({ description, print }: { description: string | null; print: boolean }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  if (description === null) return <>{t('geo.noDescription')}</>
  const en = unitDescriptionGloss(description, locale)
  if (en === null) return <span lang={knownSpanishLang(locale)}>{description}{originalWordingMark(locale)}</span>
  if (print) return <>{GLOSS_LABEL}: {en}. {ORIGINAL_LABEL}: <span lang="es">“{description}”</span>.</>
  return (
    <>
      <span className="pl-gloss"><small>{GLOSS_LABEL}:</small> {en}</span>
      <details className="pl-original"><summary>{ORIGINAL_LABEL}</summary><span lang="es">{description}</span></details>
    </>
  )
}

function UnitItem({ u, print = false }: { u: BriefUnit; print?: boolean }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const geo = displayGeologyPack(locale)
  return (
    <li>
      <b>{u.code ?? t('geo.noCode')} · {unitName(u.name, locale)}</b> — {t('geo.unit', {
        fraction: geo.formatCoverage(u.fraction),
        unambiguous: geo.formatCoverage(u.fraction_unambiguous),
        shared: u.fraction_in_ambiguity > 1e-8 ? t('geo.unitShared', { fraction: geo.formatCoverage(u.fraction_in_ambiguity) }) : '',
      })}
      {' '}<UnitDescription description={u.description} print={print} />
    </li>
  )
}

function SourceLine({ brief }: { brief: SiteBrief }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  return (
    <>
      {t('geo.source', { authority: brief.source.authority, distributor: scienceText(brief.source.distributor, locale), dataset: brief.source.dataset_name })}
      {safe(brief.source.dataset_url) ? <a className="pl-url" href={safe(brief.source.dataset_url)!} target="_blank" rel="noreferrer noopener">{brief.source.dataset_url}</a> : t('geo.noLink')}
      {t('geo.sourceTail', { date: brief.source.map_date ?? t('geo.noDate') })}
    </>
  )
}

/** Geological guidance for the test: a layer SEPARATE from the deterministic result (it does not change statuses or order). */
export function GeologyGuidance({ view, onExport, exportError }: { view: GeologyGuidanceView; onExport: () => void; exportError: string | null }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const geo = displayGeologyPack(locale)
  const ai = view.source === 'anthropic'
  return (
    <section className="pl-geo" aria-labelledby="pl-geo-title">
      <h3 id="pl-geo-title">{t('geo.title')} <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? t('geo.aiTag') : t('geo.generalTag')}</span></h3>
      <p className="pl-hint">{t('geo.layerNote')}</p>
      <p className="pl-hint">{displayRecordText(view.notice, locale)}</p>
      {view.scope_note && <p className="pl-notice">{displayRecordText(view.scope_note, locale)}</p>}
      {view.sites.map(({ brief, items }) => (
        <article key={brief.site_id} className="pl-geo-site">
          <h4>
            {siteName(brief.name, locale)}
            {brief.role === 'reference' && <b className="pl-tag ref">{t('option.knownReference')}</b>}
            <span className="pl-tag">{geo.availabilityLabel[brief.availability]}</span>
          </h4>
          <p className="pl-geo-meta"><SiteMeta brief={brief} /></p>
          {items.length > 0 ? (
            <ul className="pl-geo-items" aria-label={t('geo.whatToCheck', { name: siteName(brief.name, locale) })}>
              {items.map(({ ref, unit, purpose_label }) => (
                <li key={ref.ref_id}>
                  <b>{displayRecordText(purpose_label, locale)}</b>
                  <span className="pl-geo-src"><ItemSupport unit={unit} brief={brief} /></span>
                  <span>{displayRecordText(ref.text, locale)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-hint">{noItemsText(brief, locale)}</p>
          )}
          <ul className="pl-geo-limits" aria-label={t('geo.limitsLabel')}>
            {brief.limits.map((l) => <li key={l}>{displayRecordText(l, locale)}</li>)}
          </ul>
          <details className="pl-nested">
            <summary>{t('geo.unitsSummary', { count: brief.units.length })}</summary>
            <ul>
              {brief.units.map((u) => <UnitItem key={u.unit_id} u={u} />)}
            </ul>
            <p className="pl-hint">{t('geo.unitsNotAdditive')}</p>
            {brief.units.length > 0 && <p className="pl-hint">{t('geo.unitLanguage')}</p>}
            {brief.units_omitted > 0 && <p className="pl-hint">{t('geo.unitsOmitted', { count: brief.units_omitted })}</p>}
            <p className="pl-hint"><SourceLine brief={brief} /></p>
          </details>
        </article>
      ))}
      {view.excluded.length > 0 && (
        <details className="pl-more">
          <summary>{t('geo.excludedTitle', { count: view.excluded.length })}</summary>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{siteName(e.name, locale)}</b>: {displayRecordText(e.reason, locale)}</li>)}</ul>
        </details>
      )}
      <button type="button" className="pl-ghost" onClick={onExport}>{t('geo.download')}</button>
      {exportError && <p className="pl-notice" role="alert">{displayMissionMessage(exportError, locale)}</p>}
    </section>
  )
}

/**
 * Printable version: without interaction and with the SAME evidence as the screen (M11): separate layer
 * notice, coverage, checks with their supporting evidence, limits always shown, units with description,
 * full source with link, and sectors without guidance with their reason.
 */
export function PrintGeology({ view }: { view: GeologyGuidanceView }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const geo = displayGeologyPack(locale)
  return (
    <section className="pl-print-geo">
      <h2>{t('geo.printTitle', { source: view.source === 'anthropic' ? t('geo.printAi') : t('geo.printGeneral') })}</h2>
      <p>{t('geo.layerNote')}</p>
      <p>{displayRecordText(view.notice, locale)} {t('geo.printSeparate')}</p>
      {view.scope_note && <p>{displayRecordText(view.scope_note, locale)}</p>}
      {view.sites.map(({ brief, items }) => (
        <section key={brief.site_id} className="pl-print-opt">
          <h3>{siteName(brief.name, locale)}{brief.role === 'reference' ? t('print.reference') : ''} — {geo.availabilityLabel[brief.availability]}</h3>
          <p><SiteMeta brief={brief} /></p>
          {items.length > 0
            ? <ul>{items.map(({ ref, unit, purpose_label }) => <li key={ref.ref_id}><b>{displayRecordText(purpose_label, locale)}</b> — <ItemSupport unit={unit} brief={brief} />. {displayRecordText(ref.text, locale)}</li>)}</ul>
            : <p>{noItemsText(brief, locale)}</p>}
          <p><b>{t('geo.limitsLabel')}</b></p>
          <ul>{brief.limits.map((l) => <li key={l}>{displayRecordText(l, locale)}</li>)}</ul>
          <p><b>{t('geo.printUnits', { count: brief.units.length })}</b></p>
          {brief.units.length > 0 && <ul>{brief.units.map((u) => <UnitItem key={u.unit_id} u={u} print />)}</ul>}
          <p>{t('geo.unitsNotAdditive')}</p>
          {brief.units.length > 0 && <p>{t('geo.unitLanguage')}</p>}
          {brief.units_omitted > 0 && <p>{t('geo.unitsOmitted', { count: brief.units_omitted })}</p>}
          <p><SourceLine brief={brief} /></p>
        </section>
      ))}
      {view.excluded.length > 0 && (
        <>
          <h3>{t('geo.excludedTitle', { count: view.excluded.length })}</h3>
          <ul>{view.excluded.map((e) => <li key={e.site_id}><b>{siteName(e.name, locale)}</b>: {displayRecordText(e.reason, locale)}</li>)}</ul>
        </>
      )}
    </section>
  )
}
