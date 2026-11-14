# ADR-009 — Recálculo determinista en el cliente para perfiles de misión

- Estado: propuesto (2026-11-14). Requiere aceptación del equipo científico.
- Fecha: 2026-11-14
- Relación: `docs/UX_REDESIGN.md` §3.2, §5.1, §5.6 y §7.1 (incremento 8). No modifica el perfil P0 ni el snapshot v2: los recálculos son vistas «según tu perfil», rotuladas `needs_calibration`.

## Contexto

En el modo Misión el usuario describe una prueba («navegación autónoma en terreno rocoso») y quiere ver los sectores ordenados para ese objetivo. El snapshot v2 trae, por sector y criterio, la similitud normalizada (`normalized_similarity`) y la calidad del dato, calculadas por `pipelines/scoring.py`. Reordenar con otros pesos requiere volver a agregar; hacerlo en un backend rompería la regla «sin backend» y «sin APIs externas en el flujo central».

## Decisión

1. **Niveles → pesos**: cada criterio recibe un nivel Clave 3 / Importante 2 / Menor 1 / Excluir 0. El peso es nivel ÷ suma de niveles. Lo calcula el cliente (`features/engine`), nunca la IA.
2. **Port TypeScript de `aggregate()`** (y de `sensitivity()` si cabe) con paridad numérica frente a `pipelines/scoring.py` (tolerancia ≤1e-6) verificada por tests con el snapshot real. Media geométrica ponderada con ε y peso válido mínimo (`minimum_valid_weight` del perfil base, 0,70). Similitud y confianza siguen siendo números separados; la factibilidad no se recalcula.
3. **Insumos**: solo `normalized_similarity`, `quality` y `status` por criterio del snapshot. No se recalculan similitudes por criterio ni rangos planetarios.
4. **Cobertura**: un criterio pedido sin datos (p. ej. geología) queda «por calcular» y resta cobertura; si la cobertura baja de 0,70 se muestra «Datos insuficientes para este perfil» en lugar del %.
5. **Rótulos**: todo resultado de misión dice «% del motor determinista vX · tu perfil · no es el snapshot» y el perfil queda `needs_calibration`.
6. **Orden** con `rankCandidates` (similitud descendente, nulos al final, desempate por `site_id`).

## Consecuencias

- Misión funciona sin red (perfiles predefinidos + matcher DEMO por palabras clave).
- Hay dos implementaciones de la agregación; el test de paridad es obligatorio y bloquea el build si diverge.
- **Si no se aprueba**: solo perfiles precalculados por el pipeline; la IA o el matcher eligen entre ellos y la edición de pesos queda desactivada con «por calcular».
