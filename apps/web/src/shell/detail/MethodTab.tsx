/** Pestaña «Método» de la ficha completa (antes, sección bajo el pliegue). */
export function MethodTab() {
  const summaryUrl = `${import.meta.env.BASE_URL}${import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v2'}/analysis-summary.json`
  return (
    <div className="method-tab">
      <h3>La comparación ocurre a la misma escala.</h3>
      <p>
        NASADEM se mosaica y agrega desde ~30 m a ~480 m antes de compararlo con MOLA. Sentinel-2 aporta doce observaciones
        mensuales de superficie y POWER solo contexto climático regional.
      </p>
      <ol className="method-steps">
        <li><b>01</b><strong>Referencia MOLA</strong><span>Entorno regional de Jezero · ~451 m nominal</span></li>
        <li><b>02</b><strong>Terreno NASADEM</strong><span>Mosaico multitesela · bloques 16×16 · ~480 m</span></li>
        <li><b>03</b><strong>Superficie Sentinel-2</strong><span>12 mosaicos mensuales · SCL, NDVI y BSI · ~30 m</span></li>
        <li><b>04</b><strong>Decisión separada</strong><span>Similitud ≠ confianza ≠ factibilidad</span></li>
      </ol>
      <a href={summaryUrl} target="_blank" rel="noreferrer">Abrir análisis auditable ↗</a>
    </div>
  )
}
