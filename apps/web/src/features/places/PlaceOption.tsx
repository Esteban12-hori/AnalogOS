/**
 * Contenido de cada opción del carrusel (role=option: sin controles anidados).
 * ● candidato: anillo de similitud v3 (snapshot, sin recalcular) con la palabra «similitud»
 *   siempre visible, confianza en barra aparte y factibilidad como chip: tres cosas separadas.
 * REF (referencia conocida): mismo anillo, sin puesto; «No sale de la búsqueda».
 * Misión: el estado de la evaluación del equipo (y su puesto si está priorizado), las preferencias
 *   cumplidas y «Factibilidad territorial: pendiente». Ningún % de misión: no existe (ADR-009).
 * ◆ emblemático: sin %, sin ranking y sin confianza; anillo discontinuo «por calcular».
 */
import type { CSSProperties } from 'react'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, preferencesText } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { GLYPH } from '../../shell/public'
import { placeName, type EvaluatedPlace, type ReferencePlace } from './placeModel'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** Anillo de similitud 0–100. El número aparece ya final: solo el trazo se dibuja. */
export function SimilarityRing({ value, caption, tag }: { value: number | null; caption: string; tag?: string }) {
  return (
    <span className="places-ring" data-empty={value === null ? '' : undefined}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="places-ring-track" cx="20" cy="20" r="17" pathLength={100} />
        {value !== null && (
          <circle className="places-ring-value" cx="20" cy="20" r="17" pathLength={100} strokeDasharray={`${value} 100`} style={{ '--v': value } as Vars} />
        )}
      </svg>
      <b>{value === null ? '—' : formatScore(value)}</b>
      <small>{caption}</small>
      {tag && <small className="places-ring-tag">{tag}</small>}
    </span>
  )
}

interface EvaluatedProps {
  place: EvaluatedPlace
  /** Candidatos con puesto (el «de 6»; nunca cuenta la REF). */
  rankedCount: number
  selected: boolean
}

/** Primera línea: qué es (● ○ ◆) o, si está elegido, «◉ en el globo» (§2.4: selección). */
function Kicker({ glyph, label, selected }: { glyph: string; label: string; selected: boolean }) {
  return (
    <span className="places-kicker" data-selected={selected ? '' : undefined}>
      <span aria-hidden="true">{selected ? GLYPH.onGlobe : glyph}</span> {selected ? `En el globo · ${label}` : label}
    </span>
  )
}

function kickerText(place: EvaluatedPlace, rankedCount: number): string {
  const { mission, role, rank, status } = place
  if (mission) {
    const label = MISSION_STATUS_LABEL[mission.status]
    const ref = role === 'reference' ? ' · REF' : ''
    return mission.rank !== null ? `#${mission.rank}${ref} · ${label}` : `${label}${ref}`
  }
  if (role === 'reference') return 'REF · Referencia conocida'
  if (status === 'insufficient_data') return 'Datos insuficientes'
  return `Candidato · #${rank ?? '—'} de ${rankedCount}`
}

function glyphOf(place: EvaluatedPlace): string {
  const status = place.mission?.status
  if (status === 'evidencia_insuficiente' || place.status === 'insufficient_data') return GLYPH.insufficient
  if (status === 'no_cumple_requisitos') return GLYPH.fail
  return GLYPH.evaluated
}

export function EvaluatedOption({ place, rankedCount, selected }: EvaluatedProps) {
  const { candidate, similarity, confidence, coincident, mission, role } = place
  const option = mission?.option ?? null
  const blocker = option?.critical_failed[0] ? option.requirement_results.find((result) => result.requirement_id === option.critical_failed[0]) : null
  const preferences = option ? preferencesText(option) : null
  return (
    <>
      <Kicker glyph={glyphOf(place)} label={kickerText(place, rankedCount)} selected={selected} />
      <strong className="places-name">{placeName(candidate.name)}</strong>
      <span className="places-meta">
        {place.country ? `${countryLabels[place.country]} · ` : ''}
        <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(candidate.area_km2)}
        {role === 'reference' && !mission ? ' · no sale de la búsqueda' : ''}
      </span>
      <SimilarityRing value={similarity} caption={similarity === null ? 'sin %' : 'similitud v3'} tag={mission ? 'sin recalcular' : undefined} />
      {blocker ? (
        <span className="places-badge" data-tone="fail">Lo impide: {blocker.label}</span>
      ) : preferences ? (
        <span className="places-badge">{preferences}</span>
      ) : mission?.status === 'fuera_de_alcance' ? (
        <span className="places-badge">No entró en el alcance pedido</span>
      ) : coincident.length > 0 ? (
        <span className="places-badge">
          <span aria-hidden="true">{GLYPH.reference}</span> Coincide con {coincident.map((analog) => analog.name).join(', ')}
        </span>
      ) : null}
      <span className="places-foot">
        {confidence === null ? (
          <span className="places-conf is-pending">Confianza sin dato</span>
        ) : (
          <span className="places-conf">
            Confianza <i aria-hidden="true" style={{ '--v': Math.max(0, Math.min(1, confidence / 100)) } as Vars} /> <b>{formatScore(confidence)}</b>
          </span>
        )}
        {mission ? (
          <span className="places-chip" title="Permisos, acceso, áreas protegidas y propiedad: independiente de este resultado">Factibilidad territorial: pendiente</span>
        ) : (
          <span className="places-chip" title={feasibilityLabels[candidate.feasibility]}>{feasibilityLabels[candidate.feasibility]}</span>
        )}
      </span>
    </>
  )
}

const OUTCOME_TITLE: Readonly<Record<Exclude<MissionEvaluation['outcome'], 'evaluated'>, string>> = {
  needs_window_selection: 'Hay evidencia de una ventana, no del punto: falta elegirla',
  insufficient_coverage: 'Evidencia insuficiente para esta geometría',
  unsupported_target: 'Este objetivo no tiene un perfil soportado',
}

/**
 * Diagnóstico cuando el alcance no tiene evidencia (o falta elegir la ventana): no se estima nada
 * con ventanas vecinas; la solicitud de datos viaja en el JSON que se exporta desde «Tu misión».
 */
export function DiagnosisNote({ evaluation }: { evaluation: MissionEvaluation }) {
  if (evaluation.outcome === 'evaluated') return null
  return (
    <div className="places-diagnosis" role="note">
      <strong><span aria-hidden="true">{GLYPH.insufficient}</span> {OUTCOME_TITLE[evaluation.outcome]}</strong>
      <span>{evaluation.data_request?.note ?? 'No se estimó nada con ventanas vecinas ni se consultaron satélites.'} Exporte el diagnóstico (JSON) desde «Tu misión».</span>
    </div>
  )
}

export function ReferenceOption({ place, selected }: { place: ReferencePlace; selected: boolean }) {
  const { analog, containsSectorIds } = place
  return (
    <>
      <Kicker glyph={GLYPH.reference} label={selected ? 'emblemático' : 'Análogo emblemático'} selected={selected} />
      <strong className="places-name">{analog.name}</strong>
      <span className="places-meta">{analog.country} · {analog.location.kind === 'region' ? 'región aprox.' : 'zona aprox.'}</span>
      <SimilarityRing value={null} caption="por calcular" />
      {containsSectorIds.length > 0 && (
        <span className="places-badge">Contiene {containsSectorIds.length} {containsSectorIds.length === 1 ? 'sector evaluado' : 'sectores evaluados'}</span>
      )}
      <span className="places-foot">
        <span className="places-conf is-pending">sin %, sin ranking</span>
        <span className="places-source">Fuente: {analog.sources[0]?.publisher ?? 'citada'}</span>
      </span>
    </>
  )
}
