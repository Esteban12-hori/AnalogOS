# Prompt para que Codex retome el control

Cuando Claude haya terminado, pide a Codex:

```text
Retoma AnalogOS desde /Users/dan/Documents/Codex/2026-09-08/ana/analogos-chile.

No asumas que el resumen del chat es correcto. Lee AGENTS.md, project/NEXT_TASK.md, project/STATUS.md, el último bloque de project/CHANGELOG.md y todos los ADR. Revisa el diff y ejecuta los comandos de build/test registrados. Comprueba visualmente la aplicación y valida los artefactos contra contracts/.

Después:
1. informa qué está realmente funcionando;
2. identifica deuda, inconsistencias o desvíos del spec;
3. corrige fallas críticas dentro del milestone activo;
4. continúa con el siguiente gate de project/BACKLOG.md;
5. actualiza project/STATUS.md y project/CHANGELOG.md.

Codex es el lead técnico, científico y de producto. Revisa la entrega de Claude antes de aceptarla y escribe la siguiente unidad de trabajo en project/NEXT_TASK.md. Claude implementa; no decide aceptación, release ni cambios de alcance.

Mantén P0 estricto: perfil rover marciano, piloto Chile–Argentina de 50 ventanas, PDS/MOLA, static-first, score determinista y demo offline. Snapshot activo science-v3; Yungay es referencia fuera del ranking histórico y alternativa conocida evaluable para un ensayo. Conserva v2. Lee ADR-008/009 y docs/DEV_AI_VERIFICATION.md: M8 está publicado en dev con ambas operaciones de Anthropic verificadas; el núcleo único vive en shared/. El código desplegado es 9060970, seguido de un checkpoint de documentación. Conserva la protección de Vercel y la inyección de secretos solo en runtime de dev. No afirmes cobertura global ni novedad confirmada. M9 también está completado: contexto geológico oficial en siete sectores, contrato/exportación propios y paquete offline. Leer ADR-010, docs/CODEX_M9_REVIEW.md y el bloque vigente de DEV_AI_VERIFICATION. Código actual desplegado en dev: 34e76b9, Actions 43658989969 correcto; checkpoint posterior solo documental. M10 agrega orientación geológica con IA sin cambiar score ni evaluación: leer ADR-011 y docs/CODEX_M10_REVIEW.md. M10 aceptado localmente; consultar STATUS y DEV_AI_VERIFICATION para el despliegue más reciente. Respeta NEXT_TASK accepted y no inicies otra implementación sin nueva asignación. No agregues SAR, perfil lunar, regiones, pesos ni otra infraestructura fuera del encargo autorizado.
```
