import { describe, expect, it } from 'vitest'
import { EMPTY_CARD, isCardValid, validateCard, type CardForm } from './validation'

const VALID: CardForm = {
  holder: 'A',
  number: 'tarjeta-prueba',
  expiry: 'pasado',
  securityCode: 'x',
}

describe('Datos obligatorios del pago simulado', () => {
  it.each(['holder', 'number', 'expiry', 'securityCode'] as const)(
    'rechaza %s vacio o solo espacios',
    (field) => {
      expect(validateCard({ ...VALID, [field]: '' })[field]).toBeDefined()
      expect(isCardValid({ ...VALID, [field]: '   ' })).toBe(false)
    },
  )
  it('senala los cuatro campos ausentes', () => {
    expect(Object.keys(validateCard(EMPTY_CARD))).toHaveLength(4)
  })
  it('no impone longitudes, algoritmos ni fechas bancarias a datos de prueba', () => {
    expect(validateCard(VALID)).toEqual({})
    expect(isCardValid({ ...VALID, number: '0000', expiry: '01/20', securityCode: '12345' })).toBe(
      true,
    )
  })
})
