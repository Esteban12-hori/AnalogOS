/** STUB de la tarjeta compacta del riel para un ◆ (incremento 3): sin datos inventados. */
import { GLYPH } from '../../shell/public'
import type { ReferenceCardProps } from './index'

export function ReferenceCard({ analogId }: ReferenceCardProps) {
  return (
    <div className="place-stub">
      <p className="place-stub-head">
        <span>{GLYPH.reference} Referencia mundial · por calcular</span>
      </p>
      <p className="place-stub-note">Análogo «{analogId}»: catálogo con fuentes por publicar (incremento 3).</p>
    </div>
  )
}
