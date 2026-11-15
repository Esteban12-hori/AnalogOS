// Textos de la interfaz integrada (ADR-013): ninguna superficie promete un % de misión, rotula
// «DEMO», habla de niveles ponderados, dice «M8» o «AnalogOS Chile», ni expone VITE_LKTRON.
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

describe('textos de producto', () => {
  it('ninguna superficie contiene los textos retirados', () => {
    for (const file of sources(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const phrase of FORBIDDEN) expect(text.includes(phrase), `${file}: «${phrase}»`).toBe(false)
    }
  })

  it('ninguna superficie de usuario dice «M8» (comentarios aparte)', () => {
    for (const file of sources(SRC).filter((path) => path.endsWith('.tsx'))) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      expect(code, file).not.toMatch(/\bM8\b/)
    }
  })

  it('App.tsx mantiene la promesa del producto (la lee missionFormat.test del equipo)', () => {
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8')
    expect(app).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
    expect(app).toContain('No mide tracción ni aprueba terreno')
    expect(app).not.toContain('reproduce mejor condiciones')
  })
})
