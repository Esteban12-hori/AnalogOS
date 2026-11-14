import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

interface LazySectionProps {
  /** Id del ancla: el marcador lo conserva para que la navegación y el scroll-spy funcionen. */
  id: string
  className: string
  minHeight: number
  children: ReactNode
}

/**
 * Monta su contenido (normalmente un componente `lazy`) solo cuando el marcador se
 * acerca a la pantalla. Así el JavaScript de las secciones bajo el pliegue no compite
 * con el globo en la primera carga.
 */
export function LazySection({ id, className, minHeight, children }: LazySectionProps) {
  const [visible, setVisible] = useState(false)
  const marker = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = marker.current
    if (visible || !element) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible(true)
    }, { rootMargin: '900px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [visible])

  const placeholder = <section id={id} ref={marker} className={`${className} lazy-placeholder`} style={{ minHeight }} aria-busy="true" />
  if (!visible) return placeholder
  return <Suspense fallback={placeholder}>{children}</Suspense>
}
