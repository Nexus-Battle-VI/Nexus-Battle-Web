import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { PublishAuctionPage } from './PublishAuctionPage'

const inventory = {
  items: [
    {
      itemId: 'item-1',
      quantity: 1,
      product: {
        productId: 'product-1',
        sku: 'sword-1',
        name: 'Espada del nexo',
        imageUrl: '/sword.png',
        type: 'ARMA',
        lifecycleStatus: 'ACTIVE',
        premium: false,
      },
    },
  ],
  page: 1,
  pageSize: 16,
  totalItems: 1,
  totalPages: 1,
}

const created = {
  id: 'auction-1',
  sellerId: 'seller-1',
  productId: 'product-1',
  durationHours: 48,
  publicationFeeCredits: 3,
  minimumBidCredits: 10,
  buyNowCredits: 20,
  status: 'ACTIVE',
  publishedAt: '2026-09-21T12:00:00.000Z',
  closesAt: new Date(Date.now() + 48 * 60 * 60 * 1_000).toISOString(),
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

describe('PublishAuctionPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        return Promise.resolve(
          url.includes('/inventories/me/items')
            ? jsonResponse(inventory)
            : jsonResponse(created, 201),
        )
      }),
    )
  })

  afterEach(() => vi.unstubAllGlobals())

  const completeForm = async (): Promise<void> => {
    await userEvent.click(await screen.findByRole('radio', { name: /Espada del nexo/u }))
    await userEvent.click(screen.getByRole('radio', { name: /48 horas/u }))
    await userEvent.type(screen.getByLabelText(/Precio m.nimo de puja/u), '10')
    await userEvent.type(screen.getByLabelText('Compra inmediata (opcional)'), '20')
    await userEvent.click(screen.getByRole('checkbox', { name: /Confirmo el cobro/u }))
  }

  it('publica con el contrato canónico y muestra la subasta activa con contador', async () => {
    renderWithProviders(<PublishAuctionPage />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar subasta' }))

    expect(await screen.findByRole('heading', { name: 'Subasta activa' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/47 h|48 h/u)

    const fetchMock = vi.mocked(globalThis.fetch)
    const publication = fetchMock.mock.calls.find(([url]) => urlOf(url).endsWith('/v1/auctions'))
    expect(publication).toBeDefined()
    expect(publication?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      body: JSON.stringify({
        productId: 'product-1',
        durationHours: 48,
        minimumBidCredits: 10,
        buyNowCredits: 20,
      }),
    })
  })

  it('no ofrece productos premium para publicarlos en subasta', async () => {
    const premiumItems = inventory.items.map((item) => ({
      ...item,
      itemId: 'item-premium',
      product: {
        ...item.product,
        productId: 'product-premium',
        name: 'Corona premium',
        premium: true,
      },
    }))
    vi.mocked(globalThis.fetch).mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        urlOf(input).includes('/inventories/me/items')
          ? jsonResponse({ ...inventory, items: [...inventory.items, ...premiumItems] })
          : jsonResponse(created, 201),
      ),
    )

    renderWithProviders(<PublishAuctionPage />)

    expect(await screen.findByRole('radio', { name: /Espada del nexo/u })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Corona premium/u })).not.toBeInTheDocument()
  })

  it('carga todas las paginas y solo ofrece productos publicables', async () => {
    const page = (number: number, items: unknown[]) => ({
      items,
      page: number,
      pageSize: 1,
      totalItems: 3,
      totalPages: 3,
    })
    const item = (
      itemId: string,
      name: string,
      type: string,
      patch: Record<string, unknown> = {},
    ) => ({
      itemId,
      quantity: 1,
      product: {
        productId: `product-${itemId}`,
        sku: itemId,
        name,
        imageUrl: '',
        type,
        lifecycleStatus: 'ACTIVE',
        premium: false,
        ...patch,
      },
    })
    const pages = {
      1: page(1, [item('ability', 'Chispa', 'HABILIDAD')]),
      2: page(2, [
        item('weapon', 'Espada del Nexo', 'ARMA'),
        item('premium', 'Corona premium', 'EPICA', { premium: true }),
      ]),
      3: page(3, [
        item('hero', 'Guardiana', 'HEROE'),
        item('inactive', 'Casco antiguo', 'ARMADURA', { lifecycleStatus: 'SUSPENDED' }),
        { itemId: 'empty', quantity: 0, product: item('unused', 'Pocion', 'ITEM').product },
        { itemId: 'unknown', quantity: 1, product: null },
      ]),
    }
    vi.mocked(globalThis.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = urlOf(input)
      if (url.includes('/inventories/me/items')) {
        const number = Number(new URL(url, 'https://local.test').searchParams.get('page'))
        return Promise.resolve(jsonResponse(pages[number as 1 | 2 | 3]))
      }
      return Promise.resolve(jsonResponse(created, 201))
    })

    renderWithProviders(<PublishAuctionPage />)

    expect(await screen.findByRole('radio', { name: /Chispa/u })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Espada del Nexo/u })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Guardiana/u })).toBeInTheDocument()
    expect(
      screen.queryByRole('radio', { name: /Corona premium|Casco antiguo|Pocion/u }),
    ).not.toBeInTheDocument()
  })

  it('señala la compra inmediata inválida antes de enviar y conserva los datos', async () => {
    renderWithProviders(<PublishAuctionPage />)
    await userEvent.click(await screen.findByRole('radio', { name: /Espada del nexo/u }))
    await userEvent.type(screen.getByLabelText(/Precio m.nimo de puja/u), '10')
    await userEvent.type(screen.getByLabelText('Compra inmediata (opcional)'), '9')
    await userEvent.click(screen.getByRole('checkbox', { name: /Confirmo el cobro/u }))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar subasta' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Debe ser mayor')
    expect(screen.getByLabelText(/Precio m.nimo de puja/u)).toHaveValue(10)
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
  })

  it('traduce el rechazo del backend sin limpiar el formulario', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        urlOf(input).includes('/inventories/me/items')
          ? jsonResponse(inventory)
          : jsonResponse(
              { code: 'INSUFFICIENT_FUNDS', message: 'insufficient funds', statusCode: 422 },
              422,
            ),
      ),
    )
    renderWithProviders(<PublishAuctionPage />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar subasta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes créditos suficientes')
    expect(screen.getByLabelText(/Precio m.nimo de puja/u)).toHaveValue(10)
  })

  it('evita un segundo envío mientras la publicación está pendiente', async () => {
    let resolvePublication: ((response: Response) => void) | undefined
    vi.mocked(globalThis.fetch).mockImplementation((input: RequestInfo | URL) => {
      if (urlOf(input).includes('/inventories/me/items'))
        return Promise.resolve(jsonResponse(inventory))
      return new Promise<Response>((resolve) => {
        resolvePublication = resolve
      })
    })
    renderWithProviders(<PublishAuctionPage />)
    await completeForm()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar subasta' }))

    const pendingButton = screen.getByRole('button', { name: 'Procesando...' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(
      vi.mocked(globalThis.fetch).mock.calls.filter(([url]) => urlOf(url).endsWith('/v1/auctions')),
    ).toHaveLength(1)

    resolvePublication?.(jsonResponse(created, 201))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Subasta activa' })).toBeInTheDocument(),
    )
  })
})
