/**
 * Vista diferida de «Lectura de la comparativa» (docs/UX_REDESIGN.md §3.7 y §4.2): hechos
 * primero (deterministas, sin red) y, encima, el texto validado de la IA con fichas cuyas cifras
 * resuelve la UI. Similitud, confianza, estabilidad y factibilidad nunca se mezclan: cada una es
 * su propia ficha.
 */
import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { CriterionId } from '../../domain/contracts'
import { criterionLabels } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { isMissionBusy, uiActions, useUi, type MissionPhase } from '../../state/ui'
import { OrbitLoader } from '../boot'
import { ensureBaseReading, ensureMissionReading, retryMissionAnalysis } from './controller'
import { parseFactId } from './factIds'
import type { ReadingPanelProps } from './index'
import { LKTRON_ENABLED } from './lktron'
import { ReadingSkeleton } from './ReadingPanel'
import { useExpectedReadingKey, useReadingContext, useReadingSlot } from './readingStore'
import { TokenText } from './TokenText'
import type { AiLayer, FactRef, Reading, ReadingBlock, ResolvedSegment, SiteFacts } from './types'
import './analysis.css'

const STEP: Partial<Record<MissionPhase, { step: number; text: string }>> = {
  interpreting: { step: 1, text: 'Interpretando tu misión' },
  profile: { step: 2, text: 'Validando el perfil' },
  scoring: { step: 3, text: 'Esperando al motor' },
  analysis: { step: 4, text: 'Redactando la lectura' },
}

interface Names {
  site: (siteId: string | null) => string | null
  criterion: (criterionId: CriterionId | null) => string | null
}

const NamesContext = createContext<Names>({ site: () => null, criterion: (id) => (id ? (criterionLabels[id] ?? id) : null) })

/** Qué es cada ficha (para su cita en línea). */
export function factKindLabel(id: string): string {
  if (id.startsWith('mars:')) return 'valor de Jezero (MOLA)'
  if (id.startsWith('coverage:')) return 'cobertura del peso del perfil'
  if (id.startsWith('rank:gap:')) return 'brecha de similitud entre lugares consecutivos'
  if (id.startsWith('sens:')) return 'robustez del orden ante ±20 % por peso'
  const kind = id.split(':').pop() ?? ''
  const labels: Record<string, string> = {
    raw: 'valor del sector',
    sim: 'similitud del criterio',
    ratio: 'razón sector ÷ Jezero',
    vs_mars: 'dirección respecto de Jezero',
    similarity: 'similitud del lugar',
    confidence: 'confianza (separada de la similitud)',
    stability: 'estabilidad ante ±20 % por peso',
    feasibility: 'factibilidad (requiere revisión humana)',
    rank: 'posición en el orden del motor',
  }
  return labels[kind] ?? 'dato del motor'
}

/** Ficha con la cifra del motor: botón con cita en línea; enlaza el criterio con riel y líneas. */
function FactChip({ id, text }: { id: string; text: string }) {
  const names = useContext(NamesContext)
  const [open, setOpen] = useState(false)
  const citeId = useId()
  const { siteId, criterionId } = parseFactId(id)
  const preview = (value: CriterionId | null) => {
    if (criterionId) uiActions.setPreviewCriterion(value)
  }
  const detail = [factKindLabel(id), names.site(siteId), names.criterion(criterionId)].filter(Boolean).join(' · ')
  return (
    <>
      <button
        type="button"
        className="analysis-chip"
        data-fact={id}
        aria-expanded={open}
        aria-controls={citeId}
        onClick={() => {
          setOpen((value) => !value)
          if (criterionId) uiActions.setActiveCriterion(criterionId)
        }}
        onPointerEnter={() => preview(criterionId)}
        onPointerLeave={() => preview(null)}
        onFocus={() => preview(criterionId)}
        onBlur={() => preview(null)}
      >
        {text}
      </button>
      <span id={citeId} className="analysis-cite" role="note" hidden={!open}>
        Dato del motor: {detail}
      </span>
    </>
  )
}

function Fact({ fact }: { fact: FactRef | null | undefined }) {
  if (!fact) return <span className="analysis-pending">por calcular</span>
  return <FactChip id={fact.id} text={fact.text} />
}

function renderFact(segment: Extract<ResolvedSegment, { kind: 'fact' }>) {
  return <FactChip id={segment.id} text={segment.text} />
}

/** Un bloque validado de la IA, con su entrada escalonada (cola de 6 como máximo). */
function AiBlock({ block, children, as = 'p' }: { block: ReadingBlock; children?: ReactNode; as?: 'p' | 'li' | 'div' }) {
  const Tag = as
  const style = { '--i': Math.min(block.order, 6) } as CSSProperties
  return (
    <Tag className="analysis-block" data-type={block.type} style={style}>
      {children}
      <TokenText segments={block.segments} renderFact={renderFact} />
    </Tag>
  )
}

/** Fuente que de verdad se ve: un stream desactualizado o fallido sin bloques no es «IA». */
export function visibleSource(ai: AiLayer): AiLayer['source'] {
  if ((ai.status === 'stale' || ai.status === 'error') && ai.blocks.length === 0) return 'none'
  return ai.source
}

function sourceText(ai: AiLayer): string {
  const source = visibleSource(ai)
  if (source === 'lktron') return 'Interpretación de IA · interpreta, no puntúa'
  if (source === 'pregenerated') return 'Análisis pregenerado · no científico'
  // Hechos ya visibles; el texto (pregenerado) todavía se está buscando.
  if (ai.status === 'idle') return 'Hechos del motor · buscando la redacción…'
  return 'Solo hechos del motor · sin IA'
}

function footerText(ai: AiLayer): string {
  const source = visibleSource(ai)
  if (source === 'lktron') return 'Cifras: motor determinista · Redacción: IA (lktron), validada antes de mostrarse'
  if (source === 'pregenerated') return 'Cifras: motor determinista · Redacción: texto pregenerado, no científico'
  return 'Cifras: motor determinista · Sin redacción de IA'
}

export function discardSummary(ai: AiLayer): string | null {
  if (ai.discards.length === 0) return null
  const n = ai.discards.length
  const reasons = [...new Set(ai.discards.map((item) => item.message))].join('; ')
  return `${n} ${n === 1 ? 'frase descartada' : 'frases descartadas'}: ${reasons}`
}

function InfoTip() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <button type="button" className="analysis-info" aria-expanded={open} aria-controls={id} aria-label="Cómo se arma esta lectura" onClick={() => setOpen((value) => !value)}>
        ⓘ
      </button>
      <p id={id} className="analysis-infotext" hidden={!open}>
        La IA no calcula ni ordena: elige qué hechos importan y los redacta citando fichas. Cada cifra de
        una ficha la formateó el motor determinista y todo texto se valida antes de mostrarse; lo que no
        pasa se descarta. Similitud, confianza y factibilidad van siempre separadas.
      </p>
    </>
  )
}

type TabId = 'site' | 'compare'
const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'site', label: 'Este lugar' },
  { id: 'compare', label: 'Comparativa' },
]

function ReadingTabs({ prefix, active, onChange }: { prefix: string; active: TabId; onChange: (tab: TabId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active)
    const next =
      event.key === 'ArrowRight' ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length
          : event.key === 'Home' ? 0
            : event.key === 'End' ? TABS.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    const tab = TABS[next]
    if (!tab) return
    onChange(tab.id)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label="Vista de la lectura" className="analysis-tabs" onKeyDown={onKeyDown}>
      {TABS.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="button"
          role="tab"
          id={`${prefix}-tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`${prefix}-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SiteTab({ site, blocks }: { site: SiteFacts; blocks: readonly ReadingBlock[] }) {
  const summary = blocks.find((block) => block.type === 'summary' && block.siteId === site.siteId)
  const insights = blocks.filter((block) => block.type === 'insight' && block.siteId === site.siteId)
  const limitingInsights = insights.filter((block) => block.factKind === 'limiting_factor')
  const otherInsights = insights.filter((block) => block.factKind !== 'limiting_factor')
  const tests = blocks.filter((block) => block.type === 'test_suggestion' && block.siteId === site.siteId)
  const names = useContext(NamesContext)

  return (
    <>
      <p className="analysis-site-line">
        <span aria-hidden="true">{site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> <strong>{site.name}</strong>
        {site.rank && <> · <Fact fact={site.rank} /></>}
        {' · '}similitud <Fact fact={site.similarity} />
      </p>
      {summary && <AiBlock block={summary}><span className="analysis-ai-mark" aria-hidden="true">{GLYPH.ai} </span></AiBlock>}

      {site.directions.length > 0 && (
        <section className="analysis-section">
          <h3>Respecto de Jezero <span aria-hidden="true">{GLYPH.jezero}</span></h3>
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
        </section>
      )}

      {site.limiting && (
        <section className="analysis-limit">
          <h3>Limitante · {site.limiting.label}</h3>
          <p className="analysis-muted">
            El criterio que más resta a la similitud de este lugar (contribución del motor):{' '}
            {site.limiting.raw && <><span aria-hidden="true">{GLYPH.evaluated}</span> <Fact fact={site.limiting.raw} /> </>}
            {site.limiting.mars && <><span aria-hidden="true">{GLYPH.jezero}</span><span className="sr-only">Jezero</span> <Fact fact={site.limiting.mars} /> </>}
            {site.limiting.sim && <>· similitud <Fact fact={site.limiting.sim} /></>}
          </p>
          {limitingInsights.map((block) => <AiBlock key={block.key} block={block} />)}
        </section>
      )}

      {otherInsights.length > 0 && (
        <section className="analysis-section">
          <h3><span aria-hidden="true">{GLYPH.ai} </span>Hallazgos</h3>
          {otherInsights.map((block) => (
            <AiBlock key={block.key} block={block} as="div">
              <span className="analysis-kicker">{names.criterion(block.criterionId)}</span>
            </AiBlock>
          ))}
        </section>
      )}

      {site.saturates.length > 0 && (
        <p className="analysis-rule">
          <span aria-hidden="true">{GLYPH.rule}</span> Cumple la regla del perfil · no significa igual a Marte:{' '}
          {site.saturates.map((item, index) => <span key={item.criterionId}>{index > 0 && ', '}{item.label}</span>)}
        </p>
      )}

      {tests.length > 0 && (
        <section className="analysis-section">
          <h3><span aria-hidden="true">{GLYPH.ai} </span>Prueba sugerida (IA)</h3>
          {tests.map((block) => <AiBlock key={block.key} block={block} />)}
        </section>
      )}

      {site.missing.length > 0 && (
        <p className="analysis-pending-line">
          Por calcular, fuera del score: {site.missing.map((item) => `${item.label} (${item.status})`).join(', ')}
        </p>
      )}
    </>
  )
}

function CompareTab({ reading, blocks }: { reading: Reading; blocks: readonly ReadingBlock[] }) {
  const names = useContext(NamesContext)
  const { comparison, sites } = reading.facts
  const summary = blocks.find((block) => block.type === 'summary' && block.siteId === null)
  const tradeoffs = blocks.filter((block) => block.type === 'tradeoff')
  const analogNotes = blocks.filter((block) => block.type === 'analog_note')
  return (
    <>
      {summary && <AiBlock block={summary}><span className="analysis-ai-mark" aria-hidden="true">{GLYPH.ai} </span></AiBlock>}
      <section className="analysis-section">
        <h3>Orden del motor</h3>
        <ol className="analysis-list analysis-order">
          {sites.map((site) => (
            <li key={site.siteId}>
              <span aria-hidden="true">{site.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> {site.name}: <Fact fact={site.similarity} />
              <span className="analysis-muted"> · confianza <Fact fact={site.confidence} /> · factibilidad <Fact fact={site.feasibility} /></span>
            </li>
          ))}
        </ol>
        {comparison.gaps.length > 0 && (
          <p className="analysis-muted">
            Brechas entre lugares consecutivos:{' '}
            {comparison.gaps.map((gap, index) => <span key={gap.id}>{index > 0 && ' · '}<Fact fact={gap} /></span>)}
          </p>
        )}
      </section>

      {(comparison.noDiscrimination.length > 0 || comparison.shared.length > 0) && (
        <section className="analysis-section">
          <h3>Qué no distingue entre lugares</h3>
          <ul className="analysis-list">
            {comparison.noDiscrimination.map((item) => (
              <li key={`nd-${item.criterionId}`}>
                {item.label}: misma similitud mostrada en todos{item.sims[0] && <> (<Fact fact={item.sims[0]} />)</>}
              </li>
            ))}
            {comparison.shared.map((item) => (
              <li key={`sh-${item.criterionId}-${item.siteIds.join()}`}>
                {item.label}: mismo valor regional{item.raw && <> (<Fact fact={item.raw} />)</>} en {item.siteIds.map((id) => names.site(id) ?? id).join(' y ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparison.bestOfN.length > 0 && (
        <section className="analysis-section">
          <h3>Mejor de {sites.length} por criterio</h3>
          <ul className="analysis-list">
            {comparison.bestOfN.map((item) => (
              <li key={`best-${item.criterionId}`}>{item.label}: {names.site(item.siteId)} <Fact fact={item.sim} /></li>
            ))}
          </ul>
        </section>
      )}

      {tradeoffs.length > 0 && (
        <section className="analysis-section">
          <h3><span aria-hidden="true">{GLYPH.ai} </span>Compromisos entre lugares</h3>
          {tradeoffs.map((block) => <AiBlock key={block.key} block={block} />)}
        </section>
      )}

      {analogNotes.length > 0 && (
        <section className="analysis-section">
          <h3><span aria-hidden="true">{GLYPH.reference} </span>Otros análogos · por calcular</h3>
          {analogNotes.map((block) => <AiBlock key={block.key} block={block} />)}
        </section>
      )}
    </>
  )
}

function Robustness({ reading, blocks }: { reading: Reading; blocks: readonly ReadingBlock[] }) {
  const robustness = reading.facts.robustness
  const notes = blocks.filter((block) => block.type === 'robustness_note')
  return (
    <details className="analysis-details">
      <summary>¿Qué cambiaría el ranking?</summary>
      <ul className="analysis-bars">
        {robustness.sites.map((site) => (
          <li key={site.siteId}>
            <span className="analysis-bar-label">{site.name}</span>
            <span className="analysis-bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${site.stability === null ? 0 : Math.max(0, Math.min(1, site.stability / 100))})` }} />
            </span>
            <span className="analysis-bar-value">{site.text === null ? 'por calcular' : `estabilidad ${site.text}`}</span>
          </li>
        ))}
      </ul>
      {robustness.status === 'ready' ? (
        <ul className="analysis-list">
          <li>Con <Fact fact={robustness.perturbation} /> (<Fact fact={robustness.scenarios} />): <Fact fact={robustness.flips} />; <Fact fact={robustness.topFlips} />.</li>
          {robustness.mostSensitive && <li>Criterio más sensible: <Fact fact={robustness.mostSensitive} /></li>}
          {reading.facts.comparison.gaps[0] && <li>Brecha entre el primer y el segundo lugar: <Fact fact={reading.facts.comparison.gaps[0]} /></li>}
        </ul>
      ) : (
        <p className="analysis-pending-line">{robustness.reason}</p>
      )}
      {notes.map((block) => <AiBlock key={block.key} block={block}><span className="analysis-ai-mark" aria-hidden="true">{GLYPH.ai} </span></AiBlock>)}
    </details>
  )
}

function Uncertainty({ reading, site, blocks, onResolve }: { reading: Reading; site: SiteFacts; blocks: readonly ReadingBlock[]; onResolve: (checkRef: string) => void }) {
  const notes = blocks.filter((block) => block.type === 'uncertainty' && (block.siteId === null || block.siteId === site.siteId))
  return (
    <details className="analysis-details">
      <summary>Incertidumbre y faltantes</summary>
      <ul className="analysis-list">
        <li>Cobertura de {site.name}: <Fact fact={site.coverage} /></li>
        {site.missing.map((item) => <li key={item.criterionId}>{item.label}: {item.status} · fuera del score</li>)}
        {reading.facts.unsupported.length > 0 && (
          <li>
            No medimos esto (lo pediste, sin datos aún):{' '}
            {reading.facts.unsupported.map((item) => `«${item.phrase}»`).join(', ')}
          </li>
        )}
      </ul>
      {notes.map((block) => (
        <div key={block.key} className="analysis-uncertain">
          <AiBlock block={block}><span className="analysis-ai-mark" aria-hidden="true">{GLYPH.ai} </span></AiBlock>
          {block.checkRef && (
            <button type="button" className="analysis-link" onClick={() => onResolve(block.checkRef as string)}>
              Resolver en terreno →
            </button>
          )}
        </div>
      ))}
    </details>
  )
}

function Checklist({ site, blocks, open, onToggle, highlight }: { site: SiteFacts; blocks: readonly ReadingBlock[]; open: boolean; onToggle: (open: boolean) => void; highlight: string | null }) {
  const priorities = blocks.filter((block) => block.type === 'field_priority' && block.siteId === site.siteId)
  const order = [...priorities.map((block) => block.checkRef), ...site.checks.map((check) => check.ref)]
  const seen = new Set<string>()
  const items = order.flatMap((ref) => {
    if (!ref || seen.has(ref)) return []
    seen.add(ref)
    const check = site.checks.find((item) => item.ref === ref)
    return check ? [{ check, why: priorities.find((block) => block.checkRef === ref) ?? null }] : []
  })
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    if (!open || !highlight) return
    listRef.current?.querySelector<HTMLElement>(`[data-check="${highlight}"]`)?.focus()
  }, [open, highlight])
  return (
    <details className="analysis-details" open={open} onToggle={(event) => onToggle((event.currentTarget as HTMLDetailsElement).open)}>
      <summary>Checklist de terreno · {site.name}</summary>
      {items.length === 0 ? (
        <p className="analysis-pending-line">El snapshot no trae verificaciones de terreno para este lugar.</p>
      ) : (
        <ol ref={listRef} className="analysis-list analysis-checks">
          {items.map(({ check, why }) => (
            <li key={check.ref} data-check={check.ref} tabIndex={-1} data-highlight={highlight === check.ref ? '' : undefined}>
              {check.text}
              {why && <AiBlock block={why} as="div"><span className="analysis-ai-mark" aria-hidden="true">{GLYPH.ai} Por qué primero: </span></AiBlock>}
            </li>
          ))}
        </ol>
      )}
      {priorities.length > 0 && <p className="analysis-foot-note">Orden sugerido por la IA; los ítems salen del snapshot.</p>}
    </details>
  )
}

function Notices({ reading, stale, busy, context }: { reading: Reading; stale: boolean; busy: boolean; context: Reading['context'] }) {
  const ai = reading.ai
  const discards = discardSummary(ai)
  return (
    <>
      {stale && (
        <p className="analysis-notice is-stale">
          <strong>Desactualizado</strong> · esta lectura corresponde a una misión anterior.
          {!busy && <> <button type="button" className="analysis-link" onClick={() => ensureMissionReading()}>Actualizar lectura</button></>}
        </p>
      )}
      {ai.status === 'stale' && <p className="analysis-notice is-stale"><strong>Desactualizado</strong> · {ai.message}</p>}
      {ai.status === 'error' && (
        <p className="analysis-notice is-error">
          <span aria-hidden="true">{GLYPH.fail}</span> {ai.message}
          {LKTRON_ENABLED && context === 'mission' && !busy && <> <button type="button" className="analysis-link" onClick={() => retryMissionAnalysis()}>↻ Reintentar</button></>}
        </p>
      )}
      {ai.status === 'facts_only' && ai.message && <p className="analysis-notice">{ai.message}</p>}
      {ai.status === 'done' && ai.message && <p className="analysis-notice">{ai.message}</p>}
      {discards && <p className="analysis-notice is-discard">{discards}</p>}
    </>
  )
}

function ReadingBody({ reading, placement, busy, stale, phase, selectedSiteId }: {
  reading: Reading
  placement: ReadingPanelProps['placement']
  busy: boolean
  stale: boolean
  phase: MissionPhase
  selectedSiteId: string | null
}) {
  const prefix = `analysis-${placement}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [tab, setTab] = useState<TabId>('site')
  const [chosen, setChosen] = useState<string | null>(null)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [highlight, setHighlight] = useState<string | null>(null)
  useEffect(() => setChosen(null), [selectedSiteId])

  const sites = reading.facts.sites
  const has = (id: string | null): id is string => id !== null && sites.some((site) => site.siteId === id)
  const focusId = has(chosen) ? chosen : has(selectedSiteId) ? selectedSiteId : (sites[0]?.siteId ?? null)
  const site = sites.find((item) => item.siteId === focusId) ?? null
  const ai = reading.ai
  const blocks = ai.status === 'stale' ? [] : ai.blocks
  const writing = reading.context === 'mission' && phase === 'analysis' && ai.source === 'lktron' && (ai.status === 'waiting' || ai.status === 'streaming')
  const doneLive = ai.source === 'lktron' && ai.status === 'done'

  const names: Names = {
    site: (id) => sites.find((item) => item.siteId === id)?.name ?? null,
    criterion: (id) => {
      if (!id) return null
      for (const item of sites) {
        const found = item.directions.find((d) => d.criterionId === id) ?? item.saturates.find((d) => d.criterionId === id) ?? (item.limiting?.criterionId === id ? item.limiting : null)
        if (found) return found.label
      }
      return criterionLabels[id] ?? id
    },
  }

  return (
    <NamesContext.Provider value={names}>
      <section className="analysis" data-placement={placement} aria-labelledby={`${prefix}-title`} aria-busy={busy || writing} data-busy={busy ? '' : undefined}>
        <header className="analysis-head">
          <h2 id={`${prefix}-title`}>Lectura de la comparativa</h2>
          <InfoTip />
        </header>
        <p className={`analysis-source is-${visibleSource(ai)}`}>
          {visibleSource(ai) !== 'none' && <span className="analysis-star" data-pulse={doneLive ? '' : undefined} aria-hidden="true">{GLYPH.ai}</span>}
          {sourceText(ai)}
        </p>
        <p className="analysis-meta">
          {reading.profile.label}
          {reading.profile.status === 'needs_calibration' && <span className="analysis-muted"> · sin calibrar (needs_calibration)</span>}
          {site?.coverage && <> · cobertura <Fact fact={site.coverage} /></>}
        </p>

        {writing && (
          <p className="analysis-writing">
            <OrbitLoader active label={`${GLYPH.ai} ${STEP.analysis?.text ?? ''}${ai.stage === 'selecting_facts' ? ' · eligiendo hechos' : ''} · paso 4 de 4`} placement="inline" />
          </p>
        )}
        <Notices reading={reading} stale={stale} busy={busy} context={reading.context} />

        {sites.length === 0 || !site ? (
          <p className="analysis-pending-line">No hay lugares evaluados en este snapshot: no hay nada que comparar.</p>
        ) : (
          <>
            {sites.length > 1 && (
              <div className="analysis-sites" role="group" aria-label="Lugar de la lectura">
                {sites.map((item) => (
                  <button key={item.siteId} type="button" aria-pressed={item.siteId === site.siteId} onClick={() => setChosen(item.siteId)}>
                    <span aria-hidden="true">{item.insufficient ? GLYPH.insufficient : GLYPH.evaluated}</span> {item.name}
                  </button>
                ))}
              </div>
            )}
            <ReadingTabs prefix={prefix} active={tab} onChange={setTab} />
            <div className="analysis-panel" role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0}>
              {tab === 'site' ? <SiteTab site={site} blocks={blocks} /> : <CompareTab reading={reading} blocks={blocks} />}
            </div>
            <Robustness reading={reading} blocks={blocks} />
            <Uncertainty
              reading={reading}
              site={site}
              blocks={blocks}
              onResolve={(checkRef) => {
                const target = sites.find((item) => checkRef.startsWith(`check:${item.siteId}:`))
                if (target) setChosen(target.siteId)
                setHighlight(checkRef)
                setChecklistOpen(true)
              }}
            />
            <Checklist site={site} blocks={blocks} open={checklistOpen} onToggle={setChecklistOpen} highlight={highlight} />
          </>
        )}

        <footer className="analysis-foot">
          <span>{footerText(ai)}</span>
          <span className="analysis-hash" title="Huella FNV-1a 64 del paquete de evidencia">{reading.packet.packet_hash}</span>
        </footer>
      </section>
    </NamesContext.Provider>
  )
}

function Waiting({ placement, phase }: { placement: ReadingPanelProps['placement']; phase: MissionPhase }) {
  const step = STEP[phase]
  return (
    <section className="analysis" data-placement={placement} aria-busy="true" aria-label="Lectura de la comparativa">
      <header className="analysis-head"><h2>Lectura de la comparativa</h2></header>
      <p className="analysis-wait">
        {step ? `${step.text} (paso ${step.step} de 4).` : 'Esperando al motor.'} Los hechos aparecen con el motor; la IA redacta en el paso 4.
      </p>
      <span className="analysis-skeleton-bar" aria-hidden="true" />
      <span className="analysis-skeleton-bar is-short" aria-hidden="true" />
    </section>
  )
}

export default function ReadingView({ data, placement }: ReadingPanelProps) {
  const context = useReadingContext()
  const slot = useReadingSlot(context)
  const expectedKey = useExpectedReadingKey(context)
  const mode = useUi((state) => state.mode)
  const phase = useUi((state) => state.missionPhase)
  const selection = useUi((state) => state.selection)
  const hasMission = useMission((state) => state.scoring !== null)
  const ready = data.status === 'ready'
  const busyPhase = isMissionBusy(phase)
  const waiting = mode === 'mision' && busyPhase && phase !== 'analysis'

  useEffect(() => {
    if (!ready) return
    if (context === 'base' && !(mode === 'mision' && busyPhase)) void ensureBaseReading()
    if (context === 'mission' && !busyPhase) ensureMissionReading()
  }, [ready, context, expectedKey, mode, busyPhase])

  if (data.status === 'loading') return <ReadingSkeleton placement={placement} label="Cargando snapshot validado…" />
  if (data.status === 'error') {
    return (
      <section className="analysis" data-placement={placement} aria-label="Lectura de la comparativa">
        <header className="analysis-head"><h2>Lectura de la comparativa</h2></header>
        <p className="analysis-notice is-error"><span aria-hidden="true">{GLYPH.fail}</span> Sin snapshot validado: la lectura necesita los datos del motor.</p>
      </section>
    )
  }

  const reading = slot.reading
  if (waiting && (context === 'base' || !reading)) return <Waiting placement={placement} phase={phase} />
  if (!reading) {
    if (slot.status === 'error') {
      return (
        <section className="analysis" data-placement={placement} aria-label="Lectura de la comparativa">
          <header className="analysis-head"><h2>Lectura de la comparativa</h2></header>
          <p className="analysis-notice is-error">
            <span aria-hidden="true">{GLYPH.fail}</span> {slot.error}{' '}
            <button type="button" className="analysis-link" onClick={() => (context === 'base' ? void ensureBaseReading() : ensureMissionReading())}>Reintentar</button>
          </p>
        </section>
      )
    }
    return <ReadingSkeleton placement={placement} label={hasMission ? 'Armando la lectura de tu misión…' : 'Armando la capa de hechos…'} />
  }

  return (
    <ReadingBody
      reading={reading}
      placement={placement}
      busy={waiting || slot.status === 'building'}
      stale={reading.key !== expectedKey}
      phase={phase}
      selectedSiteId={selection?.kind === 'evaluated' ? selection.siteId : null}
    />
  )
}
