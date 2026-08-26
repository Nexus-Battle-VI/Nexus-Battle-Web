import { SECURITY_QUESTIONS } from './constants'

/**
 * Reglas deterministas de HU-01.
 *
 * Son funciones puras y viven fuera del componente: una regla de negocio que
 * solo se puede ejercitar montando un formulario es una regla que nadie va a
 * probar de verdad.
 *
 * Lo que **no** esta aqui es lo que el navegador no puede decidir: si un apodo
 * es ofensivo o esta reservado depende de una lista que pertenece al servicio
 * de cuenta. Una copia local quedaria desactualizada y seria trivial de leer en
 * el paquete servido al cliente.
 */

/** Identificadores de los controles. Sirven de clave de error y de `id` en el DOM. */
export const FIELD = {
  firstName: 'first-name',
  lastName: 'last-name',
  email: 'email',
  password: 'password',
  nickname: 'nickname',
  avatar: 'avatar',
  terms: 'terms',
} as const

export const securityFieldId = (questionId: string): string => `security-${questionId}`

export const NICKNAME_MAX_LENGTH = 32

/**
 * La contrasena debe tener **mas de 8** caracteres: 8 no cumple y 9 es la
 * primera longitud valida. Se expresa como limite exclusivo para que el numero
 * escrito aqui sea exactamente el de la regla de negocio.
 */
export const PASSWORD_EXCLUSIVE_MIN_LENGTH = 8

/** 500 MB, en la unidad en la que `File.size` cuenta realmente. */
export const AVATAR_MAX_BYTES = 500 * 1024 * 1024

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value.trim())

export const isValidPassword = (value: string): boolean =>
  value.length > PASSWORD_EXCLUSIVE_MIN_LENGTH &&
  /\p{Lu}/u.test(value) &&
  /\p{Ll}/u.test(value) &&
  /\p{Nd}/u.test(value) &&
  /[^\p{L}\p{N}]/u.test(value)

export interface RegistrationValues {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly password: string
  readonly nickname: string
  readonly avatar: File | null
  readonly securityAnswers: Readonly<Record<string, string>>
  readonly acceptedTerms: boolean
}

export type RegistrationErrors = Readonly<Record<string, string>>

export const EMPTY_VALUES: RegistrationValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  nickname: '',
  avatar: null,
  securityAnswers: {},
  acceptedTerms: false,
}

export const MESSAGES = {
  required: 'Campo obligatorio.',
  email: 'Ingresa un correo electrónico válido.',
  password:
    'La contraseña debe tener más de 8 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  nicknameLength: 'El apodo no puede superar los 32 caracteres.',
  avatarMissing: 'Selecciona una imagen para tu avatar.',
  avatarType: 'El avatar debe ser un archivo de imagen.',
  avatarSize: 'El avatar no puede superar los 500 MB.',
  securityAnswer: 'Responde esta pregunta de seguridad.',
  terms: 'Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.',
} as const

export const validateRegistration = (values: RegistrationValues): RegistrationErrors => {
  const errors: Record<string, string> = {}

  if (values.firstName.trim() === '') {
    errors[FIELD.firstName] = MESSAGES.required
  }

  if (values.lastName.trim() === '') {
    errors[FIELD.lastName] = MESSAGES.required
  }

  if (values.email.trim() === '') {
    errors[FIELD.email] = MESSAGES.required
  } else if (!isValidEmail(values.email)) {
    errors[FIELD.email] = MESSAGES.email
  }

  if (values.password === '') {
    errors[FIELD.password] = MESSAGES.required
  } else if (!isValidPassword(values.password)) {
    errors[FIELD.password] = MESSAGES.password
  }

  if (values.nickname.trim() === '') {
    errors[FIELD.nickname] = MESSAGES.required
  } else if (values.nickname.length > NICKNAME_MAX_LENGTH) {
    errors[FIELD.nickname] = MESSAGES.nicknameLength
  }

  if (values.avatar === null) {
    errors[FIELD.avatar] = MESSAGES.avatarMissing
  } else if (!values.avatar.type.startsWith('image/')) {
    errors[FIELD.avatar] = MESSAGES.avatarType
  } else if (values.avatar.size > AVATAR_MAX_BYTES) {
    errors[FIELD.avatar] = MESSAGES.avatarSize
  }

  for (const question of SECURITY_QUESTIONS) {
    if ((values.securityAnswers[question.id] ?? '').trim() === '') {
      errors[securityFieldId(question.id)] = MESSAGES.securityAnswer
    }
  }

  if (!values.acceptedTerms) {
    errors[FIELD.terms] = MESSAGES.terms
  }

  return errors
}

export const hasErrors = (errors: RegistrationErrors): boolean => Object.keys(errors).length > 0
