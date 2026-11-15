// Runs the actually packaged function, before publishing/updating the alias.
// Detects incompatible modules or missing JSON/contracts that the build does not reject, and EXERCISES that the official geological package
// ships with the function and is truly validated (it is not enough for the endpoint to start).
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
// The function is copied to a temporary directory OUTSIDE the checkout and the process runs from there: neither the cwd nor the ancestors
// (the repository) can mask a file that is missing from the package. The original is not modified; the cwd is restored at the end.
const scratch = mkdtempSync(join(tmpdir(), 'analogos-fn-check-'))
const functionDir = join(scratch, 'main.func')
// The local Vercel output may reference traced files through links to the checkout.
// Materializing them keeps the same bytes that are deployed when isolating the function in /tmp.
cpSync(sourceDir, functionDir, { recursive: true, dereference: true })
process.chdir(scratch)
delete process.env.ANTHROPIC_API_KEY
process.env.LAMBDA_TASK_ROOT = functionDir

// Same canonicalization as shared/mission/fingerprint.ts (sorted keys; undefined omitted) + SHA-256.
const canonical = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
}

async function load(dir) {
  const config = JSON.parse(await readFile(resolve(dir, '.vc-config.json'), 'utf8'))
  assert.equal(typeof config.handler, 'string', 'The function does not declare a handler')
  const entry = resolve(dir, config.handler)
  assert.ok(entry.startsWith(dir + '/'), 'Handler outside the package')
  const module = await import(pathToFileURL(entry).href)
  const handler = typeof module.default === 'function' ? module.default : module.default?.default
  assert.equal(typeof handler, 'function', 'Node handler is not callable')
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
  // FileFsRef is not always written inside .func: Vercel declares it as
  // bundle destination -> file relative to the build directory in filePathMap.
  // We only materialize declared entries; we do not fill in missing ones from the checkout.
  const sourceConfig = JSON.parse(readFileSync(join(sourceDir, '.vc-config.json'), 'utf8'))
  const refs = sourceConfig.filePathMap ?? {}
  assert.ok(refs && typeof refs === 'object' && !Array.isArray(refs), 'Invalid filePathMap')
  const repoRoot = realpathSync(originalCwd)
  for (const [bundlePath, sourcePath] of Object.entries(refs)) {
    assert.equal(typeof sourcePath, 'string', 'Invalid filePathMap source')
    const destination = resolve(functionDir, bundlePath)
    assert.ok(destination.startsWith(functionDir + sep), 'filePathMap destination outside the function')
    const source = realpathSync(resolve(originalCwd, sourcePath))
    assert.ok(source.startsWith(repoRoot + sep), 'filePathMap source outside the project')
    assert.ok(!source.split(sep).some((part) => part === '.git' || /^\.env(?:\.|$)/.test(part)), 'Unexpected private file in filePathMap')
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(source, destination, { dereference: true })
  }
  console.log(`Isolated function: ${Object.keys(refs).length} files declared in filePathMap materialized.`)
  const call = await load(functionDir)
  const method = await call('GET')
  assert.equal(method.statusCode, 405)
  assert.equal(method.body.error.code, 'method_not_allowed')
  // No credentials or network: the valid case must end in the controlled response.
  const draft = await call('POST', { operation: 'draft', client_request_id: 'ci-startup-0001', brief: 'Rover rehearsal for Mars.' })
  assert.equal(draft.statusCode, 503)
  assert.equal(draft.body.error.code, 'ai_unavailable')
  assert.equal(draft.headers['cache-control'], 'no-store')

  // Geology: the official package must be INSIDE the function and validate (schema, candidates and SHA-256 of bytes).
  const text = readFileSync(join(functionDir, GEOLOGY), 'utf8')
  const fp = createHash('sha256').update(canonical(JSON.parse(text))).digest('hex')
  const explain = (geologyFp) => ({ operation: 'explain', client_request_id: 'ci-geology-0001', request: {}, request_fingerprint: 'a'.repeat(64), geology_context_fingerprint: geologyFp })
  const stale = await call('POST', explain('f'.repeat(64)))
  assert.equal(stale.body.error.code, 'geology_context_stale', 'The geology context was not loaded/validated in the packaged function')
  const ready = await call('POST', explain(fp))
  assert.equal(ready.statusCode, 503, 'The fingerprint of the packaged geology context was not accepted')
  assert.equal(ready.body.error.code, 'ai_unavailable')

  // Isolated absence (temporary copy; the package and the repository are not touched): geological channel unavailable, M8 intact.
  const copy = join(scratch, 'no-geology.func')
  cpSync(functionDir, copy, { recursive: true, dereference: true })
  rmSync(join(copy, GEOLOGY))
  process.env.LAMBDA_TASK_ROOT = copy
  const absent = await (await load(copy))('POST', explain(fp))
  assert.equal(absent.statusCode, 409)
  assert.equal(absent.body.error.code, 'geology_context_unavailable')
  // Present but corrupt: it is also not accepted nor confused with silent absence.
  writeFileSync(join(copy, GEOLOGY), text.slice(0, 400))
  const broken = await (await load(copy))('POST', explain(fp))
  assert.equal(broken.body.error.code, 'geology_context_unavailable')
  const m8 = await (await load(copy))('POST', { operation: 'draft', client_request_id: 'ci-startup-0002', brief: 'Rover rehearsal for Mars.' })
  assert.equal(m8.body.error.code, 'ai_unavailable') // M8 continues on its way without geology
  console.log('Packaged function: modules, snapshot and contracts load; GET 405 and POST without a key 503; geology package included and validated (409 for a foreign fingerprint, 503 with the correct one); isolated absence and corruption → context unavailable.')
} finally {
  process.chdir(originalCwd)
  rmSync(scratch, { recursive: true, force: true })
}
