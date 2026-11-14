/**
 * Slot `rail.reference` / `sheet.reference`: la tarjeta de un ◆ vive en un chunk diferido
 * (no pesa en el chunk principal). Misma firma que antes; el Suspense es propio para que el
 * armazón no necesite uno.
 */
import { lazy, Suspense } from 'react'
import type { ReferenceCardProps } from './index'

const load = () => import('./ReferenceCardView')
const View = lazy(load)

/** Precarga la tarjeta (al pasar o enfocar un ◆ en el carrusel): el riel abre sin espera. */
export function preloadReferenceCard(): void {
  void load()
}

export function ReferenceCard(props: ReferenceCardProps) {
  return (
    <Suspense fallback={<p className="places-state" aria-busy="true">Cargando la referencia…</p>}>
      <View {...props} />
    </Suspense>
  )
}
