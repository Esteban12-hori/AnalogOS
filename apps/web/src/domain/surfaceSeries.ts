// Monthly Sentinel-2 L2A series per site, read from analysis-summary.json.
// They are only displayed; they do not take part in the score (which comes from pipelines/scoring.py).

export interface MonthlySurfacePoint {
  /** Start of the monthly interval (ISO 8601). */
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
 * Validates at the system boundary. Discards incomplete months instead of inventing values:
 * a series with gaps is displayed with the months that do have data, in chronological order.
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

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatMonth(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : monthFormat.format(date).replace('.', '')
}

/** Spectral index with three decimals and a decimal point (en-US). */
export function formatIndex(value: number): string {
  return value.toFixed(3)
}
