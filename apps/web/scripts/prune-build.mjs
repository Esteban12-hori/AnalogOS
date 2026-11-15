import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const generatedDist = resolve(scriptDirectory, '..', 'dist')

// The deployable build only carries the v3 snapshot and its visual context; the historical ones remain in the repository.
for (const historicalSnapshot of ['demo', 'science-v1', 'science-v2', 'visual-context']) {
  await rm(resolve(generatedDist, historicalSnapshot), { recursive: true, force: true })
}
