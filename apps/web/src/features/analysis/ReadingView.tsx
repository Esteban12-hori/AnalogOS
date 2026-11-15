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
import { MISSION_STATUS_LABEL } from '../../domain/missionView'
import { GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { uiActions, useUi } from '../../state/ui'
import { OrbitLoader } from '../boot'
import { setUseGeology, useComposer } from '../composer/composerStore'
import { withController } from '../composer/runLoader'
import { buildMetricViews } from '../metrics/buildMetricViews'
import type { MetricView } from '../metrics'
import {
  AI_SEND_NOTICE,
  AI_SEND_NOTICE_GEOLOGY,
  explanationToReading,
  GEOLOGY_OPT_LABEL,
  GEOLOGY_RETRY_LABEL,
  GEOLOGY_RETRY_NOTICE,
  GEOLOGY_WHERE,
  geologyUnavailableNotice,
  STALE_AI_MESSAGE,
  type ReadingModel,
} from './explanationToReading'
import { buildFactsLayer } from './facts'
import type { ReadingPanelProps } from './index'
import { summarizeRobustness } from './robustness'
import type { FactRef, FactsLayer, SiteFacts } from './types'
import './analysis.css'

function Fact({ fact }: { fact: FactRef | null | undefined }) {
  if (!fact) return <span className="analysis-pending">no data</span>
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
  return (
    <>
      <p className="analysis-site-line">
        <span aria-hidden="true">{site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> <strong>{site.name}</strong>
        {site.rank && <> · <Fact fact={site.rank} /></>}
        {' · '}v3 similarity <Fact fact={site.similarity} />
        <span className="analysis-muted"> · confidence <Fact fact={site.confidence} /> · stability <Fact fact={site.stability} /></span>
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
          <b>Limiting factor · {site.limiting.label}</b>
          <span className="analysis-muted">
            {' '}the criterion that takes the most away from v3 similarity (pipeline contribution)
            {site.limiting.sim && <> · similarity <Fact fact={site.limiting.sim} /></>}
          </span>
        </p>
      )}
      {site.saturates.length > 0 && (
        <p className="analysis-rule">
          <span aria-hidden="true">{GLYPH.rule}</span> Meets the profile rule · does not mean equal to Mars:{' '}
          {site.saturates.map((item, index) => <span key={item.criterionId}>{index > 0 && ', '}{item.label}</span>)}
        </p>
      )}
      {site.missing.length > 0 && (
        <p className="analysis-pending-line">No data, outside the score: {site.missing.map((item) => `${item.label} (${item.status})`).join(', ')}</p>
      )}
    </>
  )
}

function FactsSection({ facts, focusId, label }: { facts: FactsLayer; focusId: string | null; label: string }) {
  const all = [...facts.sites, ...facts.references]
  const [chosen, setChosen] = useState<string | null>(null)
  useEffect(() => setChosen(null), [focusId])
  const current = all.find((site) => site.siteId === (chosen ?? focusId)) ?? all[0] ?? null
  const names = (id: string) => all.find((site) => site.siteId === id)?.name ?? id
  const { comparison, robustness } = facts
  return (
    <Layer title="Snapshot facts" label={label}>
      {all.length > 1 && (
        <div className="analysis-sites" role="group" aria-label="Place for the facts">
          {all.map((site) => (
            <button key={site.siteId} type="button" aria-pressed={site.siteId === current?.siteId} onClick={() => setChosen(site.siteId)}>
              <span aria-hidden="true">{site.reference ? 'REF' : site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> {site.name}
            </button>
          ))}
        </div>
      )}
      {current ? <SiteFactsBlock site={current} /> : <p className="analysis-pending-line">There are no evaluated places in this snapshot.</p>}
      {(comparison.noDiscrimination.length > 0 || comparison.shared.length > 0) && (
        <details className="analysis-details">
          <summary>What does not distinguish between candidates</summary>
          <ul className="analysis-list">
            {comparison.noDiscrimination.map((item) => (
              <li key={`nd-${item.criterionId}`}>{item.label}: same similarity shown for all{item.sims[0] && <> (<Fact fact={item.sims[0]} />)</>}</li>
            ))}
            {comparison.shared.map((item) => (
              <li key={`sh-${item.criterionId}-${item.siteIds.join()}`}>
                {item.label}: same regional value{item.raw && <> (<Fact fact={item.raw} />)</>} in {item.siteIds.map(names).join(' and ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      {comparison.bestOfN.length > 0 && (
        <details className="analysis-details">
          <summary>Best of {facts.sites.length} candidates by criterion</summary>
          <ul className="analysis-list">
            {comparison.bestOfN.map((item) => <li key={`best-${item.criterionId}`}>{item.label}: {names(item.siteId)} <Fact fact={item.sim} /></li>)}
          </ul>
          <p className="analysis-muted">The known reference (REF) does not compete: it stays out of the ranking.</p>
        </details>
      )}
      <details className="analysis-details">
        <summary>What would change the order of the candidates?</summary>
        <ul className="analysis-bars">
          {robustness.sites.map((site) => (
            <li key={site.siteId}>
              <span className="analysis-bar-label">{site.name}</span>
              <span className="analysis-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${site.stability === null ? 0 : Math.max(0, Math.min(1, site.stability / 100))})` }} />
              </span>
              <span className="analysis-bar-value">{site.text === null ? 'no data' : `stability ${site.text}`}</span>
            </li>
          ))}
        </ul>
        {robustness.status === 'ready' ? (
          <ul className="analysis-list">
            <li>With <Fact fact={robustness.perturbation} /> (<Fact fact={robustness.scenarios} />): <Fact fact={robustness.flips} />; <Fact fact={robustness.topFlips} />.</li>
            {robustness.mostSensitive && <li>Most sensitive criterion: <Fact fact={robustness.mostSensitive} /></li>}
            {comparison.gaps[0] && <li>Gap between the first and second candidate: <Fact fact={comparison.gaps[0]} /></li>}
          </ul>
        ) : (
          <p className="analysis-pending-line">{robustness.reason}</p>
        )}
        <p className="analysis-muted">Pipeline scenarios (analysis-summary.json): ±20% per weight, not recalculated in the web app.</p>
      </details>
      {current && <Checks site={current} />}
    </Layer>
  )
}

function Checks({ site }: { site: SiteFacts }) {
  if (site.checks.length === 0) return null
  return (
    <details className="analysis-details analysis-checks">
      <summary>What to check in the field · {site.name}</summary>
      <ol className="analysis-list">{site.checks.map((check) => <li key={check.ref}>{check.text}</li>)}</ol>
    </details>
  )
}

// ---------------------------------------------------------------------------------------------
// Layers 1 and 2: result and highlighted reasons (Mission)
// ---------------------------------------------------------------------------------------------

function ResultLayer({ model }: { model: ReadingModel['result'] }) {
  return (
    <Layer title="Result" label={model.label}>
      {model.dataRequest && <p className="analysis-notice">{model.dataRequest}</p>}
      {model.nonePrioritized && model.outcome === 'evaluated' && (
        <p className="analysis-notice">No sector meets every must-have with sufficient evidence. This is a valid result.</p>
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
                    <summary>What evidence would change the decision · {option.whatWouldChange.length}</summary>
                    <ul className="analysis-list">{option.whatWouldChange.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <details className="analysis-details">
        <summary>Ordering rule</summary>
        <p className="analysis-muted">{model.orderingRule}</p>
      </details>
      {model.pending.length > 0 && <p className="analysis-pending-line">{model.pending.length} unmeasured requirement(s): they are kept as pending and never count as met.</p>}
      {model.openQuestions.length > 0 && (
        <details className="analysis-details">
          <summary>Open questions · {model.openQuestions.length}</summary>
          <ul className="analysis-list">{model.openQuestions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ul>
        </details>
      )}
      <details className="analysis-details">
        <summary>Limits</summary>
        <ul className="analysis-list">{model.limits.map((limit, index) => <li key={`${index}-${limit}`}>{limit}</li>)}</ul>
      </details>
    </Layer>
  )
}

function HighlightsLayer({ model }: { model: ReadingModel['highlights'] }) {
  const ai = model.source === 'anthropic'
  return (
    <Layer title="Highlighted reasons" label={model.label} ai={ai}>
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
                    {' '}· evidence:{' '}
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
        <ul className="analysis-list analysis-omitted" aria-label={ai ? 'Places without reasons highlighted by the AI' : 'Places without highlighted reasons'}>
          {model.omitted.map((option) => (
            <li key={option.siteId}>
              {option.rank !== null ? `#${option.rank} · ` : ''}{option.name}{option.role === 'reference' ? ' · REF' : ''} · {option.statusLabel}
              <span className="analysis-muted"> — no highlighted reasons{ai ? ' from the AI' : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {model.verifications.length > 0 && (
        <details className="analysis-details analysis-checks">
          <summary>{ai ? 'Checks in the order the AI suggests' : 'Field checks'} · {model.verifications.length}</summary>
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
  if (outcome !== 'evaluated' || !explain) return null
  const pending = explain.status === 'pending'
  const withGeology = geology.available && useGeology
  return (
    <div className="analysis-ai">
      <p className="analysis-muted">{withGeology ? AI_SEND_NOTICE_GEOLOGY : AI_SEND_NOTICE} The AI only highlights reasons already calculated: it does not change statuses, values or exclusions.</p>
      {geology.available ? (
        <label className="analysis-geo-opt" htmlFor={optId}>
          <input id={optId} type="checkbox" checked={useGeology} disabled={pending} onChange={(event) => setUseGeology(event.target.checked)} />
          <span>{GEOLOGY_OPT_LABEL}</span>
        </label>
      ) : (
        <p className="analysis-muted">{geologyUnavailableNotice(geology.unavailableReason)}</p>
      )}
      {pending ? (
        <p className="analysis-writing">
          <OrbitLoader active={phase === 'analysis'} label="Highlighting reasons…" placement="inline" />{' '}
          <button type="button" className="analysis-link" onClick={() => withController((mission) => mission.cancelExplain())}>Cancel</button>
        </p>
      ) : (
        <button type="button" className="analysis-ai-button" onClick={() => withController((mission) => mission.runExplain())}>
          <span aria-hidden="true">{GLYPH.ai} </span>{explain.status === 'done' ? 'Ask the AI for another selection' : 'Highlight reasons with AI'}
        </button>
      )}
      {withGeology && <p className="analysis-muted">{GEOLOGY_WHERE}</p>}
      <div aria-live="polite">
        {explain.status === 'unavailable' && <p className="analysis-notice">{explain.message} The deterministic template is still the Reading.</p>}
        {explain.status === 'error' && (
          <p className="analysis-notice">{explain.message?.includes('does not belong to the current calculation') ? STALE_AI_MESSAGE : `${explain.message ?? ''} The deterministic template is kept.`}</p>
        )}
        {explain.status === 'error' && explain.geologyFailed && (
          <p className="analysis-notice">
            {GEOLOGY_RETRY_NOTICE}{' '}
            <button type="button" className="analysis-link" onClick={() => withController((mission) => mission.runExplain(false))}>{GEOLOGY_RETRY_LABEL}</button>
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
    return buildFactsLayer({ base: snapshot.profile, candidates: snapshot.candidates, views, robustness, onlySiteIds: scope })
  }, [snapshot, mission, evaluation])

  const model = useMemo(() => (mission ? explanationToReading(explanation, evaluation, revision, provenance) : null), [mission, explanation, evaluation, revision, provenance])

  if (!snapshot || !facts) {
    return <p className="analysis-pending-line" aria-busy="true">Waiting for the validated snapshot…</p>
  }
  const focusId = selection?.kind === 'evaluated' ? selection.siteId : null
  return (
    <section className="analysis" data-placement={placement} aria-labelledby={`${prefix}-title`} data-busy={mission && stale ? '' : undefined} aria-busy={mission && stale}>
      <header className="analysis-head">
        {/* tabIndex -1: focus target of "Go to the Reading" (M11). */}
        <h2 id={`${prefix}-title`} tabIndex={-1}>{model ? 'Reading of your mission' : 'Deterministic reading'}</h2>
      </header>
      {model ? (
        <>
          {stale && <p className="analysis-notice">You edited the test: this Reading belongs to the previous evaluation until you confirm and evaluate again.</p>}
          <ResultLayer model={model.result} />
          <AiControls />
          <HighlightsLayer model={model.highlights} />
          <FactsSection facts={facts} focusId={focusId} label="Snapshot facts · evaluated sites · no AI" />
        </>
      ) : (
        <>
          <p className="analysis-meta">
            Snapshot facts {snapshot.manifest.snapshot_version} · base profile {snapshot.profile.version}
            {snapshot.profile.status === 'needs_calibration' && <span className="analysis-muted"> · not calibrated (needs_calibration)</span>}
          </p>
          {mode === 'mision' && (
            <p className="analysis-notice">No evaluation yet: define and confirm the requirements in “Your mission”. The AI is only used if you ask for it, after evaluating.</p>
          )}
          <FactsSection facts={facts} focusId={focusId} label="Deterministic reading · no AI" />
        </>
      )}
      <footer className="analysis-foot">
        <p className="analysis-foot-note">
          Similarity, confidence and feasibility are kept separate. {model ? `“${MISSION_STATUS_LABEL.priorizado_para_reconocimiento}”` : 'More similarity'} does not mean approved: territorial feasibility is pending.
        </p>
      </footer>
    </section>
  )
}
