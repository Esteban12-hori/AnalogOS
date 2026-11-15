// Precompila los validadores Ajv de los contratos a código JS estándar.
// La web valida igual que antes en el límite del sistema, pero sin cargar el
// compilador de Ajv ni compilar esquemas en el navegador (menos bytes y CPU).
//
// Genera un módulo por chunk que lo usa (docs/UX_REDESIGN.md §6.1: cada chunk paga solo lo suyo):
// - validators.generated.js: snapshot (candidato, manifiesto, perfil). Va en el chunk principal.
// - validators.analogs.generated.js: catálogo de análogos de referencia (se carga con el catálogo).
// - validators.interpretation.generated.js: interpretación de misión (chunk de misión).
// - validators.mission.generated.js: paquete de evidencia y eventos de análisis IA (UX_REDESIGN
//   §5). Solo lo importa el chunk diferido de la Lectura.
//
// Uso: node scripts/build-validators.mjs [--check]   (--check falla si algún archivo está desfasado)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import standaloneCode from 'ajv/dist/standalone/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const contracts = resolve(here, '../../../contracts')
const domain = resolve(here, '../src/domain')
const schema = (name) => JSON.parse(readFileSync(resolve(contracts, name), 'utf8'))

/** Archivo de salida → { nombre exportado: esquema }. */
const OUTPUTS = {
  'validators.generated.js': {
    validateCandidate: 'candidate-site.schema.json',
    validateManifest: 'data-manifest.schema.json',
    validateProfile: 'mission-profile.schema.json',
  },
  'validators.analogs.generated.js': {
    validateReferenceAnalogs: 'reference-analog.schema.json',
  },
  'validators.interpretation.generated.js': {
    validateMissionInterpretation: 'mission-interpretation.schema.json',
  },
  'validators.mission.generated.js': {
    validateEvidencePacket: 'evidence-packet.schema.json',
    validateAiAnalysisEvent: 'ai-analysis.schema.json',
  },
}

export function generate(exportsToFiles) {
  const ajv = new Ajv2020({ allErrors: true, strict: false, code: { source: true, esm: true, lines: true } })
  addFormats(ajv)
  const refs = {}
  for (const [name, file] of Object.entries(exportsToFiles)) {
    const loaded = schema(file)
    ajv.addSchema(loaded)
    refs[name] = loaded.$id
  }
  const code = standaloneCode(ajv, refs)
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
  return `/* eslint-disable */\n// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.\n${header}\n${esm.trimEnd()}\n`
}

const check = process.argv.includes('--check')
let stale = false
for (const [file, entries] of Object.entries(OUTPUTS)) {
  const out = resolve(domain, file)
  const code = generate(entries)
  if (!check) {
    writeFileSync(out, code)
    continue
  }
  let current = ''
  try {
    current = readFileSync(out, 'utf8')
  } catch {
    current = ''
  }
  if (current !== code) {
    console.error(`${file} está desfasado: ejecuta node scripts/build-validators.mjs`)
    stale = true
  }
}
if (stale) process.exit(1)
