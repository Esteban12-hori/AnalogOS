"""Escribe artifacts/analysis/ai-analysis.default.json (texto pregenerado, NO científico).

El texto se redactó a mano sobre el paquete de evidencia real del perfil base
(science-screening-v2, mars-rover-screening-v2): solo cita hechos con marcadores {{id}}.

Uso (desde la raíz del repo):

    python scripts/make_pregenerated_analysis.py <packet_hash> artifacts/analysis/ai-analysis.default.json

<packet_hash> es la huella FNV-1a 64 del paquete de evidencia base que calcula
apps/web/src/features/analysis/evidencePacket.ts (hoy fnv1a64:a6e090bf523550de).
Si metrics, engine o el snapshot cambian ese paquete, integration.test.ts falla:
hay que revisar el texto contra el paquete nuevo y regenerar con la huella nueva.
"""
import json
import sys

HASH = sys.argv[1]
OUT = sys.argv[2]
Y = 'cl-pampa-yungay-screening'
D = 'cl-domeyko-interior-screening'
M = 'cl-pampa-maria-elena-screening'


def f(site, crit, kind):
    return f'site:{site}:{crit}:{kind}'


def m(ref):
    return '{{' + ref + '}}'


def ev(**kw):
    return kw


def text_event(kind, text, refs, **kw):
    return dict(type=kind, **kw, text=text, refs=refs)


events = [
    ev(type='meta', schema='ai-analysis/1', engine='pregenerated', model='texto-pregenerado-no-cientifico', prompt_version='1.0.0', packet_hash=HASH),
    text_event('summary',
               f'Con el perfil base, los sectores evaluados son análogos topográficos parciales de Jezero en direcciones opuestas: Pampa Yungay es más exigente ({m(f(Y, "slope", "ratio"))} en pendiente), mientras Cordón de Domeyko y Pampa María Elena son más suaves.',
               [f(Y, 'slope', 'ratio')], site_id=None),
    text_event('summary',
               f'Más exigente que Jezero en pendiente ({m(f(Y, "slope", "ratio"))}), rugosidad ({m(f(Y, "terrain_roughness", "ratio"))}) y relieve ({m(f(Y, "local_relief", "ratio"))}).',
               [f(Y, 'slope', 'ratio'), f(Y, 'terrain_roughness', 'ratio'), f(Y, 'local_relief', 'ratio')], site_id=Y),
    text_event('summary',
               f'Algo más suave que Jezero ({m(f(D, "slope", "ratio"))} en pendiente) y con el relieve local que más se le parece entre los sectores evaluados ({m(f(D, "local_relief", "sim"))} de similitud).',
               [f(D, 'slope', 'ratio'), f(D, 'local_relief', 'sim')], site_id=D),
    text_event('summary',
               f'Casi plano frente a Jezero ({m(f(M, "slope", "ratio"))} en pendiente y {m(f(M, "terrain_roughness", "ratio"))} en rugosidad): útil como terreno de control, poco representativo del relieve marciano.',
               [f(M, 'slope', 'ratio'), f(M, 'terrain_roughness', 'ratio')], site_id=M),
    dict(type='insight', id='i1', site_id=Y, criterion_id='terrain_roughness', fact_kind='limiting_factor',
         text=f'La rugosidad es lo que más resta a la similitud de este sector: {m(f(Y, "terrain_roughness", "raw"))} frente a {m("mars:terrain_roughness")} en Jezero.',
         refs=[f(Y, 'terrain_roughness', 'raw'), 'mars:terrain_roughness']),
    dict(type='insight', id='i2', site_id=Y, criterion_id='slope', fact_kind='direction_vs_mars',
         text=f'La pendiente mediana ({m(f(Y, "slope", "raw"))}) supera la de Jezero ({m("mars:slope")}): conviene probar la estabilidad del rover en laderas.',
         refs=[f(Y, 'slope', 'raw'), 'mars:slope']),
    dict(type='insight', id='i3', site_id=Y, criterion_id='bare_ground_fraction', fact_kind='saturates_rule',
         text=f'El suelo expuesto cumple la regla del perfil ({m(f(Y, "bare_ground_fraction", "sim"))}), lo que no significa que su superficie sea igual a la de Marte.',
         refs=[f(Y, 'bare_ground_fraction', 'sim')]),
    dict(type='insight', id='i4', site_id=Y, criterion_id='surface_temperature_variability', fact_kind='no_discrimination',
         text=f'El rango térmico no separa a los sectores: todos alcanzan el tope de la regla del perfil ({m(f(Y, "surface_temperature_variability", "sim"))}).',
         refs=[f(Y, 'surface_temperature_variability', 'sim')]),
    dict(type='insight', id='i5', site_id=D, criterion_id='terrain_roughness', fact_kind='limiting_factor',
         text=f'También aquí la rugosidad es lo que más resta, pero por quedarse corta: {m(f(D, "terrain_roughness", "raw"))} frente a {m("mars:terrain_roughness")} en Jezero.',
         refs=[f(D, 'terrain_roughness', 'raw'), 'mars:terrain_roughness']),
    dict(type='insight', id='i6', site_id=D, criterion_id='local_relief', fact_kind='best_of_n',
         text=f'Tiene el relieve local más parecido a Jezero entre los sectores evaluados ({m(f(D, "local_relief", "sim"))} de similitud).',
         refs=[f(D, 'local_relief', 'sim')]),
    dict(type='insight', id='i7', site_id=D, criterion_id='aridity_context', fact_kind='shared_regional_value',
         text=f'La aridez sale del mismo valor regional que Pampa María Elena ({m(f(D, "aridity_context", "raw"))}): este criterio no separa a esos sectores.',
         refs=[f(D, 'aridity_context', 'raw')]),
    dict(type='insight', id='i8', site_id=M, criterion_id='terrain_roughness', fact_kind='limiting_factor',
         text=f'La rugosidad, muy por debajo de la de Jezero ({m(f(M, "terrain_roughness", "raw"))} frente a {m("mars:terrain_roughness")}), es lo que más resta a este sector.',
         refs=[f(M, 'terrain_roughness', 'raw'), 'mars:terrain_roughness']),
    dict(type='insight', id='i9', site_id=M, criterion_id='slope', fact_kind='direction_vs_mars',
         text=f'Con una pendiente mediana de {m(f(M, "slope", "raw"))}, el terreno es casi llano: sirve para probar tracción y odometría, no laderas.',
         refs=[f(M, 'slope', 'raw')]),
    text_event('test_suggestion',
               f'Probar la detección de obstáculos y la planificación de rutas en laderas con pendiente mediana de {m(f(Y, "slope", "raw"))} y desniveles entre celdas de {m(f(Y, "terrain_roughness", "raw"))}.',
               [f(Y, 'slope', 'raw'), f(Y, 'terrain_roughness', 'raw')], site_id=Y),
    text_event('test_suggestion',
               f'Probar navegación de larga distancia en relieve moderado ({m(f(D, "local_relief", "raw"))}), más suave que el de Jezero ({m("mars:local_relief")}).',
               [f(D, 'local_relief', 'raw'), 'mars:local_relief'], site_id=D),
    text_event('test_suggestion',
               f'Calibrar odometría y tracción en llano antes de pasar a terreno más exigente: la pendiente mediana es de {m(f(M, "slope", "raw"))}.',
               [f(M, 'slope', 'raw')], site_id=M),
    dict(type='tradeoff', site_ids=[Y, D],
         text=f'Pampa Yungay reproduce mejor la pendiente de Jezero ({m(f(Y, "slope", "sim"))}); Cordón de Domeyko, el relieve local ({m(f(D, "local_relief", "sim"))}).',
         refs=[f(Y, 'slope', 'sim'), f(D, 'local_relief', 'sim')]),
    dict(type='tradeoff', site_ids=[D, M],
         text=f'Comparten la aridez regional; los separa la topografía: Cordón de Domeyko conserva algo de relieve ({m(f(D, "local_relief", "ratio"))}) y Pampa María Elena casi no lo tiene ({m(f(M, "local_relief", "ratio"))}).',
         refs=[f(D, 'local_relief', 'ratio'), f(M, 'local_relief', 'ratio')]),
    dict(type='robustness_note',
         text=f'Con perturbaciones de {m("sens:perturbation")}, {m("sens:flips")}. El criterio cuyo peso más mueve la similitud es {m("sens:most_sensitive")}, y la brecha entre Pampa Yungay y Cordón de Domeyko es de {m("rank:gap:1:2")}.',
         refs=['sens:perturbation', 'sens:flips', 'sens:most_sensitive', 'rank:gap:1:2']),
    dict(type='uncertainty',
         text=f'La geología está por calcular y no entra al orden: la cobertura de cada sector es {m(f"coverage:{Y}")}.',
         refs=[f'coverage:{Y}'], resolves_check=f'check:{Y}:5'),
    dict(type='uncertainty',
         text='El modelo de elevación usado no ve obstáculos a escala de rueda: la pendiente y la rugosidad reales del recorrido solo se conocen en terreno.',
         refs=[], resolves_check=f'check:{Y}:2'),
    dict(type='uncertainty',
         text='La confianza casi no distingue entre sectores porque usa calidades asignadas por tipo de fuente, no incertidumbre medida.',
         refs=[]),
    dict(type='field_priority', site_id=Y, check_ref=f'check:{Y}:2', why='La misión base es de movilidad: la pendiente y la rugosidad a escala de rueda deciden si el sector sirve.', refs=[]),
    dict(type='field_priority', site_id=Y, check_ref=f'check:{Y}:3', why='La tracción depende del suelo, que este screening no mide.', refs=[]),
    dict(type='field_priority', site_id=Y, check_ref=f'check:{Y}:1', why='Sin acceso y permisos confirmados no hay campaña posible.', refs=[]),
    dict(type='field_priority', site_id=D, check_ref=f'check:{D}:2', why='El relieve moderado es su aporte: hay que confirmarlo a escala de rueda.', refs=[]),
    dict(type='field_priority', site_id=M, check_ref=f'check:{M}:3', why='En terreno llano la prueba principal es de tracción y hundimiento.', refs=[]),
]
for event in events:
    body = event.get('text') or event.get('why')
    assert body is None or len(body) <= 280, (len(body), body)
counts = {}
for event in events[1:]:
    counts[event['type']] = counts.get(event['type'], 0) + 1
events.append(dict(type='done', counts=counts))

doc = {
    'schema': 'ai-analysis-pregenerated/1',
    'label': 'Análisis pregenerado · no científico',
    'notice': 'Redactado de antemano (no por lktron) sobre el paquete de evidencia del perfil base de science-screening-v2. No es un resultado científico; solo se muestra si su huella coincide y tras validar cada evento.',
    'analyses': [{'packet_hash': HASH, 'events': events}],
}
def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


# Un evento por línea (como el NDJSON de lktron) y el resto compacto: cabe en ≤10 KB (§6.1).
head = {key: value for key, value in doc.items() if key != 'analyses'}
lines = ['{'] + [f' {compact(key)}:{compact(value)},' for key, value in head.items()]
lines.append(f' "analyses":[{{"packet_hash":{compact(HASH)},"events":[')
lines += [f'  {compact(event)}{"," if index < len(events) - 1 else ""}' for index, event in enumerate(events)]
lines.append(' ]}]')
lines.append('}')
text = '\n'.join(lines) + '\n'
assert json.loads(text) == doc
open(OUT, 'w', encoding='utf-8').write(text)
print(len(text.encode('utf-8')), 'bytes', len(events), 'events')
