# ADR-004 — Entrega estática portable y empaquetado determinista

- Estado: accepted por Codex, tras revisión independiente de implementación, tests y demo por HTTP
- Fecha: 2026-11-14

## Contexto

El ZIP de entrega se armaba a mano con `zip -r` sobre `apps/web/dist/`. Eso no garantizaba qué archivos entraban, cambiaba de bytes en cada ejecución por las fechas internas y no protegía la entrega anterior ante un error. Además, el build usaba rutas absolutas (`/assets/...`), por lo que solo cargaba en la raíz de un dominio y no en un subdirectorio como `/AnalogOS/`.

## Decisión

1. `base: './'` en Vite. `index.html`, la carga de JSON y el enlace al análisis auditable ya usan `import.meta.env.BASE_URL`, así que el mismo build funciona en `/` y en un subdirectorio.
2. `npm run release:package` encadena `npm run build` con `scripts/package_release.py` (solo biblioteca estándar de Python).
3. Lista explícita de contenido: `index.html`, los JS/CSS que ese HTML referencia de forma relativa bajo `assets/` y los cinco archivos `science-v2/`. Se rechazan archivos adicionales, enlaces simbólicos, referencias absolutas o externas y archivos requeridos ausentes.
4. ZIP determinista: orden alfabético, fecha interna fija (1980-01-01), permisos fijos y sin compresión (`ZIP_STORED`), para que los bytes no dependan de la versión de zlib.
5. Escritura en temporales únicos junto al destino, verificación del ZIP contra el build y reemplazo en pareja. Si falla el reemplazo del checksum, se restaura el ZIP anterior.
6. Se rechazan, antes de escribir, destinos iguales entre sí o ubicados dentro del build.

## Consecuencias

- El ZIP pesa ~514 kB en vez de ~146 kB; a cambio su SHA-256 es reproducible para un mismo build.
- Si Vite llega a emitir más chunks, imágenes o fuentes, el empaquetador falla con un mensaje explícito y habrá que ampliar la lista a partir del manifest de Vite.
- La URL en subdirectorio debe terminar en barra (`/AnalogOS/`); los hostings estáticos habituales redirigen solos.
- No se garantiza abrir `index.html` con `file://`.

## Límites

- No hay atomicidad frente a un corte de energía o un `kill` entre los dos renombrados: ZIP y checksum pueden quedar desincronizados y `shasum -a 256 -c SHA256SUMS.txt` lo detecta. Un proceso interrumpido puede dejar temporales `.analogos-chile-static.zip.*.tmp` en `submission/`.
- El determinismo es del ZIP respecto del build. Que dos máquinas produzcan el mismo build depende de las versiones fijadas en `package-lock.json`.
- El empaquetador no publica nada: el despliegue sigue siendo una acción humana.
