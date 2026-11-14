/** Tramo y tamaño del viewport, actualizados al redimensionar (un render por cuadro como máximo). */
import { useSyncExternalStore } from 'react'
import { viewportLayout, type ViewportLayout } from './layout'

const SERVER: ViewportLayout = viewportLayout(1440, 900)
let cached: ViewportLayout | null = null

function read(): ViewportLayout {
  if (typeof window === 'undefined') return SERVER
  const { innerWidth: width, innerHeight: height } = window
  if (!cached || cached.width !== width || cached.height !== height) cached = viewportLayout(width, height)
  return cached
}

function subscribe(listener: () => void): () => void {
  let frame = 0
  const onResize = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0
      listener()
    })
  }
  window.addEventListener('resize', onResize)
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
  }
}

export function useViewportLayout(): ViewportLayout {
  return useSyncExternalStore(subscribe, read, () => SERVER)
}
