# ADR-007 — Globo terrestre 3D (three.js) con mapa SVG como fallback

- Estado: aceptado por el equipo humano (2026-11-14, decisión directa del usuario, sin revisión de Codex). Renumerado desde ADR-004 para no colisionar con `ADR-004-portable-static-release.md`.
- Fecha: 2026-11-14

## Contexto

El rediseño visual pide reemplazar el mapa plano por un planeta 3D (referencia: componente `Globe3D` con React Three Fiber, textura NASA Blue Marble, relieve y atmósfera). El stack P0 congelado no incluye three.js y ADR-001 eligió SVG porque WebGL falló en el navegador de presentación.

## Decisión

1. Añadir `three`, `@react-three/fiber` y `@react-three/drei` a `apps/web`. Sin Tailwind ni design system: estilos en `components/CandidateGlobe.css`.
2. El globo es la vista por defecto **solo si** el navegador crea un contexto WebGL. Si no hay WebGL, si el componente lanza un error o si se pierde el contexto, la app vuelve sola al mapa SVG de ADR-001. El usuario puede alternar «Globo 3D / Mapa 2D» en todo momento.
3. Texturas versionadas en `apps/web/src/assets/globe/` (NASA Blue Marble 4096×2048 y relieve 2048×1024, dominio público; copia de `three-globe@2.31.0/example/img`). Sin CDN: la demo sigue funcionando offline.
4. three.js se carga con `React.lazy` en un chunk aparte (~970 kB, ~260 kB gzip). El bundle inicial no cambia (~395 kB).
5. Los candidatos se dibujan como **polígonos** sobre la esfera, nunca como pins. El rótulo se ancla al centro aproximado del polígono con una línea guía; es un `<button>` accesible por teclado.
6. Las funciones geométricas (`latLngToVec3`, `densifyRing`, `geometryCenter`, `facingFactor`) son puras, viven en `src/domain/globe.ts` y tienen tests.

## Consecuencias

- La vista es más comunicativa, pero la textura (~10 km/píxel) se pixela al acercarse: el globo ubica las zonas, no sirve para inspección a escala de sitio.
- El fallback SVG queda como ruta garantizada para equipos sin aceleración gráfica.
- El `Html` de drei no puede ser fallback de `Suspense` con React 19 (lanza `removeChild` al retirarse); se usa un overlay DOM.
