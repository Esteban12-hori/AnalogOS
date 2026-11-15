/**
 * Tabs following the APG pattern (automatic activation): arrow keys, Home and End; roving
 * tabindex. Used by the shell (mode, rail and full record).
 *
 * The strip scrolls without a scrollbar (the record has up to 9 tabs): the list marks with
 * `data-more-start` / `data-more-end` whether there are hidden tabs on each side, so that the CSS
 * fades that edge, and brings the active tab into the visible area without moving the sheet or the rail.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  /** Accessible content if `label` is not plain text. */
  ariaLabel?: string
}

interface TabListProps<T extends string> {
  idPrefix: string
  label: string
  items: readonly TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  /** id of the panel controlled by all the tabs (if there is only one). */
  controls?: string
  children?: ReactNode
}

export function tabId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`
}

export function panelId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`
}

/** Next index according to the key (null if the key does not move focus). */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/** Width of the edge fade (px): the active tab is moved out of it. */
export const TAB_EDGE_FADE = 28

/** Are there hidden tabs at the start or the end of the strip? (tolerance of 1 px for rounding) */
export function overflowEdges(el: { scrollLeft: number; scrollWidth: number; clientWidth: number }): { start: boolean; end: boolean } {
  const max = el.scrollWidth - el.clientWidth
  if (max <= 1) return { start: false, end: false }
  return { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 }
}

/**
 * Horizontal scroll offset that places tab `[left, right]` (relative to the visible edge of the
 * list, of width `width`) outside the fades; 0 if it is already visible.
 */
export function revealDelta(left: number, right: number, width: number, fade = TAB_EDGE_FADE): number {
  if (left < fade) return left - fade
  if (right > width - fade) return Math.min(right - (width - fade), left - fade)
  return 0
}

function useOverflowEdges(list: RefObject<HTMLDivElement | null>, count: number, activeId: string) {
  useEffect(() => {
    const el = list.current
    if (!el) return
    const update = () => {
      const { start, end } = overflowEdges(el)
      el.toggleAttribute('data-more-start', start)
      el.toggleAttribute('data-more-end', end)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [list, count])
  // Only scrolls the strip (scrollIntoView would also move the sheet or the rail).
  useEffect(() => {
    const el = list.current
    const tab = el ? document.getElementById(activeId) : null
    if (!el || !tab || el.scrollWidth - el.clientWidth <= 1) return
    const box = el.getBoundingClientRect()
    const rect = tab.getBoundingClientRect()
    const delta = revealDelta(rect.left - box.left, rect.right - box.left, el.clientWidth)
    if (delta !== 0) el.scrollLeft += delta
  }, [list, activeId])
}

export function TabList<T extends string>({ idPrefix, label, items, active, onChange, className, controls, children }: TabListProps<T>) {
  const list = useRef<HTMLDivElement>(null)
  useOverflowEdges(list, items.length, tabId(idPrefix, active))
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === active)
    const next = nextTabIndex(event.key, index, items.length)
    if (next === null) return
    event.preventDefault()
    const target = items[next]
    if (!target) return
    onChange(target.id)
    document.getElementById(tabId(idPrefix, target.id))?.focus()
  }
  return (
    <div ref={list} role="tablist" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {children}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={tabId(idPrefix, item.id)}
          aria-selected={item.id === active}
          // Only the active panel is rendered: inactive tabs do not point to a nonexistent id.
          aria-controls={controls ?? (item.id === active ? panelId(idPrefix, item.id) : undefined)}
          aria-label={item.ariaLabel}
          tabIndex={item.id === active ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
