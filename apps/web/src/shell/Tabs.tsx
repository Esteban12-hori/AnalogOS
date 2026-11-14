/**
 * Pestañas según el patrón APG (activación automática): flechas, Inicio y Fin; tabindex
 * itinerante. Las usa el armazón (modo, riel y ficha completa).
 */
import type { KeyboardEvent, ReactNode } from 'react'

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

export function TabList<T extends string>({ idPrefix, label, items, active, onChange, className, controls, children }: TabListProps<T>) {
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
    <div role="tablist" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {children}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={tabId(idPrefix, item.id)}
          aria-selected={item.id === active}
          aria-controls={controls ?? panelId(idPrefix, item.id)}
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
