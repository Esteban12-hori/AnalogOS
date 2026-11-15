// Ejecuta la función realmente empaquetada, antes de publicar/actualizar el alias.
// Detecta módulos incompatibles o JSON/contratos ausentes que el build no rechaza, y EJERCITA que el paquete
// geológico oficial viaja con la función y se valida de verdad (no basta con que el endpoint arranque).
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const sourceDir = resolve(process.argv[2] ?? '.vercel/output/functions/api/ai.func')
const originalCwd = process.cwd()
const GEOLOGY = join('artifacts', 'geology-context-v1', 'index.json')
// La función se copia a un directorio temporal FUERA del checkout y el proceso corre desde ahí: ni el cwd ni los ancestros
// (el repositorio) pueden enmascarar un archivo que falte en el paquete. El original no se modifica; el cwd se restaura al final.
const scratch = mkdtempSync(join(tmpdir(), 'analogos-fn-check-'))
const functionDir = join(scratch, 'main.func')
// La salida local de Vercel puede referenciar archivos trazados mediante enlaces al checkout.
// Materializarlos mantiene los mismos bytes que se despliegan al aislar la función en /tmp.
cpSync(sourceDir, functionDir, { recursive: true, dereference: true })
process.chdir(scratch)
delete process.env.ANTHROPIC_API_KEY
process.env.LAMBDA_TASK_ROOT = functionDir

// Misma canonicalización que shared/mission/fingerprint.ts (claves ordenadas; undefined omitido) + SHA-256.
const canonical = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
}

async function load(dir) {
  const config = JSON.parse(await readFile(resolve(dir, '.vc-config.json'), 'utf8'))
  assert.equal(typeof config.handler, 'string', 'La función no declara handler')
  const entry = resolve(dir, config.handler)
  assert.ok(entry.startsWith(dir + '/'), 'Handler fuera del paquete')
  const module = await import(pathToFileURL(entry).href)
  const handler = typeof module.default === 'function' ? module.default : module.default?.default
  assert.equal(typeof handler, 'function', 'Handler Node no ejecutable')
  return async (method, body) => {
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
}

try {
  // FileFsRef no siempre se escribe dentro de .func: Vercel lo declara como
  // destino del bundle -> archivo relativo al directorio de build en filePathMap.
  // Solo materializamos entradas declaradas; no rellenamos ausencias desde el checkout.
  const sourceConfig = JSON.parse(readFileSync(join(sourceDir, '.vc-config.json'), 'utf8'))
  const refs = sourceConfig.filePathMap ?? {}
  assert.ok(refs && typeof refs === 'object' && !Array.isArray(refs), 'filePathMap inválido')
  const repoRoot = realpathSync(originalCwd)
  for (const [bundlePath, sourcePath] of Object.entries(refs)) {
    assert.equal(typeof sourcePath, 'string', 'Origen de filePathMap inválido')
    const destination = resolve(functionDir, bundlePath)
    assert.ok(destination.startsWith(functionDir + sep), 'Destino de filePathMap fuera de la función')
    const source = realpathSync(resolve(originalCwd, sourcePath))
    assert.ok(source.startsWith(repoRoot + sep), 'Origen de filePathMap fuera del proyecto')
    assert.ok(!source.split(sep).some((part) => part === '.git' || /^\.env(?:\.|$)/.test(part)), 'Archivo privado inesperado en filePathMap')
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(source, destination, { dereference: true })
  }
  console.log(`Función aislada: ${Object.keys(refs).length} archivos declarados en filePathMap materializados.`)
  const call = await load(functionDir)
  const method = await call('GET')
  assert.equal(method.statusCode, 405)
  assert.equal(method.body.error.code, 'method_not_allowed')
  // Sin credenciales ni red: el caso válido debe terminar en la respuesta controlada.
  const draft = await call('POST', { operation: 'draft', client_request_id: 'ci-startup-0001', brief: 'Ensayo de rover para Marte.' })
  assert.equal(draft.statusCode, 503)
  assert.equal(draft.body.error.code, 'ai_unavailable')
  assert.equal(draft.headers['cache-control'], 'no-store')

  // Geología: el paquete oficial debe estar DENTRO de la función y validar (esquema, candidatos y SHA-256 de bytes).
  const text = readFileSync(join(functionDir, GEOLOGY), 'utf8')
  const fp = createHash('sha256').update(canonical(JSON.parse(text))).digest('hex')
  const explain = (geologyFp) => ({ operation: 'explain', client_request_id: 'ci-geology-0001', request: {}, request_fingerprint: 'a'.repeat(64), geology_context_fingerprint: geologyFp })
  const stale = await call('POST', explain('f'.repeat(64)))
  assert.equal(stale.body.error.code, 'geology_context_stale', 'El contexto geológico no se cargó/validó en la función empaquetada')
  const ready = await call('POST', explain(fp))
  assert.equal(ready.statusCode, 503, 'La huella del contexto geológico empaquetado no fue aceptada')
  assert.equal(ready.body.error.code, 'ai_unavailable')

  // Ausencia aislada (copia temporal; el paquete y el repositorio no se tocan): canal geológico no disponible, M8 intacto.
  const copy = join(scratch, 'sin-geologia.func')
  cpSync(functionDir, copy, { recursive: true, dereference: true })
  rmSync(join(copy, GEOLOGY))
  process.env.LAMBDA_TASK_ROOT = copy
  const absent = await (await load(copy))('POST', explain(fp))
  assert.equal(absent.statusCode, 409)
  assert.equal(absent.body.error.code, 'geology_context_unavailable')
  // Presente pero corrupto: tampoco se acepta ni se confunde con la ausencia silenciosa.
  writeFileSync(join(copy, GEOLOGY), text.slice(0, 400))
  const broken = await (await load(copy))('POST', explain(fp))
  assert.equal(broken.body.error.code, 'geology_context_unavailable')
  const m8 = await (await load(copy))('POST', { operation: 'draft', client_request_id: 'ci-startup-0002', brief: 'Ensayo de rover para Marte.' })
  assert.equal(m8.body.error.code, 'ai_unavailable') // M8 sigue por su camino sin geología
  console.log('Función empaquetada: módulos, snapshot y contratos cargan; GET 405 y POST sin clave 503; paquete geológico incluido y validado (409 por huella ajena, 503 con la correcta); ausencia y corrupción aisladas → contexto no disponible.')
} finally {
  process.chdir(originalCwd)
  rmSync(scratch, { recursive: true, force: true })
}
