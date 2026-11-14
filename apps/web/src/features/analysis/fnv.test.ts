import { describe, expect, it } from 'vitest'
import { canonicalJson, fnv1a64, packetHash } from './fnv'

/** Referencia independiente con BigInt (solo en el test): FNV-1a 64 de los bytes UTF-8. */
function reference(text: string): string {
  let hash = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte)
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return hash.toString(16).padStart(16, '0')
}

describe('FNV-1a 64 (huella del paquete de evidencia)', () => {
  it('reproduce los vectores publicados', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325')
    expect(fnv1a64('a')).toBe('af63dc4c8601ec8c')
    expect(fnv1a64('foobar')).toBe('85944171f73967e8')
  })

  it('coincide con una implementación BigInt en textos largos y con tildes, ñ y emoji', () => {
    const samples = [
      'Pampa Yungay — más rugoso que Jezero · 1,5× Jezero',
      'ñandú · «comillas» · ±20 % · ■ ◆ ✦',
      '🚀'.repeat(40),
      JSON.stringify({ facts: { 'site:cl-a:slope:raw': '3,2°' } }).repeat(50),
    ]
    for (const sample of samples) expect(fnv1a64(sample)).toBe(reference(sample))
  })

  it('cualquier cambio de un carácter cambia la huella', () => {
    expect(fnv1a64('3,2°')).not.toBe(fnv1a64('3,3°'))
  })
})

describe('forma canónica', () => {
  it('ordena las claves en todos los niveles y no agrega espacios', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: true, y: null }], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,{"y":null,"z":true}]},"b":1}')
  })

  it('omite undefined y rechaza números no finitos', () => {
    expect(canonicalJson({ a: undefined, b: 2 })).toBe('{"b":2}')
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(RangeError)
    expect(() => canonicalJson({ a: Number.POSITIVE_INFINITY })).toThrow(RangeError)
  })

  it('la huella del paquete no depende del orden de las claves ni de su propio packet_hash', () => {
    const a = { schema: 'evidence-packet/1', sites: ['cl-a'], facts: { x: '1', y: '2' } }
    const b = { facts: { y: '2', x: '1' }, sites: ['cl-a'], schema: 'evidence-packet/1', packet_hash: 'fnv1a64:0000000000000000' }
    expect(packetHash(a)).toBe(packetHash(b))
    expect(packetHash(a)).toMatch(/^fnv1a64:[0-9a-f]{16}$/)
    expect(packetHash({ ...a, sites: ['cl-b'] })).not.toBe(packetHash(a))
  })
})
