/** STUB del panel «Lectura de la comparativa» y su píldora (incremento 10). */
import { GLYPH } from '../../shell/public'
import type { ReadingPanelProps, ReadingPillProps } from './index'
import './analysis.css'

export function ReadingPanel({ placement }: ReadingPanelProps) {
  return (
    <section className="reading-stub" data-placement={placement} aria-labelledby={`reading-title-${placement}`}>
      <h2 id={`reading-title-${placement}`}>Lectura de la comparativa</h2>
      <p className="reading-stub-label"><span aria-hidden="true">{GLYPH.ai}</span> Interpretación de IA · interpreta, no puntúa</p>
      <p className="reading-stub-pending">Capa de hechos y análisis pregenerado: por calcular.</p>
      <p className="reading-stub-foot">Cifras: motor · Redacción: IA</p>
    </section>
  )
}

export function ReadingPill(props: ReadingPillProps) {
  void props
  return (
    <span className="reading-pill-stub" title="Lectura de la comparativa: por calcular">
      <span aria-hidden="true">{GLYPH.ai}</span> Lectura · por calcular
    </span>
  )
}
