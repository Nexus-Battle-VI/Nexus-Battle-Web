import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PreferencesSection } from './PreferencesSection'
import { LANGUAGE_STORAGE_KEY, useLanguage } from '@/shared/i18n/language'
import { queryKeys } from '@/shared/query-keys'
import { THEME_STORAGE_KEY, initTheme, useTheme } from '@/shared/theme'

import type { OwnAccount } from './api'

/**
 * La primera eleccion de un idioma descarga su chunk (import dinamico real, no
 * simulado). Bajo la instrumentacion de cobertura eso supera el segundo por
 * defecto de `waitFor`.
 */
const LOAD_TIMEOUT = { timeout: 5000 }

const ACCOUNT: OwnAccount = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
  preferredLanguage: null,
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const renderSection = () => {
  // Sin `gcTime: 0`: la cuenta vive en cache sin observador (como cuando la
  // lee la cabecera), y la prueba comprueba que el guardado la actualiza.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(queryKeys.account.me, ACCOUNT)

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <PreferencesSection />
      </QueryClientProvider>,
    ),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  globalThis.localStorage.clear()
  initTheme()
})

describe('PreferencesSection — tema', () => {
  it('marca el tema activo con aria-pressed', () => {
    useTheme.getState().setTheme('light')
    renderSection()

    expect(screen.getByRole('button', { name: /Claro/u })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Oscuro/u })).toHaveAttribute('aria-pressed', 'false')
  })

  it('cambiar a Oscuro usa el MISMO store y la MISMA persistencia (una sola fuente)', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    renderSection()

    await user.click(screen.getByRole('button', { name: /Oscuro/u }))

    expect(useTheme.getState().theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    // La preferencia se guarda en la clave global de `@/shared/theme`, no en una propia.
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    // El tema no toca el idioma.
    expect(useLanguage.getState().language).toBe('es')
  })
})

describe('PreferencesSection — idioma', () => {
  it('ofrece Español, English, Français y Português, sin el aviso de "no disponible"', () => {
    renderSection()

    const group = screen.getByRole('group', { name: 'Idioma de la interfaz' })
    for (const name of [/Español/u, /English/u, /Français/u, /Português/u]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Español/u })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Todavia no disponible/u)).not.toBeInTheDocument()
  })

  it.each([
    ['English', 'en', 'Language', { preferredLanguage: 'en' }],
    ['Français', 'fr', 'Langue', { preferredLanguage: 'fr' }],
    ['Português', 'pt', 'Idioma', { preferredLanguage: 'pt' }],
  ] as const)(
    'elegir %s cambia la interfaz al instante, <html lang>, el espejo local y lo guarda en Account',
    async (name, code, heading, body) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ ...ACCOUNT, preferredLanguage: code }))
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()
      const { queryClient } = renderSection()

      await user.click(screen.getByRole('button', { name: new RegExp(name, 'u') }))

      await waitFor(() => {
        expect(document.documentElement.lang).toBe(code)
      }, LOAD_TIMEOUT)
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
      expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(code)
      expect(screen.getByRole('button', { name: new RegExp(name, 'u') })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1)
      }, LOAD_TIMEOUT)
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/accounts\/me$/u)
      expect(init.method).toBe('PATCH')
      expect(JSON.parse(init.body as string)).toEqual(body)
      await waitFor(() => {
        expect(queryClient.getQueryData<OwnAccount>(queryKeys.account.me)?.preferredLanguage).toBe(
          code,
        )
      }, LOAD_TIMEOUT)
      // El tema no cambia por cambiar el idioma.
      expect(useTheme.getState().theme).toBe(document.documentElement.dataset.theme)
    },
  )

  it('si Account rechaza el guardado, vuelve al idioma anterior y avisa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ statusCode: 503, message: 'caido' }, 503)),
    )
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /Français/u }))

    expect(
      await screen.findByText(/No se pudo guardar el idioma en tu cuenta/u, {}, LOAD_TIMEOUT),
    ).toBeInTheDocument()
    expect(useLanguage.getState().language).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
    expect(screen.getByRole('button', { name: /Español/u })).toHaveAttribute('aria-pressed', 'true')
  })

  it('volver a pulsar el idioma activo no envia nada', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /Español/u }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
