import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { WalletSnapshot } from '@/shared/wallet'
import { CreditsBadge } from './CreditsBadge'
import { compactCredits } from './creditsFormat'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const wallet = (overrides: Partial<WalletSnapshot> = {}): WalletSnapshot => ({
  balance: 50_000,
  reserved: 200,
  available: 49_800,
  victoryProgress: 0,
  weeklyChestCount: 0,
  weeklyChestLimit: 2,
  threshold: 20,
  ...overrides,
})

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('CreditsBadge', () => {
  it('muestra los creditos DISPONIBLES que devuelve Wallet (no el saldo total)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(wallet()))
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<CreditsBadge />)

    const badge = await screen.findByRole('img', { name: /Créditos disponibles: 49\.800/u })
    expect(badge).toHaveTextContent('49.800')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/wallet/me', expect.anything())
  })

  it('con creditos reservados, el nombre accesible explica total, reservado y disponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(wallet())))

    renderWithProviders(<CreditsBadge />)

    expect(
      await screen.findByRole('img', {
        name: 'Créditos disponibles: 49.800. Saldo total: 50.000. Reservado en apuestas o pujas: 200.',
      }),
    ).toBeInTheDocument()
  })

  it('un Wallet anterior a HU-23 (sin available) muestra el saldo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          balance: 1234,
          victoryProgress: 0,
          weeklyChestCount: 0,
          weeklyChestLimit: 2,
          threshold: 20,
        }),
      ),
    )

    renderWithProviders(<CreditsBadge />)

    expect(
      await screen.findByRole('img', { name: 'Créditos disponibles: 1.234.' }),
    ).toBeInTheDocument()
  })

  it('muestra la cifra compacta para pantallas estrechas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(wallet())))

    renderWithProviders(<CreditsBadge />)

    const badge = await screen.findByRole('img', { name: /Créditos disponibles/u })
    expect(badge.textContent).toContain('49,8 mil')
  })

  it('mientras carga pinta un marcador compacto, sin texto', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )

    renderWithProviders(<CreditsBadge />)

    expect(screen.getByTestId('credits-badge-loading')).toBeInTheDocument()
  })

  it.each([403, 500])('si Wallet responde %s se oculta, sin alertas', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'x' }, status))
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<CreditsBadge />)

    await waitFor(() => {
      expect(screen.queryByTestId('credits-badge-loading')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin sesion no consulta ni pinta nada', () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { container } = renderWithProviders(<CreditsBadge />)

    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no hay ninguna cifra fija: el valor cambia con lo que devuelve Wallet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(wallet({ available: 7 }))))

    renderWithProviders(<CreditsBadge />)

    expect(
      await screen.findByRole('img', {
        name: 'Créditos disponibles: 7. Saldo total: 50.000. Reservado en apuestas o pujas: 200.',
      }),
    ).toBeInTheDocument()
  })

  it.each([
    [0, '0'],
    [9_999, '9.999'],
    [10_000, '10 mil'],
    [49_800, '49,8 mil'],
    [49_899, '49,8 mil'],
    [1_250_000, '1,2 M'],
  ])('compactCredits(%s) = %s (trunca, nunca redondea hacia arriba)', (value, expected) => {
    expect(compactCredits(value)).toBe(expected)
  })
})
