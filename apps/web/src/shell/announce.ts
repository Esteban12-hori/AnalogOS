/**
 * A single announcement region for the entire site (§1.24): `role=status` with a debounce of
 * 300–600 ms and `role=alert` for errors. Features call `announce()`; they never create their
 * own aria-live region (documented exception: the metrics carousel on mobile).
 */
export type AnnouncementKind = 'status' | 'alert'

export interface Announcement {
  text: string
  kind: AnnouncementKind
  at: number
}

type Listener = (announcement: Announcement) => void
const listeners = new Set<Listener>()

/** Announces a text. Consecutive `status` are grouped: only the last one is read. */
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

/** Debounce for status announcements (ms). */
export const ANNOUNCE_DEBOUNCE_MS = 450
