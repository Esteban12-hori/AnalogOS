// Integrated interface texts (ADR-013): no surface promises a mission %, labels
// «DEMO», talks about weighted levels, says «M8» or «AnalogOS Chile», or exposes VITE_LKTRON.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const FORBIDDEN = ['% del motor determinista', 'DEMO · sin IA', 'nivel ÷ suma', 'Perfil de tu misión', 'AnalogOS Chile', 'VITE_LKTRON', 'motor determinista v', 'reglas del equipo']

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) && !/testSupport|v3Support/.test(name) ? [path] : []
  })
}

describe('product texts', () => {
  it('no surface contains the retired texts', () => {
    for (const file of sources(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const phrase of FORBIDDEN) expect(text.includes(phrase), `${file}: «${phrase}»`).toBe(false)
    }
  })

  it('no user surface says “M8” (comments aside)', () => {
    for (const file of sources(SRC).filter((path) => path.endsWith('.tsx'))) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      expect(code, file).not.toMatch(/\bM8\b/)
    }
  })

  it('App.tsx keeps the product promise (read by the team missionFormat.test)', () => {
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8')
    expect(app).toContain('Prioritizes which sectors deserve reconnaissance for a rover test')
    expect(app).toContain('It does not measure traction or approve terrain')
    expect(app).not.toContain('best reproduces conditions')
  })
})
