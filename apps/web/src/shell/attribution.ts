/**
 * Attribution of the data that produces the percentages (CLAUDE.md: «Data attribution always visible»;
 * docs/UX_REDESIGN.md §4.3). It is generated from `manifest.datasets[].provider/product`: nothing
 * handwritten that could fall out of sync with the snapshot. Pure function.
 */
import type { DataManifest } from '../domain/contracts'
import { getLocale, type Locale } from '../i18n/core'
import { tShell } from '../i18n/messages/shell'

/** Short name of each recognized source and its order in the line. */
const KNOWN: ReadonlyArray<{ test: RegExp; label: string }> = [
  { test: /NASADEM/i, label: 'NASADEM' },
  { test: /Sentinel-2 L2A|Copernicus/i, label: 'Copernicus Sentinel-2' },
  { test: /MOLA/i, label: 'MOLA (PDS)' },
  { test: /NASA POWER/i, label: 'NASA POWER' },
  { test: /Natural Earth/i, label: 'Natural Earth' },
]

/** What is not an external data source: own metrics and search inventories. */
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

/** “Data: NASADEM · …” / “Datos: NASADEM · …”: source names are proper names and stay as they are. */
export function dataAttributionText(manifest: Pick<DataManifest, 'datasets'> | null | undefined, locale: Locale = getLocale()): string | null {
  const labels = dataAttribution(manifest)
  return labels.length ? tShell.in(locale)('credit', { sources: labels.join(' · ') }) : null
}
