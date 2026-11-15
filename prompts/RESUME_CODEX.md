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

Entrega vigente: rediseño Explorar/Misión integrado por Gus/Claude en dd625b4 y aceptado por Codex. Corrección publicada en https://analogos-dev.vercel.app/: código 9c183fb8cc5d8adbc717f931efd64bf877ddb0b0, Actions 43681551867 correcto. Enviar un brief desde el dock conserva el sector elegido. ADR-013/014 aceptados; Yungay se mantiene fuera del ranking de descubrimiento y como alternativa conocida evaluable/priorizable en Misión, siempre REF (ADR-009 §5). Leer docs/CODEX_INTEGRATION_REVIEW.md y docs/DEV_AI_VERIFICATION.md: borrador y explicación geológica Anthropic reales desde la interfaz integrada, exportación validada y reconstruida con datos oficiales. Verificación: 333 Python/784 web, 3 web opt-in omitidos, tipos/build correctos. M8/M9/M10 y sus datos se conservan. Anthropic selecciona comprobaciones respaldadas por SERNAGEOMIN/SEGEMAR; no cambia score, evaluación ni mide tracción. Pendientes acotados: acceso directo a Lectura móvil, GIBS sin red, impresión nativa e iOS real. Los checkpoints anteriores describen sus versiones históricas.

Producción posterior autorizada por Dan: main avanzó a 7e8c7798186e02a5014f6bf8b79554b7faa84c3c, igual que dev. Actions producción 43682694089 y dev 43682693561 correctos. README actualizado para Explorar/Misión; screenshot tomado desde la nueva producción después del despliegue. Ambas operaciones Anthropic y geología AR6 verificadas realmente en https://analogos.vercel.app/; exportación validada/reconstruida. Lee docs/PRODUCTION_RELEASE.md y el bloque superior de STATUS. El checkpoint documental/capturas posterior lleva [skip ci] y conserva el código desplegado; el desarrollo continúa en dev.

Respeta NEXT_TASK accepted: Claude queda sin asignación; no inicies otro milestone sin nuevo encargo. Conserva protección Vercel y secretos solo en runtime. No afirmes cobertura global, novedad ni aptitud de campo. No agregues SAR, perfil lunar, regiones, pesos u otra infraestructura fuera del alcance autorizado. Las futuras promociones a main requieren un encargo; esta publicación ya quedó completada.
```
