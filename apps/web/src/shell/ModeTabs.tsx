/**
 * Explore | Mission mode tabs (APG pattern, CSS thumb without WebGL). The dot on "Mission"
 * signals new results. They control the dock (≥1100) or the sheet (<1100): `#mode-panel`.
 */
import { useT } from '../i18n'
import { tShell } from '../i18n/messages/shell'
import { uiActions, type UiMode } from '../state/ui'
import { TabList, type TabItem } from './Tabs'

export const MODE_PANEL_ID = 'mode-panel'

interface ModeTabsProps {
  mode: UiMode
  /** There are mission results the user has not yet seen. */
  unseen: boolean
}

export function ModeTabs({ mode, unseen }: ModeTabsProps) {
  const t = useT(tShell)
  const items: TabItem<UiMode>[] = [
    { id: 'explorar', label: t('mode.explore') },
    {
      id: 'mision',
      label: <>{t('mode.mission')}{unseen && <i className="mode-dot" aria-hidden="true" />}</>,
      ariaLabel: unseen ? t('mode.missionUnseen') : t('mode.mission'),
    },
  ]
  return (
    <TabList idPrefix="mode" label={t('mode.label')} items={items} active={mode} onChange={uiActions.setMode} className="mode-tabs" controls={MODE_PANEL_ID}>
      <span className="mode-thumb" data-mode={mode} aria-hidden="true" />
    </TabList>
  )
}
