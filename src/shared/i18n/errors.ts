import type { TFunction } from 'i18next'

import { HttpError } from '@/lib/http'

import { i18n } from './i18n'
import type { Language } from './languages'

/** Codigo estable del cuerpo de error, si el servicio lo envia (`{ code: 'X' }`). */
export const errorCodeOf = (error: unknown): string | null => {
  if (!(error instanceof HttpError)) {
    return null
  }

  const { body } = error

  if (typeof body === 'object' && body !== null && 'code' in body) {
    const { code } = body

    return typeof code === 'string' && /^[A-Za-z0-9_.-]{1,64}$/u.test(code) ? code : null
  }

  return null
}

const statusKey = (status: number): string => {
  if (status === 400) return 'errors:status.badRequest'
  if (status === 401) return 'errors:status.unauthorized'
  if (status === 403) return 'errors:status.forbidden'
  if (status === 404) return 'errors:status.notFound'
  if (status === 409) return 'errors:status.conflict'
  if (status === 422) return 'errors:status.unprocessable'
  if (status === 429) return 'errors:status.tooManyRequests'
  if (status === 502 || status === 503 || status === 504) return 'errors:status.unavailable'
  if (status >= 500) return 'errors:status.server'

  return 'errors:unexpected'
}

/**
 * Descripcion de un fallo para quien usa la aplicacion, en el idioma activo.
 *
 * NUNCA se traduce comparando el texto del mensaje. El orden es:
 * 1. Codigo estable del servicio con traduccion conocida (`errors:codes.<CODIGO>`).
 * 2. En español, el mensaje del servicio tal cual -los servicios ya lo
 *    redactan en español: asi la experiencia en español no cambia-.
 * 3. En otro idioma, una descripcion localizada por estado HTTP. Account y
 *    Player-Inventory todavia no envian codigos: es la limitacion aceptada.
 */
export const describeFailure = (error: unknown, t: TFunction, language: Language): string => {
  const code = errorCodeOf(error)

  if (code !== null && i18n.exists(`errors:codes.${code}`)) {
    return t(`errors:codes.${code}`)
  }

  if (error instanceof HttpError) {
    return language === 'es' && error.message.length > 0
      ? error.message
      : t(statusKey(error.status))
  }

  if (language === 'es' && error instanceof Error && error.message.length > 0) {
    return error.message
  }

  if (error instanceof TypeError) {
    return t('errors:network')
  }

  return t('errors:unexpected')
}
