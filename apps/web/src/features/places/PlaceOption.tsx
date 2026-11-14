/**
 * Contenido de cada opción del carrusel (role=option: sin controles anidados).
 * ● evaluado: anillo de similitud con la palabra «similitud» siempre visible, perfil junto al %,
 *   confianza en barra aparte y factibilidad como chip: tres cosas separadas, nunca mezcladas.
 * ◆ emblemático: sin %, sin ranking y sin confianza; anillo discontinuo «por calcular».
 */
import type { CSSProperties } from 'react'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
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
  rankedCount: number
  /** Etiqueta del perfil junto al %: «perfil base» o el perfil de la misión. */
  profileTag: string
  mission: boolean
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

export function EvaluatedOption({ place, rankedCount, profileTag, mission, selected }: EvaluatedProps) {
  const { candidate, status, similarity, rank, confidence, coincident } = place
  const label = status === 'scored' ? `${selected ? '' : 'Evaluado · '}#${rank ?? '—'} de ${rankedCount}` : status === 'insufficient_data' ? 'Datos insuficientes' : 'Por calcular con tu perfil'
  return (
    <>
      <Kicker glyph={status === 'insufficient_data' ? GLYPH.insufficient : GLYPH.evaluated} label={label} selected={selected} />
      <strong className="places-name">{placeName(candidate.name)}</strong>
      <span className="places-meta"><span aria-hidden="true">{GLYPH.sector}</span> {formatArea(candidate.area_km2)}</span>
      <SimilarityRing
        value={status === 'scored' ? similarity : null}
        caption={status === 'scored' ? 'similitud' : status === 'insufficient_data' ? 'sin %' : 'por calcular'}
        tag={status === 'scored' ? profileTag : undefined}
      />
      {coincident.length > 0 && (
        <span className="places-badge">
          <span aria-hidden="true">{GLYPH.reference}</span> Coincide con {coincident.map((analog) => analog.name).join(', ')}
        </span>
      )}
      <span className="places-foot">
        {confidence === null ? (
          <span className="places-conf is-pending">Confianza {mission ? 'por calcular con tu perfil' : 'sin dato'}</span>
        ) : (
          <span className="places-conf">
            Confianza <i aria-hidden="true" style={{ '--v': Math.max(0, Math.min(1, confidence / 100)) } as Vars} /> <b>{formatScore(confidence)}</b>
          </span>
        )}
        <span className="places-chip" title={feasibilityLabels[candidate.feasibility]}>{feasibilityLabels[candidate.feasibility]}</span>
      </span>
    </>
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
