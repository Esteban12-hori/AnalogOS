import { describe, expect, it } from 'vitest'
import { readNdjson } from './ndjson'

function stream(chunks: string[]): { body: ReadableStream<Uint8Array>; cancelled: () => boolean } {
  const encoder = new TextEncoder()
  let cancelled = false
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++]
      if (chunk === undefined) controller.close()
      else controller.enqueue(encoder.encode(chunk))
    },
    cancel() {
      cancelled = true
    },
  })
  return { body, cancelled: () => cancelled }
}

describe('readNdjson', () => {
  it('reconstruye líneas partidas entre trozos (incluso un carácter multibyte) y omite líneas vacías', async () => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode('{"a":"más"}\r\n\n{"b":2}')
    // Corta en medio de la «á» (2 bytes en UTF-8).
    const split = bytes.indexOf(0xc3) + 1
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split))
        controller.enqueue(bytes.slice(split))
        controller.close()
      },
    })
    const lines: string[] = []
    expect(await readNdjson(body, (line) => (lines.push(line), true))).toBe('ended')
    expect(lines).toEqual(['{"a":"más"}', '{"b":2}'])
  })

  it('se detiene y cancela el stream cuando onLine devuelve false', async () => {
    const source = stream(['{"type":"meta"}\n{"type":"done"}\n', '{"type":"late"}\n'])
    const lines: string[] = []
    expect(await readNdjson(source.body, (line) => (lines.push(line), !line.includes('done')))).toBe('stopped')
    expect(lines).toHaveLength(2)
    expect(source.cancelled()).toBe(true)
  })

  it('corta líneas demasiado largas, demasiadas líneas o demasiados caracteres', async () => {
    const limits = { maxLineChars: 10, maxLines: 2, maxChars: 40 }
    expect(await readNdjson(stream(['x'.repeat(11) + '\n']).body, () => true, limits)).toBe('too_large')
    expect(await readNdjson(stream(['x'.repeat(12)]).body, () => true, limits)).toBe('too_large')
    expect(await readNdjson(stream(['a\nb\nc\n']).body, () => true, limits)).toBe('too_large')
    expect(await readNdjson(stream(['a\n'.repeat(5), 'b'.repeat(40)]).body, () => true, { ...limits, maxLines: 99 })).toBe('too_large')
  })
})
