import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { AuctionPage } from './AuctionPage'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const auction = {
  id: 'auction-1',
  sellerId: 'seller-1',
  productId: 'product-1',
  durationHours: 24,
  publicationFeeCredits: 1,
  minimumBidCredits: 10,
  buyNowCredits: null,
  status: 'ACTIVE',
  publishedAt: '2026-09-21T11:00:00.000Z',
  closesAt: '2026-09-22T11:00:00.000Z',
}

afterEach(() => vi.unstubAllGlobals())

/** TASK 68.5: estados, seguir/dejar de seguir y contrato real de Auction. */
describe('AuctionPage', () => {
  it('muestra estado vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [] })))
    renderWithProviders(<AuctionPage />)
    expect(await screen.findByText('Aún no sigues ninguna subasta.')).toBeInTheDocument()
  })

  it('lista seguimientos y permite dejar de seguir', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        json({ items: [{ auctionId: auction.id, followedAt: auction.publishedAt, auction }] }),
      )
      .mockResolvedValueOnce(
        json({
          productId: 'product-1',
          sku: 'espada',
          name: 'Espada del Nexo',
          description: '',
          imageUrl: '',
          type: 'ARMA',
          lifecycleStatus: 'ACTIVE',
          creditsPrice: 10,
          premium: false,
          realMoneyPrice: null,
          averageRating: null,
          reviewCount: 0,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ items: [] }))
    vi.stubGlobal('fetch', fetchImpl)
    renderWithProviders(<AuctionPage />)

    expect(await screen.findByText('Espada del Nexo')).toBeInTheDocument()
    expect(screen.getByText('ARMA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/auction/auction-1',
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Dejar de seguir' }))
    expect(await screen.findByText('Aún no sigues ninguna subasta.')).toBeInTheDocument()
    expect(
      fetchImpl.mock.calls.some(([url]) =>
        String(url).includes('/v1/auctions/watchlist/auction-1'),
      ),
    ).toBe(true)
  })

  it('no expone un formulario para escribir el identificador de subasta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [] })))
    renderWithProviders(<AuctionPage />)

    await screen.findByText('Aún no sigues ninguna subasta.')
    expect(screen.queryByLabelText('Identificador de subasta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Seguir subasta' })).not.toBeInTheDocument()
  })
})
