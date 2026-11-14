import type { CandidateSite, CountryCode } from '../domain/contracts'
import { countryLabels, type CountryFilter } from '../domain/discovery'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'

interface CandidateRankingProps {
  /** Candidatos de la búsqueda, ya ordenados y filtrados por país. */
  ranked: CandidateSite[]
  /** Referencias conocidas: se muestran aparte y nunca reciben posición en el ranking. */
  references: CandidateSite[]
  /** Posición global en el ranking, igual que en el mapa aunque haya un filtro activo. */
  rankOf: Map<string, number>
  countries: CountryCode[]
  country: CountryFilter
  onCountryChange: (country: CountryFilter) => void
  selectedId: string
  onSelect: (siteId: string) => void
}

interface CardProps {
  candidate: CandidateSite
  badge: string
  selected: boolean
  onSelect: (siteId: string) => void
}

function SiteCard({ candidate, badge, selected, onSelect }: CardProps) {
  return (
    <button
      type="button"
      className={`candidate-card${selected ? ' selected' : ''}${candidate.role === 'reference' ? ' reference' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(candidate.site_id)}
    >
      <span className="rank-number">{badge}</span>
      <span className="candidate-card-main">
        <strong>{shortCandidateName(candidate.name)}</strong>
        <small>
          {candidate.country ? `${countryLabels[candidate.country]} · ` : ''}{feasibilityLabels[candidate.feasibility]}
        </small>
      </span>
      <span className="candidate-score">
        <strong>{candidate.similarity === null ? 'N/D' : formatScore(candidate.similarity)}</strong>
        <small>similitud</small>
      </span>
      <span className="confidence-line" aria-label={`Confianza ${formatScore(candidate.confidence)} de 100`}>
        <i style={{ width: `${candidate.confidence}%` }} />
      </span>
    </button>
  )
}

export function CandidateRanking({
  ranked, references, rankOf, countries, country, onCountryChange, selectedId, onSelect,
}: CandidateRankingProps) {
  const filters: Array<[CountryFilter, string]> = [['all', 'Todos'], ...countries.map((code) => [code, countryLabels[code]] as [CountryFilter, string])]
  return (
    <aside className="ranking-panel" aria-labelledby="ranking-title">
      <div className="panel-heading">
        <span className="section-kicker">Ranking del piloto</span>
        <h2 id="ranking-title">Candidatos de la búsqueda</h2>
        <p>Ordenados por similitud. La confianza se muestra por separado.</p>
      </div>
      {countries.length > 1 && (
        <div className="country-filter" role="group" aria-label="Filtrar candidatos por país">
          {filters.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={country === value} onClick={() => onCountryChange(value)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="ranking-list">
        {ranked.length === 0 && (
          <p className="ranking-empty" role="status">
            La búsqueda no dejó candidatos {country === 'all' ? 'elegibles' : `en ${countryLabels[country]}`}. No se
            completa la lista con sitios elegidos a mano.
          </p>
        )}
        {ranked.map((candidate) => (
          <SiteCard
            key={candidate.site_id}
            candidate={candidate}
            badge={String(rankOf.get(candidate.site_id) ?? '')}
            selected={candidate.site_id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
      {references.length > 0 && (
        <div className="reference-block">
          <span className="section-kicker">Referencia conocida: Yungay</span>
          <p>Se muestra para comparar. No es un resultado de la búsqueda ni participa en el ranking.</p>
          {references.map((candidate) => (
            <SiteCard
              key={candidate.site_id}
              candidate={candidate}
              badge="REF"
              selected={candidate.site_id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      <div className="ranking-note">
        <strong>Interpretación correcta</strong>
        <span>Más alto no significa aprobado ni nuevo. Solo indica ajuste al perfil con este snapshot.</span>
      </div>
    </aside>
  )
}
