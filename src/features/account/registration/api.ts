import { httpClient } from '@/lib/http'

import { SECURITY_QUESTIONS } from './constants'
import type { RegistrationValues } from './validation'

/**
 * IDs del catalogo en Nexus-Battle-Account (migracion hu01-registration).
 *
 * El formulario usa slugs estables en el DOM; el servicio espera sq-01..04.
 */
export const ACCOUNT_QUESTION_IDS: Readonly<Record<string, string>> = {
  'first-pet': 'sq-01',
  'birth-city': 'sq-02',
  'childhood-nickname': 'sq-03',
  'parents-city': 'sq-04',
}

export interface RegisteredAccount {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly firstNames: string
  readonly lastNames: string
  readonly status: string
  readonly roles: readonly string[]
}

/**
 * Resuelve el id de catalogo de Account para una pregunta local.
 *
 * `ACCOUNT_QUESTION_IDS` y `SECURITY_QUESTIONS` se mantienen a mano en el mismo
 * modulo, asi que solo pueden desalinearse por una edicion incompleta. Fallar
 * aqui con un mensaje explicito evita enviar un `questionId` ausente: el
 * mapeo indefinido desaparece silenciosamente al serializar con
 * `JSON.stringify`, y esa entrada llegaria al backend sin `questionId`.
 */
const accountQuestionIdFor = (localQuestionId: string): string => {
  const questionId = ACCOUNT_QUESTION_IDS[localQuestionId]

  if (questionId === undefined) {
    throw new Error(
      `No existe un identificador de catalogo de Account para la pregunta "${localQuestionId}".`,
    )
  }

  return questionId
}

export const toRegistrationFormData = (values: RegistrationValues): FormData => {
  if (values.avatar === null) {
    throw new Error('El avatar es obligatorio.')
  }

  const form = new FormData()

  form.set('firstNames', values.firstName)
  form.set('lastNames', values.lastName)
  form.set('email', values.email)
  // La contrasena SI se envia, y esta vez llega a su custodio: Account la pasa a
  // Cognito por `signUp` (ADR-004, "Alta server-side") sin persistirla. Hubo un
  // periodo en que el campo se enviaba y Account lo tiraba, y quien se
  // registraba creia fijar su contrasena sin fijar nada; ahora la ruta del alta
  // es server-side y la contrasena queda registrada en el proveedor.
  form.set('password', values.password)
  form.set('nickname', values.nickname)
  form.set('termsAccepted', values.acceptedTerms ? 'true' : 'false')
  form.set(
    'securityAnswers',
    JSON.stringify(
      SECURITY_QUESTIONS.map((question) => ({
        questionId: accountQuestionIdFor(question.id),
        answer: values.securityAnswers[question.id] ?? '',
      })),
    ),
  )
  form.set('avatar', values.avatar)

  return form
}

export const registerAccount = async (values: RegistrationValues): Promise<void> => {
  await httpClient.post<RegisteredAccount>('/accounts', toRegistrationFormData(values))
}

/**
 * Segundo paso del alta server-side: confirma el correo con el codigo que el
 * proveedor envio al buzon y ACTIVA la cuenta (`POST /accounts/confirmation`).
 *
 * `identifier` es el correo con el que se registro. Account responde 400 si el
 * codigo no es valido o expiro, y 503 si el proveedor no esta disponible; ambos
 * llegan como `HttpError` y los distingue quien llama.
 */
export const confirmRegistration = async (identifier: string, code: string): Promise<void> => {
  await httpClient.post<RegisteredAccount>('/accounts/confirmation', { identifier, code })
}
