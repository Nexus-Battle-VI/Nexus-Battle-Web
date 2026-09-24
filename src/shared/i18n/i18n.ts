import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { LocaleBundle } from './bundle'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './languages'
import es from './locales/es'

/**
 * Instancia unica de traduccion de la Web.
 *
 * - El español va EMPAQUETADO en el bundle inicial: es la experiencia por
 *   defecto y el ultimo recurso de toda clave, asi que tiene que estar antes
 *   del primer render (sin parpadeo, sin peticion).
 * - Ingles, frances y portugues se cargan bajo demanda, un chunk por idioma
 *   (`import()` de Vite): quien nunca los elige no los descarga.
 * - `fallbackLng: 'es'`: una clave que falte en otro idioma se muestra en
 *   español, nunca como identificador crudo.
 * - Las claves que faltan no se vigilan en tiempo de ejecucion (el proyecto no
 *   escribe en consola): las detectan las pruebas de completitud, que recorren
 *   el codigo fuente y comparan los cuatro idiomas.
 */
export const NAMESPACES: readonly string[] = Object.keys(es)

const loaders: Readonly<Record<Exclude<Language, 'es'>, () => Promise<{ default: LocaleBundle }>>> =
  {
    en: () => import('./locales/en'),
    fr: () => import('./locales/fr'),
    pt: () => import('./locales/pt'),
  }

export const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  resources: { es },
  partialBundledLanguages: true,
  ns: [...NAMESPACES],
  defaultNS: 'common',
  // React ya escapa lo que pinta; escapar aqui duplicaria las entidades.
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  initAsync: false,
  react: { useSuspense: false },
})

/** Descarga (una sola vez) las traducciones de un idioma. El español ya esta. */
export const ensureLanguageLoaded = async (language: Language): Promise<void> => {
  if (language === 'es' || i18n.hasResourceBundle(language, 'common')) {
    return
  }

  const { default: bundle } = await loaders[language]()

  for (const [namespace, resources] of Object.entries(bundle)) {
    i18n.addResourceBundle(language, namespace, resources, true, true)
  }
}
