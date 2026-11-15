import type { IncomingMessage, ServerResponse } from 'node:http'
import { readAiConfig, type EnvLike } from './config'
import { loadTrustedBundle } from './facts'
import { loadTrustedGeology } from './geology'
import { MAX_BODY_BYTES, handleAiRequest } from './handler'
import { RateLimiter } from './guard'

const limiter = new RateLimiter() // in memory, per instance: NOT distributed

type VercelLikeRequest = IncomingMessage & { body?: unknown }

async function readBody(req: VercelLikeRequest): Promise<unknown> {
  if (req.body !== undefined) return req.body // Vercel has already consumed/parsed it
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    total += buf.length
    if (total > MAX_BODY_BYTES) throw new Error('payload_too_large')
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function clientKey(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
  return first || req.socket?.remoteAddress || 'unknown'
}

/** Node adapter: used by api/ai.ts (Vercel) and the local Vite server. `env` server only. */
export async function nodeAiHandler(req: VercelLikeRequest, res: ServerResponse, env: EnvLike = process.env): Promise<void> {
  let body: unknown
  try {
    body = req.method === 'POST' ? await readBody(req) : undefined
  } catch {
    body = Symbol('too_large') // forces payload_too_large/bad_request without reflecting anything
  }
  const response =
    typeof body === 'symbol'
      ? { status: 413, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: { ok: false, error: { code: 'payload_too_large', message: 'The request exceeds the allowed size.' }, client_request_id: null } }
      : await handleAiRequest(
          { method: req.method ?? '', headers: req.headers, body, clientKey: clientKey(req) },
          { config: readAiConfig(env), fetchImpl: fetch, now: Date.now, limiter, bundle: loadTrustedBundle(), geology: () => loadTrustedGeology(loadTrustedBundle()) },
        )
  res.statusCode = response.status
  for (const [k, v] of Object.entries(response.headers)) res.setHeader(k, v)
  res.end(JSON.stringify(response.body))
}
