/** Canal para enfocar el composer desde fuera (tecla «/», botón «✦ Refinar»). */
export const COMPOSER_FOCUS_EVENT = 'analogos:focus-composer'

export function focusComposer(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMPOSER_FOCUS_EVENT))
}
