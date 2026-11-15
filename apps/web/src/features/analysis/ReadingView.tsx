/**
 * Reading (deferred chunk, ADR-013, docs/INTEGRATION_PLAN.md §5). Three layers, ALWAYS kept separate:
 *
 *  1. Result — `MissionEvaluation` of the team (ordering rule, groups, reasons, what would change,
 *     pending items, open questions, limits and data request). Label "Deterministic calculation".
 *  2. Highlighted reasons — `composeExplanation` of the team: by default the deterministic template
 *     (without ✦); after "✦ Highlight reasons with AI", the Anthropic selection already validated by the
 *     reducer (fingerprints and `checkSelection`). The AI only chooses IDs: all text and all figures come
 *     from the evaluation.
 *  3. Snapshot facts — layer of deterministic facts (direction relative to Jezero, limiting factor,
 *     saturates, shared value, best of N without the REF, pipeline robustness).
 *
 * In Explore there is no AI operation (`explain` needs a confirmed request): only facts,
 * labeled "Deterministic reading". There are never automatic calls to the AI.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useLocale, useT } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tReading } from '../../i18n/messages/reading'
import { displayMissionMessage } from '../../mission/messages'
import { GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { uiActions, useUi } from '../../state/ui'
import { OrbitLoader } from '../boot'
import { setUseGeology, useComposer } from '../composer/composerStore'
import { withController } from '../composer/runLoader'
import { buildMetricViews } from '../metrics/buildMetricViews'
import type { MetricView } from '../metrics'
import { explanationToReading, geologyUnavailableNotice, type ReadingModel } from './explanationToReading'
import { buildFactsLayer } from './facts'
import type { ReadingPanelProps } from './index'
import { summarizeRobustness } from './robustness'
import type { FactRef, FactsLayer, SiteFacts } from './types'
import './analysis.css'

function Fact({ fact }: { fact: FactRef | null | undefined }) {
  const t = useT(tReading)
  if (!fact) return <span className="analysis-pending">{t('facts.noData')}</span>
  return <b className="analysis-chip" data-fact={fact.id}>{fact.text}</b>
}

function Layer({ title, label, ai = false, children }: { title: string; label: string; ai?: boolean; children: ReactNode }) {
  const id = useId()
  return (
    <section className="analysis-section analysis-layer" aria-labelledby={id} data-ai={ai ? '' : undefined}>
      <h3 id={id}>{title}</h3>
      <p className={`analysis-source${ai ? ' is-ai' : ''}`}>
        {ai && <span className="analysis-star" aria-hidden="true">{GLYPH.ai} </span>}
        {label}
      </p>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------------------------
// Layer 3: snapshot facts
// ---------------------------------------------------------------------------------------------

function SiteFactsBlock({ site }: { site: SiteFacts }) {
  const t = useT(tReading)
  return (
    <>
      <p className="analysis-site-line">
        <span aria-hidden="true">{site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> <strong>{site.name}</strong>
        {site.rank && <> · <Fact fact={site.rank} /></>}
        {' · '}{t('facts.similarityV3')} <Fact fact={site.similarity} />
        <span className="analysis-muted"> · {t('facts.confidence')} <Fact fact={site.confidence} /> · {t('facts.stability')} <Fact fact={site.stability} /></span>
      </p>
      {site.directions.length > 0 && (
        <ul className="analysis-list">
          {site.directions.map((item) => (
            <li key={item.criterionId}>
              <span className="analysis-dir" aria-hidden="true">
                {item.direction === 'more_demanding' ? GLYPH.moreDemanding : item.direction === 'less_demanding' ? GLYPH.lessDemanding : '≈'}
              </span>{' '}
              {item.label}: <Fact fact={item.ratio} /> <span className="analysis-muted">({item.phrase.text})</span>
              {item.raw && item.mars && (
                <span className="analysis-pair">
                  {' '}<span aria-hidden="true">{GLYPH.evaluated}</span> <Fact fact={item.raw} /> <span aria-hidden="true">{GLYPH.jezero}</span>
                  <span className="sr-only">Jezero</span> <Fact fact={item.mars} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {site.limiting && (
        <p className="analysis-limit">
          <b>{t('facts.limiting', { label: site.limiting.label })}</b>
          <span className="analysis-muted">
            {' '}{t('facts.limitingNote')}
            {site.limiting.sim && <> · {t('facts.similarity')} <Fact fact={site.limiting.sim} /></>}
          </span>
        </p>
      )}
      {site.saturates.length > 0 && (
        <p className="analysis-rule">
          <span aria-hidden="true">{GLYPH.rule}</span> {t('facts.saturates')}{' '}
          {site.saturates.map((item, index) => <span key={item.criterionId}>{index > 0 && ', '}{item.label}</span>)}
        </p>
      )}
      {site.missing.length > 0 && (
        <p className="analysis-pending-line">{t('facts.missing', { items: site.missing.map((item) => `${item.label} (${item.status})`).join(', ') })}</p>
      )}
    </>
  )
}

function FactsSection({ facts, focusId, label }: { facts: FactsLayer; focusId: string | null; label: string }) {
  const t = useT(tReading)
  const all = [...facts.sites, ...facts.references]
  const [chosen, setChosen] = useState<string | null>(null)
  useEffect(() => setChosen(null), [focusId])
  const current = all.find((site) => site.siteId === (chosen ?? focusId)) ?? all[0] ?? null
  const names = (id: string) => all.find((site) => site.siteId === id)?.name ?? id
  const { comparison, robustness } = facts
  return (
    <Layer title={t('facts.title')} label={label}>
      {all.length > 1 && (
        <div className="analysis-sites" role="group" aria-label={t('facts.sitesGroup')}>
          {all.map((site) => (
            <button key={site.siteId} type="button" aria-pressed={site.siteId === current?.siteId} onClick={() => setChosen(site.siteId)}>
              <span aria-hidden="true">{site.reference ? 'REF' : site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> {site.name}
            </button>
          ))}
        </div>
      )}
      {current ? <SiteFactsBlock site={current} /> : <p className="analysis-pending-line">{t('facts.noSites')}</p>}
      {(comparison.noDiscrimination.length > 0 || comparison.shared.length > 0) && (
        <details className="analysis-details">
          <summary>{t('facts.noDiscriminationTitle')}</summary>
          <ul className="analysis-list">
            {comparison.noDiscrimination.map((item) => (
              <li key={`nd-${item.criterionId}`}>{t('facts.noDiscrimination', { label: item.label })}{item.sims[0] && <> (<Fact fact={item.sims[0]} />)</>}</li>
            ))}
            {comparison.shared.map((item) => (
              <li key={`sh-${item.criterionId}-${item.siteIds.join()}`}>
                {t('facts.shared', { label: item.label })}{item.raw && <> (<Fact fact={item.raw} />)</>}{t('facts.sharedIn', { places: item.siteIds.map(names).join(` ${t('facts.and')} `) })}
              </li>
            ))}
          </ul>
        </details>
      )}
      {comparison.bestOfN.length > 0 && (
        <details className="analysis-details">
          <summary>{t('facts.bestOfTitle', { count: facts.sites.length })}</summary>
          <ul className="analysis-list">
            {comparison.bestOfN.map((item) => <li key={`best-${item.criterionId}`}>{item.label}: {names(item.siteId)} <Fact fact={item.sim} /></li>)}
          </ul>
          <p className="analysis-muted">{t('facts.referenceOut')}</p>
        </details>
      )}
      <details className="analysis-details">
        <summary>{t('facts.orderTitle')}</summary>
        <ul className="analysis-bars">
          {robustness.sites.map((site) => (
            <li key={site.siteId}>
              <span className="analysis-bar-label">{site.name}</span>
              <span className="analysis-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${site.stability === null ? 0 : Math.max(0, Math.min(1, site.stability / 100))})` }} />
              </span>
              <span className="analysis-bar-value">{site.text === null ? t('facts.noData') : t('facts.barStability', { value: site.text })}</span>
            </li>
          ))}
        </ul>
        {robustness.status === 'ready' ? (
          <ul className="analysis-list">
            <li>{t('facts.with')} <Fact fact={robustness.perturbation} /> (<Fact fact={robustness.scenarios} />): <Fact fact={robustness.flips} />; <Fact fact={robustness.topFlips} />.</li>
            {robustness.mostSensitive && <li>{t('facts.mostSensitive')} <Fact fact={robustness.mostSensitive} /></li>}
            {comparison.gaps[0] && <li>{t('facts.gap')} <Fact fact={comparison.gaps[0]} /></li>}
          </ul>
        ) : (
          <p className="analysis-pending-line">{robustness.reason}</p>
        )}
        <p className="analysis-muted">{t('facts.pipelineNote')}</p>
      </details>
      {current && <Checks site={current} />}
    </Layer>
  )
}

function Checks({ site }: { site: SiteFacts }) {
  const t = useT(tReading)
  if (site.checks.length === 0) return null
  return (
    <details className="analysis-details analysis-checks">
      <summary>{t('facts.checksTitle', { name: site.name })}</summary>
      <ol className="analysis-list">{site.checks.map((check) => <li key={check.ref}>{check.text}</li>)}</ol>
    </details>
  )
}

// ---------------------------------------------------------------------------------------------
// Layers 1 and 2: result and highlighted reasons (Mission)
// ---------------------------------------------------------------------------------------------

function ResultLayer({ model }: { model: ReadingModel['result'] }) {
  const t = useT(tReading)
  return (
    <Layer title={t('result.title')} label={model.label}>
      {model.dataRequest && <p className="analysis-notice">{model.dataRequest}</p>}
      {model.nonePrioritized && model.outcome === 'evaluated' && (
        <p className="analysis-notice">{t('result.nonePrioritized')}</p>
      )}
      {model.groups.map((group) => (
        <div key={group.status} className="analysis-group" data-status={group.status}>
          <p className="analysis-kicker">{group.label} · {group.options.length}</p>
          <ul className="analysis-list">
            {group.options.map((option) => (
              <li key={option.siteId}>
                <button type="button" className="analysis-link" onClick={() => uiActions.select(option.siteId)}>
                  {option.rank !== null ? `#${option.rank} ` : ''}{option.name}{option.role === 'reference' ? ' · REF' : ''}
                </button>
                {option.blockers.length > 0 && <span className="analysis-muted"> — {option.blockers.join(' · ')}</span>}
                {option.whatWouldChange.length > 0 && (
                  <details className="analysis-details analysis-change">
                    <summary>{t('result.whatWouldChange', { count: option.whatWouldChange.length })}</summary>
                    <ul className="analysis-list">{option.whatWouldChange.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <details className="analysis-details">
        <summary>{t('result.orderingRule')}</summary>
        <p className="analysis-muted">{model.orderingRule}</p>
      </details>
      {model.pending.length > 0 && <p className="analysis-pending-line">{t('result.pending', { count: model.pending.length })}</p>}
      {model.openQuestions.length > 0 && (
        <details className="analysis-details">
          <summary>{t('result.openQuestions', { count: model.openQuestions.length })}</summary>
          <ul className="analysis-list">{model.openQuestions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ul>
        </details>
      )}
      <details className="analysis-details">
        <summary>{t('result.limits')}</summary>
        <ul className="analysis-list">{model.limits.map((limit, index) => <li key={`${index}-${limit}`}>{limit}</li>)}</ul>
      </details>
    </Layer>
  )
}

function HighlightsLayer({ model }: { model: ReadingModel['highlights'] }) {
  const t = useT(tReading)
  const ai = model.source === 'anthropic'
  return (
    <Layer title={t('highlights.title')} label={model.label} ai={ai}>
      {ai && model.provenance && <p className="analysis-meta">{model.provenance}</p>}
      <p className="analysis-muted">{model.notice}</p>
      {/* The note comes from the evaluation (explanationToReading.emptyNote), not from what the AI chose. */}
      {model.emptyNote && <p className="analysis-pending-line">{model.emptyNote}</p>}
      {model.options.filter((option) => option.lines.length > 0).map((option) => (
        <div key={option.siteId} className="analysis-group">
          <p className="analysis-kicker">{option.rank !== null ? `#${option.rank} · ` : ''}{option.name}{option.role === 'reference' ? ' · REF' : ''} · {option.statusLabel}</p>
          <ul className="analysis-list">
            {option.lines.map((line) => (
              <li key={line.requirementId} data-status={line.status}>
                <b aria-hidden="true">{line.mark}</b> {line.text}
                <span className="analysis-muted"> — {line.reason}</span>
                {line.evidence.length > 0 && (
                  <span className="analysis-muted">
                    {' '}· {t('highlights.evidence')}{' '}
                    {line.evidence.map((item, index) => (
                      <span key={item.id}>
                        {index > 0 && ', '}
                        {'url' in item.link ? <a href={item.link.url} target="_blank" rel="noreferrer noopener">{item.id}</a> : <code>{item.id}</code>}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {model.omitted.length > 0 && (
        <ul className="analysis-list analysis-omitted" aria-label={ai ? t('highlights.omittedAiAria') : t('highlights.omittedAria')}>
          {model.omitted.map((option) => (
            <li key={option.siteId}>
              {option.rank !== null ? `#${option.rank} · ` : ''}{option.name}{option.role === 'reference' ? ' · REF' : ''} · {option.statusLabel}
              <span className="analysis-muted"> — {ai ? t('highlights.omittedAi') : t('highlights.omitted')}</span>
            </li>
          ))}
        </ul>
      )}
      {model.verifications.length > 0 && (
        <details className="analysis-details analysis-checks">
          <summary>{ai ? t('highlights.checksAi') : t('highlights.checks')} · {model.verifications.length}</summary>
          <ol className="analysis-list">{model.verifications.map((item) => <li key={item.id}>{item.text}</li>)}</ol>
        </details>
      )}
    </Layer>
  )
}

/**
 * "✦ Highlight reasons with AI": only with `outcome === 'evaluated'`, with the literal sending notice. With the
 * official geological context, the team's geological channel checkbox (M10) decides whether the same call
 * also requests the geological orientation; the notice changes accordingly (just one, conditional).
 */
function AiControls() {
  const explain = useMission((state) => state.planner?.explain ?? null)
  const outcome = useMission((state) => state.planner?.result?.outcome ?? null)
  const phase = useUi((state) => state.missionPhase)
  const geology = useComposer((state) => state.geology)
  const useGeology = useComposer((state) => state.useGeology)
  const optId = useId()
  const locale = useLocale()
  const t = useT(tReading)
  if (outcome !== 'evaluated' || !explain) return null
  const pending = explain.status === 'pending'
  const withGeology = geology.available && useGeology
  return (
    <div className="analysis-ai">
      <p className="analysis-muted">{withGeology ? t('ai.sendNoticeGeology') : t('ai.sendNotice')} {t('ai.onlyHighlights')}</p>
      {geology.available ? (
        <label className="analysis-geo-opt" htmlFor={optId}>
          <input id={optId} type="checkbox" checked={useGeology} disabled={pending} onChange={(event) => setUseGeology(event.target.checked)} />
          <span>{t('ai.geologyOption')}</span>
        </label>
      ) : (
        <p className="analysis-muted">{geologyUnavailableNotice(geology.unavailableReason, locale)}</p>
      )}
      {pending ? (
        <p className="analysis-writing">
          <OrbitLoader active={phase === 'analysis'} label={t('ai.highlighting')} placement="inline" />{' '}
          <button type="button" className="analysis-link" onClick={() => withController((mission) => mission.cancelExplain())}>{t('ai.cancel')}</button>
        </p>
      ) : (
        <button type="button" className="analysis-ai-button" onClick={() => withController((mission) => mission.runExplain())}>
          <span aria-hidden="true">{GLYPH.ai} </span>{explain.status === 'done' ? t('ai.highlightAgain') : t('ai.highlight')}
        </button>
      )}
      {withGeology && <p className="analysis-muted">{t('ai.geologyWhere')}</p>}
      <div aria-live="polite">
        {explain.status === 'unavailable' && <p className="analysis-notice">{t('ai.unavailableSuffix', { message: explain.message === null ? '' : displayMissionMessage(explain.message, locale) })}</p>}
        {explain.status === 'error' && (
          // The check runs on the canonical (English) message kept in the planner state, whatever the language shown.
          <p className="analysis-notice">{explain.message?.includes('does not belong to the current calculation') ? t('ai.stale') : t('ai.errorSuffix', { message: explain.message === null ? '' : displayMissionMessage(explain.message, locale) })}</p>
        )}
        {explain.status === 'error' && explain.geologyFailed && (
          <p className="analysis-notice">
            {t('ai.geologyRetryNotice')}{' '}
            <button type="button" className="analysis-link" onClick={() => withController((mission) => mission.runExplain(false))}>{t('ai.geologyRetry')}</button>
          </p>
        )}
      </div>
    </div>
  )
}

export default function ReadingView({ data, placement }: ReadingPanelProps) {
  const prefix = `analysis-${placement}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const mode = useUi((state) => state.mode)
  const selection = useUi((state) => state.selection)
  const evaluation = useMission((state) => state.evaluation)
  const stale = useMission((state) => state.stale)
  const explanation = useMission((state) => state.explanation)
  const revision = useMission((state) => state.revision)
  // Provenance saved alongside the view: remains visible if the Reading is dimmed after editing.
  const provenance = useMission((state) => state.explanationProvenance)
  const snapshot = data.snapshot
  const mission = mode === 'mision' && evaluation !== null && explanation !== null
  const locale = useLocale()
  const t = useT(tReading)

  const facts = useMemo(() => {
    if (!snapshot) return null
    const views = new Map<string, readonly MetricView[]>()
    for (const site of snapshot.candidates) {
      views.set(site.site_id, buildMetricViews({ site, sites: snapshot.candidates, profile: snapshot.profile, weights: null, contributions: null, marsReference: snapshot.marsReference }))
    }
    const sensitivity = snapshot.sensitivity ?? new Map()
    const rows = snapshot.candidates
      .filter((site) => site.role !== 'reference')
      .map((site) => ({ siteId: site.site_id, baseScore: site.similarity, result: sensitivity.get(site.site_id) ?? null }))
    const robustness = sensitivity.size > 0 ? summarizeRobustness(rows) : null
    const scope = mission ? evaluation.options.map((option) => option.site_id) : null
    return buildFactsLayer({ base: snapshot.profile, candidates: snapshot.candidates, views, robustness, onlySiteIds: scope, locale })
    // `locale`: the metric views and the facts are formatted in the interface language.
  }, [snapshot, mission, evaluation, locale])

  const model = useMemo(() => (mission ? explanationToReading(explanation, evaluation, revision, provenance, locale) : null), [mission, explanation, evaluation, revision, provenance, locale])

  if (!snapshot || !facts) {
    return <p className="analysis-pending-line" aria-busy="true">{t('view.waitingSnapshot')}</p>
  }
  const focusId = selection?.kind === 'evaluated' ? selection.siteId : null
  return (
    <section className="analysis" data-placement={placement} aria-labelledby={`${prefix}-title`} data-busy={mission && stale ? '' : undefined} aria-busy={mission && stale}>
      <header className="analysis-head">
        {/* tabIndex -1: focus target of "Go to the Reading" (M11). */}
        <h2 id={`${prefix}-title`} tabIndex={-1}>{model ? t('view.titleMission') : t('view.titleDeterministic')}</h2>
      </header>
      {model ? (
        <>
          {stale && <p className="analysis-notice">{t('view.stale')}</p>}
          <ResultLayer model={model.result} />
          <AiControls />
          <HighlightsLayer model={model.highlights} />
          <FactsSection facts={facts} focusId={focusId} label={t('view.factsMission')} />
        </>
      ) : (
        <>
          <p className="analysis-meta">
            {t('view.snapshotMeta', { snapshot: snapshot.manifest.snapshot_version, profile: snapshot.profile.version })}
            {snapshot.profile.status === 'needs_calibration' && <span className="analysis-muted">{t('view.uncalibrated')}</span>}
          </p>
          {mode === 'mision' && (
            <p className="analysis-notice">{t('view.noEvaluation')}</p>
          )}
          <FactsSection facts={facts} focusId={focusId} label={t('view.factsExplore')} />
        </>
      )}
      <footer className="analysis-foot">
        <p className="analysis-foot-note">
          {t('view.footer', { subject: model ? t('view.footerMission', { status: tMission.in(locale)('status.priorizado_para_reconocimiento') }) : t('view.footerExplore') })}
        </p>
      </footer>
    </section>
  )
}
