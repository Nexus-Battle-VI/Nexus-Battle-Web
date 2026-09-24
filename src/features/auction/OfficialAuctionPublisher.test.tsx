import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { OfficialAuctionPublisher } from './OfficialAuctionPublisher'

const created = {
  id: 'official-1',
  publisherId: 'upb-company-subject',
  publisherType: 'GAME_MASTER',
  productId: 'exclusive-1',
  durationHours: 48,
  publicationFeeCredits: 0,
  currency: 'COP',
  minimumBidAmountMinor: 150_000,
  buyNowAmountMinor: 300_000,
  mark: 'PREMIUM',
  status: 'ACTIVE',
  publishedAt: '2026-09-24T12:00:00.000Z',
  closesAt: '2026-09-26T12:00:00.000Z',
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

describe('OfficialAuctionPublisher', () => {
  afterEach(() => vi.unstubAllGlobals())

  const completeForm = async (): Promise<void> => {
    await userEvent.type(
      screen.getByLabelText(/Identificador del producto exclusivo/u),
      'exclusive-1',
    )
    await userEvent.selectOptions(screen.getByLabelText('Duración'), '48')
    await userEvent.type(screen.getByLabelText(/Precio m.nimo en unidad menor/u), '150000')
    await userEvent.type(
      screen.getByLabelText('Compra inmediata en unidad menor (opcional)'),
      '300000',
    )
    await userEvent.click(screen.getByRole('checkbox', { name: /Confirmo que Catalog/u }))
  }

  it('publica con el contrato oficial y muestra la marca asignada por Catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(created, 201))),
    )
    renderWithProviders(<OfficialAuctionPublisher />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto oficial' }))

    expect(
      await screen.findByRole('heading', { name: 'Publicación oficial activa' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Marca asignada por Catalog: Premium/u)).toBeInTheDocument()

    const fetchMock = vi.mocked(globalThis.fetch)
    const publication = fetchMock.mock.calls.find(([url]) =>
      urlOf(url).endsWith('/v1/official-auctions'),
    )
    expect(publication).toBeDefined()
    expect(publication?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      body: JSON.stringify({
        productId: 'exclusive-1',
        durationHours: 48,
        currency: 'COP',
        minimumBidAmountMinor: 150_000,
        buyNowAmountMinor: 300_000,
      }),
    })
  })

  it('nunca acepta comision: el precio previo siempre marca 0 creditos', () => {
    renderWithProviders(<OfficialAuctionPublisher />)

    expect(screen.getByText(/Comisión: 0 créditos/u)).toBeInTheDocument()
  })

  it('rechaza enviar sin producto ni confirmacion, sin llamar al backend', async () => {
    vi.stubGlobal('fetch', vi.fn())
    renderWithProviders(<OfficialAuctionPublisher />)

    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto oficial' }))

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('traduce el rechazo de Catalog (producto no elegible) sin limpiar el formulario', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { code: 'PRODUCT_NOT_ELIGIBLE', message: 'not eligible', statusCode: 422 },
            422,
          ),
        ),
      ),
    )
    renderWithProviders(<OfficialAuctionPublisher />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto oficial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no es exclusivo o no está disponible',
    )
    expect(screen.getByLabelText(/Identificador del producto exclusivo/u)).toHaveValue(
      'exclusive-1',
    )
  })

  it('evita un segundo envío mientras la publicación está pendiente', async () => {
    let resolvePublication: ((response: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePublication = resolve
          }),
      ),
    )
    renderWithProviders(<OfficialAuctionPublisher />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto oficial' }))

    const pendingButton = screen.getByRole('button', { name: 'Procesando...' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)

    resolvePublication?.(jsonResponse(created, 201))
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Publicación oficial activa' }),
      ).toBeInTheDocument(),
    )
  })
})
