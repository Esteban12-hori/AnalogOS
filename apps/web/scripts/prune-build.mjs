import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const generatedDist = resolve(scriptDirectory, '..', 'dist')

// El build desplegable solo lleva el snapshot v3 y su contexto visual; los históricos quedan en el repositorio.
for (const historicalSnapshot of ['demo', 'science-v1', 'science-v2', 'visual-context']) {
  await rm(resolve(generatedDist, historicalSnapshot), { recursive: true, force: true })
}
