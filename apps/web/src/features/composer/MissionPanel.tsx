/**
 * Tarjeta «Tu misión» (chunk diferido de misión). Muestra lo que la IA o el modo DEMO
 * propusieron (niveles, supuestos, lo pedido sin datos), deja editar los niveles — Clave 3 ·
 * Importante 2 · Menor 1 · Excluir 0, peso = nivel ÷ suma — con Deshacer, y guarda un historial.
 *
 * La IA nunca aparece junto a un % como si lo hubiera calculado: los pesos son del cliente y
 * la cobertura y el orden, del motor determinista, con su versión a la vista.
 */
import { useEffect, useState } from 'react'
import type { CriterionLevel } from '../../domain/aiContracts'
import { PROFILE_STATUS_LABEL, formatWhole } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi } from '../../state/ui'
import { useComposer } from './composerStore'
import { formatWhen, type Levels } from './history'
import { DEMO_TAG, isWaitingPhase, phaseLabel } from './labels'
import { missionController, type MissionSnapshotData } from './missionRun'
import { LEVEL_LABEL, LEVEL_SHORT, LEVELS_DESC, SOURCE_LABEL, coverageSummary, formatWeight, highlightSegments, weightRows, type WeightRow } from './model'
import { MISSION_PANEL_ID, type MissionPanelProps } from './panel'
import './mission.css'

const UNSUPPORTED_REASON = { not_measured: 'no se mide', out_of_scope: 'fuera de alcance', ambiguous: 'ambiguo' } as const

function LevelPicker({ row, name, onPick }: { row: WeightRow; name: string; onPick: (level: CriterionLevel) => void }) {
  const level = row.level ?? 0
  return (
    <fieldset className="composer-levels">
      <legend className="sr-only">Nivel de {row.label}</legend>
      {LEVELS_DESC.map((option) => (
        <label key={option} className="composer-level" data-checked={option === level ? '' : undefined}>
          <input type="radio" name={name} value={option} checked={option === level} onChange={() => onPick(option)} />
          <span aria-hidden="true">{LEVEL_SHORT[option]}</span>
          <span className="sr-only">{LEVEL_LABEL[option]}</span>
        </label>
      ))}
    </fieldset>
  )
}

function rowNote(row: WeightRow): string | null {
  if (row.pending) return (row.level ?? 0) > 0 ? 'por calcular · resta cobertura' : 'revisión experta · fuera del score'
  if (row.mentioned === false && row.level === 0) return 'no mencionado'
  return null
}

function CriterionRow({
  row,
  editing,
  edited,
  name,
  onPick,
}: {
  row: WeightRow
  editing: boolean
  edited: boolean
  name: string
  onPick: (level: CriterionLevel) => void
}) {
  const level = row.level
  const excluded = level === 0
  const note = rowNote(row)
  return (
    <li className="composer-row" data-editing={editing ? '' : undefined} data-excluded={excluded ? '' : undefined} data-pending={row.pending ? '' : undefined}>
      <span className="composer-row-label">
        {row.label}
        {edited && <small className="composer-row-edited"> · editado</small>}
        {note && <small className="composer-row-note">{note}</small>}
      </span>
      {editing && level !== null ? (
        <LevelPicker row={row} name={name} onPick={onPick} />
      ) : (
        <span className="composer-row-level">{level === null ? 'base' : row.mentioned === false && excluded ? '—' : LEVEL_LABEL[level]}</span>
      )}
      <span className="composer-row-weight">
        <span>
          {excluded ? '—' : formatWeight(row.weight)}
          {!excluded && row.direction === 'up' && <span className="composer-row-dir" title="Sube respecto del perfil base"><span aria-hidden="true"> {GLYPH.weightUp}</span><span className="sr-only">, sube respecto del perfil base</span></span>}
          {!excluded && row.direction === 'down' && <span className="composer-row-dir" title="Baja respecto del perfil base"><span aria-hidden="true"> {GLYPH.weightDown}</span><span className="sr-only">, baja respecto del perfil base</span></span>}
        </span>
        {level !== null && row.baseWeight !== null && <small className="composer-row-base">base {formatWeight(row.baseWeight)}</small>}
      </span>
    </li>
  )
}

export function MissionPanel({ data, placement }: MissionPanelProps) {
  const text = useMission((state) => state.text)
  const source = useMission((state) => state.source)
  const interpretation = useMission((state) => state.interpretation)
  const profile = useMission((state) => state.profile)
  const scoring = useMission((state) => state.scoring)
  const error = useMission((state) => state.error)
  const phase = useUi((state) => state.missionPhase)
  const selection = useUi((state) => state.selection)
  const highlights = useComposer((state) => state.highlights)
  const mentioned = useComposer((state) => state.mentioned)
  const undo = useComposer((state) => state.undo)
  const history = useComposer((state) => state.history)
  const presets = useComposer((state) => state.presets)
  const notice = useComposer((state) => state.notice)
  const run = useComposer((state) => state.run)
  const [editing, setEditing] = useState(false)

  // Publica los perfiles predefinidos del motor (chips «Refinar») si aún no se cargaron.
  useEffect(() => {
    if (presets === null) missionController()
  }, [presets])

  const snapshot = data.snapshot
  const ready: MissionSnapshotData | null = data.status === 'ready' && snapshot ? { candidates: snapshot.candidates, profile: snapshot.profile } : null
  const base = snapshot?.profile ?? null
  const rows = weightRows(profile, base, snapshot?.candidates ?? [], mentioned)
  const coverage = coverageSummary(scoring, base)
  const keepSelection = selection !== null && !selection.preview
  const waiting = run !== null && isWaitingPhase(phase)
  const prefix = `composer-${placement}`
  const titleId = `${prefix}-title`
  const interpreted = new Map(interpretation?.criteria.map((criterion) => [criterion.id, criterion.level]) ?? [])
  const preset = profile?.origin === 'preset' ? presets?.find((item) => item.id === profile.id) ?? null : null

  const act = (fn: (controller: ReturnType<typeof missionController>, snap: MissionSnapshotData) => void) => () => {
    if (ready) fn(missionController(), ready)
  }
  const pick = (id: WeightRow['id'], level: CriterionLevel) => {
    if (!ready || !profile) return
    const next: Levels = { ...profile.levels, [id]: level }
    missionController().applyLevels(next, ready, { keepSelection })
  }

  if (data.status !== 'ready' || !snapshot) {
    return (
      <section className="composer-card" data-placement={placement} aria-labelledby={titleId}>
        <h2 id={titleId} className="composer-card-title">Tu misión</h2>
        <p className="composer-card-note">
          {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail}</span> Sin snapshot validado: la misión no puede calcularse.</> : 'Esperando el snapshot validado…'}
        </p>
      </section>
    )
  }

  return (
    <section
      className="composer-card"
      data-placement={placement}
      aria-labelledby={titleId}
      aria-busy={waiting || undefined}
      id={placement === 'panel' ? MISSION_PANEL_ID : undefined}
      tabIndex={placement === 'panel' ? -1 : undefined}
    >
      <header className="composer-card-head">
        <h2 id={titleId} className="composer-card-title">Tu misión</h2>
        {source && (
          <span className="composer-card-source" data-source={source}>
            {/* ✦ es solo de la IA (§2.4): ni DEMO ni un perfil predefinido lo llevan. */}
            {source === 'lktron' && <span aria-hidden="true">{GLYPH.ai} </span>}
            {SOURCE_LABEL[source]}
          </span>
        )}
      </header>

      {waiting && <p className="composer-card-phase"><span aria-hidden="true">{GLYPH.ai}</span> {phaseLabel(phase, run?.interpreter ?? null)}</p>}
      {phase === 'error' && error && <p className="composer-card-error"><span aria-hidden="true">{GLYPH.fail}</span> {error.message}</p>}
      {phase === 'cancelled' && error?.code === 'cancelled' && <p className="composer-card-note">{error.message}</p>}
      {notice && <p className="composer-card-note">{notice}</p>}

      {!profile ? (
        <>
          <p className="composer-card-lead">
            <span aria-hidden="true">{GLYPH.ai}</span> Describe abajo el trabajo que quieres probar para Marte. La IA — o el modo {DEMO_TAG} — solo
            propone un nivel por criterio; el % y el orden los calcula el motor determinista.
          </p>
          <p className="composer-card-profile">
            <span>Perfil base del snapshot</span>
            <span className="composer-status-chip">{PROFILE_STATUS_LABEL[base?.status ?? ''] ?? base?.status} · {base?.status}</span>
          </p>
          <ul className="composer-rows" aria-label="Pesos del perfil base">
            {rows.map((row) => (
              <CriterionRow key={row.id} row={row} editing={false} edited={false} name={`${prefix}-${row.id}`} onPick={() => undefined} />
            ))}
          </ul>
        </>
      ) : (
        <>
          {text ? (
            <blockquote className="composer-quote">
              «{highlightSegments(text, source === 'demo' ? highlights : null).map((segment, index) =>
                segment.criterionId ? (
                  <mark key={index} data-criterion={segment.criterionId}>{segment.text}</mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}»
            </blockquote>
          ) : preset ? (
            <p className="composer-card-lead">{preset.description}</p>
          ) : null}
          {source === 'demo' && highlights && highlights.length > 0 && (
            <p className="composer-card-hint"><mark>resaltado</mark> = palabra que activó un criterio ({DEMO_TAG})</p>
          )}
          {interpretation && (
            <p className="composer-ai">
              <span className="composer-ai-label">{interpretation.engine === 'demo' ? DEMO_TAG : <><span aria-hidden="true">{GLYPH.ai}</span> Interpretación de IA</>}</span>
              {interpretation.mission_summary}
            </p>
          )}

          <div className="composer-card-profile">
            <span>{profile.label}</span>
            <span className="composer-status-chip" title="Perfil sin validación experta">{PROFILE_STATUS_LABEL[profile.status] ?? profile.status} · {profile.status}</span>
            <span className="composer-card-actions">
              <button type="button" className="composer-btn" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>
                {editing ? 'Listo' : 'Editar'}
              </button>
              <button type="button" className="composer-btn" disabled={undo.length === 0} onClick={act((controller, snap) => controller.undo(snap, { keepSelection }))}>
                Deshacer
              </button>
            </span>
          </div>

          <ul className="composer-rows" aria-label="Niveles y pesos de tu misión">
            {rows.map((row) => (
              <CriterionRow
                key={row.id}
                row={row}
                editing={editing}
                edited={interpretation !== null && (interpreted.get(row.id) ?? 0) !== row.level}
                name={`${prefix}-${row.id}`}
                onPick={(level) => pick(row.id, level)}
              />
            ))}
          </ul>

          {coverage && (
            <p className="composer-card-note">
              Cobertura del peso con datos: {formatWhole(coverage.min * 100)}{coverage.max !== coverage.min ? `–${formatWhole(coverage.max * 100)}` : ''} %
              {coverage.insufficient > 0 && coverage.minimumValidWeight !== null && (
                <>
                  {' '}· <span aria-hidden="true">{GLYPH.insufficient}</span> datos insuficientes en {coverage.insufficient}{' '}
                  {coverage.insufficient === 1 ? 'lugar' : 'lugares'} (mínimo {formatWhole(coverage.minimumValidWeight * 100)} %)
                </>
              )}
            </p>
          )}

          {interpretation && interpretation.unsupported.length > 0 && (
            <div className="composer-card-block">
              <h3>Pediste, sin datos aún</h3>
              <ul className="composer-plain">
                {interpretation.unsupported.map((item) => (
                  <li key={item.phrase}>{item.phrase} <small>· {UNSUPPORTED_REASON[item.reason]}</small></li>
                ))}
              </ul>
            </div>
          )}

          {interpretation && (interpretation.assumptions.length > 0 || interpretation.criteria.length > 0) && (
            <details className="composer-details">
              <summary>Supuestos y razones</summary>
              <ul className="composer-plain composer-ai-list">
                {interpretation.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                {interpretation.criteria.map((criterion) => (
                  <li key={criterion.id}>
                    <b>{rows.find((row) => row.id === criterion.id)?.label}:</b> {criterion.rationale}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="composer-card-foot">
            {source === 'lktron' ? 'La IA propone niveles' : source === 'demo' ? `El modo ${DEMO_TAG} propone niveles` : 'Niveles predefinidos'}; el peso es nivel ÷ suma y el % lo
            calcula el motor determinista{scoring ? ` ${scoring.engineVersion}` : ''}. No es el snapshot ni una validación experta.
          </p>
          <button type="button" className="composer-btn composer-btn-quiet" onClick={act((controller, snap) => controller.useBaseProfile(snap, { keepSelection }))}>
            Volver al perfil base
          </button>
        </>
      )}

      {presets && presets.length > 0 && (() => {
        const list = (
          <>
            <ul className="composer-presets">
              {presets.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="composer-preset"
                    aria-pressed={profile?.id === item.id}
                    onClick={act((controller, snap) => controller.applyPreset(item.id, snap, { keepSelection }))}
                  >
                    <b>{item.label}</b>
                    <small>{item.description}</small>
                  </button>
                </li>
              ))}
            </ul>
            <p className="composer-card-note">Todos son needs_calibration: proponen niveles por criterio, sin validación experta.</p>
          </>
        )
        // Con resultados, los perfiles se pliegan: la Lectura (veredicto y limitante) queda a la
        // vista en el panel izquierdo sin desplazar (§4.2).
        return profile ? (
          <details className="composer-details composer-card-block">
            <summary>Perfiles predefinidos · {presets.length}</summary>
            {list}
          </details>
        ) : (
          <div className="composer-card-block">
            <h3>Perfiles predefinidos</h3>
            {list}
          </div>
        )
      })()}

      {history.length > 0 && (
        <details className="composer-details">
          <summary>Historial · {history.length}</summary>
          <ul className="composer-history">
            {history.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="composer-history-item" onClick={act((controller, snap) => controller.restore(entry.id, snap, { keepSelection }))}>
                  <span>{entry.text ?? entry.label}</span>
                  <small>
                    {SOURCE_LABEL[entry.source]} · {entry.label} · {formatWhen(entry.at)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="composer-btn composer-btn-quiet" onClick={act((controller) => controller.clearHistory())}>
            Borrar historial
          </button>
          <p className="composer-card-note">Solo en este navegador. Al restaurar, el motor vuelve a calcular el %.</p>
        </details>
      )}
    </section>
  )
}
