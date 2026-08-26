import { describe, expect, it } from 'vitest'

import { EMPTY_LOGIN_VALUES, FIELD, MESSAGES, hasErrors, validateLoginForm } from './validation'

describe('validateLoginForm', () => {
  it('exige correo/apodo y contrasena cuando ambos faltan', () => {
    const errors = validateLoginForm(EMPTY_LOGIN_VALUES)

    expect(errors[FIELD.identifier]).toBe(MESSAGES.identifierRequired)
    expect(errors[FIELD.password]).toBe(MESSAGES.passwordRequired)
    expect(hasErrors(errors)).toBe(true)
  })

  it('no encuentra errores cuando ambos campos estan diligenciados', () => {
    const errors = validateLoginForm({ identifier: 'ana@nexus.test', password: 'cualquiera' })

    expect(errors).toEqual({})
    expect(hasErrors(errors)).toBe(false)
  })

  it('rechaza un identificador compuesto solo por espacios', () => {
    const errors = validateLoginForm({ identifier: '   ', password: 'x' })

    expect(errors[FIELD.identifier]).toBe(MESSAGES.identifierRequired)
  })
})
