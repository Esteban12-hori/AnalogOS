/**
 * Popovers nativos (atributo `popover`, capa superior del navegador): no los recortan el dock
 * ni la hoja, y traen Esc y cierre al tocar fuera. Aquí solo se colocan sobre su ancla.
 */
export function isPopoverOpen(element: HTMLElement | null): boolean {
  try {
    return element?.matches(':popover-open') ?? false
  } catch {
    return false
  }
}

/** ¿Hay algún popover abierto? (Esc lo cierra primero; no cancela la misión). */
export function anyPopoverOpen(): boolean {
  try {
    return document.querySelector(':popover-open') !== null
  } catch {
    return false
  }
}

export function hidePopover(element: HTMLElement | null): void {
  if (element && isPopoverOpen(element)) element.hidePopover()
}

/** Coloca el popover encima del ancla, dentro del área bajo la barra superior. */
export function placeAbove(popover: HTMLElement | null, anchor: HTMLElement | null, preferredWidth: number): void {
  if (!popover || !anchor) return
  const rect = anchor.getBoundingClientRect()
  const vw = window.innerWidth
  const width = Math.min(preferredWidth, vw - 24)
  const left = Math.min(Math.max(12, rect.left), Math.max(12, vw - width - 12))
  const style = getComputedStyle(anchor)
  const top = (Number.parseFloat(style.getPropertyValue('--topbar-h')) || 56) + (Number.parseFloat(style.getPropertyValue('--banner-h')) || 22)
  Object.assign(popover.style, {
    left: `${Math.round(left)}px`,
    bottom: `${Math.round(window.innerHeight - rect.top + 8)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.max(160, Math.round(rect.top - top - 20))}px`,
  })
}
