# ADR-013 — La interfaz del rediseño aloja el planificador, los datos v3 y la IA del equipo

- Estado: **accepted por Codex (2026-11-15)**, bajo la dirección y revisión delegadas por Dan. Integración publicada en `dev` (`dd625b4`) y Anthropic real comprobado desde la UI; evidencia y límites en `docs/CODEX_INTEGRATION_REVIEW.md`. El equipo humano conserva la autoridad final.
- Fecha: 2026-11-14
- Autorización: el usuario pidió directamente «fusiona en dev y haz push» y decidió integrar: la UI es la del rediseño (ADR-014, antes ADR-010) y por dentro se usan el motor determinista, la IA y los datos del equipo.
- Relación: aplica ADR-008 (piloto de descubrimiento v3) y ADR-009 (recomendación guiada) sin cambiarlos. Sustituye ADR-015, antes ADR-011 (recálculo por pesos en el cliente) y ADR-012 (lktron).

## Contexto

Dos líneas de trabajo avanzaron en paralelo desde `adcffcd`:

- **Rediseño (esta rama):** escenario fijo con globo y paso a 2D, marcadores ●◆○, carrusel, líneas Tesla, riel de métricas, composer, Lectura y hoja móvil (ADR-014), con un motor propio que volvía a ponderar los 7 criterios (ADR-015) y una IA opcional por NDJSON (ADR-012).
- **Equipo (`origin/dev`):** snapshot científico v3 Chile–Argentina con búsqueda reproducible y Yungay como referencia (ADR-008), y un planificador con requisitos confirmados, evaluación determinista, exportación JSON e IA de Anthropic en el servidor (ADR-009), ya desplegado y verificado.

Mantener los dos motores mostraría dos órdenes y dos «similitudes» para el mismo lugar, y ADR-009 (aceptado) prohíbe volver a ponderar.

## Decisión

1. **La UI del rediseño aloja el planificador del equipo.** «Tu misión» monta las piezas del equipo (`RequirementEditor`, `ScopePicker`, `ConfirmSummary`, `ResultView` compacto) a través de `PlannerView`, que se separa de `PlannerPanel` sin cambiar la firma ni el comportamiento de este. Un único controlador (chunk diferido) usa sin cambios `plannerReducer`, `buildRequest`, `evaluateMission`, `composeExplanation`, `buildMissionExport` y el cliente de IA sobre un store externo: el dock, «Tu misión», el carrusel, el globo, el riel, las líneas y la Lectura leen el mismo estado en el mismo render. `usePlanner` se conserva intacto para `PlannerPanel`.
2. **Validadores precompilados en el chunk principal; Ajv en runtime solo en el chunk de misión.** La web valida el snapshot con validadores generados desde los mismos esquemas y con los mismos mensajes que `shared/domain/contracts.ts`; la búsqueda y los antecedentes v3 van en un chunk aparte que el cargador importa solo con v3. `shared/` y `server/` no cambian y no importan nada de `apps/web`.
3. **La Lectura combina tres capas separadas:** el resultado de `MissionEvaluation` («Cálculo determinista»), los motivos destacados (plantilla determinista sin ✦ o, si el usuario la pide, la selección de Anthropic validada por el reductor) y los hechos del snapshot. La IA solo aporta IDs; todo texto y toda cifra se resuelven contra la evaluación.
4. **No hay llamadas automáticas a la IA.** Solo dos botones explícitos, cada uno con el aviso literal de envío del equipo: «Proponer requisitos con IA» (el borrador llega sin confirmar) y «Destacar motivos con IA» (solo con `outcome === 'evaluated'`). «Enviar» en el dock nunca llama a la IA. Sin clave, sin red o desde el ZIP, el recorrido manual funciona completo y los botones dicen «no disponible».
5. **El flujo sin IA exige requisitos manuales.** Sin IA no hay conversión determinista de texto libre a umbrales, y crearla rompería «nada inventado». El flujo «escribo y veo resultados» pasa a «escribo, añado requisitos o uso el ejemplo, confirmo y evalúo»; «Usar ejemplo» queda a un clic y los requisitos sugeridos llegan sin valor.

## Consecuencias

- Misión deja de calcular un «% de misión»: muestra estado, puesto (solo priorizados), preferencias cumplidas, similitud/confianza/estabilidad v3 sin recalcular y «Factibilidad territorial: pendiente». Los pesos del riel y de las líneas son siempre los del snapshot; encima va la capa de requisitos (✓ ✕ ○).
- Yungay (REF) queda fuera del ranking de Explorar en el carrusel, el globo, el riel, Comparar y la Lectura; un filtro por país conserva el puesto global.
- **Decisión de aceptación sobre Misión:** se conserva `evaluateMission` sin cambios. Conforme a ADR-009 §5, Yungay puede priorizarse como alternativa conocida si cumple los requisitos confirmados. Su puesto en Misión es el de las alternativas evaluadas, siempre rotulado REF; el recuento de candidatos la excluye y dice aparte «REF también priorizada». Ese puesto no es un descubrimiento ni el ranking de Explorar. Mantener el mismo orden en la UI y la exportación evita dos resultados incompatibles.
- Enviar o editar el brief desde el dock conserva el recorrido y la geometría ya elegidos; solo inicializa «Definir una prueba» cuando no existe recorrido. La confirmación sigue siendo explícita.
- Se retiran `features/engine`, el canal lktron, la prosa pregenerada y los contratos `mission-interpretation`, `evidence-packet` y `ai-analysis`, con sus validadores, fixtures y tests (incluida la paridad TS↔Python del motor propio). El catálogo de ◆ (`reference-analog`) se conserva.
- La edición tras evaluar invalida el resultado (reductor del equipo) y aborta la petición de IA en curso; el resultado anterior queda atenuado hasta reevaluar. El historial local pasa a v2 (brief, alcance y requisitos del usuario; nunca procedencia de la IA ni resultados).
- El informe imprimible del equipo se monta una vez por página mientras haya una evaluación vigente.
- Riesgo: si el bundle de la web dejara de ser idéntico al del servidor, toda explicación de IA terminaría en «no corresponde al cálculo vigente». `bundleParity.test.ts` lo vigila.

## Alternativas descartadas

- Mantener el motor propio junto al del equipo: dos órdenes y dos similitudes; contradice ADR-009.
- Usar `usePlanner` dentro de un componente y copiar su estado a un store: un render de retraso hace perder caracteres en los campos controlados.
- Validar el snapshot con Ajv en runtime en el chunk principal: más peso en la ruta crítica sin beneficio.
