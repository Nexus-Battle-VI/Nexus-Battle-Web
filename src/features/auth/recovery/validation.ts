import { isValidEmail, isValidPassword } from '@/features/account/registration/validation'

export const RECOVERY_FIELD = {
  email: 'recovery-email',
  code: 'recovery-code',
  password: 'recovery-password',
  confirm: 'recovery-confirm',
} as const

export const RECOVERY_MESSAGES = {
  emailRequired: 'Ingresa el correo asociado a tu cuenta.',
  emailInvalid: 'Ingresa un correo electrónico válido.',
  answerRequired: 'Responde esta pregunta.',
  codeRequired: 'Ingresa el código que recibiste.',
  password:
    'La contraseña debe tener más de 8 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  confirmRequired: 'Repite tu nueva contraseña.',
  confirmMismatch: 'Las contraseñas no coinciden.',
  rejected: 'No fue posible continuar con la recuperación. Revisa los datos e inténtalo de nuevo.',
  service: 'No pudimos completar la recuperación en este momento. Inténtalo de nuevo más tarde.',
} as const

export const answerFieldId = (questionId: string): string => `recovery-answer-${questionId}`

export const validateEmailStep = (email: string): string | undefined => {
  if (email.trim() === '') {
    return RECOVERY_MESSAGES.emailRequired
  }

  if (!isValidEmail(email)) {
    return RECOVERY_MESSAGES.emailInvalid
  }

  return undefined
}

export const validateAnswersStep = (
  questions: readonly { readonly id: string }[],
  answers: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> => {
  const errors: Record<string, string> = {}

  for (const question of questions) {
    if ((answers[question.id] ?? '').trim() === '') {
      errors[answerFieldId(question.id)] = RECOVERY_MESSAGES.answerRequired
    }
  }

  return errors
}

export const validateCodeStep = (code: string): string | undefined =>
  code.trim() === '' ? RECOVERY_MESSAGES.codeRequired : undefined

export const validatePasswordStep = (
  password: string,
  confirm: string,
): Readonly<Record<string, string>> => {
  const errors: Record<string, string> = {}

  if (!isValidPassword(password)) {
    errors[RECOVERY_FIELD.password] = RECOVERY_MESSAGES.password
  }

  if (confirm === '') {
    errors[RECOVERY_FIELD.confirm] = RECOVERY_MESSAGES.confirmRequired
  } else if (password !== confirm) {
    errors[RECOVERY_FIELD.confirm] = RECOVERY_MESSAGES.confirmMismatch
  }

  return errors
}

export const hasErrors = (errors: Readonly<Record<string, string>>): boolean =>
  Object.keys(errors).length > 0
