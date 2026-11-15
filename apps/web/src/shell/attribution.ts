/**
 * Atribución de los datos que producen los % (CLAUDE.md: «Atribución de datos siempre visible»;
 * docs/UX_REDESIGN.md §4.3). Se genera desde `manifest.datasets[].provider/product`: nada
 * escrito a mano que pueda quedar desfasado del snapshot. Función pura.
 */
import type { DataManifest } from '../domain/contracts'

/** Nombre corto de cada fuente reconocida y su orden en la línea. */
const KNOWN: ReadonlyArray<{ test: RegExp; label: string }> = [
  { test: /NASADEM/i, label: 'NASADEM' },
  { test: /Sentinel-2 L2A|Copernicus/i, label: 'Copernicus Sentinel-2' },
  { test: /MOLA/i, label: 'MOLA (PDS)' },
  { test: /NASA POWER/i, label: 'NASA POWER' },
  { test: /Natural Earth/i, label: 'Natural Earth' },
]

/** Lo que no es una fuente externa de datos: métricas propias e inventarios de búsqueda. */
const SKIP = /AnalogOS|inventario|inventory/i

export function dataAttribution(manifest: Pick<DataManifest, 'datasets'> | null | undefined): string[] {
  const labels: string[] = []
  for (const dataset of manifest?.datasets ?? []) {
    const text = `${dataset.provider} ${dataset.product}`
    if (SKIP.test(text)) continue
    const known = KNOWN.find((item) => item.test.test(text))
    const label = known ? known.label : dataset.provider
    if (!labels.includes(label)) labels.push(label)
  }
  const rank = (label: string) => {
    const index = KNOWN.findIndex((item) => item.label === label)
    return index === -1 ? KNOWN.length : index
  }
  return labels.sort((a, b) => rank(a) - rank(b))
}

export function dataAttributionText(manifest: Pick<DataManifest, 'datasets'> | null | undefined): string | null {
  const labels = dataAttribution(manifest)
  return labels.length ? `Datos: ${labels.join(' · ')}` : null
}
