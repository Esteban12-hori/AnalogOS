# Prompt para que Codex retome el control

Cuando Claude haya terminado, pide a Codex:

```text
Retoma AnalogOS Chile desde /Users/dan/Documents/Codex/2026-09-08/ana/analogos-chile.

No asumas que el resumen del chat es correcto. Lee AGENTS.md, project/STATUS.md, el último bloque de project/CHANGELOG.md y todos los ADR. Revisa el diff y ejecuta los comandos de build/test registrados. Comprueba visualmente la aplicación y valida los artefactos contra contracts/.

Después:
1. informa qué está realmente funcionando;
2. identifica deuda, inconsistencias o desvíos del spec;
3. corrige fallas críticas dentro del milestone activo;
4. continúa con el siguiente gate de project/BACKLOG.md;
5. actualiza project/STATUS.md y project/CHANGELOG.md.

Mantén P0 estricto: perfil rover marciano, Chile completo, PDS/MOLA, static-first, score determinista y demo offline. No agregues IA, SAR, backend ni perfil lunar antes de completar y verificar M0–M4.
```
