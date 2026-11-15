/**
 * "Your mission" (ADR-013): the team planner, history, and Undo. Slots `left.mission`
 * (panel ≥1440 in Mission) and `full.mission` (S2 tab). The full card is downloaded
 * with the mission chunk; in the meantime, a static header with no figures is shown.
 */
import { Suspense } from 'react'
import { useT } from '../../i18n'
import { tComposer } from '../../i18n/messages/composer'
import type { MissionCardProps } from './index'
import { LazyMissionPanel } from './panel'

export function MissionCard({ data, placement, promise }: MissionCardProps) {
  const t = useT(tComposer)
  return (
    <Suspense
      fallback={
        <section className="composer-card" data-placement={placement} aria-busy="true" aria-label={t('profile.title')}>
          <h2 className="composer-card-title">{t('profile.title')}</h2>
          <p className="composer-card-note">{t('card.loading')}</p>
        </section>
      }
    >
      <LazyMissionPanel data={data} placement={placement} promise={promise} />
    </Suspense>
  )
}
