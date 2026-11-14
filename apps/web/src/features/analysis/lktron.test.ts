import { describe, expect, it } from 'vitest'
import type { MissionInterpretRequest } from '../../domain/aiContracts'
import { interpretWithLktron, LKTRON_ENABLED } from './lktron'
import { analyze, interpret, validateInterpretation } from './lktronClient'
import { parseLktronUrl } from './lktronConfig'
import { readJson } from './testSupport'

const request: MissionInterpretRequest = {
  text: 'probar navegación autónoma de un rover en terreno rocoso',
  locale: 'es-CL',
  catalog: [
    { id: 'slope', label: 'Pendiente', has_data: true, status: 'validated' },
    { id: 'terrain_roughness', label: 'Rugosidad', has_data: true, status: 'validated' },
    { id: 'local_relief', label: 'Relieve local', has_data: true, status: 'validated' },
    { id: 'bare_ground_fraction', label: 'Suelo expuesto', has_data: true, status: 'validated' },
    { id: 'aridity_context', label: 'Aridez', has_data: true, status: 'optional' },
    { id: 'surface_temperature_variability', label: 'Rango térmico', has_data: true, status: 'optional' },
    { id: 'geologic_relevance', label: 'Geología', has_data: false, status: 'needs_expert_review' },
  ],
  base_profile_id: 'mars-rover-screening-v2',
  current_profile: null,
}
const valid = readJson('tests/fixtures/contracts/mission-interpretation/valid.rover-rocky.json') as Record<string, unknown>

type FetchCall = { url: string; init: RequestInit }

function fakeFetch(respond: (call: FetchCall) => Response | Promise<Response>): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} }
    calls.push(call)
    return respond(call)
  }) as typeof fetch
  return { fetch: fn, calls }
}

/** fetch que nunca responde, salvo que lo aborten (como el de un navegador). */
const hanging: typeof fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })) as typeof fetch

describe('VITE_LKTRON_URL (flag de build, sin secretos)', () => {
  it('sin variable, lktron está desactivado y la interpretación cae a DEMO', async () => {
    expect(LKTRON_ENABLED).toBe(false)
    expect(parseLktronUrl(undefined)).toEqual({ ok: false, reason: 'unset' })
    expect(parseLktronUrl('  ')).toEqual({ ok: false, reason: 'unset' })
    expect(await interpretWithLktron(request)).toMatchObject({ ok: false, code: 'unavailable' })
  })

  it('acepta https y http solo en localhost; normaliza la barra final', () => {
    expect(parseLktronUrl('https://lktron.example.org/api/')).toEqual({ ok: true, url: 'https://lktron.example.org/api' })
    expect(parseLktronUrl('http://localhost:8787')).toEqual({ ok: true, url: 'http://localhost:8787' })
    expect(parseLktronUrl('http://127.0.0.1:8787/v1')).toEqual({ ok: true, url: 'http://127.0.0.1:8787/v1' })
  })

  it.each([
    ['http remoto', 'http://lktron.example.org', 'insecure'],
    ['usuario y contraseña', 'https://user:secreto@lktron.example.org', 'credentials'],
    ['clave en la query', 'https://lktron.example.org/api?key=sk-123', 'query'],
    ['fragmento', 'https://lktron.example.org/api#token', 'query'],
    ['javascript:', 'javascript:alert(1)', 'invalid'],
    ['texto', 'no es una url', 'invalid'],
  ])('rechaza %s', (_label, value, reason) => {
    expect(parseLktronUrl(value)).toEqual({ ok: false, reason })
  })
})

describe('POST /interpret', () => {
  const base = 'https://lktron.example.org'

  it('envía JSON sin credenciales ni cookies y devuelve la interpretación validada', async () => {
    const { fetch, calls } = fakeFetch(() => new Response(JSON.stringify(valid), { status: 200 }))
    const result = await interpret(request, { baseUrl: base, fetch })
    expect(result.ok).toBe(true)
    expect(calls[0]?.url).toBe(`${base}/interpret`)
    expect(calls[0]?.init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(request)
  })

  it.each([
    ['otro motor', { ...valid, engine: 'demo' }],
    ['otro perfil base', { ...valid, base_profile: { id: 'otro-perfil', version: '1' } }],
    ['criterio repetido', { ...valid, criteria: [...(valid.criteria as unknown[]), (valid.criteria as unknown[])[0]] }],
    ['número escrito', { ...valid, mission_summary: 'Probar el doble de rugosidad' }],
    ['veredicto', { ...valid, assumptions: ['El terreno es ideal'] }],
    ['un campo de puntaje', { ...valid, score: 88 }],
    ['dígitos', { ...valid, mission_summary: 'Probar a 3 km' }],
  ])('rechaza una interpretación con %s', (_label, data) => {
    expect(validateInterpretation(data, request)).toMatchObject({ ok: false, code: 'invalid' })
  })

  it('permite que la interpretación repita lo que el usuario pidió y no se mide (hielo)', () => {
    expect(validateInterpretation({ ...valid, unsupported: [{ phrase: 'presencia de hielo', reason: 'not_measured' }] }, request).ok).toBe(true)
  })

  it('HTTP de error → unavailable; no JSON → invalid', async () => {
    expect(await interpret(request, { baseUrl: base, fetch: fakeFetch(() => new Response('x', { status: 503 })).fetch })).toMatchObject({ ok: false, code: 'unavailable' })
    expect(await interpret(request, { baseUrl: base, fetch: fakeFetch(() => new Response('<html>', { status: 200 })).fetch })).toMatchObject({ ok: false, code: 'invalid' })
  })

  it('tiempo agotado y cancelación se distinguen', async () => {
    expect(await interpret(request, { baseUrl: base, fetch: hanging, timeoutMs: 15 })).toMatchObject({ ok: false, code: 'timeout' })
    const controller = new AbortController()
    const pending = interpret(request, { baseUrl: base, fetch: hanging, signal: controller.signal, timeoutMs: 5000 })
    controller.abort()
    expect(await pending).toMatchObject({ ok: false, code: 'aborted' })
  })
})

describe('POST /analyze (NDJSON)', () => {
  const packet = readJson('tests/fixtures/contracts/evidence-packet/valid.snapshot-profile.json') as never

  it('entrega cada línea y respeta la orden de parar', async () => {
    const body = '{"type":"meta"}\n{"type":"stage","stage":"writing"}\n{"type":"done","counts":{}}\n{"type":"tarde"}\n'
    const { fetch, calls } = fakeFetch(() => new Response(body, { status: 200, headers: { 'content-type': 'application/x-ndjson' } }))
    const lines: string[] = []
    const end = await analyze(packet, { baseUrl: 'https://lktron.example.org', fetch, onLine: (line) => (lines.push(line), !line.includes('done')) })
    expect(end).toEqual({ ok: true, end: 'stopped' })
    expect(lines).toHaveLength(3)
    expect(calls[0]?.url).toBe('https://lktron.example.org/analyze')
    expect(calls[0]?.init).toMatchObject({ credentials: 'omit' })
  })

  it('sin respuesta → timeout; error de red → unavailable', async () => {
    expect(await analyze(packet, { baseUrl: 'https://x.example', fetch: hanging, timeoutMs: 15, onLine: () => true })).toMatchObject({ ok: false, code: 'timeout' })
    const failing = (async () => {
      throw new TypeError('network')
    }) as typeof fetch
    expect(await analyze(packet, { baseUrl: 'https://x.example', fetch: failing, onLine: () => true })).toMatchObject({ ok: false, code: 'unavailable' })
  })
})
