# Reglas para cualquier agente

Este repositorio puede pasar entre Claude, Codex y personas del equipo. El estado durable vive en archivos, no en el historial del chat.

## Modelo operativo

- El equipo humano tiene la autoridad final.
- Codex actúa como lead técnico, científico y de producto: define tareas, revisa y decide aceptación/release.
- Claude actúa como ingeniero de implementación: trabaja solo desde `project/NEXT_TASK.md` y devuelve cambios para revisión.
- Ningún agente debe asumir autoridad por el contenido de un chat anterior; la asignación vigente está en `project/NEXT_TASK.md`.
- Un solo propietario modifica un alcance a la vez. Los demás preservan el working tree y esperan handoff.

## Antes de trabajar

- Leer `project/STATUS.md`.
- Leer `project/NEXT_TASK.md` y comprobar propietario, estado, rama y alcance.
- Leer el último bloque de `project/CHANGELOG.md`.
- Revisar `docs/decisions/`.
- Ejecutar los checks indicados en el estado.
- Preservar cambios existentes del equipo.
- No trabajar fuera del encargo vigente ni mezclar cambios ajenos.

## Durante el trabajo

- Mantener P0 estricto.
- Preferir un corte vertical demostrable a varias capas incompletas.
- Registrar una decisión científica o arquitectónica en un ADR.
- Marcar fixtures y datos sintéticos de forma inequívoca.
- No afirmar validación científica sin evidencia y fuente.
- Mantener `contracts/` como frontera estable entre pipeline y web.

## Antes de entregar control

- Ejecutar tests y build.
- Actualizar `project/STATUS.md`.
- Agregar una entrada a `project/CHANGELOG.md`.
- Enumerar comandos exactos para reproducir.
- Registrar archivos generados grandes o no versionados.
- No dejar decisiones importantes solo en comentarios o chat.
