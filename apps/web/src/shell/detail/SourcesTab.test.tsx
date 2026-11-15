// Toda descarga de la ficha usa `buildExport` del equipo (aviso de honestidad y alcance de la
// búsqueda): el botón de la pestaña Fuentes ya no exporta el candidato en bruto con el mismo
// nombre de archivo que «Exportar ficha (JSON)» de la cabecera.
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { v3Snapshot } from '../../tests/v3Support'

const exportSiteJson = vi.fn()
vi.mock('../actions', async (importOriginal) => ({ ...(await importOriginal<typeof import('../actions')>()), exportSiteJson }))

const { SourcesTab } = await import('./SourcesTab')
const { siteExportText } = await import('../actions')

/** Busca un elemento en el árbol devuelto por el componente (sin DOM ni render). */
function findButton(node: ReactNode, label: string): ReactElement<{ onClick: () => void; children: ReactNode }> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButton(child, label)
      if (found) return found
    }
    return null
  }
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return null
  if (node.type === 'button' && node.props.children === label) return node as ReactElement<{ onClick: () => void; children: ReactNode }>
  return findButton(node.props.children, label)
}

afterEach(() => exportSiteJson.mockReset())

describe('Fuentes · «Descargar ficha (JSON)»', () => {
  const site = v3Snapshot.candidates[0]!
  const search = v3Snapshot.search

  it('usa la misma exportación que la cabecera (buildExport con el alcance de la búsqueda)', () => {
    const tree = SourcesTab({ site, manifest: v3Snapshot.manifest, search, visual: { status: 'loading' }, onShowOnMap: () => undefined })
    const button = findButton(tree, 'Descargar ficha (JSON)')
    expect(button).not.toBeNull()
    button!.props.onClick()
    expect(exportSiteJson).toHaveBeenCalledWith(site, search)
  })

  it('la ficha exportada trae el aviso de honestidad y search_context', () => {
    const doc = JSON.parse(siteExportText(site, search)) as Record<string, unknown>
    expect(Object.keys(doc)).toEqual(['exported_from', 'notice', 'site', 'search_context'])
    expect(doc.notice).toBe('Screening preliminar: no aprueba el sitio, no autoriza acceso y no declara novedad.')
    expect(doc.search_context).not.toBeNull()
    expect((doc.site as { site_id: string }).site_id).toBe(site.site_id)
  })
})
