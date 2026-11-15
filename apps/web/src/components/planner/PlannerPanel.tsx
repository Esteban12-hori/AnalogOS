import { useEffect, useMemo, useRef, useState } from 'react'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import { shortCandidateName } from '../../domain/formatting'
import { MAX_BRIEF_CHARS, exampleState, type EvidenceBundle, type JourneyId } from '../../mission'
import { ConfirmSummary } from './ConfirmSummary'
import { RequirementEditor } from './RequirementEditor'
import { ResultView } from './ResultView'
import { ScopePicker } from './ScopePicker'
import { usePlanner } from './usePlanner'
import './planner.css'

export interface PlannerIntent {
  journey: JourneyId
  siteId?: string
  nonce: number
}

type StepId = 'describe' | 'scope' | 'confirm' | 'result'
const STEP_LABEL: Record<StepId, string> = { describe: 'Describir la prueba', scope: 'Elegir el sector', confirm: 'Confirmar y evaluar', result: 'Resultado' }
const ORDER: Record<JourneyId, StepId[]> = {
  test: ['describe', 'scope', 'confirm', 'result'],
  sector: ['scope', 'describe', 'confirm', 'result'],
}

export function PlannerPanel({ snapshot, intent }: { snapshot: DemoSnapshot; intent: PlannerIntent | null }) {
  const bundle = useMemo<EvidenceBundle>(() => ({ candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile }), [snapshot])
  const { state, dispatch, built, evaluate, evaluationError, runDraft, runExplain, exportJson, exportError } = usePlanner(bundle)
  const [step, setStep] = useState<StepId>('describe')
  const [announce, setAnnounce] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const journey = state.journey
  const steps = journey ? ORDER[journey] : []

  useEffect(() => {
    if (!intent) return
    dispatch({ type: 'set_journey', journey: intent.journey, siteId: intent.siteId })
    setStep(intent.journey === 'sector' && !intent.siteId ? 'scope' : 'describe')
  }, [intent, dispatch])

  // El resultado solo existe mientras la solicitud confirmada siga vigente.
  useEffect(() => {
    if (state.result) setStep('result')
    else if (step === 'result') setStep('confirm')
  }, [state.result]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!journey) return
    const idx = steps.indexOf(step)
    setAnnounce(`Paso ${idx + 1} de ${steps.length}: ${STEP_LABEL[step]}`)
    if (step === 'result') document.getElementById('pl-result-title')?.focus()
    else headingRef.current?.focus()
  }, [step, journey]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = state.scope
  const scopeSummary = (() => {
    if (current.mode === 'catalog') return 'Comparar las siete áreas'
    if (current.mode === 'sector') {
      const c = snapshot.candidates.find((x) => x.site_id === current.siteId)
      return c ? `Sector: ${shortCandidateName(c.name)}` : 'Sector sin elegir'
    }
    if (current.mode === 'point') return `Punto: ${current.lon || '…'}, ${current.lat || '…'}`
    return `Rectángulo: ${[current.west, current.south, current.east, current.north].map((v) => v || '…').join(', ')}`
  })()

  const idx = journey ? steps.indexOf(step) : -1
  const go = (delta: number) => setStep(steps[Math.min(Math.max(idx + delta, 0), steps.length - 2)])
  const moonHint = state.target.kind === 'rover' && /\b(luna|lunar|moon)\b/i.test(state.brief)
  const critUnmeasured = state.requirements.filter((r) => r.kind === 'unmeasured' && r.importance === 'critical').length
  const pointReqs = state.requirements.filter((r) => r.kind === 'measurable' && r.scale === 'point').length
  const aiReqs = state.requirements.filter((r) => r.origin === 'ai').length
  const d = state.draft

  return (
    <section id="planner" className="planner glass" aria-labelledby="planner-title">
      <header className="pl-head">
        <span className="section-kicker">Planificador de pruebas</span>
        <h2 id="planner-title">¿Qué sector merece reconocimiento para su ensayo?</h2>
        <p>Describa su prueba o elija un sector. El resultado dice qué área priorizar, qué la descarta y qué falta medir, con datos reales del snapshot y sin aprobar nada.</p>
      </header>

      <div className="pl-entry" role="group" aria-label="Elegir recorrido">
        <button type="button" className={`pl-card${journey === 'test' ? ' on' : ''}`} aria-pressed={journey === 'test'} onClick={() => { dispatch({ type: 'set_journey', journey: 'test' }); setStep('describe') }}>
          <strong>Definir una prueba</strong>
          <span>Cuénteme qué quiere ensayar y le muestro qué áreas cumplen y cuáles no.</span>
        </button>
        <button type="button" className={`pl-card${journey === 'sector' ? ' on' : ''}`} aria-pressed={journey === 'sector'} onClick={() => { dispatch({ type: 'set_journey', journey: 'sector' }); setStep('scope') }}>
          <strong>Evaluar un sector</strong>
          <span>Elija una de las siete áreas con evidencia, un punto o un rectángulo.</span>
        </button>
      </div>

      {!journey && (
        <p className="pl-hint pl-start">
          Primer perfil soportado: rover marciano con referencia regional Jezero. Otros objetivos se conservan como «no soportados».
          Funciona sin conexión y sin IA; la IA es un ayudante opcional.
        </p>
      )}

      {journey && (
        <div className="pl-flow">
          <ol className="pl-steps" aria-label="Pasos">
            {steps.map((s, i) => {
              const disabled = s === 'result' && !state.result
              return (
                <li key={s}>
                  <button type="button" disabled={disabled} aria-current={s === step ? 'step' : undefined} className={s === step ? 'on' : ''} onClick={() => setStep(s)}>
                    <b>{i + 1}</b> {STEP_LABEL[s]}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="pl-bar">
            <span className="pl-tag">{scopeSummary}</span>
            {step !== 'scope' && step !== 'result' && <button type="button" className="pl-ghost" onClick={() => setStep('scope')}>Cambiar sector</button>}
            <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'reset' })} title="El texto vive solo en esta página; nada se guarda en el navegador.">Borrar todo y empezar de nuevo</button>
          </div>

          <div className="pl-body">
            {step === 'describe' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Describa su prueba</h3>
                <fieldset className="pl-modes">
                  <legend>Objetivo</legend>
                  <label className={`pl-radio${state.target.kind === 'rover' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'rover'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'rover', stated: '' } })} />
                    <span><strong>Rover marciano (referencia Jezero)</strong><small>Único perfil soportado con datos reales.</small></span>
                  </label>
                  <label className={`pl-radio${state.target.kind === 'other' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'other'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'other', stated: state.target.stated } })} />
                    <span><strong>Otro objetivo / no soportado</strong><small>Se conserva su pedido, pero no se calcula ni se recomienda nada.</small></span>
                  </label>
                  {state.target.kind === 'other' && (
                    <label className="pl-field wide">
                      <span>Descríbalo</span>
                      <input type="text" maxLength={200} value={state.target.stated} onChange={(e) => dispatch({ type: 'set_target', target: { kind: 'other', stated: e.target.value } })} placeholder="Ej.: hábitat lunar, perforación…" />
                    </label>
                  )}
                  {moonHint && <p className="pl-notice">El texto menciona la Luna: el único perfil soportado es rover marciano. Elija «Otro objetivo» si corresponde.</p>}
                </fieldset>

                <label className="pl-field wide">
                  <span>Texto de su prueba (opcional, hasta {MAX_BRIEF_CHARS} caracteres)</span>
                  <textarea rows={5} maxLength={MAX_BRIEF_CHARS} value={state.brief} onChange={(e) => dispatch({ type: 'set_brief', brief: e.target.value })}
                    placeholder="Qué quiere probar, qué es imprescindible y qué es preferible…" aria-describedby="pl-brief-count" />
                  <small id="pl-brief-count">{state.brief.length} / {MAX_BRIEF_CHARS}</small>
                </label>
                <label className="pl-field wide">
                  <span>Actividad (opcional)</span>
                  <input type="text" maxLength={200} value={state.activity} onChange={(e) => dispatch({ type: 'set_activity', activity: e.target.value })} placeholder="Ej.: navegación autónoma de rover" />
                </label>

                <div className="pl-actions">
                  <button type="button" onClick={() => dispatch({ type: 'load_example', example: exampleState() })}>Cargar un ejemplo</button>
                  <span className="pl-hint">Ejemplo editable con valores de muestra: no es una recomendación ni un estándar.</span>
                </div>
                <div className="pl-ai-box">
                  <button type="button" onClick={runDraft} disabled={!state.brief.trim() || d.status === 'pending'} aria-busy={d.status === 'pending'}>
                    {d.status === 'pending' ? 'Consultando a la IA…' : 'Proponer requisitos con IA (opcional)'}
                  </button>
                  <p className="pl-hint">Al pulsarlo, el texto de su prueba se envía a Anthropic para proponer un borrador. El recorrido manual no envía nada. La IA no confirma ni evalúa: usted revisa y confirma.</p>
                  <div aria-live="polite">
                    {(d.status === 'error' || d.status === 'unavailable') && <p className="pl-notice">{d.message}</p>}
                    {d.status === 'idle' && d.message && <p className="pl-hint">{d.message}</p>}
                    {d.status === 'done' && (
                      <p className="pl-ok">La IA propuso {aiReqs} requisito(s). Revíselos abajo: no están confirmados.
                        {d.warnings.map((w) => <span key={w} className="pl-notice block">{w}</span>)}</p>
                    )}
                  </div>
                </div>
                <RequirementEditor state={state} dispatch={dispatch} />
              </>
            )}

            {step === 'scope' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Elija el sector</h3>
                <ScopePicker journey={journey} scope={state.scope} candidates={snapshot.candidates} dispatch={dispatch} />
              </>
            )}

            {step === 'confirm' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Confirme y evalúe</h3>
                <ConfirmSummary state={state} candidates={snapshot.candidates} />
                <ul className="pl-warns">
                  {state.requirements.length === 0 && <li>Sin requisitos, todas las áreas quedan priorizadas solo por similitud. Añada requisitos para una recomendación útil.</li>}
                  {critUnmeasured > 0 && <li>{critUnmeasured} requisito(s) imprescindible(s) sin medición: ninguna área podrá quedar priorizada (evidencia insuficiente).</li>}
                  {pointReqs > 0 && <li>{pointReqs} requisito(s) de escala puntual: no se evalúan con medianas de ventana.</li>}
                  {aiReqs > 0 && <li>{aiReqs} requisito(s) vienen de una propuesta de IA sin editar; al confirmar, usted los hace suyos.</li>}
                  {state.target.kind === 'other' && <li>El objetivo no está soportado: se generará un informe sin cálculo ni recomendación.</li>}
                </ul>
                {built.issues.length > 0 && <ul className="pl-problems" role="alert">{built.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
                {!state.confirmed ? (
                  <button type="button" disabled={built.issues.length > 0} onClick={() => dispatch({ type: 'confirm' })}>Confirmar requisitos y sector</button>
                ) : (
                  <div className="pl-actions">
                    <p className="pl-ok">Confirmado. Si cambia cualquier dato tendrá que confirmar otra vez.</p>
                    <button type="button" onClick={() => evaluate()}>Evaluar ahora</button>
                    <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'unconfirm' })}>Editar</button>
                  </div>
                )}
                {evaluationError && <p className="pl-notice" role="alert">{evaluationError}</p>}
              </>
            )}

            {step === 'result' && state.result && built.request && (
              <ResultView evaluation={state.result} request={built.request} state={state} candidates={snapshot.candidates}
                onExplain={runExplain} onExport={exportJson} exportError={exportError} onEdit={() => dispatch({ type: 'unconfirm' })} />
            )}
          </div>

          {step !== 'result' && (
            <nav className="pl-nav" aria-label="Navegar pasos">
              <button type="button" className="pl-ghost" disabled={idx <= 0} onClick={() => go(-1)}>← Atrás</button>
              {step !== 'confirm' && <button type="button" onClick={() => go(1)}>Siguiente →</button>}
            </nav>
          )}
        </div>
      )}

      {/* El informe imprimible vive en ResultView; aquí solo el anuncio accesible de pasos. */}
      <div className="pl-sr" role="status" aria-live="polite">{announce}</div>
    </section>
  )
}
