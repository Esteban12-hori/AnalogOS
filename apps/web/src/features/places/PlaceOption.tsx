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
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, preferencesText, type SiteMissionStatus } from '../../domain/missionView'
import type { MissionEvaluation } from '../../mission/types'
import { GLYPH } from '../../shell/public'
import { placeName, type EvaluatedPlace, type ReferencePlace } from './placeModel'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** Forma corta de la factibilidad para tarjetas angostas (la completa sigue para lectores de pantalla). */
const FEASIBILITY_SHORT: Readonly<Record<CandidateSite['feasibility'], string>> = {
  unknown: 'Factib.: sin evaluar',
  requires_review: 'Factib.: revisión',
  potentially_feasible: 'Factib.: posible',
  excluded: 'Factib.: excluido',
}
export const TERRITORIAL_PENDING = 'Factibilidad territorial: pendiente'
/** Textos más largos que esto pasan a la forma corta en cuanto la tarjeta es de carrusel (places.css). */
const LONG_CHARS = 20

/**
 * Chip con texto completo y forma corta. En tarjetas angostas (places.css) se ve la corta y la
 * completa queda solo para lectores de pantalla: la factibilidad nunca se reduce a «R…».
 */
function Chip({ full, short, title }: { full: string; short: string; title: string }) {
  return (
    <span className="places-chip" title={title} data-long={full.length > LONG_CHARS ? '' : undefined}>
      <span className="places-chip-full">{full}</span>
      <span className="places-chip-short" aria-hidden="true">{short}</span>
    </span>
  )
}

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

/**
 * Primera línea: qué es (● ○ ◆) o, si está elegido, «◉ en el globo» (§2.4: selección). En
 * tarjetas angostas se ve la forma corta («#2 · Priorizado»); la completa queda para lectores de
 * pantalla (places.css), así el estado nunca termina en «PRIORIZADO PAR…».
 */
function Kicker({ glyph, label, short = label, selected }: { glyph: string; label: string; short?: string; selected: boolean }) {
  const full = selected ? `En el globo · ${label}` : label
  return (
    <span
      className="places-kicker"
      data-selected={selected ? '' : undefined}
      data-short={short !== full ? kickerFit(full) : undefined}
    >
      <span aria-hidden="true">{selected ? GLYPH.onGlobe : glyph}</span>{' '}
      <span className="places-kicker-full">{full}</span>
      <span className="places-kicker-short" aria-hidden="true">{short}</span>
    </span>
  )
}

/**
 * Ancho (px) por debajo del cual la forma completa del encabezado no entra: versalitas mono de
 * ~7 px por carácter más el glifo (medido en Chrome). places.css pasa a la forma corta cuando el
 * encabezado mide menos que el primer escalón (cada 20 px) que alcanza ese ancho.
 */
export function kickerFit(text: string): string {
  const need = text.length * 7 + 14
  for (let step = 120; step <= 300; step += 20) if (need <= step) return String(step)
  return 'always'
}

/** Estado de Misión abreviado para la forma corta del encabezado de la tarjeta. */
const STATUS_SHORT: Readonly<Record<SiteMissionStatus, string>> = {
  priorizado_para_reconocimiento: 'Priorizado',
  no_cumple_requisitos: 'No cumple',
  evidencia_insuficiente: 'Evid. insuficiente',
  objetivo_no_soportado: 'No soportado',
  fuera_de_alcance: 'Fuera del alcance',
}

function kickerText(place: EvaluatedPlace, rankedCount: number): { label: string; short: string } {
  const { mission, role, rank, status } = place
  if (mission) {
    const ref = role === 'reference' ? ' · REF' : ''
    const head = mission.rank !== null ? `#${mission.rank}${ref} · ` : ''
    const tail = mission.rank !== null ? '' : ref
    return { label: `${head}${MISSION_STATUS_LABEL[mission.status]}${tail}`, short: `${head}${STATUS_SHORT[mission.status]}${tail}` }
  }
  if (role === 'reference') return { label: 'REF · Referencia conocida', short: 'REF' }
  if (status === 'insufficient_data') return { label: 'Datos insuficientes', short: 'Datos insuficientes' }
  return { label: `Candidato · #${rank ?? '—'} de ${rankedCount}`, short: `#${rank ?? '—'} de ${rankedCount}` }
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
  // Objetivo no soportado: la similitud v3 es del perfil rover Marte y no aplica a lo pedido (ADR-009 §2).
  const unsupported = mission?.status === 'objetivo_no_soportado'
  return (
    <>
      <Kicker glyph={glyphOf(place)} {...kickerText(place, rankedCount)} selected={selected} />
      <strong className="places-name">{placeName(candidate.name)}</strong>
      <span className="places-meta">
        {place.country ? `${countryLabels[place.country]} · ` : ''}
        <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(candidate.area_km2)}
        {role === 'reference' && !mission ? ' · no sale de la búsqueda' : ''}
      </span>
      {unsupported
        ? <SimilarityRing value={null} caption="no aplica" />
        : <SimilarityRing value={similarity} caption={similarity === null ? 'sin %' : 'similitud v3'} tag={mission ? 'sin recalcular' : undefined} />}
      {unsupported ? (
        <span className="places-badge">Sin % para este objetivo: la similitud v3 es del perfil rover Marte</span>
      ) : blocker ? (
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
            <span className="places-conf-word">Confianza</span><span className="places-conf-short" aria-hidden="true">Conf.</span>
            <i aria-hidden="true" style={{ '--v': Math.max(0, Math.min(1, confidence / 100)) } as Vars} /> <b>{formatScore(confidence)}</b>
          </span>
        )}
        {mission ? (
          <Chip full={TERRITORIAL_PENDING} short="Factib.: pendiente" title="Permisos, acceso, áreas protegidas y propiedad: independiente de este resultado" />
        ) : (
          <Chip full={feasibilityLabels[candidate.feasibility]} short={FEASIBILITY_SHORT[candidate.feasibility]} title={`Factibilidad: ${feasibilityLabels[candidate.feasibility]}`} />
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
      <Kicker glyph={GLYPH.reference} label={selected ? 'emblemático' : 'Análogo emblemático'} short="Emblemático" selected={selected} />
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
