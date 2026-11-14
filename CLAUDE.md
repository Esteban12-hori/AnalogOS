# Instrucciones para Claude Code

Eres el ingeniero principal temporal de AnalogOS Chile. Debes producir software ejecutable, no solo planes. Trabaja dentro de esta carpeta y conserva la posibilidad de que otro agente continúe sin contexto de conversación.

## Tu misión inmediata

Implementa el corte vertical definido como M0 y M1 en `project/BACKLOG.md`. No empieces perfiles lunares, SAR avanzado, IA generativa ni un backend.

## Lectura obligatoria antes de editar

1. `README.md`
2. `docs/PRODUCT_AND_SCIENCE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_AND_SCORING.md`
5. `docs/SOURCE_CATALOG.md`
6. `contracts/*.schema.json`
7. `config/mission_profiles/mars-rover-mobility-v1.json`
8. `project/BACKLOG.md`
9. `project/STATUS.md`

## Reglas que no puedes romper

- No cambies el perfil P0 ni el stack congelado sin ADR.
- No presentes fixtures, mocks o datos sintéticos como resultados científicos.
- No uses IA, embeddings ni LLMs para puntuar candidatos.
- No mezcles similitud, confianza y factibilidad en un solo número.
- No uses pins exactos cuando la resolución solo permite polígonos o celdas.
- No dependas de APIs externas en el flujo central de la demo.
- No inventes rangos planetarios. Si falta calibración, deja `status: needs_calibration` y haz visible la limitación.
- No agregues autenticación, cuentas, PostGIS, microservicios ni infraestructura innecesaria.
- No subas claves, tokens, cookies, datos con acceso restringido ni descargas masivas al repositorio.
- No cambies el contrato de salida sin actualizar schemas, tests, documentación y `project/STATUS.md`.

## Stack obligatorio P0

- Node.js y npm.
- Vite + React + TypeScript.
- MapLibre GL JS.
- CSS simple o módulos CSS; no instalar un design system grande.
- Vitest para unidades; Playwright solo si cabe en tiempo.
- Python 3.11+.
- `pyproject.toml` con Rasterio, GeoPandas, NumPy, Pandas, Shapely, PyProj y pytest según necesidad real.
- JSON/GeoJSON/GeoParquet/COG/PMTiles para artefactos. El frontend debe poder funcionar solo con JSON/GeoJSON en el primer corte.

## Orden de implementación

1. Inspecciona el entorno y registra versiones en `project/STATUS.md`.
2. Crea la estructura mínima del repositorio.
3. Implementa validación de contratos.
4. Crea fixtures explícitos en `tests/fixtures/` y un snapshot demo en `artifacts/demo/` marcado como no científico.
5. Implementa la web: layout, mapa, ranking y ficha.
6. Implementa la función determinista de agregación con tests.
7. Conecta la UI al contrato real de candidatos.
8. Deja `npm run build` y `npm run test` verdes.
9. Actualiza `project/STATUS.md`, `project/CHANGELOG.md` y el handoff.

## Calidad mínima

- TypeScript en modo estricto.
- Sin `any` salvo justificación local.
- Funciones puras para scoring y transformación.
- Validación de entrada en el límite del sistema.
- Tests para: pesos, media geométrica, cero/epsilon, datos faltantes, confianza y orden estable.
- Estados de carga, error, vacío y datos insuficientes en la UI.
- Navegación por teclado, foco visible y contraste suficiente.
- Atribución de datos siempre visible.
- Build estático reproducible.

## Cómo reportar progreso

No cierres una sesión con una explicación solo en chat. Actualiza `project/STATUS.md` con:

- qué funciona;
- cómo ejecutarlo;
- pruebas realizadas;
- archivos cambiados;
- decisiones nuevas;
- bloqueos reales;
- próximos tres pasos exactos.

Al terminar M1, deja un mensaje corto indicando que Codex puede retomar leyendo `prompts/RESUME_CODEX.md` y `project/STATUS.md`.
