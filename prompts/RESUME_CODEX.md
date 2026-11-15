# Prompt para que Codex retome el control

Cuando Claude haya terminado, pide a Codex:

```text
Retoma AnalogOS desde /Users/dan/Documents/Codex/2026-09-08/ana/analogos-chile.

No asumas que el resumen del chat es correcto. Lee AGENTS.md, project/NEXT_TASK.md, project/STATUS.md, el último bloque de project/CHANGELOG.md y todos los ADR. Revisa el diff y ejecuta los comandos de build/test registrados. Comprueba visualmente la aplicación y valida los artefactos contra contracts/.

Después:
1. informa qué está realmente funcionando;
2. identifica deuda, inconsistencias o desvíos del spec;
3. corrige fallas críticas dentro del milestone activo;
4. si el milestone está cerrado, informa el siguiente gate de project/BACKLOG.md sin iniciar otro alcance no autorizado;
5. actualiza project/STATUS.md y project/CHANGELOG.md.

Codex es el lead técnico, científico y de producto. Revisa la entrega de Claude antes de aceptarla y escribe la siguiente unidad de trabajo en project/NEXT_TASK.md. Claude implementa; no decide aceptación, release ni cambios de alcance.

Mantén P0 estricto: rover marciano/Jezero, piloto Chile–Argentina de 50 ventanas, PDS/MOLA, static-first, evaluación determinista y demo offline. Snapshot activo science-v3; seis candidatos y Yungay como referencia fuera del ranking histórico (alternativa conocida evaluable para una prueba). Conserva v2, ciencia, perfiles y datos originales.

Entrega vigente M10 completada, aceptada por Codex y publicada en https://analogos-dev.vercel.app/: código 4708b42b4bd152dca74d3e009f233a910e458d8b, Actions 43665786554. Checkpoint posterior documental/evidencia con [skip ci]. Lee ADR-009/010/011, docs/CODEX_M10_REVIEW.md y docs/DEV_AI_VERIFICATION.md. Anthropic usa cartografía SERNAGEOMIN/SEGEMAR para elegir comprobaciones de terreno según objetivo confirmado, con fuentes, límites y exportación auditable. No cambia score ni evaluación y no mide tracción. La función empaquetada y una explicación geológica real en dev quedaron verificadas; JSON descargado reconstruido idéntico. Verificación final: 316 Python/332 web, typecheck/build y dos objetivos reales contrastantes.

Respeta NEXT_TASK accepted: Claude queda sin asignación; no inicies otro milestone sin nuevo encargo. Conserva protección Vercel y secretos solo en runtime. No afirmes cobertura global, novedad ni aptitud de campo. No agregues SAR, perfil lunar, regiones, pesos u otra infraestructura fuera del alcance autorizado. Main no fue modificado por esta entrega.
```
