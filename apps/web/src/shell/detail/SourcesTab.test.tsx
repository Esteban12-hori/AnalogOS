// Every download from the record uses the team's `buildExport` (honesty notice and search scope):
// the button on the Sources tab no longer exports the raw candidate with the same
// file name as the header's "Export record (JSON)".
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { v3Snapshot } from '../../tests/v3Support'

const exportSiteJson = vi.fn()
vi.mock('../actions', async (importOriginal) => ({ ...(await importOriginal<typeof import('../actions')>()), exportSiteJson }))

const { SourcesTab } = await import('./SourcesTab')
const { siteExportText } = await import('../actions')

/** Finds an element in the tree returned by the component (no DOM or render). */
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

describe('Sources · “Download record (JSON)”', () => {
  const site = v3Snapshot.candidates[0]!
  const search = v3Snapshot.search

  it('uses the same export as the header (buildExport with the search scope)', () => {
    const tree = SourcesTab({ site, manifest: v3Snapshot.manifest, search, visual: { status: 'loading' }, onShowOnMap: () => undefined })
    const button = findButton(tree, 'Download site record (JSON source record)')
    expect(button).not.toBeNull()
    button!.props.onClick()
    expect(exportSiteJson).toHaveBeenCalledWith(site, search)
  })

  it('the exported sheet carries the honesty notice and search_context', () => {
    const doc = JSON.parse(siteExportText(site, search)) as Record<string, unknown>
    expect(Object.keys(doc)).toEqual(['exported_from', 'notice', 'site', 'search_context'])
    expect(doc.notice).toBe('Preliminary screening: it does not approve the site, authorize access or declare novelty. The site object is the source record from the snapshot, kept in its original wording (mostly Spanish).')
    expect(doc.search_context).not.toBeNull()
    expect((doc.site as { site_id: string }).site_id).toBe(site.site_id)
  })
})
