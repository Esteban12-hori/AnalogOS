/** STUB de «Tu misión» (incremento 9): sin perfil todavía; nada inventado. */
import { GLYPH } from '../../shell/public'
import type { MissionCardProps } from './index'

export function MissionCard({ placement }: MissionCardProps) {
  return (
    <section className="mission-stub" data-placement={placement} aria-labelledby={`mission-title-${placement}`}>
      <h2 id={`mission-title-${placement}`}>Tu misión</h2>
      <p>
        <span aria-hidden="true">{GLYPH.ai}</span> Describe el trabajo que quieres probar. La IA solo propondrá niveles por criterio;
        el % lo calculará el motor determinista.
      </p>
      <p className="mission-stub-pending">Perfil de misión: por calcular.</p>
    </section>
  )
}
