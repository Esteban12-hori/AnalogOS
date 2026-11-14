// Ejecuta la función realmente empaquetada, antes de publicar/actualizar el alias.
// Detecta módulos incompatibles o JSON/contratos ausentes que el build no rechaza.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const functionDir = resolve(process.argv[2] ?? '.vercel/output/functions/api/ai.func')
const config = JSON.parse(await readFile(resolve(functionDir, '.vc-config.json'), 'utf8'))
assert.equal(typeof config.handler, 'string', 'La función no declara handler')
const entry = resolve(functionDir, config.handler)
assert.ok(entry.startsWith(functionDir + '/'), 'Handler fuera del paquete')
const module = await import(pathToFileURL(entry).href)
const handler = typeof module.default === 'function' ? module.default : module.default?.default
assert.equal(typeof handler, 'function', 'Handler Node no ejecutable')

async function call(method, body) {
  const response = { statusCode: 0, headers: {}, body: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value },
    end(data) { this.body = JSON.parse(data) },
  }
  await handler({ method, headers: {
    host: 'analogos-dev.vercel.app', origin: 'https://analogos-dev.vercel.app',
    'content-type': 'application/json',
  }, body, socket: { remoteAddress: '127.0.0.1' } }, response)
  return response
}

const method = await call('GET')
assert.equal(method.statusCode, 405)
assert.equal(method.body.error.code, 'method_not_allowed')
// Sin credenciales ni red: el caso válido debe terminar en la respuesta controlada.
delete process.env.ANTHROPIC_API_KEY
const draft = await call('POST', { operation: 'draft', client_request_id: 'ci-startup-0001', brief: 'Ensayo de rover para Marte.' })
assert.equal(draft.statusCode, 503)
assert.equal(draft.body.error.code, 'ai_unavailable')
assert.equal(draft.headers['cache-control'], 'no-store')
console.log('Función empaquetada: módulos, snapshot y contratos cargan; GET 405 y POST sin clave 503 correctos.')
