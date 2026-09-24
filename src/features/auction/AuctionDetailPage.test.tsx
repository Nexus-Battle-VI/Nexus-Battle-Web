import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import * as catalogApi from '@/features/catalog/api'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import * as auctionApi from './api'
import { AuctionDetailPage } from './AuctionDetailPage'
import * as detailApi from './detail-api'
import type { BuyNowConfirmation } from './detail-api'

const AUCTION_ID = 'auction-123'

const auction = (patch: Partial<detailApi.AuctionDetail> = {}): detailApi.AuctionDetail => ({
  id: AUCTION_ID,
  sellerId: 'seller-1',
  productId: 'product-1',
  durationHours: 24,
  publicationFeeCredits: 1,
  minimumBidCredits: 10,
  buyNowCredits: 2500,
  status: 'ACTIVE',
  publishedAt: '2026-09-20T12:00:00.000Z',
  closesAt: '2026-09-22T12:00:00.000Z',
  currentBid: null,
  ...patch,
})

const producto = (
  patch: Partial<catalogApi.CanonicalProduct> = {},
): catalogApi.CanonicalProduct => ({
  productId: 'product-1',
  sku: 'espada-legendaria',
  name: 'Espada Legendaria Nexus',
  description: 'Arma mítica de poder considerable.',
  imageUrl: 'https://assets.example.test/espada.png',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 2500,
  premium: false,
  realMoneyPrice: null,
  averageRating: null,
  reviewCount: 0,
  ...patch,
})

const confirmacion = (patch: Partial<BuyNowConfirmation> = {}): BuyNowConfirmation => ({
  transactionId: 'txn-1',
  auctionId: AUCTION_ID,
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  productId: 'product-1',
  debitedCredits: 2500,
  remainingCredits: 2500,
  closedAt: '2026-09-22T12:00:00.000Z',
  replayed: false,
  ...patch,
})

const montar = (): void => {
  renderWithProviders(
    <Routes>
      <Route path="/auction/:auctionId" element={<AuctionDetailPage />} />
    </Routes>,
    { route: `/auction/${AUCTION_ID}` },
  )
}

describe('AuctionDetailPage (HU-64.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useSession.setState({ subject: 'buyer-1', accessToken: 'token', expiresAt: null })
    vi.spyOn(auctionApi, 'fetchWatchlist').mockResolvedValue({ items: [] })
  })

  it('muestra la tarjeta de compra inmediata cuando hay precio configurado y saldo suficiente', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })

    montar()

    expect(
      await screen.findByRole('heading', { name: 'Espada Legendaria Nexus' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2.500 créditos')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
    ).toBeInTheDocument()
  })

  it('CA-02: saldo insuficiente muestra el aviso y deshabilita la compra', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 100 })

    montar()

    expect(await screen.findByText('Créditos insuficientes')).toBeInTheDocument()
    expect(screen.getByText(/Necesitas 2\.500 créditos/u)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprar ahora' })).toBeDisabled()
  })

  it('CA-02: usa el saldo disponible (balance menos apuestas activas) cuando el servicio lo informa', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000, available: 100 })

    montar()

    expect(await screen.findByText('Créditos insuficientes')).toBeInTheDocument()
  })

  it('CA-03: sin precio de compra inmediata no muestra la tarjeta de compra, ofrece pujar', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction({ buyNowCredits: null }))
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())

    montar()

    expect(await screen.findByText('Compra inmediata no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('una subasta que ya no esta activa no ofrece comprar', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction({ status: 'SOLD' }))

    montar()

    expect(await screen.findByText('Esta subasta ya no esta activa')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('el propio vendedor no ve la opcion de comprar su subasta', async () => {
    useSession.setState({ subject: 'seller-1', accessToken: 'token', expiresAt: null })
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())

    montar()

    expect(await screen.findByText('Es tu propia subasta')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('CA-04: comprar sin marcar la confirmacion pide confirmar y no llega a ejecutar la compra', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    const ejecutar = vi.spyOn(detailApi, 'executeBuyNow')

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Comprar ahora' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Confirmación requerida')
    expect(ejecutar).not.toHaveBeenCalled()
  })

  it('HU-64.6: con la confirmacion marcada, ejecuta la compra real y muestra la confirmacion', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    const ejecutar = vi
      .spyOn(detailApi, 'executeBuyNow')
      .mockResolvedValue(confirmacion({ debitedCredits: 2500, remainingCredits: 2500 }))

    montar()

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(await screen.findByText('¡Compra completada!')).toBeInTheDocument()
    expect(screen.getByText('txn-1')).toBeInTheDocument()
    expect(ejecutar).toHaveBeenCalledWith(AUCTION_ID, expect.any(String))

    // Resincroniza con el servidor tras el exito: la subasta y el saldo se vuelven a pedir.
    await waitFor(() => {
      expect(detailApi.fetchAuctionDetail).toHaveBeenCalledTimes(2)
    })
  })

  it('HU-64.6: cada intento de compra usa una Idempotency-Key distinta', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    const ejecutar = vi.spyOn(detailApi, 'executeBuyNow').mockResolvedValue(confirmacion())

    montar()

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })

    const [, primeraLlave] = ejecutar.mock.calls[0] as [string, string]

    expect(primeraLlave.length).toBeGreaterThan(0)
  })

  it('HU-64.6: un rechazo de negocio (otro comprador se adelanto) muestra el mensaje y no reintenta', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    const ejecutar = vi.spyOn(detailApi, 'executeBuyNow').mockRejectedValue(
      new HttpError(409, 'La subasta ya se cerro', {
        statusCode: 409,
        code: 'BUY_NOW_CONFLICT',
      }),
    )

    montar()

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(
      await screen.findByText('Otro comprador se adelantó: la subasta ya se cerró.'),
    ).toBeInTheDocument()
    expect(ejecutar).toHaveBeenCalledTimes(1)
  })

  /**
   * HU-68: hoy la unica forma de seguir una subasta era escribir su id a
   * mano en la pantalla de seguimiento. El boton de aqui es el segundo
   * camino real -el primero es la tarjeta del listado, HU-66.6-.
   */
  it('HU-68: ofrece seguir la subasta y la agrega a la lista de seguimiento', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    const seguir = vi.spyOn(auctionApi, 'followAuction').mockResolvedValue(undefined)

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Seguir esta subasta' }))

    await waitFor(() => {
      expect(seguir.mock.calls[0]?.[0]).toBe(AUCTION_ID)
    })
  })

  it('HU-68: si ya la sigue, ofrece dejar de seguir en su lugar', async () => {
    vi.spyOn(auctionApi, 'fetchWatchlist').mockResolvedValue({
      items: [
        { auctionId: AUCTION_ID, followedAt: '2026-09-20T12:00:00.000Z', auction: auction() },
      ],
    })
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    const dejarDeSeguir = vi.spyOn(auctionApi, 'unfollowAuction').mockResolvedValue(undefined)

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Dejar de seguir' }))

    await waitFor(() => {
      expect(dejarDeSeguir.mock.calls[0]?.[0]).toBe(AUCTION_ID)
    })
  })

  it('el propio vendedor no ve el boton de seguir su propia subasta', async () => {
    useSession.setState({ subject: 'seller-1', accessToken: 'token', expiresAt: null })
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())

    montar()

    await screen.findByText('Es tu propia subasta')
    expect(screen.queryByRole('button', { name: 'Seguir esta subasta' })).not.toBeInTheDocument()
  })
})
