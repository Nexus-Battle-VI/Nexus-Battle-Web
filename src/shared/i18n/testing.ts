import { i18n } from './i18n'
import { LANGUAGE_STORAGE_KEY, useLanguage } from './language'
import { DEFAULT_LANGUAGE } from './languages'

/**
 * Solo pruebas: vuelve a español de forma SINCRONA (el español ya esta
 * cargado), sin espejo local y con `<html lang="es">`.
 */
export const resetLanguageForTests = (): void => {
  void i18n.changeLanguage(DEFAULT_LANGUAGE)
  document.documentElement.lang = DEFAULT_LANGUAGE
  useLanguage.setState({ language: DEFAULT_LANGUAGE })

  try {
    globalThis.localStorage.removeItem(LANGUAGE_STORAGE_KEY)
  } catch {
    // jsdom sin almacenamiento: nada que limpiar.
  }
}
