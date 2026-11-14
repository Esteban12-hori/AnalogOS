/**
 * Una sola región de anuncios para todo el sitio (§1.24): `role=status` con debounce de
 * 300–600 ms y `role=alert` para errores. Las features llaman `announce()`; nunca crean su
 * propia región aria-live (excepción documentada: el carrusel de métricas en móvil).
 */
export type AnnouncementKind = 'status' | 'alert'

export interface Announcement {
  text: string
  kind: AnnouncementKind
  at: number
}

type Listener = (announcement: Announcement) => void
const listeners = new Set<Listener>()

/** Anuncia un texto. Los `status` seguidos se agrupan: solo se lee el último. */
export function announce(text: string, kind: AnnouncementKind = 'status'): void {
  const trimmed = text.trim()
  if (!trimmed) return
  const announcement: Announcement = { text: trimmed, kind, at: Date.now() }
  for (const listener of [...listeners]) listener(announcement)
}

export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Debounce de los anuncios de estado (ms). */
export const ANNOUNCE_DEBOUNCE_MS = 450
