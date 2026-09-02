import { describe, expect, it } from 'vitest'

import { EMPTY_CARD, isCardValid, validateCard, type CardForm } from './validation'

const VALID: CardForm = {
  holder: 'Ana Gomez',
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
}

describe('validateCard', () => {
  it('acepta los cuatro datos bien formados', () => {
    expect(validateCard(VALID)).toEqual({})
    expect(isCardValid(VALID)).toBe(true)
  })

  /** CA-02: si falta uno de los datos documentados, no se puede confirmar. */
  it.each([['holder'], ['number'], ['expiry'], ['securityCode']] as const)(
    'senala el campo %s cuando esta vacio',
    (field) => {
      const errors = validateCard({ ...VALID, [field]: '' })

      expect(errors[field]).toBeDefined()
      expect(isCardValid({ ...VALID, [field]: '' })).toBe(false)
    },
  )

  it('un formulario vacio senala los cuatro campos', () => {
    expect(Object.keys(validateCard(EMPTY_CARD)).sort()).toEqual([
      'expiry',
      'holder',
      'number',
      'securityCode',
    ])
  })

  it('admite el numero con espacios o guiones', () => {
    expect(validateCard({ ...VALID, number: '4111 1111 1111 1111' })).toEqual({})
    expect(validateCard({ ...VALID, number: '4111-1111-1111-1111' })).toEqual({})
  })

  it('rechaza un numero con letras', () => {
    expect(validateCard({ ...VALID, number: '4111abcd11111111' }).number).toBeDefined()
  })

  it.each([['13/30'], ['00/30'], ['1/30'], ['12/2030'], ['12-30']])(
    'rechaza el vencimiento %s',
    (expiry) => {
      expect(validateCard({ ...VALID, expiry }).expiry).toBeDefined()
    },
  )

  it('admite tres y cuatro digitos de codigo de seguridad', () => {
    expect(validateCard({ ...VALID, securityCode: '123' })).toEqual({})
    expect(validateCard({ ...VALID, securityCode: '1234' })).toEqual({})
  })

  it.each([['12'], ['12345'], ['abc']])('rechaza el codigo %s', (securityCode) => {
    expect(validateCard({ ...VALID, securityCode }).securityCode).toBeDefined()
  })

  it('ignora los espacios sobrantes alrededor', () => {
    expect(validateCard({ ...VALID, holder: '  Ana Gomez  ', expiry: ' 12/30 ' })).toEqual({})
  })

  /**
   * HU-59 dice que la historia no establece marcas, longitudes exactas ni
   * algoritmos de validacion. Estas tarjetas de prueba no pasan Luhn y **deben
   * aceptarse**: rechazarlas seria inventar una regla que nadie pidio.
   */
  it('no aplica Luhn ni valida la marca', () => {
    expect(validateCard({ ...VALID, number: '1234567890123' })).toEqual({})
    expect(validateCard({ ...VALID, number: '0000000000000000' })).toEqual({})
  })

  /** Tampoco se comprueba que la fecha sea futura: no lo documenta la historia. */
  it('no exige que el vencimiento sea futuro', () => {
    expect(validateCard({ ...VALID, expiry: '01/20' })).toEqual({})
  })
})
