/**
 * Explore | Mission mode tabs (APG pattern, CSS thumb without WebGL). The dot on "Mission"
 * signals new results. They control the dock (≥1100) or the sheet (<1100): `#mode-panel`.
 */
import { uiActions, type UiMode } from '../state/ui'
import { TabList, type TabItem } from './Tabs'

export const MODE_PANEL_ID = 'mode-panel'

interface ModeTabsProps {
  mode: UiMode
  /** There are mission results the user has not yet seen. */
  unseen: boolean
}

export function ModeTabs({ mode, unseen }: ModeTabsProps) {
  const items: TabItem<UiMode>[] = [
    { id: 'explorar', label: 'Explore' },
    {
      id: 'mision',
      label: <>Mission{unseen && <i className="mode-dot" aria-hidden="true" />}</>,
      ariaLabel: unseen ? 'Mission, new results available' : 'Mission',
    },
  ]
  return (
    <TabList idPrefix="mode" label="Mode" items={items} active={mode} onChange={uiActions.setMode} className="mode-tabs" controls={MODE_PANEL_ID}>
      <span className="mode-thumb" data-mode={mode} aria-hidden="true" />
    </TabList>
  )
}
