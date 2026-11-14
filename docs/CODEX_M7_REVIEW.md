# Revisión y aceptación M7 — Codex

Fecha: 2026-11-14. Implementación: Claude Desktop Code. Dirección, revisión y aceptación: Codex. Rama: `dev`, sobre `57b3a97bc13b712e98dae64ae28511fb2782c6c3`. Sin commit, push ni publicación de este cambio.

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

## Entrega aceptada

- ZIP: `submission/analogos-static.zip`, 9.012.267 bytes.
- SHA-256: `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415`.
- Reporte científico y bibliográfico: `docs/DISCOVERY_REPORT.md`.
- Decisión: ADR-006 aceptado.
- Captura de conjunto: `submission/assets/analogos-pilot-overview.jpg`.

## Límites y siguiente trabajo

La aprobación se refiere a la implementación y a la reproducibilidad del piloto, no a la aptitud de los terrenos. Los seis candidatos conservan `regional_precedent` y `requires_review`. Falta revisar textos completos y coordenadas de los estudios argentinos, cruzar capas territoriales oficiales y contrastar localmente POWER en la Puna. La resolución topográfica de ~460–480 m no mide obstáculos o tracción a escala de rueda. Los pesos y calidades asignadas se mantienen; confianza no equivale a probabilidad de éxito.

La siguiente unidad de implementación debe priorizar el descarte territorial y la evidencia bibliográfica antes de ampliar regiones. Queda pendiente una nueva asignación explícita a Claude. No se inicia automáticamente otro barrido ni publicación.
