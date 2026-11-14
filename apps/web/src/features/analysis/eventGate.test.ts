// Validación de cada evento ai-analysis/1 antes de mostrarlo (§5.5), con un paquete real del
// snapshot v2 (vistas FIXTURE). Ningún texto que no pase llega a la UI.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkAiAnalysisEvent } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { buildEvidencePacket } from './evidencePacket'
import { createEventGate, parseFactId, type GateOutcome } from './eventGate'
import { DOMEYKO, fixtureViews, loadScienceSnapshot, MARIA_ELENA, REPO_ROOT, YUNGAY } from './testSupport'

const snapshot = loadScienceSnapshot()
const weights = Object.fromEntries(snapshot.profile.criteria.map((criterion) => [criterion.id, criterion.weight])) as Partial<Record<CriterionId, number>>
const { packet } = buildEvidencePacket({
  snapshotVersion: snapshot.manifest.snapshot_version,
  base: snapshot.profile,
  candidates: snapshot.candidates,
  profile: { id: snapshot.profile.id, origin: 'snapshot', status: 'needs_calibration', weights },
  missionSummary: null,
  scoring: null,
  views: fixtureViews(snapshot),
  robustness: { status: 'ready', scenarios: 14, flips: 0, topFlips: 0, mostSensitive: 'terrain_roughness', sites: [] },
  unsupported: [],
})

const META = { type: 'meta', schema: 'ai-analysis/1', engine: 'lktron', model: 'modelo-de-prueba', prompt_version: '1.0.0', packet_hash: packet.packet_hash }

function open(analogIds: ReadonlySet<string> | null = null) {
  const gate = createEventGate({ packet, expectedEngine: 'lktron', analogIds, checkSchema: checkAiAnalysisEvent })
  expect(gate.accept(META)).toEqual({ kind: 'meta', model: 'modelo-de-prueba' })
  return gate
}

function reasonOf(outcome: GateOutcome): string {
  return outcome.kind === 'discard' ? outcome.reason : outcome.kind
}

const ratio = `site:${YUNGAY}:slope:ratio`
const rough = `site:${YUNGAY}:terrain_roughness:raw`

describe('encabezado y huella', () => {
  it('el primer evento debe ser meta; si no, el stream no se usa', () => {
    const gate = createEventGate({ packet, expectedEngine: 'lktron', analogIds: null, checkSchema: checkAiAnalysisEvent })
    expect(gate.accept({ type: 'stage', stage: 'writing' }).kind).toBe('fatal')
  })

  it('una huella distinta deja el contenido «Desactualizado» y cierra el stream', () => {
    const gate = createEventGate({ packet, expectedEngine: 'lktron', analogIds: null, checkSchema: checkAiAnalysisEvent })
    expect(gate.accept({ ...META, packet_hash: 'fnv1a64:0123456789abcdef' })).toEqual({ kind: 'stale' })
    expect(reasonOf(gate.accept({ type: 'summary', site_id: null, text: 'Texto.', refs: [] }))).toBe('out_of_order')
  })

  it('el stream de los fixtures de contrato (otra huella) queda «Desactualizado» frente al paquete real', () => {
    const lines = readFileSync(resolve(REPO_ROOT, 'tests/fixtures/contracts/ai-analysis/valid.stream.ndjson'), 'utf8').trim().split('\n')
    const gate = createEventGate({ packet, expectedEngine: 'pregenerated', analogIds: null, checkSchema: checkAiAnalysisEvent })
    expect(gate.accept(JSON.parse(lines[0] ?? 'null'))).toEqual({ kind: 'stale' })
  })

  it('un motor distinto del esperado no se acepta (lktron no puede hacerse pasar por pregenerado)', () => {
    const gate = createEventGate({ packet, expectedEngine: 'pregenerated', analogIds: null, checkSchema: checkAiAnalysisEvent })
    expect(gate.accept(META).kind).toBe('fatal')
  })

  it('un error antes del encabezado se informa como error', () => {
    const gate = createEventGate({ packet, expectedEngine: 'lktron', analogIds: null, checkSchema: checkAiAnalysisEvent })
    expect(gate.accept({ type: 'error', code: 'timeout', message: 'sin respuesta' })).toEqual({ kind: 'error', code: 'timeout' })
  })
})

describe('texto con marcadores', () => {
  it('acepta un resumen válido y resuelve cada marcador con la cifra del motor', () => {
    const outcome = open().accept({ type: 'summary', site_id: YUNGAY, text: 'Más inclinado que Jezero: {{' + ratio + '}}.', refs: [ratio] })
    expect(outcome.kind).toBe('block')
    if (outcome.kind !== 'block') return
    expect(outcome.block.segments).toEqual([
      { kind: 'text', text: 'Más inclinado que Jezero: ' },
      { kind: 'fact', id: ratio, text: '1,4× Jezero', criterionId: 'slope', siteId: YUNGAY },
      { kind: 'text', text: '.' },
    ])
  })

  it.each([
    ['cita un dato que no existe', { text: 'Valor {{site:cl-pampa-yungay-screening:geologic_relevance:raw}}.', refs: ['site:cl-pampa-yungay-screening:geologic_relevance:raw'] }, 'unknown_ref'],
    ['declara un ref inexistente', { text: 'Texto sin cifras.', refs: ['sens:inventado'] }, 'unknown_ref'],
    ['no declara el marcador en refs', { text: 'Valor {{' + ratio + '}}.', refs: [] }, 'undeclared_ref'],
    ['escribe dígitos', { text: 'Pendiente de tres coma dos grados.', refs: [] }, 'number_word'],
    ['escribe «el doble»', { text: 'Es el doble de rugoso que Jezero.', refs: [] }, 'number_word'],
    ['usa un veredicto', { text: 'Es el sitio ideal para el rover.', refs: [] }, 'vocabulary'],
    ['dice «el mejor»', { text: 'Pampa Yungay es el mejor análogo.', refs: [] }, 'vocabulary'],
    ['habla de lo que no se mide', { text: 'Tiene minerales parecidos a Marte.', refs: [] }, 'unmeasured'],
    ['esconde un homóglifo', { text: 'Es idеal.', refs: [] }, 'unsafe_text'],
  ])('descarta un resumen que %s', (_label, body, reason) => {
    expect(reasonOf(open().accept({ type: 'summary', site_id: YUNGAY, ...body }))).toBe(reason)
  })

  it('dígitos, % y marcadores mal formados los rechaza ya el esquema (motivo «schema»); el filtro es la segunda barrera', () => {
    expect(reasonOf(open().accept({ type: 'summary', site_id: YUNGAY, text: 'Pendiente de 3 grados.', refs: [] }))).toBe('schema')
    expect(reasonOf(open().accept({ type: 'summary', site_id: YUNGAY, text: 'Casi todo, 100 %.', refs: [] }))).toBe('schema')
    expect(reasonOf(open().accept({ type: 'summary', site_id: YUNGAY, text: 'Valor {{ mars:slope }}.', refs: [] }))).toBe('schema')
    // Lo que el esquema deja pasar (dígitos Unicode, números escritos) lo para el filtro.
    expect(reasonOf(open().accept({ type: 'summary', site_id: YUNGAY, text: 'Pendiente de ３ grados.', refs: [] }))).toBe('digits')
  })
})

describe('insight: tipo de hecho y criterio propio', () => {
  const insight = (overrides: Record<string, unknown>) => ({
    type: 'insight', id: 'i1', site_id: YUNGAY, criterion_id: 'terrain_roughness', fact_kind: 'limiting_factor',
    text: 'La rugosidad es lo que más resta: {{' + rough + '}}.', refs: [rough], ...overrides,
  })

  it('acepta un limitante que el motor estableció y que cita su criterio', () => {
    const outcome = open().accept(insight({}))
    expect(outcome.kind).toBe('block')
    if (outcome.kind === 'block') expect(outcome.block).toMatchObject({ type: 'insight', siteId: YUNGAY, criterionId: 'terrain_roughness', factKind: 'limiting_factor' })
  })

  it('descarta un hecho que el motor no estableció (limitante en pendiente)', () => {
    expect(reasonOf(open().accept(insight({ criterion_id: 'slope', text: 'La pendiente es lo que más resta.' })))).toBe('fact_kind')
  })

  it('descarta un insight que no cita ni nombra su propio criterio', () => {
    expect(reasonOf(open().accept(insight({ text: 'Este sector exige mucho al rover.', refs: [] })))).toBe('own_criterion')
  })

  it('acepta nombrar el criterio sin ficha y los hechos sin lugar (no distingue, valor compartido)', () => {
    const gate = open()
    expect(gate.accept(insight({ id: 'i2', text: 'La rugosidad pesa más que el resto.', refs: [] })).kind).toBe('block')
    expect(gate.accept(insight({ id: 'i3', criterion_id: 'surface_temperature_variability', fact_kind: 'no_discrimination', text: 'El rango térmico no separa a los sectores.', refs: [] })).kind).toBe('block')
    expect(gate.accept(insight({ id: 'i4', site_id: DOMEYKO, criterion_id: 'aridity_context', fact_kind: 'shared_regional_value', text: 'Comparte la aridez regional.', refs: [] })).kind).toBe('block')
    expect(reasonOf(gate.accept(insight({ id: 'i5', site_id: YUNGAY, criterion_id: 'aridity_context', fact_kind: 'shared_regional_value', text: 'Comparte la aridez regional.', refs: [] })))).toBe('fact_kind')
  })

  it('tope de 6 insight por lugar e ids sin repetir', () => {
    const gate = open()
    for (let index = 1; index <= 6; index += 1) expect(gate.accept(insight({ id: `i${index}` })).kind).toBe('block')
    expect(reasonOf(gate.accept(insight({ id: 'i7' })))).toBe('cap')
    expect(reasonOf(gate.accept(insight({ id: 'i1' })))).toBe('duplicate')
  })
})

describe('lugares, verificaciones, análogos y topes', () => {
  it('descarta lugares fuera del paquete', () => {
    expect(reasonOf(open().accept({ type: 'test_suggestion', site_id: 'cl-otro-lugar', text: 'Probar tracción.', refs: [] }))).toBe('unknown_site')
    expect(reasonOf(open().accept({ type: 'tradeoff', site_ids: [YUNGAY, 'cl-otro-lugar'], text: 'Uno compensa al otro.', refs: [] }))).toBe('unknown_site')
  })

  it('field_priority solo con verificaciones del mismo lugar, sin repetir', () => {
    const gate = open()
    const good = { type: 'field_priority', site_id: YUNGAY, check_ref: `check:${YUNGAY}:2`, why: 'La rugosidad decide la ruta.', refs: [] }
    expect(gate.accept(good).kind).toBe('block')
    expect(reasonOf(gate.accept(good))).toBe('duplicate')
    expect(reasonOf(gate.accept({ ...good, check_ref: `check:${MARIA_ELENA}:2` }))).toBe('unknown_check')
    expect(reasonOf(gate.accept({ ...good, check_ref: `check:${YUNGAY}:42` }))).toBe('unknown_check')
  })

  it('uncertainty solo resuelve verificaciones que existen', () => {
    expect(reasonOf(open().accept({ type: 'uncertainty', text: 'La geología está por calcular.', refs: [], resolves_check: `check:${YUNGAY}:99` }))).toBe('unknown_check')
    const outcome = open().accept({ type: 'uncertainty', text: 'La geología está por calcular.', refs: [], resolves_check: `check:${YUNGAY}:5` })
    expect(outcome.kind === 'block' && outcome.block.checkRef).toBe(`check:${YUNGAY}:5`)
  })

  it('notas de análogos solo con el catálogo de ◆ disponible y con ids conocidos', () => {
    const note = { type: 'analog_note', analog_id: 'devon-island', status: 'por_calcular', text: 'Análogo ártico aún sin cálculo.' }
    expect(reasonOf(open(null).accept(note))).toBe('unknown_analog')
    expect(reasonOf(open(new Set(['otro'])).accept(note))).toBe('unknown_analog')
    expect(open(new Set(['devon-island'])).accept(note).kind).toBe('block')
  })

  it('tope de 4 tradeoff', () => {
    const gate = open()
    const tradeoff = { type: 'tradeoff', site_ids: [YUNGAY, DOMEYKO], text: 'Un sector es más exigente y el otro más parecido.', refs: [] }
    for (let index = 0; index < 4; index += 1) expect(gate.accept(tradeoff).kind).toBe('block')
    expect(reasonOf(gate.accept(tradeoff))).toBe('cap')
  })

  it('después de done nada más se muestra; un evento sin forma se descarta', () => {
    const gate = open()
    expect(reasonOf(gate.accept({ type: 'inventado', score: 99 }))).toBe('schema')
    expect(reasonOf(gate.accept(undefined))).toBe('schema')
    expect(gate.accept({ type: 'done', counts: {} })).toEqual({ kind: 'done' })
    expect(reasonOf(gate.accept({ type: 'summary', site_id: null, text: 'Tarde.', refs: [] }))).toBe('out_of_order')
  })
})

describe('parseFactId', () => {
  it('extrae lugar y criterio de cada forma de id', () => {
    expect(parseFactId(ratio)).toEqual({ siteId: YUNGAY, criterionId: 'slope' })
    expect(parseFactId('mars:local_relief')).toEqual({ siteId: null, criterionId: 'local_relief' })
    expect(parseFactId(`coverage:${YUNGAY}`)).toEqual({ siteId: YUNGAY, criterionId: null })
    expect(parseFactId(`site:${YUNGAY}:similarity`)).toEqual({ siteId: YUNGAY, criterionId: null })
    expect(parseFactId('rank:gap:1:2')).toEqual({ siteId: null, criterionId: null })
  })
})
