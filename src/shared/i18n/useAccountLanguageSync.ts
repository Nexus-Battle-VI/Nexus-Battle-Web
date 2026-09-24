import { useEffect, useRef } from 'react'

import { currentLanguage, setLanguage } from './language'
import { isSupportedLanguage } from './languages'

/**
 * Hace que la preferencia guardada en Account mande sobre el espejo local.
 *
 * Se aplica UNA vez por (sujeto, idioma guardado): cuando llega la cuenta tras
 * iniciar sesion o cuando otra sesion cambio el idioma. No se vuelve a aplicar
 * por cada refetch de la misma cuenta, de modo que una respuesta vieja que
 * llegue mientras se guarda un idioma nuevo no revierte la eleccion.
 *
 * `null`/ausente (nunca eligio, o Account todavia sin el campo): se respeta la
 * eleccion local o español. Un valor fuera de la lista se ignora.
 */
export const useAccountLanguageSync = (
  subject: string | null,
  preferredLanguage: string | null | undefined,
): void => {
  const applied = useRef<string | null>(null)

  useEffect(() => {
    if (subject === null) {
      applied.current = null
      return
    }

    if (!isSupportedLanguage(preferredLanguage)) {
      return
    }

    const marker = `${subject} ${preferredLanguage}`

    if (applied.current === marker) {
      return
    }

    applied.current = marker

    if (preferredLanguage !== currentLanguage()) {
      // Si el chunk no se puede descargar, la interfaz sigue en el idioma
      // actual: es mejor que dejarla a medio cambiar.
      setLanguage(preferredLanguage).catch(() => undefined)
    }
  }, [subject, preferredLanguage])
}
