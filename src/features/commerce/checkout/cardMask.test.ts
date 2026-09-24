import { describe, expect, it } from 'vitest'
import {
  caretPositionForDigitCount,
  digitsBeforeCursor,
  formatCardNumber,
  formatExpiry,
  sanitizeCardNumber,
  sanitizeExpiryDigits,
  sanitizeSecurityCode,
} from './cardMask'

describe('Numero de tarjeta: PAN canonico vs. texto mostrado', () => {
  it('deja solo digitos', () => {
    expect(sanitizeCardNumber('4111-1111 1111x1111')).toBe('4111111111111111')
  })

  it('acepta pegar con o sin espacios: normaliza igual en ambos casos', () => {
    expect(sanitizeCardNumber('4111 1111 1111 1111')).toBe('4111111111111111')
    expect(sanitizeCardNumber('4111111111111111')).toBe('4111111111111111')
  })

  it('recorta a 16 digitos canonicos', () => {
    expect(sanitizeCardNumber('41111111111111119999')).toBe('4111111111111111')
    expect(sanitizeCardNumber('41111111111111119999')).toHaveLength(16)
  })

  it('agrupa en bloques de 4 para mostrarlo, sin agregar espacio final', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111')
    expect(formatCardNumber('4111')).toBe('4111')
    expect(formatCardNumber('41111')).toBe('4111 1')
    expect(formatCardNumber('')).toBe('')
  })
})

describe('Vencimiento: MM/AA con barra automatica', () => {
  it('deja solo digitos y recorta a 4 (MMAA)', () => {
    expect(sanitizeExpiryDigits('12/30')).toBe('1230')
    expect(sanitizeExpiryDigits('12/30/99')).toBe('1230')
  })

  it('no inserta la barra hasta que empieza el año', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('123')).toBe('12/3')
    expect(formatExpiry('1230')).toBe('12/30')
  })
})

describe('Codigo de seguridad: solo digitos, 3 a 4', () => {
  it('deja solo digitos', () => {
    expect(sanitizeSecurityCode('1a2b3')).toBe('123')
  })

  it('recorta a 4 digitos', () => {
    expect(sanitizeSecurityCode('123456')).toBe('1234')
  })
})

describe('Reposicion del cursor tras strip+reformat', () => {
  it('cuenta los digitos antes del cursor, ignorando separadores', () => {
    expect(digitsBeforeCursor('4111 1111', 9)).toBe(8)
    expect(digitsBeforeCursor('4111 1111', 5)).toBe(4)
    expect(digitsBeforeCursor('12/30', 3)).toBe(2)
  })

  it('ubica el cursor tras el n-esimo digito del texto formateado, saltando separadores', () => {
    // Insertar un digito en medio de "4111 1111 ..." no debe mandar el cursor al final.
    expect(caretPositionForDigitCount('4111 1111', 5)).toBe(6)
    expect(caretPositionForDigitCount('12/30', 2)).toBe(2)
    expect(caretPositionForDigitCount('12/30', 3)).toBe(4)
  })

  it('con 0 digitos antes del cursor, lo deja al inicio', () => {
    expect(caretPositionForDigitCount('4111 1111', 0)).toBe(0)
  })

  it('si se pide mas digitos de los que hay, deja el cursor al final', () => {
    expect(caretPositionForDigitCount('4111', 99)).toBe(4)
  })
})
