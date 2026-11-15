# Revisión y aceptación M7 — Codex

Fecha: 2026-11-14. Implementación: Claude Desktop Code. Dirección, revisión y aceptación: Codex. La aceptación científica inicial se hizo sobre `57b3a97bc13b712e98dae64ae28511fb2782c6c3`; sus comprobaciones y paquete de 18 entradas quedan como evidencia histórica. Posteriormente Dan autorizó actualizar `dev` y Codex integró el rediseño remoto.

## Revisión de integración para dev

La entrega vigente reúne el piloto de `1302ed8` con el globo, MapLibre, ficha flotante, visualización de magnitudes y series del equipo. Yungay conserva REF y queda fuera del ranking en todas las vistas. Se corrigieron rutas de las siete imágenes v3, propagación de rankings y el encaje del selector/ficha con nombres largos. La búsqueda auditable y el filtro por país permanecen en una sección propia. ADR-006/007 del equipo se preservan; el de descubrimiento se renumera ADR-008.

- 177 pruebas Python, 69 web, TypeScript y build correctos. Nuevas regresiones: las siete rutas visuales v3, series de los siete sitios y REF sin puesto 7.
- ZIP: 30 entradas, 12.865.983 bytes; SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Repetido byte a byte y cotejado con dist; admite chunks, texturas y basemaps alcanzables sin relajar la validación del snapshot.
- Los once hashes del baseline científico v2 siguen idénticos. Los artefactos científicos y visuales v3 no cambian respecto del checkpoint aceptado. El ZIP histórico v2 se conserva en la versión remota del equipo.
- ZIP servido en `/AnalogOS/`: globo, candidato argentino, su Sentinel-2 en mapa 2D, filtro Argentina y Yungay verificados. Escritorio y móvil 390 px sin desborde horizontal. Sin errores de aplicación registrados en ese servidor local.
- Captura vigente: `submission/assets/analogos-integrated-dev.jpg`. Reproducción: `source .venv/bin/activate && npm run verify`, después `npm run release:package`.

Esta integración autoriza la entrega a `dev`; los límites científicos de abajo se mantienen. Las comprobaciones históricas sin red no se presentan como una nueva auditoría de todos los servicios opcionales del rediseño.

## Decisión

Aceptado como piloto regional preliminar de AnalogOS. Se evaluaron 50 ventanas en dos regiones de prueba de Chile y Argentina (≈22.274 km²), se preseleccionaron seis mediante reglas versionadas y se caracterizaron con datos reales. Yungay queda como referencia conocida, comparable y exportable, fuera del ranking. Ninguno de los seis resultados es un análogo nuevo confirmado.

## Evidencia independiente

| Comprobación de Codex | Resultado |
|---|---|
| `source .venv/bin/activate && npm run verify` | 167 pruebas Python, 39 web, contratos, TypeScript y Vite correctos |
| Reconstrucción v3 en directorio temporal | Sus seis JSON coinciden byte por byte con los artefactos entregados |
| Reconstrucción v2 tras modificar código compartido | Sus cinco archivos coinciden byte por byte con el histórico |
| Once hashes tomados antes de comenzar | Snapshot, configuración, perfil e imágenes v2 intactos |
| Coordenadas bibliográficas | 30 conversiones de grados/minutos/segundos verificadas; cinco puntos dentro de la región chilena explican cuatro ventanas excluidas |
| Preselección | Las 50 prioridades recalculadas de forma independiente y la selección voraz reproducen los seis IDs; distancia mínima entre centros seleccionados ≈29,831 km |
| Puntuaciones | Cálculo independiente desde topografía, estadísticas mensuales Sentinel-2 y respuestas POWER reproduce las seis similitudes y confianzas |
| Calidad y procedencia | Reproducidos y corregidos rechazos por banda ausente, intervalo incorrecto, NoData negativo, relleno POWER e identidad de petición incompatible |
| Resultado negativo | Builder probado con shortlist vacía y stores de etapa 2 ausentes o vacíos; conserva Yungay y no inventa fuentes adquiridas |
| Caché | Las 18 entradas multifuente y ambos paquetes visuales se reutilizan con clientes de red/login sustituidos por fallos deliberados; no se invocan |
| Imágenes | Inspección de los seis PNG nuevos; observaciones preliminares incorporadas por ficha, sin deducir instalaciones, propiedad o permisos |
| Navegador independiente | Filtro Argentina, ficha argentina, Yungay, comparación, exportación JSON y selección de mapa por teclado; revisión móvil y escritorio sin desbordamiento horizontal observado |
| Exportación real | Archivo descargado desde el navegador conserva país AR, rol candidate, origen grid_search y estado regional_precedent |
| ZIP extraído | Aplicación e imágenes locales cargan en `/` y `/AnalogOS/`; consola de aplicación sin errores durante la revisión |
| Empaquetado repetido por Codex | 18 entradas idénticas al build; ZIP repetido idéntico al entregado; checksum correcto |
| Higiene | `git diff --check` correcto; no se modificaron dependencias, remotos ni baseline científico |

Los tests automatizados cubren imagen ausente/metadata inválida, selección vacía, contratos históricos y v3, autoridades por país, fallos por ventana y empaquetado seguro. No sustituyen una revisión científica o de campo.

## Correcciones devueltas durante la supervisión

- Registrar falta de tesela o NoData por ventana, manteniendo el experimento restante.
- Medir completitud Sentinel-2 contra los meses esperados y validar intervalos, bandas, rangos y conteos.
- Vincular la reutilización de datos a la petición exacta también durante el build.
- No puntuar valores de relleno o respuestas climáticas inválidas.
- Advertir que POWER representa contexto regional de una celda mayor que las ventanas. Valores coincidentes no bastan para afirmar que dos consultas identificaron la misma celda.
- Incorporar observaciones visuales por candidato sin convertirlas en identificación territorial ni modificar scores.
- Soportar una búsqueda sin preselección y distinguir ventanas intentadas de evaluadas.

## Entrega científica aceptada antes de integrar el rediseño (histórica)

- ZIP: `submission/analogos-static.zip`, 9.012.267 bytes.
- SHA-256: `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415`.
- Reporte científico y bibliográfico: `docs/DISCOVERY_REPORT.md`.
- Decisión: ADR-008 aceptado.
- Captura de conjunto: `submission/assets/analogos-pilot-overview.jpg`.

## Límites y siguiente trabajo

La aprobación se refiere a la implementación y a la reproducibilidad del piloto, no a la aptitud de los terrenos. Los seis candidatos conservan `regional_precedent` y `requires_review`. Falta revisar textos completos y coordenadas de los estudios argentinos, cruzar capas territoriales oficiales y contrastar localmente POWER en la Puna. La resolución topográfica de ~460–480 m no mide obstáculos o tracción a escala de rueda. Los pesos y calidades asignadas se mantienen; confianza no equivale a probabilidad de éxito.

La siguiente unidad de implementación debe priorizar el descarte territorial y la evidencia bibliográfica antes de ampliar regiones. Queda pendiente una nueva asignación explícita a Claude. No se inicia automáticamente otro barrido ni publicación.
