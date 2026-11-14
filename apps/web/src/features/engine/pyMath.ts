/**
 * Aritmética con la semántica exacta de Python que usa `pipelines/scoring.py`, para que el port TS
 * tenga paridad ≤1e-6 (ADR-009) también en los bordes de redondeo:
 *
 * - `pyRound(x, n)` ≡ `round(x, n)` de Python: redondeo correcto sobre el valor binario exacto y,
 *   en un empate exacto, al par (0.125 → 0.12). `Math.round(x * 100) / 100` falla en ambos casos.
 * - `pySum(xs)` ≡ `sum(xs)` de Python ≥3.12, que usa suma compensada de Neumaier
 *   (`sum([0.1] * 10) == 1.0`).
 */

const view = new DataView(new ArrayBuffer(8))

function trailingZeros32(value: number): number {
  return 31 - Math.clz32(value & -value)
}

/**
 * ¿`|x|·10^digits` queda exactamente a mitad de camino entre dos enteros?
 * Con x = m·2^e (m entero), 2·|x|·10^d = (m·5^d)·2^(v2(m)+d+e+1) con m·5^d impar tras quitar
 * los factores 2: es un entero impar solo si v2(m) + d + e + 1 = 0.
 */
function isHalfwayTie(x: number, digits: number): boolean {
  view.setFloat64(0, x)
  const high = view.getUint32(0)
  const low = view.getUint32(4)
  const exponentBits = (high >>> 20) & 0x7ff
  if (exponentBits === 0x7ff) return false
  let mantissaHigh = high & 0xfffff
  let exponent: number
  if (exponentBits === 0) {
    if (mantissaHigh === 0 && low === 0) return false
    exponent = -1074
  } else {
    mantissaHigh |= 0x100000
    exponent = exponentBits - 1075
  }
  const twos = low !== 0 ? trailingZeros32(low) : 32 + trailingZeros32(mantissaHigh)
  return twos + digits + exponent + 1 === 0
}

/** `round(x, digits)` de Python para floats (0 ≤ digits ≤ 20). Conserva el signo del cero. */
export function pyRound(x: number, digits: number): number {
  if (!Number.isFinite(x) || x === 0) return x
  // toFixed redondea el valor binario EXACTO (ES2015+ §Number.prototype.toFixed); en un empate
  // exacto elige el de mayor magnitud. Python elige el par: se corrige solo ese caso.
  let text = Math.abs(x).toFixed(digits)
  if (isHalfwayTie(x, digits)) {
    const last = text.charCodeAt(text.length - 1) - 48
    // El último dígito es impar: restar 1 no arrastra (1→0, 3→2, …, 9→8).
    if (last % 2 === 1) text = text.slice(0, -1) + String(last - 1)
  }
  const magnitude = Number(text)
  return x < 0 ? -magnitude : magnitude
}

/** `sum(values)` de Python ≥3.12 (suma compensada de Neumaier); `sum([]) == 0`. */
export function pySum(values: readonly number[]): number {
  let total = 0
  let compensation = 0
  values.forEach((value, index) => {
    if (index === 0) {
      total = 0 + value
      return
    }
    const next = total + value
    compensation += Math.abs(total) >= Math.abs(value) ? total - next + value : value - next + total
    total = next
  })
  // Igual que CPython: no se pierde el signo ni se convierte un desborde en NaN.
  return compensation !== 0 && Number.isFinite(compensation) ? total + compensation : total
}
