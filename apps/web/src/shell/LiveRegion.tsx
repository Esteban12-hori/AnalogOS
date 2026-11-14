/** Región única de anuncios (role=status con debounce + role=alert). Ver shell/announce.ts. */
import { useEffect, useState } from 'react'
import { ANNOUNCE_DEBOUNCE_MS, subscribeAnnouncements } from './announce'

export function LiveRegion() {
  const [status, setStatus] = useState('')
  const [alert, setAlert] = useState('')
  useEffect(() => {
    let timer = 0
    const unsubscribe = subscribeAnnouncements((announcement) => {
      if (announcement.kind === 'alert') {
        setAlert(announcement.text)
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setStatus(announcement.text), ANNOUNCE_DEBOUNCE_MS)
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [])
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</div>
      <div className="sr-only" role="alert" aria-atomic="true">{alert}</div>
    </>
  )
}
