/**
 * Pestañas de modo Explorar | Misión (patrón APG, pulgar CSS sin WebGL). El punto en «Misión»
 * avisa de resultados nuevos. Controlan el dock (≥1100) o la hoja (<1100): `#mode-panel`.
 */
import { uiActions, type UiMode } from '../state/ui'
import { TabList, type TabItem } from './Tabs'

export const MODE_PANEL_ID = 'mode-panel'

interface ModeTabsProps {
  mode: UiMode
  /** Hay resultados de misión que el usuario aún no vio. */
  unseen: boolean
}

export function ModeTabs({ mode, unseen }: ModeTabsProps) {
  const items: TabItem<UiMode>[] = [
    { id: 'explorar', label: 'Explorar' },
    {
      id: 'mision',
      label: <>Misión{unseen && <i className="mode-dot" aria-hidden="true" />}</>,
      ariaLabel: unseen ? 'Misión, hay resultados nuevos' : 'Misión',
    },
  ]
  return (
    <TabList idPrefix="mode" label="Modo" items={items} active={mode} onChange={uiActions.setMode} className="mode-tabs" controls={MODE_PANEL_ID}>
      <span className="mode-thumb" data-mode={mode} aria-hidden="true" />
    </TabList>
  )
}
