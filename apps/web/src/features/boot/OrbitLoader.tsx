/** STUB de la órbita reutilizable (incremento 7): indicador estático con la fase real. */
import type { OrbitLoaderProps } from './index'

export function OrbitLoader({ active, label, placement = 'inline' }: OrbitLoaderProps) {
  if (!active) return null
  return (
    <span className="orbit-stub" data-placement={placement}>
      <span className="orbit-stub-ring" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
