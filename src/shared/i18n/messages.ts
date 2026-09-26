import { i18n } from './i18n'

/**
 * Tabla de mensajes que se TRADUCE AL LEERSE.
 *
 * Muchas validaciones exportan un objeto `MESSAGES` que devuelven como error y
 * que las pruebas comparan con lo pintado. Convertir cada propiedad en un
 * getter que resuelve su clave en el idioma activo conserva ese contrato
 * (`MESSAGES.required` sigue siendo un texto) y hace que la misma validacion
 * hable el idioma de la interfaz, sin duplicar reglas por idioma.
 */
export const localizedMessages = <K extends string>(
  keys: Readonly<Record<K, string>>,
): Readonly<Record<K, string>> => {
  const messages = {} as Record<K, string>

  for (const [name, key] of Object.entries(keys) as [K, string][]) {
    Object.defineProperty(messages, name, {
      enumerable: true,
      get: () => i18n.t(key),
    })
  }

  return messages
}
