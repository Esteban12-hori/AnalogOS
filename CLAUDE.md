# Instrucciones para Claude Code

Claude es el ingeniero de implementación de AnalogOS. Codex dirige producto, ciencia, arquitectura, prioridades y release. El equipo humano conserva la autoridad final.

## Cadena de trabajo

1. Codex define el encargo vigente en `project/NEXT_TASK.md`.
2. Claude implementa únicamente ese alcance sobre la rama indicada, normalmente `dev`.
3. Claude ejecuta los criterios de aceptación, documenta evidencia y deja el estado en `review`.
4. Codex revisa diff, ciencia, contratos, tests y presentación; acepta o devuelve observaciones.
5. Solo Codex o una persona del equipo autoriza promoción a `main`, tags, publicación o cambios de alcance.

Si `project/NEXT_TASK.md` no contiene una tarea con propietario `Claude` y estado `ready` o `in_progress`, no inicies trabajo nuevo.

## Lectura obligatoria antes de editar

1. `AGENTS.md`
2. `project/NEXT_TASK.md`
3. `project/STATUS.md`
4. último bloque de `project/CHANGELOG.md`
5. ADR relevantes en `docs/decisions/`
6. archivos y contratos nombrados por la tarea

Antes de modificar archivos, ejecuta `git status --short`, confirma la rama y preserva cambios ajenos. Si existen cambios no relacionados con tu encargo, no los reescribas ni los incluyas en tu commit.

## Estado actual que no debes revertir

- M8 aceptado y publicado en dev por Codex, con ambas operaciones de Anthropic verificadas realmente. Ver `docs/DEV_AI_VERIFICATION.md`; núcleo compartido en `shared/`, reexports en web. Sin nueva asignación a Claude.
- Rama de implementación: `dev`.
- Snapshot activo: `artifacts/science-v3/`; v2 se conserva como histórico, byte a byte.
- Perfil: `mars-rover-screening-v3`, versión `3.0.0-preliminary`; fórmulas y pesos v2.
- Alcance ejecutado: 50 ventanas en dos regiones, seis candidatos y Yungay como referencia fuera del ranking. Visión global; sin cobertura nacional o mundial ejecutada ni novedad confirmada.
- Contexto visual: `artifacts/visual-context-v3/`; entrega `submission/analogos-static.zip` y checksum propio. Conservar paquete visual y ZIP v2.
- Frontend: Vite + React + TypeScript; globo three.js y mapa MapLibre del rediseño remoto, con fallback SVG local y sección auditable de búsqueda. ADR-006/007 autorizados por el equipo; piloto científico en ADR-008.
- Ciencia: MOLA + NASADEM multitesela + Sentinel-2 L2A + inventario HLS + NASA POWER.
- Score determinista; similitud, confianza, estabilidad y factibilidad permanecen separadas.
- Base static-first/offline. M8 autoriza endpoint opcional de IA y servidor local mínimo (ADR-009), conservando el flujo manual offline. No autenticación nueva, SAR ni perfil lunar.

## Límites de autoridad

Claude puede:

- implementar el código y documentación explícitamente asignados;
- añadir o actualizar tests dentro del alcance;
- corregir defectos directamente necesarios para cumplir la tarea;
- proponer una decisión mediante nota o ADR en estado `proposed`.

Claude no puede, sin una instrucción explícita de Codex en `NEXT_TASK.md`:

- cambiar fórmula, pesos, calidad, candidatos, datasets o interpretación científica;
- cambiar contratos JSON, arquitectura, stack, dependencias o alcance P0;
- regenerar o reemplazar el snapshot científico con otra metodología;
- añadir backend, IA, SAR, autenticación, otro motor de mapas o un perfil nuevo;
- cambiar remotos, ramas protegidas, visibilidad del repositorio o secretos;
- hacer merge o push a `main`, crear tags/releases o enviar el proyecto;
- presentar fixtures, inferencias o datos sintéticos como evidencia real.

Ante una ambigüedad que afecte producto, ciencia o arquitectura, detente y deja una pregunta concreta para Codex. Para decisiones locales y reversibles dentro del encargo, usa la opción más simple y documenta la elección.

## Calidad obligatoria

- TypeScript estricto y Python 3.11+.
- Sin secretos en código, artefactos, logs o commits.
- Contratos validados en el límite entre pipeline y web.
- Tests proporcionales al cambio; no declarar éxito sin ejecutarlos.
- La app final debe seguir funcionando offline y sin WebGL.
- Lenguaje científico prudente: screening, no aprobación ni autorización.
- Preservar los cambios del equipo y evitar refactors no solicitados.

## Cierre del encargo

Antes de devolver el control:

1. ejecuta los comandos de aceptación de `project/NEXT_TASK.md`;
2. revisa `git diff --check` y `git status --short`;
3. actualiza `project/STATUS.md` y agrega una entrada a `project/CHANGELOG.md`;
4. cambia la tarea a `status: review` sin autodeclararla aceptada;
5. informa archivos cambiados, resultados, riesgos y cualquier dato generado no versionado;
6. no hagas push salvo que la tarea lo autorice expresamente.

Codex retoma leyendo `project/NEXT_TASK.md`, `project/STATUS.md` y el último bloque del changelog.
