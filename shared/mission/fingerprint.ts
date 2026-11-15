// Deterministic fingerprint (canonical JSON + pure, synchronous SHA-256) to invalidate
// results and discard late responses without relying on WebCrypto (file://).

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite value in canonical JSON')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(',')}}`
}

function primes(count: number): number[] {
  const found: number[] = []
  for (let n = 2; found.length < count; n += 1) {
    if (found.every((p) => n % p !== 0)) found.push(n)
  }
  return found
}
const frac32 = (x: number): number => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0
const K = primes(64).map((p) => frac32(Math.cbrt(p)))
const H0 = primes(8).map((p) => frac32(Math.sqrt(p)))
const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0

export function sha256Hex(text: string): string {
  const data = new TextEncoder().encode(text)
  const padded = new Uint8Array((((data.length + 9 + 63) >> 6) << 6))
  padded.set(data)
  padded[data.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 2 ** 32))
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0)
  const h = [...H0]
  const w = new Uint32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i += 1) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    const next = [a, b, c, d, e, f, g, hh]
    for (let i = 0; i < 8; i += 1) h[i] = (h[i] + next[i]) >>> 0
  }
  return h.map((x) => x.toString(16).padStart(8, '0')).join('')
}

export function fingerprint(value: unknown): string {
  return sha256Hex(canonicalJson(value))
}
