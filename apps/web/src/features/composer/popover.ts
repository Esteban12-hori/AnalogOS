/**
 * Native popovers (`popover` attribute, the browser's top layer): the dock and the sheet do not clip them,
 * and they come with Esc and close-on-outside-tap built in. Here they are only positioned over their anchor.
 */
export function isPopoverOpen(element: HTMLElement | null): boolean {
  try {
    return element?.matches(':popover-open') ?? false
  } catch {
    return false
  }
}

/** Is any popover open? (Esc closes it first; it does not cancel the mission). */
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

/** Positions the popover above the anchor, within the area below the top bar. */
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
