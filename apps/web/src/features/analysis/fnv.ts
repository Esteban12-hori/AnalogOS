/**
 * Huella del paquete de evidencia (docs/UX_REDESIGN.md §5.3): FNV-1a de 64 bits en JS puro,
 * sin BigInt ni `crypto.subtle` (puede faltar cuando el ZIP se abre desde `file://`).
 *
 * Forma canónica (la misma que debe reproducir lktron para firmar su respuesta):
 *  - JSON sin espacios;
 *  - claves de objeto ordenadas por unidades UTF-16 (`Array.prototype.sort` sin comparador);
 *  - escalares con `JSON.stringify`; números finitos solamente;
 *  - el campo `packet_hash` se omite antes de calcular la huella.
 * La huella es FNV-1a 64 sobre los bytes UTF-8 de esa cadena, en 16 dígitos hex.
 */

/** Serializa en la forma canónica. Lanza ante números no finitos o valores no JSON. */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value)
    case 'number':
      if (!Number.isFinite(value)) throw new RangeError('canonicalJson: número no finito')
      return JSON.stringify(value)
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
      const record = value as Record<string, unknown>
      const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort()
      return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
    }
    default:
      throw new TypeError(`canonicalJson: valor no serializable (${typeof value})`)
  }
}

const encoder = new TextEncoder()

function hex4(limb: number): string {
  return limb.toString(16).padStart(4, '0')
}

/**
 * FNV-1a 64 con cuatro limbos de 16 bits. Primo 2^40 + 0x1b3: h·p = (h << 40) + h·0x1b3 (mod 2^64).
 * Base 0xcbf29ce484222325. Vectores: "" → cbf29ce484222325, "a" → af63dc4c8601ec8c.
 */
export function fnv1a64(text: string): string {
  let h0 = 0x2325
  let h1 = 0x8422
  let h2 = 0x9ce4
  let h3 = 0xcbf2
  for (const byte of encoder.encode(text)) {
    h0 ^= byte
    const t0 = h0 * 0x1b3
    let t1 = h1 * 0x1b3
    let t2 = h2 * 0x1b3 + ((h0 & 0xff) << 8)
    let t3 = h3 * 0x1b3 + (h0 >>> 8) + ((h1 & 0xff) << 8)
    t1 += t0 >>> 16
    t2 += t1 >>> 16
    t3 += t2 >>> 16
    h0 = t0 & 0xffff
    h1 = t1 & 0xffff
    h2 = t2 & 0xffff
    h3 = t3 & 0xffff
  }
  return hex4(h3) + hex4(h2) + hex4(h1) + hex4(h0)
}

export const PACKET_HASH_PREFIX = 'fnv1a64:'

/** Huella `fnv1a64:<16 hex>` de un paquete (sin su propio `packet_hash`). */
export function packetHash(packet: Readonly<Record<string, unknown>>): string {
  const { packet_hash: omitted, ...rest } = packet
  void omitted
  return PACKET_HASH_PREFIX + fnv1a64(canonicalJson(rest))
}
