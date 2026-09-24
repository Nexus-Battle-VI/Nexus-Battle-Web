import { create } from 'zustand'

import { ensureLanguageLoaded, i18n } from './i18n'
import { DEFAULT_LANGUAGE, isSupportedLanguage, type Language } from './languages'

/**
 * Idioma activo de la interfaz.
 *
 * Mismo patron que el tema (`@/shared/theme`), pero con una diferencia de
 * autoridad: el tema es una preferencia LOCAL del navegador; el idioma lo
 * decide Account (`preferredLanguage`) cuando hay sesion. Aqui solo vive un
 * ESPEJO local (`nexus-battles.language`) que permite arrancar ya en el idioma
 * correcto -sin parpadeo- y que tambien sirve antes de iniciar sesion.
 *
 * Tema e idioma no se tocan entre si: claves, stores y persistencias separadas.
 */
export const LANGUAGE_STORAGE_KEY = 'nexus-battles.language'

export const readStoredLanguage = (): Language | null => {
  try {
    const stored = globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)

    return isSupportedLanguage(stored) ? stored : null
  } catch {
    return null
  }
}

const persistLanguage = (language: Language): void => {
  try {
    globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Sin almacenamiento la eleccion vive solo en esta pestaña. Aceptable.
  }
}

const reflectInDocument = (language: Language): void => {
  document.documentElement.lang = language
}

export interface LanguageState {
  readonly language: Language
}

export const useLanguage = create<LanguageState>(() => ({ language: DEFAULT_LANGUAGE }))

export const currentLanguage = (): Language => useLanguage.getState().language

let latestRequest = 0

/**
 * Aplica un idioma a TODA la interfaz, sin recargar: carga su chunk si hace
 * falta, cambia i18next (los componentes con `useTranslation` se vuelven a
 * pintar), actualiza `<html lang>` y el espejo local.
 *
 * Si llegan dos cambios seguidos, gana el ultimo pedido, no el ultimo en
 * terminar de descargar.
 *
 * Rechaza si el chunk no se pudo descargar; en ese caso NO cambia nada.
 */
export const setLanguage = async (language: Language): Promise<void> => {
  latestRequest += 1
  const request = latestRequest

  await ensureLanguageLoaded(language)

  if (request !== latestRequest) {
    return
  }

  // El store va PRIMERO: al cambiar i18next se vuelven a pintar los
  // componentes, y los que formatean numeros o fechas leen el locale del store.
  // Si fuera al reves, pintarian con el separador del idioma anterior.
  useLanguage.setState({ language })
  reflectInDocument(language)
  persistLanguage(language)
  await i18n.changeLanguage(language)
}

/**
 * Arranque. Lo llama `main.tsx` ANTES del primer render: el espejo local (si
 * es valido) o español. Account puede corregirlo despues, cuando llegue
 * `GET /accounts/me` (ver `useAccountLanguageSync`).
 *
 * Nunca rechaza: si el idioma guardado no se puede descargar, se queda en
 * español.
 */
export const initLanguage = async (): Promise<void> => {
  const stored = readStoredLanguage() ?? DEFAULT_LANGUAGE

  try {
    await setLanguage(stored)
  } catch {
    await setLanguage(DEFAULT_LANGUAGE)
  }
}
