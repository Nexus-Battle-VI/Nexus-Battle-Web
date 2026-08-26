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

export const toRegistrationFormData = (values: RegistrationValues): FormData => {
  if (values.avatar === null) {
    throw new Error('El avatar es obligatorio.')
  }

  const form = new FormData()

  form.set('firstNames', values.firstName)
  form.set('lastNames', values.lastName)
  form.set('email', values.email)
  form.set('password', values.password)
  form.set('nickname', values.nickname)
  form.set('termsAccepted', values.acceptedTerms ? 'true' : 'false')
  form.set(
    'securityAnswers',
    JSON.stringify(
      SECURITY_QUESTIONS.map((question) => ({
        questionId: ACCOUNT_QUESTION_IDS[question.id],
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
