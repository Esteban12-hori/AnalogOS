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

Mantén P0 estricto: perfil rover marciano, piloto Chile–Argentina de 50 ventanas, PDS/MOLA, static-first, score determinista y demo offline. Snapshot activo science-v3; Yungay es referencia, fuera del ranking. Conserva v2 como histórico y lee ADR-006 y docs/CODEX_M7_REVIEW.md. No afirmes cobertura nacional/global ni novedad confirmada. No agregues IA, SAR, backend, perfil lunar, nuevas regiones ni cambios de pesos fuera de un encargo autorizado.
```
