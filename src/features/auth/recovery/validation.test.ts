import { describe, expect, it } from 'vitest'

import {
  RECOVERY_FIELD,
  RECOVERY_MESSAGES,
  answerFieldId,
  validateAnswersStep,
  validateCodeStep,
  validateEmailStep,
  validatePasswordStep,
} from './validation'

describe('validacion de recuperacion', () => {
  it('exige un correo con forma valida', () => {
    expect(validateEmailStep('')).toBe(RECOVERY_MESSAGES.emailRequired)
    expect(validateEmailStep('hola')).toBe(RECOVERY_MESSAGES.emailInvalid)
    expect(validateEmailStep('ana@nexus.test')).toBeUndefined()
  })

  it('exige respuesta para cada pregunta recibida', () => {
    const errors = validateAnswersStep([{ id: 'sq-01' }, { id: 'sq-02' }], { 'sq-01': 'luna' })

    expect(errors[answerFieldId('sq-02')]).toBe(RECOVERY_MESSAGES.answerRequired)
    expect(errors[answerFieldId('sq-01')]).toBeUndefined()
  })

  it('exige el codigo', () => {
    expect(validateCodeStep('')).toBe(RECOVERY_MESSAGES.codeRequired)
    expect(validateCodeStep('000000')).toBeUndefined()
  })

  it('reutiliza la politica de contrasena de HU-01 y exige confirmacion', () => {
    expect(validatePasswordStep('corta', 'corta')[RECOVERY_FIELD.password]).toBe(
      RECOVERY_MESSAGES.password,
    )
    expect(validatePasswordStep('NuevaClave9!', '')[RECOVERY_FIELD.confirm]).toBe(
      RECOVERY_MESSAGES.confirmRequired,
    )
    expect(validatePasswordStep('NuevaClave9!', 'OtraClave9!')[RECOVERY_FIELD.confirm]).toBe(
      RECOVERY_MESSAGES.confirmMismatch,
    )
    expect(validatePasswordStep('NuevaClave9!', 'NuevaClave9!')).toEqual({})
  })
})
