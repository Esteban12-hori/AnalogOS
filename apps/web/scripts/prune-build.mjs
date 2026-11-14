import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const generatedDist = resolve(scriptDirectory, '..', 'dist')

for (const historicalSnapshot of ['demo', 'science-v1']) {
  await rm(resolve(generatedDist, historicalSnapshot), { recursive: true, force: true })
}
