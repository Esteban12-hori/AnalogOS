# M9 — Contexto geológico oficial por sector

## Estado y autorización

- **Task ID:** M9-GEOLOGY-CONTEXT
- **Owner:** Codex
- **Status:** in_progress — A/B aceptadas localmente por Codex; ejecutando publicación dev y comprobación remota. Claude sin nueva asignación.
- **Branch:** dev
- **Base commit:** 92392f1181133ee2b86fb6b13c97ec9b10de021d
- **Dirección/revisión/aceptación:** Codex. Dan aprobó la recomendación de `docs/GEOLOGY_FEASIBILITY.md`: «ok saquemoslo que quede perfecto y que nada se rompa». Completar el corte recomendado preservando M8. Codex se encarga de aceptación y salida a dev; Claude no hace commit, push ni deploy.
- M8 archivado en `project/tasks/M8_MISSION_RECOMMENDATION.md`. El working tree tiene documentación de investigación de Codex: preservarla. Baseline protegido en `/tmp/analogos-m9-baseline-hashes.json`.

## Primer checkpoint (solo lectura)

Lee AGENTS, CLAUDE, STATUS, último CHANGELOG, ADR-001 a 009, GEOLOGY_FEASIBILITY, investigación, pipeline/contexto visual, contratos, carga web y empaquetador. Confirma rama/HEAD. Devuelve un plan de archivos, contrato, algoritmo de cobertura/reparaciones, descargas y pruebas **antes de editar**. Espera aprobación de Codex. No subagentes ni trabajo paralelo. Luego implementar por fases A (datos/contrato) y B (UI/exportación/paquete), con revisión de Codex entre ambas.

## Resultado y alcance

Ficha «Contexto geológico» en los siete sectores actuales. Datos reales de SERNAGEOMIN distribuido por MMA (1:1M) y SEGEMAR (`sigam:e250K_UnidadGeologica`, 1:250K). Entender qué unidades están cartografiadas, cobertura/gaps/ambigüedad, escala, fuentes y qué verificar. Exportación geológica independiente y trazable. Offline, móvil/teclado, tolerante a ausencia/error. No modifica score, confianza, restricciones, IA ni recomendación M8.

No incluir mapa de polígonos geológicos, filtros/requisitos litológicos, nuevos perfiles/regiones/score, infraestructura ni IA geológica. No rellenar huecos con 1M/2.5M; se puede enlazar el visor oficial sin datos de reemplazo. Este es el primer corte de 20–32 h evaluado.

## A. Pipeline, contrato y datos

1. Contrato versionado para paquete independiente, p. ej. `artifacts/geology-context-v1/index.json`. Ciencia v2/v3 y perfiles inmutables. Siete site_ids y geometrías exactas, hash de candidatos y/o geometría canónica comprobado en Python/web. No heredar porcentajes a puntos, subpolígonos ni snapshots distintos.
2. Adaptadores públicos acotados y reproducibles, sin credenciales. URLs verificadas en el informe; Chile tiene formatos intercambiados: inspeccionar ZIP y esquema, sin extracción arbitraria. GeoJSON real en recurso rotulado SHP. Propiedades originales, codificación, consulta y fecha del mapa separadas; CKAN no fecha el levantamiento. Fecha de mapa desconocida = null.
3. Argentina: WFS 1.0 GetFeature GeoJSON lon/lat EPSG:4326 explícito; bbox piloto o tres sectores; límite de entidades/bytes, timeout HTTP, comprobar numberMatched/Returned. No `resultType=hits` defectuoso. Rechazar truncamiento, CRS/esquema incorrecto. No descargar todo el país. Caída de fuente no borra caché/paquete válido.
4. Raw ignorado con petición exacta, SHA-256 y adquisición. Caché validada reconstruye sin red. Cambio de petición/geometría invalida caché. Preparar/validar artefacto completo antes de reemplazar. No inventar retrieved_at al reutilizar auditoría; preferir adquisición fresca inicial y luego caché.
5. Shapely autorizada como dependencia de pipeline; requests/pyproj existentes. No GDAL/GeoPandas/Pyshp necesarios. APIs geológicas solo en pipeline, no navegador.
6. Recortar AOI, áreas con proyección equivalente declarada, agujeros y multipolígonos. Agrupar unidades con identidad de fuente/hoja/código. Separar sin cobertura, cubierta sin conflicto, intersección entre unidades distintas y descripción ausente. Duplicados no incrementan área; no forzar sumas a 100 ni inferir categorías ausentes.
7. Reparaciones: preservar raw; registrar IDs, método, área/diagnósticos antes/después y limitación. Proponer política conservadora de rechazo de cambios materiales en checkpoint para revisión Codex. Umbral de ingeniería no es estándar científico. Geometría no utilizable queda desconocida con diagnóstico.
8. Metadata: autoridad original/distribuidor, capa/hoja/versión conocida, escala denominador (NO resolución en metros), CRS, URL, licencia/atribución, hashes, fecha consulta/descarga, transformaciones/límites. CC0 MMA; SIGAM declara CC BY4: registrar URL y alcance de declaración, sin inventar licencia adicional.
9. Estados disponible/parcial/sin cobertura/no disponible definen evidencia, nunca aptitud. Auditoría ~99 % CL y 50/0/100 % AR es control independiente, no resultado hardcodeado. Mostrar cualquier cambio real de fuente.
10. Tests significativos: agujeros, multigeometría, conflictos/duplicados, cero, CRS/metadata incorrectos, truncamiento, caché corrupta/otra geometría, fallo que conserva paquete anterior, rebuild offline determinista. Fixtures solo en tests rotulados; entrega real.

## B. Producto/exportación/paquete portable

1. Carga opcional validada (contrato y semántica de áreas/fracciones finitas, reconciliación, IDs/geometría/snapshot, URLs permitidas). Ausente/inválido muestra no disponible y M8 funciona. Sin proveedores geológicos desde web ni respuestas de otro candidato al cambiar selección.
2. Ficha en diseño existente; conservar globo/mapa, liquid glass y navegación. Español claro, cartografía regional/no campo, redondeo honesto, cobertura ≠ precisión/confianza. Desconocido/ambiguo visibles; unidades con descripción original/fuentes; nombres largos, cero/50/99/100 %, móvil390px y teclado.
3. Geología del score continúa sin calibrar; explicar que contexto no implica compatibilidad planetaria calibrada. Escalas 1M/250K visibles. Nada de apto/seguro, tracción, granulometría o equivalencia química. Preguntas de campo son orientación editorial, no mediciones.
4. Exportación propia JSON validada: sitio/geometría, snapshot, fuentes, evidencia, límites. Botón accesible y nombre estable. Exportaciones M8/candidato existentes se conservan; no agregar campos silenciosamente a sus contratos.
5. Empaquetador admite nuevo paquete con lista explícita/validación, conserva controles. ZIP repetible portable /AnalogOS/ con geología offline. Raw fuera del bundle y ZIP. Manejar paquete opcional faltante coherentemente con la carga web.
6. No modificar shared/mission, server/ai, api, workflows, secretos ni Vercel. IA M8 mantiene evidencia previa; documentar que no consume geología aún.

## Aceptación y devolución

- `project/M9_PROGRESS.md`, ADR-010 propuesto, instrucciones operación/reproducción/fuentes, STATUS/CHANGELOG. Datos grandes ignorados enumerados.
- `source .venv/bin/activate && npm run verify`; rebuild geológico offline idéntico; `npm run release:package` repetido idéntico; `git diff --check`; baseline intacto, no modificarlo para pasar.
- Codex revisa datos/reparaciones contra auditoría, semántica, fallos de carga, navegador escritorio/móvil/teclado, exportación real, ZIP offline /AnalogOS/, regresión manual/IA y función Vercel. Tests verdes no sustituyen revisión.
- Al terminar: Owner Codex / Status review; sin autoaceptar, commit, push ni publicar. Informar brechas, no ocultarlas por «perfección».

## Devolución de Codex — corregir A antes de B

Aplicar docs/CODEX_M9_REVIEW.md: cambio total de área, NaN/estructura inválida, transacción raw+artefacto ante fallo posterior a descarga, procedencia ligada a adquisición/sector/rol y metadata veraz. Reproducción en /tmp/analogos-m9-independent-review.py y /tmp/analogos-m9-provenance-checks.json. Agregar regresiones y devolver Owner Codex / review. Superposición EPSG:6933 aprobada con documentación consistente. B sigue pendiente; no commit/push.

## Checkpoint Codex — reconexión y autorización de B

Los cinco hallazgos originales pasan la revisión independiente; 120 tests geológicos y baseline49 intactos. Antes de B cerrar dos casos adicionales concretos:

1. `publish`: si falla instalar el staging y también restaurar el backup del MISMO par (incluso el primero), hoy emite GeologyError «se restauró» pero target no existe. Registrar esa restauración fallida como PackageStateError, mantener respaldo y describir ruta/estado real. Probar primer y segundo par; conservar rollback de pares anteriores.
2. `check_geometry_dict`: exigir cierre exacto de cada anillo. GeoJSON con cuatro vértices distintos sin repetir el primero hoy se acepta y Shapely cierra silenciosamente; rechazar en adquisición con prueba CL/AR. Datos reales deben seguir pasando.

Luego implementar B completo dentro del alcance existente, sin esperar otro checkpoint. Paquete real recalculado solo si cambia contenido. Mantener contrato/semántica única en Python sin arrastrar Shapely/pyproj/requests al empaquetador: separar constantes y validaciones puras de procesamiento si hace falta, documentar dependencia de jsonschema ya existente. Importación lazy solo si paquete presente; no debilitar validación.

Ficha compacta en diseño existente: resumen de cobertura/gaps/ambigüedad, escala y fuentes; detalle expandible con unidades originales y preguntas de campo. Exportación geológica independiente y autodescriptiva validada, sin tocar contratos M8. Carga opcional con timeout incluyendo body y sin afectar selección/M8 cuando falla. Validación web de geometría exacta y procedencia (rol/site_id/bbox), fracciones/estados, URL https permitida.

Actualizar documentación vigente (README, ciencia/fuentes/operación) distinguiendo contexto disponible y score sin calibrar. Verificar tests/build/ZIP determinista/baseline. No commits/push/deploy. Entregar Owner Codex/review; Codex hace navegador y salida dev. No ampliar alcance por brechas históricas ajenas.
