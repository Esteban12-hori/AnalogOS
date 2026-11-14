# Protocolo de handoff

## Objetivo

Permitir que otro agente retome el proyecto sin depender del chat anterior.

## Responsabilidades

- Codex define el encargo en `project/NEXT_TASK.md`, revisa el resultado y decide aceptación.
- Claude implementa el encargo asignado y lo entrega con estado `review`; no se autoaprueba.
- El equipo humano autoriza decisiones de negocio y acciones externas definitivas.
- `dev` es la rama normal de implementación; `main` se reserva para cambios revisados y entregables aprobados.

## Antes de transferir control

1. Detenerse en un estado coherente; no dejar archivos parcialmente escritos.
2. Actualizar el estado del encargo en `project/NEXT_TASK.md`.
3. Ejecutar todos los tests y builds disponibles.
4. Actualizar `project/STATUS.md`.
5. Agregar una entrada a `project/CHANGELOG.md`.
6. Crear ADR si cambió producto, ciencia, datos, contrato o arquitectura.
7. Enumerar archivos grandes/no versionados y cómo regenerarlos.
8. Registrar variables de entorno necesarias sin copiar secretos.
9. Dejar los próximos tres pasos en orden.

## Formato obligatorio de STATUS

- fecha/hora y responsable;
- milestone activo;
- qué funciona;
- qué está incompleto;
- comandos exactos;
- resultados de tests/build;
- decisiones nuevas;
- bloqueos;
- próximos tres pasos.

## Cuándo crear un ADR

- cambiar stack;
- cambiar fórmula o pesos;
- seleccionar un producto/dataset;
- cambiar resolución de screening;
- cambiar contrato JSON;
- cambiar tratamiento de áreas sensibles;
- añadir backend o dependencia externa;
- activar IA o perfil lunar.

## Plantilla ADR

Crear `docs/decisions/ADR-NNN-titulo.md`:

```markdown
# ADR-NNN Título

- Fecha:
- Estado: proposed | accepted | superseded
- Responsable:

## Contexto

## Opciones

## Decisión

## Consecuencias

## Validación
```

## Handoff hacia Codex

Cuando Claude termine, debe dejar `project/NEXT_TASK.md` en `review`. Codex abre la carpeta, lee `prompts/RESUME_CODEX.md`, verifica el diff y la evidencia, y decide entre `accepted`, `changes_requested` o una nueva tarea. Claude no cambia el estado a `accepted`.
