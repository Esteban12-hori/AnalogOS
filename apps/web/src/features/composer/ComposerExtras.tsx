/**
 * Composer extras (loaded with the mission chunk when entering Mission): recents ⟲
 * (local history) and suggestions for starting a test without AI.
 *
 * The suggestions use the team's planner as is: "Use example" (`exampleState`),
 * "Add requirement: …" (`defaultMetricRequirement`, which arrives WITHOUT a value: the user types the
 * threshold) and "Evaluate a sector…". They never propose figures.
 */
import { useRef } from 'react'
import { useT } from '../../i18n'
import { tPlanner } from '../../i18n/messages/planner'
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
  const t = useT(tPlanner)
  const recents = recentTexts(history)
  if (recents.length === 0) return null
  return (
    <>
      <button ref={button} type="button" className="composer-icon" aria-label={t('recents')} title={t('recents')} popoverTarget={id}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={t('recents')}
        className="composer-popover composer-recent"
        onBeforeToggle={(event) => {
          if (event.newState === 'open') placeAbove(popover.current, button.current, 360)
        }}
      >
        <p className="composer-popover-title">{t('recents')}</p>
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

/** Requirements that can be added with one click (the user types the value); chip labels in English. */
export const METRIC_SUGGESTIONS: ReadonlyArray<{ metric: MetricId; label: string }> = (
  ['median_slope_degree', 'terrain_roughness_meter', 'local_relief_meter', 'nonvegetated_fraction', 'polygon_area_km2', 'country'] as const
).map((metric) => ({ metric, label: tPlanner.in('en')(`chips.${metric}`) }))

/** Suggestions: they appear when the composer is focused, above it (the dock does not grow). */
export function SuggestionChips() {
  const t = useT(tPlanner)
  return (
    <div className="composer-chips" role="group" aria-label={t('chips.group')}>
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.loadExample())}>
        {t('chips.example')}
      </button>
      <span className="composer-chips-label" aria-hidden="true">{t('chips.add')}</span>
      {METRIC_SUGGESTIONS.map((item) => {
        const label = t(`chips.${item.metric}`)
        return (
          <button
            key={item.metric}
            type="button"
            className="composer-chip"
            aria-label={t('chips.addAria', { label })}
            onClick={() => withController((mission) => mission.addMetricRequirement(item.metric))}
          >
            + {label}
          </button>
        )
      })}
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.startSector())}>
        {t('chips.sector')}
      </button>
    </div>
  )
}
