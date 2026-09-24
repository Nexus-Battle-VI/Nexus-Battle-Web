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
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ items: [] }))
    vi.stubGlobal('fetch', fetchImpl)
    renderWithProviders(<AuctionPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Dejar de seguir' }))
    expect(await screen.findByText('Aún no sigues ninguna subasta.')).toBeInTheDocument()
    expect(fetchImpl.mock.calls[1]?.[0]).toContain('/v1/auctions/watchlist/auction-1')
  })

  it('permite seguir por identificador y presenta errores controlados', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ items: [] }))
      .mockResolvedValueOnce(json({ code: 'AUCTION_NOT_FOLLOWABLE', message: 'cerrada' }, 422))
    vi.stubGlobal('fetch', fetchImpl)
    renderWithProviders(<AuctionPage />)

    await userEvent.type(await screen.findByLabelText('Identificador de subasta'), 'auction-1')
    await userEvent.click(screen.getByRole('button', { name: 'Seguir subasta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La subasta no está disponible para seguimiento.',
    )
  })
})
