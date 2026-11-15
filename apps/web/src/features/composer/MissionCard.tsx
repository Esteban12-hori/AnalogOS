/**
 * "Your mission" (ADR-013): the team planner, history, and Undo. Slots `left.mission`
 * (panel ≥1440 in Mission) and `full.mission` (S2 tab). The full card is downloaded
 * with the mission chunk; in the meantime, a static header with no figures is shown.
 */
import { Suspense } from 'react'
import type { MissionCardProps } from './index'
import { LazyMissionPanel } from './panel'

export function MissionCard({ data, placement, promise }: MissionCardProps) {
  return (
    <Suspense
      fallback={
        <section className="composer-card" data-placement={placement} aria-busy="true" aria-label="Your mission">
          <h2 className="composer-card-title">Your mission</h2>
          <p className="composer-card-note">Loading the mission card…</p>
        </section>
      }
    >
      <LazyMissionPanel data={data} placement={placement} promise={promise} />
    </Suspense>
  )
}
