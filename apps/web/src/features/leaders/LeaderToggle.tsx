/** "Lines" toggle next to the stage controls (slot `stage.hud`). */
import { useT } from '../../i18n'
import { tLeaders } from '../../i18n/messages/leaders'
import { setLeadersEnabled, useLeadersEnabled } from './preference'
import './leaders-toggle.css'

export function LeaderToggle() {
  const enabled = useLeadersEnabled()
  const t = useT(tLeaders)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className="leaders-toggle"
      onClick={() => setLeadersEnabled(!enabled)}
    >
      <span className="leaders-toggle-track" aria-hidden="true"><span className="leaders-toggle-knob" /></span>
      {t('toggle')}<span className="leaders-toggle-state" aria-hidden="true">: {enabled ? t('toggle.on') : t('toggle.off')}</span>
    </button>
  )
}
