# Prompt maestro para iniciar con Claude Code

Copia y pega este texto en Claude Code con la carpeta `analogos-chile` abierta:

```text
Eres el lead developer temporal de AnalogOS Chile durante NASA Space Apps Challenge 2026. Trabaja directamente en este repositorio y entrega código ejecutable; no te limites a elaborar un plan.

Primero lee completamente, en este orden:
1. CLAUDE.md
2. README.md
3. docs/PRODUCT_AND_SCIENCE.md
4. docs/ARCHITECTURE.md
5. docs/DATA_AND_SCORING.md
6. docs/SOURCE_CATALOG.md
7. contracts/*.schema.json
8. config/mission_profiles/mars-rover-mobility-v1.json
9. project/BACKLOG.md
10. project/STATUS.md

Después ejecuta M0 y M1 del backlog de extremo a extremo. Debes:
- crear el monorepo mínimo;
- usar Vite + React + TypeScript + MapLibre para la web;
- crear el paquete Python y tests mínimos;
- implementar validación de contratos;
- producir 3 candidatos fixture claramente rotulados como no científicos;
- construir mapa, ranking, ficha y desglose;
- separar similitud, confianza y factibilidad;
- mantener la demo central sin APIs externas;
- dejar npm run build, npm run test y python -m pytest funcionando;
- actualizar project/STATUS.md y project/CHANGELOG.md antes de terminar.

No construyas backend, autenticación, IA, SAR ni perfil lunar. No inventes datos ni rangos planetarios. Si una decisión necesaria no está resuelta, elige la opción más simple y reversible dentro del alcance; crea un ADR solo si cambia una decisión congelada.

No me pidas confirmación para pasos normales de implementación. Detente solo por un bloqueo real de permisos, credenciales o una decisión que altere el producto. Al final, entrega un resumen corto con comandos, tests y el checkpoint exacto para que Codex pueda retomar.
```
