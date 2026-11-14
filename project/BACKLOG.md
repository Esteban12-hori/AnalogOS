# Backlog ejecutable

## M0 Repositorio reproducible

- [x] Crear `package.json` raíz con scripts coordinados.
- [x] Crear `apps/web` con Vite, React y TypeScript estricto.
- [x] Crear `pyproject.toml` y paquete `pipelines`.
- [x] Implementar validación JSON Schema.
- [x] Configurar Vitest y pytest.
- [x] Crear `.env.example` y documentación de instalación.
- [x] Verificar `npm run build`, `npm run test` y `python -m pytest`.

**Gate M0:** una persona nueva instala y ejecuta ambos lados siguiendo el README.

## M1 Corte vertical demostrable

- [x] Crear 3 candidatos fixture rotulados como `fixture`.
- [x] Crear `artifacts/demo/manifest.json`.
- [x] Crear `artifacts/demo/candidates.geojson` o equivalente.
- [x] Validar fixtures contra los schemas.
- [x] Implementar layout principal.
- [x] Implementar mapa de Chile con polígonos.
- [x] Implementar ranking.
- [x] Implementar ficha con similitud, confianza y factibilidad.
- [x] Implementar desglose por criterio y fuentes.
- [x] Mostrar banner “datos de demostración no científicos”.
- [x] Construir versión estática sin llamadas externas obligatorias.

**Gate M1:** abrir la app, seleccionar tres candidatos y explicar uno en menos de dos minutos.

## M2 Motor científico mínimo

- [x] Implementar media geométrica ponderada.
- [x] Implementar confianza separada.
- [x] Implementar regla de peso válido mínimo 0.70.
- [x] Implementar restricciones con razón trazable.
- [x] Tests de score, faltantes, epsilon, empate y exclusión.
- [x] Cargar el perfil desde JSON.
- [x] Exportar `score_breakdown` compatible con contrato.

**Gate M2:** casos sintéticos conocidos producen resultados deterministas y explicables.

## M3 Datos reales y snapshot

- [x] Probar Earthdata y Copernicus.
- [x] Elegir productos exactos y registrar ADR.
- [x] Crear manifiesto con licencias y checksums.
- [x] Procesar relieve terrestre.
- [x] Procesar cobertura/suelo expuesto.
- [x] Construir firma MOLA.
- [ ] Incorporar aridez y geología simplificada. (aridez lista; geología pendiente)
- [x] Calibrar criterios disponibles o marcar los no calibrados.
- [ ] Generar grilla nacional y top candidatos.
- [x] Congelar snapshot real `v1`.

**Gate M3:** existen 3–5 candidatos reproducibles y ningún fixture aparece como resultado.

## M4 Validación

- [ ] Revisar resultados altos, medios y bajos en Worldview/imagen reciente. (parcial: contexto Sentinel-2 de diciembre de 2025 offline por candidato y observaciones en `docs/VISUAL_REVIEW.md`; faltan imagen reciente y revisión experta)
- [x] Usar Atacama como control.
- [x] Ejecutar sensibilidad ±20 %.
- [x] Revisar NoData y resolución limitante.
- [ ] Revisar áreas sensibles y advertencias. (agua permanente lista; territorial pendiente)
- [ ] Conseguir revisión experta si es posible.
- [ ] Registrar falsos positivos y correcciones.

**Gate M4:** el top 3 tiene evidencia, límites y estabilidad conocida.

## M5 Producto final

- [x] Reemplazar todos los fixtures en la vista final.
- [x] Comparador de hasta tres candidatos.
- [x] Metodología y catálogo de fuentes dentro de la app.
- [x] Exportación de ficha.
- [x] Accesibilidad y estados de error.
- [x] Optimizar carga y geometrías.
- [x] Probar offline en el navegador de presentación. (segundo equipo pendiente)

**Gate M5:** flujo completo, build público y demo de respaldo.

## M6 Entrega

- [x] README final y licencia elegida.
- [x] Página del proyecto completa.
- [x] Guion de pitch.
- [ ] Video y capturas.
- [ ] Atribuciones y contribuciones. (atribuciones listas; nombres del equipo pendientes)
- [ ] Links probados en incógnito.
- [x] Auditoría/checklist contra brief oficial.
- [ ] Enviar con margen y guardar comprobante.

## Reglas de corte

- Sin M1: no trabajar en datos secundarios.
- Sin M2: no agregar un segundo perfil.
- Sin M3: congelar diseño y resolver ciencia.
- Sin M4: no usar lenguaje concluyente.
- Si la demo depende de internet: reemplazar por snapshot.
- IA, SAR y perfil lunar son P1/P2 y se eliminan primero.
