// Precompila los validadores Ajv de los contratos a código JS estándar.
// La web valida igual que antes en el límite del sistema, pero sin cargar el
// compilador de Ajv ni compilar esquemas en el navegador (menos bytes y CPU).
// Uso: node scripts/build-validators.mjs [--check]   (--check falla si el archivo está desfasado)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import standaloneCode from 'ajv/dist/standalone/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const contracts = resolve(here, '../../../contracts')
const out = resolve(here, '../src/domain/validators.generated.js')
const schema = (name) => JSON.parse(readFileSync(resolve(contracts, name), 'utf8'))

export function generate() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, code: { source: true, esm: true, lines: true } })
  addFormats(ajv)
  const candidate = schema('candidate-site.schema.json')
  const manifest = schema('data-manifest.schema.json')
  const profile = schema('mission-profile.schema.json')
  ajv.addSchema(candidate).addSchema(manifest).addSchema(profile)
  const code = standaloneCode(ajv, {
    validateCandidate: candidate.$id,
    validateManifest: manifest.$id,
    validateProfile: profile.$id,
  })
  // Ajv emite require() para dos dependencias de runtime; se convierten a import ESM.
  const imports = new Map()
  const esm = code
    .replace(/^"use strict";\n/m, '')
    .replace(/require\("([^"]+)"\)(\.default)?/g, (_, module, isDefault) => {
      const key = `${module}${isDefault ?? ''}`
      if (!imports.has(key)) imports.set(key, { name: `__dep${imports.size}`, module, isDefault: Boolean(isDefault) })
      const { name } = imports.get(key)
      return isDefault ? `__interop(${name})` : name
    })
  const header = [...imports.values()]
    .map(({ name, module }) => `import * as ${name} from '${module}.js'`)
    .concat(
      // Interop CommonJS: Vite respeta __esModule y Node no; ambos quedan en la función exportada.
      "const __interop = (m) => (typeof m.default === 'function' ? m.default : m.default?.default ?? m)",
    )
    .join('\n')
  return `/* eslint-disable */\n// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.\n${header}\n${esm}\n`
}

const code = generate()
if (process.argv.includes('--check')) {
  if (readFileSync(out, 'utf8') !== code) {
    console.error('validators.generated.js está desfasado: ejecuta node scripts/build-validators.mjs')
    process.exit(1)
  }
} else {
  writeFileSync(out, code)
}
