// Runtime de la Lectura: hechos primero, luego texto validado (lktron o pregenerado). Estas
// pruebas valen con los stubs de metrics/engine y con sus implementaciones: solo usan hechos que
// salen directamente del snapshot (similitud, verificaciones de terreno).
import { afterEach, describe, expect, it } from 'vitest'
import { checkEvidencePacket } from '../../domain/aiContracts'
import { resetPregeneratedCache } from './pregenerated'
import { attachPregenerated, buildReading, MESSAGES, runReading, streamLktron } from './runtime'
import { loadScienceSnapshot, YUNGAY } from './testSupport'
import type { Reading } from './types'

const snapshot = loadScienceSnapshot()
const base = buildReading({ snapshot, context: 'base', mission: null })
const sim = `site:${YUNGAY}:similarity`
const check = `check:${YUNGAY}:2`

afterEach(() => resetPregeneratedCache())

function meta(hash = base.packet.packet_hash, engine = 'lktron') {
  return { type: 'meta', schema: 'ai-analysis/1', engine, model: 'modelo-de-prueba', prompt_version: '1.0.0', packet_hash: hash }
}

const GOOD = [
  { type: 'stage', stage: 'writing' },
  { type: 'summary', site_id: YUNGAY, text: `Pampa Yungay encabeza el orden con {{${sim}}} de similitud.`, refs: [sim] },
  { type: 'test_suggestion', site_id: YUNGAY, text: 'Probar la percepción de obstáculos en laderas.', refs: [] },
  { type: 'field_priority', site_id: YUNGAY, check_ref: check, why: 'La escala de rueda no se ve desde el satélite.', refs: [] },
]

function ndjson(events: unknown[], extra = ''): string {
  return events.map((event) => JSON.stringify(event)).join('\n') + '\n' + extra
}

function serve(text: string): { fetch: typeof fetch; cancelled: () => boolean } {
  let cancelled = false
  const bytes = new TextEncoder().encode(text)
  const fn = (async () => new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      // En dos trozos, cortando una línea por la mitad.
      const half = Math.floor(bytes.length / 2)
      controller.enqueue(bytes.slice(0, half))
      controller.enqueue(bytes.slice(half))
      controller.close()
    },
    cancel() {
      cancelled = true
    },
  }), { status: 200 })) as typeof fetch
  return { fetch: fn, cancelled: () => cancelled }
}

async function stream(events: unknown[], extra = ''): Promise<{ final: Reading; published: Reading[]; cancelled: boolean }> {
  const published: Reading[] = []
  const server = serve(ndjson(events, extra))
  const final = await streamLktron(base, { baseUrl: 'https://lktron.example.org', signal: new AbortController().signal, publish: (reading) => published.push(reading), fetch: server.fetch, analogIds: null })
  return { final, published, cancelled: server.cancelled() }
}

describe('buildReading (hechos primero)', () => {
  it('arma un paquete válido y la capa de hechos sin red ni IA', () => {
    expect(base.packetValid).toBe(true)
    expect(checkEvidencePacket(base.packet).ok).toBe(true)
    expect(base.key).toBe('base')
    expect(base.profile).toMatchObject({ id: 'mars-rover-screening-v2', origin: 'snapshot', label: 'Perfil base del snapshot' })
    expect(base.facts.sites.map((site) => site.similarity?.text)).toEqual(['75,7 %', '71,6 %', '50,0 %'])
    expect(base.ai.status).toBe('idle')
    // Con o sin motor integrado, la robustez nunca se inventa.
    expect(['ready', 'por_calcular']).toContain(base.facts.robustness.status)
    expect(base.facts.robustness.sites.map((site) => site.text)).toEqual(['99,0', '98,9', '98,4'])
  })

  it('el contexto misión exige perfil y resultados del motor', () => {
    expect(() => buildReading({ snapshot, context: 'mission', mission: { profile: null, scoring: null, interpretation: null, revision: 1 } })).toThrow()
  })
})

describe('stream de lktron', () => {
  it('publica primero la espera y luego cada bloque validado; descarta lo inválido y lo avisa', async () => {
    const { final, published } = await stream([
      meta(),
      ...GOOD,
      { type: 'summary', site_id: null, text: 'Un sector es el doble de rugoso.', refs: [] },
      { type: 'done', counts: { summary: 1 } },
    ], '')
    expect(published[0]?.ai.status).toBe('waiting')
    expect(final.ai).toMatchObject({ source: 'lktron', status: 'done', model: 'modelo-de-prueba' })
    expect(final.ai.blocks.map((block) => block.type)).toEqual(['summary', 'test_suggestion', 'field_priority'])
    expect(final.ai.blocks[0]?.segments[1]).toEqual({ kind: 'fact', id: sim, text: '75,7 %', criterionId: null, siteId: YUNGAY })
    expect(final.ai.discards).toEqual([{ reason: 'number_word', message: 'escribía un número con palabras' }])
    // Los hechos no cambian: el texto llega encima.
    expect(final.facts).toBe(base.facts)
  })

  it('una línea que no es JSON se descarta sin cortar el stream', async () => {
    const { final } = await stream([meta(), GOOD[1]], 'esto no es json\n' + JSON.stringify({ type: 'done', counts: {} }) + '\n')
    expect(final.ai.status).toBe('done')
    expect(final.ai.discards.map((item) => item.reason)).toEqual(['schema'])
  })

  it('huella distinta → «Desactualizado», sin bloques, y el stream se cancela', async () => {
    const { final, cancelled } = await stream([meta('fnv1a64:0123456789abcdef'), ...GOOD, { type: 'done', counts: {} }])
    expect(final.ai.status).toBe('stale')
    expect(final.ai.blocks).toEqual([])
    expect(final.ai.message).toBe(MESSAGES.stale)
    expect(cancelled).toBe(true)
  })

  it('un error de lktron deja los hechos y un mensaje neutro', async () => {
    const { final } = await stream([meta(), GOOD[1], { type: 'error', code: 'timeout', message: 'el modelo tardó 99 s' }])
    expect(final.ai.status).toBe('error')
    expect(final.ai.message).toBe('lktron no terminó a tiempo: se muestran los hechos del motor.')
    expect(final.ai.message).not.toContain('99')
  })

  it('sin cierre: con bloques queda «incompleto»; sin bloques, error', async () => {
    expect((await stream([meta(), GOOD[1]])).final.ai).toMatchObject({ status: 'done', message: MESSAGES.incomplete })
    expect((await stream([meta()])).final.ai).toMatchObject({ status: 'error', message: MESSAGES.empty })
  })

  it('red caída → error con los hechos intactos', async () => {
    const failing = (async () => {
      throw new TypeError('offline')
    }) as typeof fetch
    const final = await streamLktron(base, { baseUrl: 'https://x.example', signal: new AbortController().signal, publish: () => undefined, fetch: failing, analogIds: null })
    expect(final.ai.status).toBe('error')
    expect(final.ai.message).toMatch(/hechos del motor/)
  })
})

describe('análisis pregenerado', () => {
  const file = (hash: string, events: unknown[]) => async () => ({ schema: 'ai-analysis-pregenerated/1', label: 'FIXTURE · no científico', analyses: [{ packet_hash: hash, events }] })

  it('se usa solo si su huella coincide; pasa por la misma compuerta', async () => {
    const reading = await attachPregenerated(base, { fetchPregenerated: file(base.packet.packet_hash, [meta(base.packet.packet_hash, 'pregenerated'), ...GOOD, { type: 'done', counts: {} }]) })
    expect(reading.ai).toMatchObject({ source: 'pregenerated', status: 'done' })
    expect(reading.ai.blocks).toHaveLength(3)
  })

  it('otra huella → solo hechos, con el motivo', async () => {
    const reading = await attachPregenerated(base, { fetchPregenerated: file('fnv1a64:0123456789abcdef', []) })
    expect(reading.ai).toMatchObject({ source: 'none', status: 'facts_only', message: MESSAGES.pregeneratedMismatch })
  })

  it('sin archivo → solo hechos', async () => {
    const reading = await attachPregenerated(base, {
      fetchPregenerated: async () => {
        throw new Error('404')
      },
    })
    expect(reading.ai).toMatchObject({ status: 'facts_only', message: MESSAGES.noPregenerated })
  })

  it('un pregenerado que dice venir de lktron no se muestra', async () => {
    const reading = await attachPregenerated(base, { fetchPregenerated: file(base.packet.packet_hash, [meta(base.packet.packet_hash, 'lktron'), ...GOOD]) })
    expect(reading.ai.status).toBe('error')
    expect(reading.ai.blocks).toEqual([])
  })

  it('runReading en Explorar nunca llama a lktron: hechos y después pregenerado', async () => {
    const published: Reading[] = []
    const final = await runReading({
      snapshot,
      context: 'base',
      mission: null,
      signal: new AbortController().signal,
      allowLktron: true,
      publish: (reading) => published.push(reading),
      fetchPregenerated: async () => {
        throw new Error('sin archivo')
      },
    })
    expect(published.map((reading) => reading.ai.status)).toEqual(['idle', 'facts_only'])
    expect(final.ai.source).toBe('none')
  })
})
