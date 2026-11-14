// Series mensuales Sentinel-2 L2A por sitio, leídas de analysis-summary.json.
// Solo se muestran; no participan en el score (que viene de pipelines/scoring.py).

export interface MonthlySurfacePoint {
  /** Inicio del intervalo mensual (ISO 8601). */
  from: string
  ndvi: number
  bsi: number
  validFraction: number
}

export type SurfaceSeriesBySite = ReadonlyMap<string, readonly MonthlySurfacePoint[]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/**
 * Valida en el límite del sistema. Descarta meses incompletos en vez de inventar valores:
 * una serie con huecos se muestra con los meses que sí tienen dato, en orden cronológico.
 */
export function parseSurfaceSeries(summary: unknown): Map<string, MonthlySurfacePoint[]> {
  const result = new Map<string, MonthlySurfacePoint[]>()
  if (!isRecord(summary) || !Array.isArray(summary.sites)) return result
  for (const site of summary.sites) {
    if (!isRecord(site) || typeof site.site_id !== 'string') continue
    const sentinel = site.sentinel2
    if (!isRecord(sentinel) || !Array.isArray(sentinel.monthly)) continue
    const points: MonthlySurfacePoint[] = []
    for (const month of sentinel.monthly) {
      if (!isRecord(month) || typeof month.from !== 'string') continue
      if (!finite(month.ndvi) || !finite(month.bsi) || !finite(month.valid_fraction)) continue
      points.push({ from: month.from, ndvi: month.ndvi, bsi: month.bsi, validFraction: month.valid_fraction })
    }
    points.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
    if (points.length >= 2) result.set(site.site_id, points)
  }
  return result
}

const monthFormat = new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatMonth(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : monthFormat.format(date).replace('.', '')
}

/** Índice espectral con tres decimales y coma decimal (es-CL). */
export function formatIndex(value: number): string {
  return value.toFixed(3).replace('.', ',')
}
