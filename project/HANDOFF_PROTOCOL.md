# Protocolo de handoff

## Objetivo

Permitir que otro agente retome el proyecto sin depender del chat anterior.

## Antes de transferir control

1. Detenerse en un estado coherente; no dejar archivos parcialmente escritos.
2. Ejecutar todos los tests y builds disponibles.
3. Actualizar `project/STATUS.md`.
4. Agregar una entrada a `project/CHANGELOG.md`.
5. Crear ADR si cambió producto, ciencia, datos, contrato o arquitectura.
6. Enumerar archivos grandes/no versionados y cómo regenerarlos.
7. Registrar variables de entorno necesarias sin copiar secretos.
8. Dejar los próximos tres pasos en orden.

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

Cuando Claude termine, el usuario puede pedir a Codex que abra esta carpeta y use `prompts/RESUME_CODEX.md`. Codex debe verificar el estado con evidencia antes de continuar.
