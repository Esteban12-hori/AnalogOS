/**
 * Lectura (chunk diferido, ADR-013, docs/INTEGRATION_PLAN.md §5). Tres capas SIEMPRE separadas:
 *
 *  1. Resultado — `MissionEvaluation` del equipo (regla de orden, grupos, motivos, qué cambiaría,
 *     pendientes, preguntas abiertas, límites y solicitud de datos). Rótulo «Cálculo determinista».
 *  2. Motivos destacados — `composeExplanation` del equipo: por defecto la plantilla determinista
 *     (sin ✦); tras «✦ Destacar motivos con IA», la selección de Anthropic ya validada por el
 *     reductor (huellas y `checkSelection`). La IA solo elige IDs: todo texto y toda cifra salen
 *     de la evaluación.
 *  3. Hechos del snapshot — capa de hechos deterministas (dirección frente a Jezero, limitante,
 *     satura, valor compartido, mejor de N sin la REF, robustez del pipeline).
 *
 * En Explorar no hay operación de IA (`explain` necesita una solicitud confirmada): solo hechos,
 * rotulados «Lectura determinista». Nunca hay llamadas automáticas a la IA.
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
  if (!fact) return <span className="analysis-pending">sin dato</span>
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
// Capa 3: hechos del snapshot
// ---------------------------------------------------------------------------------------------

function SiteFactsBlock({ site }: { site: SiteFacts }) {
  return (
    <>
      <p className="analysis-site-line">
        <span aria-hidden="true">{site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> <strong>{site.name}</strong>
        {site.rank && <> · <Fact fact={site.rank} /></>}
        {' · '}similitud v3 <Fact fact={site.similarity} />
        <span className="analysis-muted"> · confianza <Fact fact={site.confidence} /> · estabilidad <Fact fact={site.stability} /></span>
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
          <b>Limitante · {site.limiting.label}</b>
          <span className="analysis-muted">
            {' '}el criterio que más resta a la similitud v3 (contribución del pipeline)
            {site.limiting.sim && <> · similitud <Fact fact={site.limiting.sim} /></>}
          </span>
        </p>
      )}
      {site.saturates.length > 0 && (
        <p className="analysis-rule">
          <span aria-hidden="true">{GLYPH.rule}</span> Cumple la regla del perfil · no significa igual a Marte:{' '}
          {site.saturates.map((item, index) => <span key={item.criterionId}>{index > 0 && ', '}{item.label}</span>)}
        </p>
      )}
      {site.missing.length > 0 && (
        <p className="analysis-pending-line">Sin dato, fuera del score: {site.missing.map((item) => `${item.label} (${item.status})`).join(', ')}</p>
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
    <Layer title="Hechos del snapshot" label={label}>
      {all.length > 1 && (
        <div className="analysis-sites" role="group" aria-label="Lugar de los hechos">
          {all.map((site) => (
            <button key={site.siteId} type="button" aria-pressed={site.siteId === current?.siteId} onClick={() => setChosen(site.siteId)}>
              <span aria-hidden="true">{site.reference ? 'REF' : site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> {site.name}
            </button>
          ))}
        </div>
      )}
      {current ? <SiteFactsBlock site={current} /> : <p className="analysis-pending-line">No hay lugares evaluados en este snapshot.</p>}
      {(comparison.noDiscrimination.length > 0 || comparison.shared.length > 0) && (
        <details className="analysis-details">
          <summary>Qué no distingue entre candidatos</summary>
          <ul className="analysis-list">
            {comparison.noDiscrimination.map((item) => (
              <li key={`nd-${item.criterionId}`}>{item.label}: misma similitud mostrada en todos{item.sims[0] && <> (<Fact fact={item.sims[0]} />)</>}</li>
            ))}
            {comparison.shared.map((item) => (
              <li key={`sh-${item.criterionId}-${item.siteIds.join()}`}>
                {item.label}: mismo valor regional{item.raw && <> (<Fact fact={item.raw} />)</>} en {item.siteIds.map(names).join(' y ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      {comparison.bestOfN.length > 0 && (
        <details className="analysis-details">
          <summary>Mejor de {facts.sites.length} candidatos por criterio</summary>
          <ul className="analysis-list">
            {comparison.bestOfN.map((item) => <li key={`best-${item.criterionId}`}>{item.label}: {names(item.siteId)} <Fact fact={item.sim} /></li>)}
          </ul>
          <p className="analysis-muted">La referencia conocida (REF) no compite: queda fuera del ranking.</p>
        </details>
      )}
      <details className="analysis-details">
        <summary>¿Qué cambiaría el orden de los candidatos?</summary>
        <ul className="analysis-bars">
          {robustness.sites.map((site) => (
            <li key={site.siteId}>
              <span className="analysis-bar-label">{site.name}</span>
              <span className="analysis-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${site.stability === null ? 0 : Math.max(0, Math.min(1, site.stability / 100))})` }} />
              </span>
              <span className="analysis-bar-value">{site.text === null ? 'sin dato' : `estabilidad ${site.text}`}</span>
            </li>
          ))}
        </ul>
        {robustness.status === 'ready' ? (
          <ul className="analysis-list">
            <li>Con <Fact fact={robustness.perturbation} /> (<Fact fact={robustness.scenarios} />): <Fact fact={robustness.flips} />; <Fact fact={robustness.topFlips} />.</li>
            {robustness.mostSensitive && <li>Criterio más sensible: <Fact fact={robustness.mostSensitive} /></li>}
            {comparison.gaps[0] && <li>Brecha entre el primer y el segundo candidato: <Fact fact={comparison.gaps[0]} /></li>}
          </ul>
        ) : (
          <p className="analysis-pending-line">{robustness.reason}</p>
        )}
        <p className="analysis-muted">Escenarios del pipeline (analysis-summary.json): ±20 % por peso, sin recalcular en la web.</p>
      </details>
      {current && <Checks site={current} />}
    </Layer>
  )
}

function Checks({ site }: { site: SiteFacts }) {
  if (site.checks.length === 0) return null
  return (
    <details className="analysis-details analysis-checks">
      <summary>Qué verificar en terreno · {site.name}</summary>
      <ol className="analysis-list">{site.checks.map((check) => <li key={check.ref}>{check.text}</li>)}</ol>
    </details>
  )
}

// ---------------------------------------------------------------------------------------------
// Capas 1 y 2: resultado y motivos destacados (Misión)
// ---------------------------------------------------------------------------------------------

function ResultLayer({ model }: { model: ReadingModel['result'] }) {
  return (
    <Layer title="Resultado" label={model.label}>
      {model.dataRequest && <p className="analysis-notice">{model.dataRequest}</p>}
      {model.nonePrioritized && model.outcome === 'evaluated' && (
        <p className="analysis-notice">Ningún sector cumple todo lo imprescindible con evidencia suficiente. Es un resultado válido.</p>
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
                    <summary>Qué evidencia cambiaría la decisión · {option.whatWouldChange.length}</summary>
                    <ul className="analysis-list">{option.whatWouldChange.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <details className="analysis-details">
        <summary>Regla de orden</summary>
        <p className="analysis-muted">{model.orderingRule}</p>
      </details>
      {model.pending.length > 0 && <p className="analysis-pending-line">{model.pending.length} requisito(s) sin medición: se conservan como pendientes y nunca cuentan como cumplidos.</p>}
      {model.openQuestions.length > 0 && (
        <details className="analysis-details">
          <summary>Preguntas abiertas · {model.openQuestions.length}</summary>
          <ul className="analysis-list">{model.openQuestions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ul>
        </details>
      )}
      <details className="analysis-details">
        <summary>Límites</summary>
        <ul className="analysis-list">{model.limits.map((limit, index) => <li key={`${index}-${limit}`}>{limit}</li>)}</ul>
      </details>
    </Layer>
  )
}

function HighlightsLayer({ model }: { model: ReadingModel['highlights'] }) {
  const ai = model.source === 'anthropic'
  return (
    <Layer title="Motivos destacados" label={model.label} ai={ai}>
      {ai && model.provenance && <p className="analysis-meta">{model.provenance}</p>}
      <p className="analysis-muted">{model.notice}</p>
      {/* La nota sale de la evaluación (explanationToReading.emptyNote), no de lo que eligió la IA. */}
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
                    {' '}· evidencia:{' '}
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
        <ul className="analysis-list analysis-omitted" aria-label={ai ? 'Lugares sin motivos destacados por la IA' : 'Lugares sin motivos destacados'}>
          {model.omitted.map((option) => (
            <li key={option.siteId}>
              {option.rank !== null ? `#${option.rank} · ` : ''}{option.name}{option.role === 'reference' ? ' · REF' : ''} · {option.statusLabel}
              <span className="analysis-muted"> — sin motivos destacados{ai ? ' por la IA' : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {model.verifications.length > 0 && (
        <details className="analysis-details analysis-checks">
          <summary>Verificaciones {ai ? 'en el orden que sugiere la IA' : 'de campo'} · {model.verifications.length}</summary>
          <ol className="analysis-list">{model.verifications.map((item) => <li key={item.id}>{item.text}</li>)}</ol>
        </details>
      )}
    </Layer>
  )
}

/**
 * «✦ Destacar motivos con IA»: solo con `outcome === 'evaluated'`, con el aviso literal de envío. Con el
 * contexto geológico oficial, la casilla del canal geológico del equipo (M10) decide si la misma llamada
 * pide también la orientación geológica; el aviso cambia con ella (uno solo, condicional).
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
      <p className="analysis-muted">{withGeology ? AI_SEND_NOTICE_GEOLOGY : AI_SEND_NOTICE} La IA solo destaca motivos ya calculados: no cambia estados, valores ni exclusiones.</p>
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
          <OrbitLoader active={phase === 'analysis'} label="Destacando motivos…" placement="inline" />{' '}
          <button type="button" className="analysis-link" onClick={() => withController((mission) => mission.cancelExplain())}>Cancelar</button>
        </p>
      ) : (
        <button type="button" className="analysis-ai-button" onClick={() => withController((mission) => mission.runExplain())}>
          <span aria-hidden="true">{GLYPH.ai} </span>{explain.status === 'done' ? 'Pedir otra selección a la IA' : 'Destacar motivos con IA'}
        </button>
      )}
      {withGeology && <p className="analysis-muted">{GEOLOGY_WHERE}</p>}
      <div aria-live="polite">
        {explain.status === 'unavailable' && <p className="analysis-notice">{explain.message} La plantilla determinista sigue siendo la Lectura.</p>}
        {explain.status === 'error' && (
          <p className="analysis-notice">{explain.message?.includes('no corresponde') ? STALE_AI_MESSAGE : `${explain.message ?? ''} Se mantiene la plantilla determinista.`}</p>
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
  // Procedencia guardada junto a la vista: sigue visible si la Lectura queda atenuada tras editar.
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
    return <p className="analysis-pending-line" aria-busy="true">Esperando el snapshot validado…</p>
  }
  const focusId = selection?.kind === 'evaluated' ? selection.siteId : null
  return (
    <section className="analysis" data-placement={placement} aria-labelledby={`${prefix}-title`} data-busy={mission && stale ? '' : undefined} aria-busy={mission && stale}>
      <header className="analysis-head">
        <h2 id={`${prefix}-title`}>{model ? 'Lectura de tu misión' : 'Lectura determinista'}</h2>
      </header>
      {model ? (
        <>
          {stale && <p className="analysis-notice">Editó la prueba: esta Lectura corresponde a la evaluación anterior hasta que confirme y evalúe de nuevo.</p>}
          <ResultLayer model={model.result} />
          <AiControls />
          <HighlightsLayer model={model.highlights} />
          <FactsSection facts={facts} focusId={focusId} label="Hechos del snapshot · sitios evaluados · sin IA" />
        </>
      ) : (
        <>
          <p className="analysis-meta">
            Hechos del snapshot {snapshot.manifest.snapshot_version} · perfil base {snapshot.profile.version}
            {snapshot.profile.status === 'needs_calibration' && <span className="analysis-muted"> · sin calibrar (needs_calibration)</span>}
          </p>
          {mode === 'mision' && (
            <p className="analysis-notice">Sin evaluación: defina y confirme los requisitos en «Tu misión». La IA solo se usa si usted la pide, después de evaluar.</p>
          )}
          <FactsSection facts={facts} focusId={focusId} label="Lectura determinista · sin IA" />
        </>
      )}
      <footer className="analysis-foot">
        <p className="analysis-foot-note">
          Similitud, confianza y factibilidad van por separado. {model ? `«${MISSION_STATUS_LABEL.priorizado_para_reconocimiento}»` : 'Más similitud'} no significa aprobado: la factibilidad territorial está pendiente.
        </p>
      </footer>
    </section>
  )
}
