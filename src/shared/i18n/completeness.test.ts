import { describe, expect, it } from 'vitest'

import { collectNamespaces, type LocaleBundle } from './bundle'
import { SUPPORTED_LANGUAGES, type Language } from './languages'

/**
 * Completitud de las traducciones. Un idioma nuevo o un namespace nuevo NO
 * puede quedar con claves faltantes en silencio: estas pruebas comparan los
 * cuatro idiomas contra el español (la referencia) y recorren el codigo fuente
 * para comprobar que toda clave usada existe.
 */

const BUNDLES: Readonly<Record<Language, LocaleBundle>> = {
  es: collectNamespaces(
    import.meta.glob<Record<string, unknown>>('./locales/es/*.json', {
      eager: true,
      import: 'default',
    }),
  ),
  en: collectNamespaces(
    import.meta.glob<Record<string, unknown>>('./locales/en/*.json', {
      eager: true,
      import: 'default',
    }),
  ),
  fr: collectNamespaces(
    import.meta.glob<Record<string, unknown>>('./locales/fr/*.json', {
      eager: true,
      import: 'default',
    }),
  ),
  pt: collectNamespaces(
    import.meta.glob<Record<string, unknown>>('./locales/pt/*.json', {
      eager: true,
      import: 'default',
    }),
  ),
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/u

const flatten = (tree: unknown, prefix = ''): Map<string, unknown> => {
  const out = new Map<string, unknown>()

  if (typeof tree !== 'object' || tree === null) {
    out.set(prefix, tree)
    return out
  }

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`
    for (const [leaf, leafValue] of flatten(value, path)) {
      out.set(leaf, leafValue)
    }
  }

  return out
}

/** Claves logicas: `count.credits_one` y `count.credits_other` → `count.credits`. */
const baseKeys = (flat: Map<string, unknown>): Set<string> =>
  new Set([...flat.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')))

const placeholders = (text: unknown): string[] =>
  [...String(text).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/gu)].map((match) => match[1] ?? '').sort()

const namespacesOf = (language: Language): string[] => Object.keys(BUNDLES[language]).sort()

describe('Completitud de traducciones', () => {
  it('los cuatro idiomas tienen exactamente los mismos namespaces', () => {
    const reference = namespacesOf('es')

    expect(reference.length).toBeGreaterThan(0)
    for (const language of SUPPORTED_LANGUAGES) {
      expect(namespacesOf(language), language).toEqual(reference)
    }
  })

  describe.each(SUPPORTED_LANGUAGES.filter((language) => language !== 'es'))('%s', (language) => {
    it.each(namespacesOf('es'))('namespace %s: mismas claves que el español', (namespace) => {
      const reference = baseKeys(flatten(BUNDLES.es[namespace]))
      const translated = baseKeys(flatten(BUNDLES[language][namespace]))

      expect(
        [...reference].filter((key) => !translated.has(key)),
        'faltan',
      ).toEqual([])
      expect(
        [...translated].filter((key) => !reference.has(key)),
        'sobran',
      ).toEqual([])
    })

    it.each(namespacesOf('es'))(
      'namespace %s: mismas variables de interpolacion que el español',
      (namespace) => {
        const reference = flatten(BUNDLES.es[namespace])
        const translated = flatten(BUNDLES[language][namespace])
        const mismatches: string[] = []

        for (const key of baseKeys(reference)) {
          const esText = reference.get(key) ?? reference.get(`${key}_other`)
          const text = translated.get(key) ?? translated.get(`${key}_other`)

          if (placeholders(esText).join() !== placeholders(text).join()) {
            mismatches.push(key)
          }
        }

        expect(mismatches).toEqual([])
      },
    )
  })

  it.each(SUPPORTED_LANGUAGES)('%s: ningun texto vacio ni no-texto', (language) => {
    const invalid: string[] = []

    for (const namespace of namespacesOf(language)) {
      for (const [key, value] of flatten(BUNDLES[language][namespace])) {
        if (typeof value !== 'string' || value.trim() === '') {
          invalid.push(`${namespace}:${key}`)
        }
      }
    }

    expect(invalid).toEqual([])
  })

  it.each(SUPPORTED_LANGUAGES)(
    '%s: todo plural tiene las categorias CLDR que pide el idioma',
    (language) => {
      const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories
      const missing: string[] = []

      for (const namespace of namespacesOf(language)) {
        const flat = flatten(BUNDLES[language][namespace])
        const plurals = new Set(
          [...flat.keys()]
            .filter((key) => PLURAL_SUFFIX.test(key))
            .map((key) => key.replace(PLURAL_SUFFIX, '')),
        )

        for (const base of plurals) {
          for (const category of categories) {
            if (!flat.has(`${base}_${category}`)) {
              missing.push(`${namespace}:${base}_${category}`)
            }
          }
        }
      }

      expect(missing).toEqual([])
    },
  )
})

const SOURCES = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  eager: true,
  query: '?raw',
  import: 'default',
})

describe('Claves usadas en el codigo', () => {
  it('toda clave literal `namespace:clave` del codigo existe en español', () => {
    const namespaces = namespacesOf('es')
    const pattern = new RegExp(
      `['"\`](${namespaces.join('|')}):([A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*)['"\`]`,
      'gu',
    )
    const missing: string[] = []

    for (const [file, source] of Object.entries(SOURCES)) {
      for (const match of source.matchAll(pattern)) {
        const namespace = match[1] ?? ''
        const key = match[2] ?? ''
        const flat = flatten(BUNDLES.es[namespace])
        const exists =
          flat.has(key) ||
          flat.has(`${key}_other`) ||
          [...flat.keys()].some((k) => k.startsWith(`${key}.`))

        if (!exists) {
          missing.push(`${file}: ${namespace}:${key}`)
        }
      }
    }

    expect(missing).toEqual([])
  })
})
