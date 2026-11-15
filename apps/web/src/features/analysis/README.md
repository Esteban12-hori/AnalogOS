# features/analysis · la Lectura

La Lectura tiene tres capas, siempre separadas (ADR-013, `docs/INTEGRATION_PLAN.md` §5):

1. **Resultado**: la `MissionEvaluation` del equipo (`shared/mission`, ADR-009). Rótulo «Cálculo
   determinista · reglas mission-rules-1.0.0 · similitud v3 sin recalcular».
2. **Motivos destacados**: `composeExplanation` del equipo. Por defecto, la plantilla determinista
   («Plantilla determinista sin IA», sin ✦). Si el usuario pulsa «✦ Destacar motivos con IA», la
   selección de Anthropic validada por el reductor (huellas y `checkSelection`). La IA solo elige IDs:
   todo texto y toda cifra se resuelven contra la evaluación (`explanationToReading.ts`).
3. **Hechos del snapshot**: capa de hechos deterministas (`facts.ts`): dirección frente a Jezero,
   limitante, satura, valor regional compartido, «no distingue», mejor de N (sin la REF) y robustez
   del orden leída de `analysis-summary.json` (`domain/sensitivity.ts`, `robustness.ts`).

En Explorar no hay IA: la Lectura es «Lectura determinista». Nunca hay llamadas automáticas: el
botón de IA pasa por el controlador de misión (`features/composer/missionController.ts`).

| Archivo | Chunk | Qué hace |
|---|---|---|
| `index.ts`, `ReadingPanel.tsx`, `ReadingPill.tsx` | principal | Interfaz estable y envoltorios (esqueleto, disclosure) |
| `deferred.ts`, `ReadingView.tsx` | diferido | La vista de tres capas |
| `facts.ts`, `types.ts` | diferido | Capa de hechos del snapshot (sin paquete ni huella) |
| `robustness.ts` | diferido | Compara órdenes con la sensibilidad del pipeline |
| `explanationToReading.ts` | diferido | Adaptadores puros (`explanationToReading`, `readingKey`, `snippetFor`, `evidenceHref`) |

Retirado al integrar con dev: el canal lktron (NDJSON, tokens `{{id}}`, compuerta de eventos,
huella FNV del paquete) y la prosa pregenerada (ADR-012, sustituido por ADR-009 §7–9).
