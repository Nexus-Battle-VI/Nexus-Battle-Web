import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Reglas deterministas del formulario de login (HU-02).
 *
 * Son las unicas que el navegador puede decidir por su cuenta: que ambos
 * campos esten diligenciados. Si el correo/apodo corresponde a una cuenta real
 * y si la contrasena es la correcta son preguntas que solo el servicio de
 * cuenta puede responder, y esta HU distingue explicitamente ese fallo (ver
 * `LoginPage`) del de validacion local.
 */

export const FIELD = {
  identifier: 'identifier',
  password: 'password',
} as const

export interface LoginFormValues {
  readonly identifier: string
  readonly password: string
}

export type LoginFormErrors = Readonly<Record<string, string>>

export const EMPTY_LOGIN_VALUES: LoginFormValues = {
  identifier: '',
  password: '',
}

/** Se traducen al leerse (idioma activo); ver `localizedMessages`. */
export const MESSAGES = localizedMessages({
  identifierRequired: 'auth:login.identifierRequired',
  passwordRequired: 'auth:login.passwordRequired',
  summaryTitle: 'auth:login.summaryTitle',
  summaryBody: 'auth:login.summaryBody',
})

export const validateLoginForm = (values: LoginFormValues): LoginFormErrors => {
  const errors: Record<string, string> = {}

  if (values.identifier.trim() === '') {
    errors[FIELD.identifier] = MESSAGES.identifierRequired
  }

  if (values.password === '') {
    errors[FIELD.password] = MESSAGES.passwordRequired
  }

  return errors
}

export const hasErrors = (errors: LoginFormErrors): boolean => Object.keys(errors).length > 0
