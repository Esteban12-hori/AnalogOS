// Tests adversariales del filtro de texto de la IA (docs/UX_REDESIGN.md §5.5): la IA nunca
// escribe cifras, números escritos ni veredictos; solo cita hechos del motor con {{id}}.
import { describe, expect, it } from 'vitest'
import { checkTokenText, scanPlainText, splitMarkers, type TextIssueCode } from './analysisTokens'

const facts = {
  'site:cl-pampa-yungay-screening:slope:ratio': '1,4× Jezero',
  'site:cl-pampa-yungay-screening:slope:raw': '3,2°',
  'mars:slope': '2,2°',
}
const refs = Object.keys(facts)

function code(text: string): TextIssueCode | null {
  return scanPlainText(text)?.code ?? null
}

describe('dígitos y porcentajes fuera de los marcadores', () => {
  it.each([
    ['dígito ASCII', 'La pendiente es 3 grados'],
    ['decimal con coma', 'unos 1,4 sobre Jezero'],
    ['dígito de ancho completo', 'pendiente ３ grados'],
    ['dígito arábigo-índico', 'pendiente ٣ grados'],
    ['superíndice', 'un área de km²'],
    ['fracción vulgar', 'cerca de ½ del valor'],
    ['número romano Unicode', 'categoría Ⅲ'],
  ])('rechaza %s', (_label, text) => {
    expect(code(text)).toBe('digit')
  })

  it.each([
    ['%', 'casi todo el suelo, % alto'],
    ['％ de ancho completo', 'alto ％'],
    ['٪ arábigo', 'alto ٪'],
    ['‰', 'un ‰ de agua'],
  ])('rechaza el signo %s', (_label, text) => {
    expect(code(text)).toBe('percent')
  })

  it.each(['×', '±', '≈', '÷'])('rechaza el símbolo numérico «%s»', (symbol) => {
    expect(code(`más exigente ${symbol} Jezero`)).toBe('numeric_symbol')
  })
})

describe('números escritos', () => {
  it.each([
    'el doble de rugoso',
    'casi el triple de relieve',
    'la mitad de pendiente',
    'un tercio del relieve',
    'tres veces más inclinado',
    'dos sectores comparten aridez',
    'veintidós escenarios',
    'doscientos metros',
    'cien por cien',
    'cada uno de los sectores',
    'un porcentaje alto',
    'duplica la rugosidad',
    'Duplicado frente a Jezero',
    'twice as rough',
    'half the slope',
  ])('rechaza «%s»', (text) => {
    expect(code(text)).toBe('number_word')
  })

  it('rechaza «por ciento» aunque cada palabra suelta sea inocente', () => {
    expect(scanPlainText('cerca del noventa por ciento')?.code).toBe('number_word')
    expect(scanPlainText('cerca de diez por ciento')?.detail).toBe('diez')
  })

  it('no confunde palabras que contienen un número: «todos», «unidad», «adosado», «dosis», «trescientas» sí cuenta', () => {
    expect(code('todos los sectores tienen esa unidad')).toBeNull()
    expect(code('un relieve adosado a la ladera')).toBeNull()
    expect(code('una dosis de polvo')).toBeNull()
    expect(code('trescientas celdas')).toBe('number_word')
  })

  it('normaliza mayúsculas, tildes y ancho completo antes de comparar', () => {
    expect(code('EL DOBLE de rugoso')).toBe('number_word')
    expect(code('ｄｏｂｌｅ')).toBe('number_word')
    expect(code('dóble')).toBe('number_word')
  })
})

describe('vocabulario de veredicto', () => {
  it.each([
    ['seguro', 'un terreno seguro para el rover'],
    ['segura', 'una ruta Segura'],
    ['aprobado', 'sitio aprobado'],
    ['garantiza', 'garantiza el éxito'],
    ['garantía', 'sin garantía de tracción'],
    ['ideal', 'es ideal para probar'],
    ['apto', 'un lugar apto'],
    ['apta', 'zona APTA'],
    ['puntaje', 'su puntaje es alto'],
    ['puntúa', 'puntúa mejor'],
    ['score', 'el score sube'],
    ['óptimo', 'un sitio óptimo'],
    ['el mejor', 'es el mejor análogo'],
    ['la mejor', 'la mejor opción'],
    ['los mejores', 'los mejores sectores'],
  ])('rechaza «%s»', (_label, text) => {
    expect(code(text)).toBe('vocabulary')
  })

  it('permite «mejor» como comparación que no es un veredicto', () => {
    expect(code('reproduce mejor la pendiente que el otro sector')).toBeNull()
    expect(code('el que mejor reproduce la pendiente')).toBeNull()
  })

  it('no confunde «seguridad» ni «aptitud» con un veredicto', () => {
    expect(code('requiere revisión de seguridad en terreno')).toBeNull()
  })
})

// El motor fija todo orden y toda postura (§0.8, §5.5): la IA cita {{site:…:rank}}, no lo escribe.
describe('afirmaciones de orden y preferencia', () => {
  it.each([
    ['primera', 'Pampa Yungay queda primera y Cordón de Domeyko segunda'],
    ['encabeza', 'Domeyko encabeza el ranking de la comparativa'],
    ['última', 'Pampa María Elena queda última'],
    ['lidera', 'Domeyko lidera la comparativa'],
    ['ranking', 'sube en el ranking'],
    ['preferible', 'Domeyko es preferible y recomendable'],
    ['adecuado', 'Este sector es el más adecuado y confiable'],
    ['confiable', 'un sector confiable'],
  ])('rechaza «%s»', (_label, text) => {
    expect(code(text)).toBe('rank')
  })

  it('no confunde «superficie», «primavera» ni «adecuación» con un orden', () => {
    expect(code('la superficie expuesta en primavera')).toBeNull()
  })
})

describe('cuantificadores escritos', () => {
  it.each([
    ['media', 'La rugosidad es una vez y media la de Jezero'],
    ['medio', 'Supera a Jezero por medio grado'],
    ['par', 'La pendiente es un par de grados mayor'],
    ['cuarto', 'un cuarto más de relieve'],
  ])('rechaza «%s»', (_label, text) => {
    expect(code(text)).toBe('number_word')
  })

  it('no confunde «mediana» ni «para» con un número', () => {
    expect(code('la pendiente mediana sirve para probar laderas')).toBeNull()
  })
})

describe('criterios que este snapshot no mide', () => {
  it.each(['hielo', 'minerales', 'mineralogía', 'radiación', 'regolito', 'química', 'químicos'])('rechaza «%s» fuera de unsupported', (word) => {
    expect(code(`la ${word} del sector`)).toBe('unmeasured')
  })

  it('se puede desactivar solo para repetir lo que pidió el usuario (interpretación)', () => {
    expect(scanPlainText('pediste hielo', { unmeasured: false })).toBeNull()
  })
})

describe('caracteres invisibles y homóglifos', () => {
  it.each([
    ['espacio de ancho cero', 'do​ble'],
    ['marca bidi', 'texto ‮elbod'],
    ['guion blando', 'do­ble'],
    ['BOM', '﻿texto'],
  ])('rechaza %s', (_label, text) => {
    expect(code(text)).toBe('control')
  })

  it.each([
    ['o cirílica', 'dоble'],
    ['alfa griega', 'idεal'],
  ])('rechaza letras de otros alfabetos (%s)', (_label, text) => {
    expect(code(text)).toBe('script')
  })
})

describe('marcadores {{id}}', () => {
  it('acepta marcadores existentes y declarados, y devuelve los tramos', () => {
    const result = checkTokenText('Más inclinado que Jezero: {{site:cl-pampa-yungay-screening:slope:ratio}}.', { facts, refs })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.markers).toEqual(['site:cl-pampa-yungay-screening:slope:ratio'])
    expect(result.segments).toEqual([
      { kind: 'text', text: 'Más inclinado que Jezero: ' },
      { kind: 'marker', id: 'site:cl-pampa-yungay-screening:slope:ratio' },
      { kind: 'text', text: '.' },
    ])
  })

  it('rechaza un marcador que no existe en el paquete', () => {
    expect(checkTokenText('valor {{site:cl-pampa-yungay-screening:slope:sim}}', { facts, refs: [...refs, 'site:cl-pampa-yungay-screening:slope:sim'] }))
      .toEqual({ ok: false, issue: { code: 'unknown_ref', detail: 'site:cl-pampa-yungay-screening:slope:sim' } })
  })

  it('rechaza un marcador existente pero no declarado en refs', () => {
    expect(checkTokenText('Jezero: {{mars:slope}}', { facts, refs: [] })).toEqual({ ok: false, issue: { code: 'undeclared_ref', detail: 'mars:slope' } })
  })

  it.each([
    ['llave suelta', 'texto } suelto'],
    ['marcador sin cerrar', 'valor {{mars:slope'],
    ['marcador vacío', 'valor {{}}'],
    ['id con espacios', 'valor {{ mars:slope }}'],
    ['id con mayúsculas', 'valor {{MARS:slope}}'],
    ['llaves triples', 'valor {{{mars:slope}}}'],
  ])('rechaza un %s', (_label, text) => {
    const result = checkTokenText(text, { facts, refs })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.code).toBe('malformed_marker')
  })

  it('el filtro se aplica a todo lo que queda fuera de los marcadores', () => {
    const result = checkTokenText('{{mars:slope}} es el doble que {{site:cl-pampa-yungay-screening:slope:raw}}', { facts, refs })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue).toEqual({ code: 'number_word', detail: 'doble' })
  })

  it('una cifra pegada a un marcador sigue siendo una cifra', () => {
    const result = checkTokenText('{{mars:slope}}0', { facts, refs })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.code).toBe('digit')
  })

  it('rechaza textos vacíos o de más de 280 caracteres', () => {
    expect(checkTokenText('   ', { facts, refs }).ok).toBe(false)
    expect(checkTokenText('a'.repeat(281), { facts, refs })).toEqual({ ok: false, issue: { code: 'too_long', detail: '281' } })
  })

  it('splitMarkers separa sin validar los ids contra el paquete', () => {
    expect(splitMarkers('{{a}}{{b}}')).toEqual({ ok: true, segments: [{ kind: 'marker', id: 'a' }, { kind: 'marker', id: 'b' }] })
  })
})
