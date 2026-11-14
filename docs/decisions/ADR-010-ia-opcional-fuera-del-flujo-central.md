# ADR-010 — IA opcional (lktron) fuera del flujo central

- Estado: propuesto (2026-11-14). Excepción acotada a «sin LLM en la demo central» (`CLAUDE.md`, `docs/ARCHITECTURE.md`); requiere aceptación del equipo humano.
- Fecha: 2026-11-14
- Relación: `docs/UX_REDESIGN.md` §0.8–§0.9 y §5. Depende de ADR-009 para el recálculo.

## Contexto

El modo Misión gana mucho si alguien interpreta el texto libre del usuario y redacta una lectura comparativa. Las reglas del proyecto prohíben usar IA para puntuar, mezclar similitud/confianza/factibilidad, inventar cifras y depender de APIs externas en el flujo central.

## Decisión

1. **La IA nunca puntúa ni produce cifras.** Solo (a) interpreta la misión en niveles 0–3 por criterio, supuestos y «lo pedido sin datos» (`mission-interpretation/1`), y (b) redacta texto que cita hechos con marcadores `{{id}}` (`ai-analysis/1`). Toda cifra, orden y postura («mejor de 3», «limitante», «satura») la produce el motor determinista y viaja en `evidence-packet/1`.
2. **Contratos cerrados** (`additionalProperties: false`): el esquema no tiene dónde poner un %, una confianza o un ranking. Texto sin dígitos ni % fuera de marcadores, ≤280 caracteres. Validadores Ajv precompilados en el cliente.
3. **Validación antes de mostrar** (§5.5): esquema, huella FNV-1a 64 del paquete, cada `{{id}}` existe y está en `refs`, sin números escritos, `fact_kind` coherente, filtro de vocabulario («seguro», «apto», «el mejor», «score»…). Lo que no pasa se descarta y se avisa; nunca se muestra texto sin validar.
4. **Fuera del flujo central**: sin red o sin endpoint, la interpretación usa coincidencia por palabras clave rotulada «DEMO · sin IA» y la lectura usa `artifacts/science-v2/ai-analysis.default.json` (pregenerado, rotulado como no científico) solo si su huella coincide; si no, solo la capa de hechos deterministas. lktron se activa detrás de un flag de build y su endpoint se configura sin subir secretos.
5. **Rótulo fijo** «✦ Interpretación de IA · interpreta, no puntúa» y «Cifras: motor · Redacción: IA» en toda superficie con texto generado.

## Consecuencias

- La demo central sigue funcionando offline y sin IA.
- Riesgo residual: una frase plausible pero falsa sin cifras. Se mitiga con la postura fijada por el motor, el filtro de vocabulario y la checklist a un clic, y se reconoce en la UI.
- **Si no se aprueba**: Misión queda solo con perfiles predefinidos y matcher DEMO; el panel de Lectura muestra solo hechos deterministas.
