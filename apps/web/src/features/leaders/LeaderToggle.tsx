/** "Lines" toggle next to the stage controls (slot `stage.hud`). */
import { setLeadersEnabled, useLeadersEnabled } from './preference'
import './leaders-toggle.css'

export function LeaderToggle() {
  const enabled = useLeadersEnabled()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className="leaders-toggle"
      onClick={() => setLeadersEnabled(!enabled)}
    >
      <span className="leaders-toggle-track" aria-hidden="true"><span className="leaders-toggle-knob" /></span>
      Lines<span className="leaders-toggle-state" aria-hidden="true">: {enabled ? 'on' : 'off'}</span>
    </button>
  )
}
