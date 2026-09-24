/**
 * Idiomas de la interfaz (preferencia persistida en Account, HU-05 CA-04).
 *
 * Es la MISMA lista cerrada que acepta Account (`PreferredLanguage`): un valor
 * fuera de ella no se aplica ni se envia. El identificador es la etiqueta
 * BCP-47 corta, sin region: la region solo decide el FORMATO de numeros y
 * fechas (`FORMAT_LOCALES`), no el idioma de los textos.
 */
export const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'pt'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Experiencia por defecto del producto y ultimo recurso de toda traduccion. */
export const DEFAULT_LANGUAGE: Language = 'es'

export const isSupportedLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)

/**
 * Nombre de cada idioma EN ESE IDIOMA (endonimo). No se traduce: quien no lee
 * el idioma actual debe poder reconocer el suyo en la lista.
 */
export const LANGUAGE_NATIVE_NAMES: Readonly<Record<Language, string>> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
}

/**
 * Locale de `Intl` para cada idioma. Solo presentacion: separadores, formato
 * de fecha y moneda; ningun valor de negocio cambia.
 *
 * - `es-CO`: el formato que la Web ya usaba en todas partes.
 * - `pt-BR`: el portugues de la interfaz se redacta con convenciones de Brasil,
 *   el publico lusofono de LatAm; `Intl` con `pt` a secas ya resuelve a pt-BR.
 */
export const FORMAT_LOCALES: Readonly<Record<Language, string>> = {
  es: 'es-CO',
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-BR',
}
