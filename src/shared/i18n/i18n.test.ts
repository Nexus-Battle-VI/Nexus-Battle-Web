import { describe, expect, it } from 'vitest'

import { compactCredits, fullCredits } from '@/app/creditsFormat'
import { formatDateTime, formatMoney } from '@/lib/format'
import { HttpError } from '@/lib/http'

import { describeFailure, errorCodeOf } from './errors'
import { countLabel, formatInteger, formatLocale } from './format'
import { i18n } from './i18n'
import {
  initLanguage,
  LANGUAGE_STORAGE_KEY,
  readStoredLanguage,
  setLanguage,
  useLanguage,
} from './language'
import { isSupportedLanguage, SUPPORTED_LANGUAGES } from './languages'

const t = i18n.t.bind(i18n)

describe('Idiomas soportados', () => {
  it('la lista cerrada coincide con Account: es, en, fr y pt', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['es', 'en', 'fr', 'pt'])
  })

  it.each([null, undefined, '', 'ES', 'es-ES', 'de', ' en ', 7, '<script>'])(
    'rechaza %j',
    (value) => {
      expect(isSupportedLanguage(value)).toBe(false)
    },
  )
})

describe('Cambio de idioma', () => {
  it.each([
    ['es', 'Cargando...'],
    ['en', 'Loading...'],
    ['fr', 'Chargement...'],
    ['pt', 'Carregando...'],
  ] as const)(
    '%s: traduce, actualiza <html lang>, el store y el espejo local',
    async (language, loading) => {
      await setLanguage(language)

      expect(t('common:loading')).toBe(loading)
      expect(document.documentElement.lang).toBe(language)
      expect(useLanguage.getState().language).toBe(language)
      expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(language)
    },
  )

  it('el arranque usa el espejo local valido (recarga de pagina)', async () => {
    globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')

    await initLanguage()

    expect(useLanguage.getState().language).toBe('fr')
    expect(t('app:nav.inventory')).toBe('Mon inventaire')
  })

  it('un espejo local invalido se ignora y se arranca en español', async () => {
    globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon')

    expect(readStoredLanguage()).toBeNull()
    await initLanguage()

    expect(useLanguage.getState().language).toBe('es')
  })

  it('sin espejo local el producto arranca en español', async () => {
    await initLanguage()

    expect(useLanguage.getState().language).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })
})

describe('Fallback', () => {
  it('una clave que solo existe en español se muestra en español en otro idioma', async () => {
    // Clave de prueba que solo existe en español (no choca con ninguna real).
    i18n.addResource('es', 'common', 'pruebaSoloEnEspanol', 'Texto de respaldo')
    await setLanguage('fr')

    expect(t('common:pruebaSoloEnEspanol')).toBe('Texto de respaldo')
  })
})

describe('Interpolacion y plurales', () => {
  it('interpola sin escapar dos veces', async () => {
    await setLanguage('en')

    expect(t('app:credits.available', { available: '1,200' })).toBe('Available credits: 1,200.')
  })

  it.each([
    [
      'es',
      [0, 1, 2, 1_000_000],
      ['0 créditos', '1 crédito', '2 créditos', '1.000.000 de créditos'],
    ],
    ['en', [0, 1, 2, 1_000_000], ['0 credits', '1 credit', '2 credits', '1,000,000 credits']],
    ['fr', [0, 1, 2, 1_000_000], ['0 crédit', '1 crédit', '2 crédits', '1 000 000 de crédits']],
    ['pt', [0, 1, 2, 1_000_000], ['0 crédito', '1 crédito', '2 créditos', '1.000.000 de créditos']],
  ] as const)('%s: 0, 1, 2 y un millon', async (language, counts, expected) => {
    await setLanguage(language)

    expect(counts.map((count) => countLabel(t, 'common:count.credits', count))).toEqual(expected)
  })
})

describe('Formato por idioma (solo presentacion)', () => {
  it.each([
    ['es', 'es-CO', '49.800'],
    ['en', 'en-US', '49,800'],
    ['fr', 'fr-FR', '49 800'],
    ['pt', 'pt-BR', '49.800'],
  ] as const)('%s → %s: 49800 se lee %s', async (language, locale, expected) => {
    await setLanguage(language)

    expect(formatLocale()).toBe(locale)
    expect(formatInteger(49_800)).toBe(expected)
    expect(fullCredits(49_800)).toBe(expected)
  })

  it.each([
    ['es', '49,8 mil', '1,2 M'],
    ['en', '49.8 k', '1.2 M'],
    ['fr', '49,8 k', '1,2 M'],
    ['pt', '49,8 mil', '1,2 mi'],
  ] as const)('%s: creditos compactos truncados', async (language, thousands, millions) => {
    await setLanguage(language)

    expect(compactCredits(49_899)).toBe(thousands)
    expect(compactCredits(1_299_999)).toBe(millions)
  })

  it('el importe no cambia al cambiar de idioma, solo su lectura', async () => {
    await setLanguage('en')
    const english = formatMoney(1_250_000, 'COP')
    await setLanguage('es')
    const spanish = formatMoney(1_250_000, 'COP')

    expect(english.replace(/\D/gu, '')).toBe(spanish.replace(/\D/gu, ''))
  })

  it('las fechas siguen el idioma activo', async () => {
    await setLanguage('en')
    const english = formatDateTime('2026-09-23T15:04:00.000Z')
    await setLanguage('fr')
    const french = formatDateTime('2026-09-23T15:04:00.000Z')

    expect(english).toMatch(/Sep/u)
    expect(french).toMatch(/sept\./u)
  })
})

describe('Descripcion de errores', () => {
  const byStatus = (status: number): HttpError =>
    new HttpError(status, 'Mensaje del servicio en español.', { message: 'x' })

  it('en español conserva el mensaje del servicio (sin cambios para quien ya juega en español)', () => {
    expect(describeFailure(byStatus(409), t, 'es')).toBe('Mensaje del servicio en español.')
  })

  it.each([
    [400, 'The request is not valid. Check the data and try again.'],
    [401, 'Your session is not valid or has expired. Please sign in again.'],
    [403, 'You do not have permission to do this.'],
    [404, 'We could not find what you were looking for.'],
    [409, 'The operation conflicts with the current state. Refresh and try again.'],
    [422, 'The operation cannot be applied with this data.'],
    [503, 'The service is not available right now. Try again in a few minutes.'],
    [500, 'The service had a problem processing the request. Try again.'],
  ])(
    'en otro idioma describe el estado %s sin mostrar el texto en español',
    async (status, text) => {
      await setLanguage('en')

      expect(describeFailure(byStatus(status), t, 'en')).toBe(text)
    },
  )

  it('un codigo estable con traduccion gana sobre el estado; nunca se compara el texto', async () => {
    i18n.addResource('en', 'errors', 'codes.PRUEBA_SALA_LLENA', 'The room is full.')
    await setLanguage('en')

    const error = new HttpError(409, 'La sala esta llena', { code: 'PRUEBA_SALA_LLENA' })

    expect(errorCodeOf(error)).toBe('PRUEBA_SALA_LLENA')
    expect(describeFailure(error, t, 'en')).toBe('The room is full.')
  })

  it('un codigo con forma extraña no se usa como clave', () => {
    expect(errorCodeOf(new HttpError(400, 'x', { code: '../../<b>' }))).toBeNull()
  })

  it('un fallo de red se describe como tal fuera del español', async () => {
    await setLanguage('pt')

    expect(describeFailure(new TypeError('Failed to fetch'), t, 'pt')).toBe(
      'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.',
    )
  })
})
