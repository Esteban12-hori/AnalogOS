/**
 * Slot `rail.reference` / `sheet.reference`: the card for a ◆ lives in a deferred chunk
 * (it does not weigh down the main chunk). Same signature as before; the Suspense is its own so that the
 * shell does not need one.
 */
import { lazy, Suspense } from 'react'
import { useT } from '../../i18n'
import { tPlaces } from '../../i18n/messages/places'
import type { ReferenceCardProps } from './index'

const load = () => import('./ReferenceCardView')
const View = lazy(load)

/** Preloads the card (on hover or focus of a ◆ in the carousel): the rail opens without waiting. */
export function preloadReferenceCard(): void {
  void load()
}

export function ReferenceCard(props: ReferenceCardProps) {
  const t = useT(tPlaces)
  return (
    <Suspense fallback={<p className="places-state" aria-busy="true">{t('ref.loading')}</p>}>
      <View {...props} />
    </Suspense>
  )
}
