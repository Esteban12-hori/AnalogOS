# README — presentación de producto

- **Owner:** Codex
- **Status:** accepted — contenido y verificación completados por Codex
- **Branch:** dev
- **Autorización:** Dan pidió convertir el README de dev en una presentación de producto y reducir el contenido propio del evento.
- **Alcance:** README centrado en problema, usuario, recorrido, capacidades, evidencia, límites y acceso; documentación operativa separada; continuidad documental. Sin cambios de aplicación, ciencia, credenciales ni postulación.
- **Verificación:** enlaces locales y comandos contra el repositorio, diff documental, tests y build exigidos por AGENTS.md. Conservar outputs/ local sin incluirlo en la entrega.

## Resultado

- README de 75 líneas centrado en problema, usuarios, recorrido, fuentes, IA opcional, límites y acceso local. Sin calendario del evento, rankings detallados ni instrucciones internas de agentes.
- `docs/DEVELOPMENT.md` conserva instalación, operación, empaquetado, reproducción de datos, snapshots históricos y continuidad. Enlaces de las guías y comandos contrastados con el repositorio; 34 enlaces relativos comprobados sin destinos ausentes.
- `source .venv/bin/activate && npm run verify`: 316 pruebas Python y 332 web correctas, 3 pruebas de IA real omitidas por defecto; typecheck y build correctos. Log local: `/tmp/analogos-readme-verify.log`.
- `git diff --check` correcto. Solo documentación; no se regeneró el ZIP ni se consultó IA real. El build local generado queda ignorado por Git.
- `outputs/` preexistente permanece local, sin incluirse en el commit. Publicación documental en dev con `[skip ci]`, conservando el despliegue de aplicación M10 y main.
