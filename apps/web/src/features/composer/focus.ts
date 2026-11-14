/** Canal para enfocar el composer desde fuera (tecla «/», botón «✦ Refinar»). */
export const COMPOSER_FOCUS_EVENT = 'analogos:focus-composer'

let pending = false

/**
 * Pide el foco del campo de misión. Si el formulario aún no se montó (cambio de modo o chunk
 * diferido en camino), lo toma al montarse.
 */
export function focusComposer(): void {
  pending = true
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMPOSER_FOCUS_EVENT))
}

/** El formulario consume el pedido pendiente (true = debe enfocarse). */
export function takeFocusRequest(): boolean {
  const request = pending
  pending = false
  return request
}
