/**
 * Composer extras (loaded with the mission chunk when entering Mission): recents ⟲
 * (local history) and suggestions for starting a test without AI.
 *
 * The suggestions use the team's planner as is: "Use example" (`exampleState`),
 * "Add requirement: …" (`defaultMetricRequirement`, which arrives WITHOUT a value: the user types the
 * threshold) and "Evaluate a sector…". They never propose figures.
 */
import { useRef } from 'react'
import type { MetricId } from '../../mission/types'
import { useComposer } from './composerStore'
import { recentTexts } from './history'
import { hidePopover, placeAbove } from './popover'
import { withController } from './runLoader'
import './extras.css'

export interface RecentsMenuProps {
  id: string
  onPick: (text: string) => void
}

/** ⟲ button and its popover with the latest texts evaluated in this browser. */
export function RecentsMenu({ id, onPick }: RecentsMenuProps) {
  const history = useComposer((state) => state.history)
  const button = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const recents = recentTexts(history)
  if (recents.length === 0) return null
  return (
    <>
      <button ref={button} type="button" className="composer-icon" aria-label="Recent tests" title="Recent tests" popoverTarget={id}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Recent tests"
        className="composer-popover composer-recent"
        onBeforeToggle={(event) => {
          if (event.newState === 'open') placeAbove(popover.current, button.current, 360)
        }}
      >
        <p className="composer-popover-title">Recent tests</p>
        <ul>
          {recents.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => {
                  hidePopover(popover.current)
                  onPick(text)
                }}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/** Requirements that can be added with one click (the user types the value). */
export const METRIC_SUGGESTIONS: ReadonlyArray<{ metric: MetricId; label: string }> = [
  { metric: 'median_slope_degree', label: 'slope' },
  { metric: 'terrain_roughness_meter', label: 'roughness' },
  { metric: 'local_relief_meter', label: 'relief' },
  { metric: 'nonvegetated_fraction', label: 'bare ground' },
  { metric: 'polygon_area_km2', label: 'area' },
  { metric: 'country', label: 'country' },
]

/** Suggestions: they appear when the composer is focused, above it (the dock does not grow). */
export function SuggestionChips() {
  return (
    <div className="composer-chips" role="group" aria-label="Start a test">
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.loadExample())}>
        Use example
      </button>
      <span className="composer-chips-label" aria-hidden="true">Add requirement</span>
      {METRIC_SUGGESTIONS.map((item) => (
        <button
          key={item.metric}
          type="button"
          className="composer-chip"
          aria-label={`Add requirement: ${item.label}`}
          onClick={() => withController((mission) => mission.addMetricRequirement(item.metric))}
        >
          + {item.label}
        </button>
      ))}
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.startSector())}>
        Evaluate a sector…
      </button>
    </div>
  )
}
