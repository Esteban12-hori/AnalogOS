/**
 * STUB del riel de métricas (incremento 5): reutiliza la ficha existente para que la app
 * siga mostrando datos reales (cifras del lugar, advertencias, desglose por criterio).
 */
import { ScoreBreakdown } from '../../breakdown/ScoreBreakdown'
import { feasibilityLabels, formatArea, formatScore } from '../../domain/formatting'
import { GLYPH } from '../../shell/public'
import type { MetricRailProps } from './index'

function Figure({ label, value, hint, muted = false }: { label: string; value: string; hint: string; muted?: boolean }) {
  return (
    <div className={`metric${muted ? ' muted' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

export function MetricRail({ data, site, variant }: MetricRailProps) {
  const profile = data.snapshot?.profile
  return (
    <div className="metric-stub" data-variant={variant}>
      <div className="metrics-grid">
        <Figure
          label="Similitud"
          value={site.similarity === null ? 'Sin score' : formatScore(site.similarity)}
          hint={site.similarity === null ? 'Peso válido insuficiente' : 'Ajuste al perfil · 0–100'}
          muted={site.similarity === null}
        />
        <Figure label="Confianza" value={formatScore(site.confidence)} hint="Calidad asignada por fuente · 0–100" />
        <Figure label="Factibilidad" value={feasibilityLabels[site.feasibility]} hint="Preliminar · no es permiso" />
        <Figure
          label="Estabilidad"
          value={site.stability === null ? 'Sin calcular' : formatScore(site.stability)}
          hint="Pesos perturbados ±20 % · 0–100"
          muted={site.stability === null}
        />
      </div>
      <div className="detail-meta">
        <span><small>{GLYPH.sector} Área aproximada</small><strong>{formatArea(site.area_km2)}</strong></span>
        <span><small>Perfil</small><strong>{profile?.version ?? '—'}</strong></span>
      </div>
      {site.warnings.length > 0 && (
        <div className="warning-box">
          <strong>Advertencia activa</strong>
          <p>{site.warnings[0]}</p>
          {site.warnings.length > 1 && (
            <details className="warning-details">
              <summary>{site.warnings.length - 1} verificaciones pendientes</summary>
              <ul>{site.warnings.slice(1).map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </details>
          )}
        </div>
      )}
      <ScoreBreakdown items={site.score_breakdown} marsReference={data.snapshot?.marsReference ?? null} />
    </div>
  )
}
