/**
 * Pestañas según el patrón APG (activación automática): flechas, Inicio y Fin; tabindex
 * itinerante. Las usa el armazón (modo, riel y ficha completa).
 *
 * La tira se desplaza sin barra (la ficha tiene hasta 9 pestañas): la lista marca con
 * `data-more-start` / `data-more-end` si quedan pestañas ocultas a cada lado, para que el CSS
 * difumine ese borde, y lleva la pestaña activa a la parte visible sin mover la hoja ni el riel.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  /** Contenido accesible si `label` no es texto plano. */
  ariaLabel?: string
}

interface TabListProps<T extends string> {
  idPrefix: string
  label: string
  items: readonly TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  /** id del panel controlado por todas las pestañas (si es uno solo). */
  controls?: string
  children?: ReactNode
}

export function tabId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`
}

export function panelId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`
}

/** Índice siguiente según la tecla (null si la tecla no mueve el foco). */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/** Ancho del difuminado del borde (px): la pestaña activa se lleva fuera de él. */
export const TAB_EDGE_FADE = 28

/** ¿Quedan pestañas ocultas al inicio o al final de la tira? (tolerancia de 1 px por redondeo) */
export function overflowEdges(el: { scrollLeft: number; scrollWidth: number; clientWidth: number }): { start: boolean; end: boolean } {
  const max = el.scrollWidth - el.clientWidth
  if (max <= 1) return { start: false, end: false }
  return { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 }
}

/**
 * Desplazamiento horizontal que deja la pestaña `[left, right]` (relativa al borde visible de la
 * lista, de ancho `width`) fuera de los difuminados; 0 si ya se ve.
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
  // Solo desplaza la tira (scrollIntoView movería también la hoja o el riel).
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
          // Solo se renderiza el panel activo: las pestañas inactivas no apuntan a un id inexistente.
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
