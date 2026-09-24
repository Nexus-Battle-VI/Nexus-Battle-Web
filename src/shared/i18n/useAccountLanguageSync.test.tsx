import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { setLanguage, useLanguage } from './language'
import { useAccountLanguageSync } from './useAccountLanguageSync'

/**
 * La primera eleccion de un idioma descarga su chunk (import dinamico real, no
 * simulado). Bajo la instrumentacion de cobertura eso supera el segundo por
 * defecto de `waitFor`.
 */
const LOAD_TIMEOUT = { timeout: 5000 }

const render = (subject: string | null, preferred: string | null | undefined) =>
  renderHook(
    ({ s, p }: { s: string | null; p: string | null | undefined }) => {
      useAccountLanguageSync(s, p)
    },
    { initialProps: { s: subject, p: preferred } },
  )

describe('useAccountLanguageSync', () => {
  it('al iniciar sesion, el idioma guardado en Account manda sobre el local', async () => {
    render('sub-ana', 'pt')

    await waitFor(() => {
      expect(useLanguage.getState().language).toBe('pt')
    }, LOAD_TIMEOUT)
    expect(document.documentElement.lang).toBe('pt')
  })

  it('null (nunca eligio) conserva la eleccion local', async () => {
    await setLanguage('fr')
    render('sub-ana', null)

    expect(useLanguage.getState().language).toBe('fr')
  })

  it('sin campo (Account anterior) conserva la eleccion local', async () => {
    await setLanguage('en')
    render('sub-ana', undefined)

    expect(useLanguage.getState().language).toBe('en')
  })

  it('un valor fuera de la lista se ignora', () => {
    render('sub-ana', 'de')

    expect(useLanguage.getState().language).toBe('es')
  })

  it('no reaplica el mismo valor en cada refetch: una lectura vieja no revierte un cambio nuevo', async () => {
    const { rerender } = render('sub-ana', 'en')
    await waitFor(() => {
      expect(useLanguage.getState().language).toBe('en')
    }, LOAD_TIMEOUT)

    // La persona elige frances; mientras se guarda, llega un refetch con 'en'.
    await setLanguage('fr')
    rerender({ s: 'sub-ana', p: 'en' })

    expect(useLanguage.getState().language).toBe('fr')
  })

  it('otra cuenta que inicia sesion aplica su propio idioma', async () => {
    const { rerender } = render('sub-ana', 'en')
    await waitFor(() => {
      expect(useLanguage.getState().language).toBe('en')
    }, LOAD_TIMEOUT)

    rerender({ s: null, p: undefined })
    rerender({ s: 'sub-bruno', p: 'pt' })

    await waitFor(() => {
      expect(useLanguage.getState().language).toBe('pt')
    }, LOAD_TIMEOUT)
  })

  it('sin sesion no hace nada', () => {
    render(null, 'fr')

    expect(useLanguage.getState().language).toBe('es')
  })
})
