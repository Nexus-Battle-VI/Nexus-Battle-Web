import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import * as catalogApi from '@/features/catalog/api'
import { useSession } from '@/shared/session'
import { AuctionDetailPage } from './AuctionDetailPage'
import * as detailApi from './detail-api'

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

  it('CA-04: comprar sin marcar la confirmacion pide confirmar y no llega a avisar de la integracion', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Comprar ahora' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Confirmación requerida')
    expect(screen.queryByText(/todavia no estan conectados al backend/)).not.toBeInTheDocument()
  })

  it('con la confirmacion marcada, comprar avisa que el backend real todavia no esta conectado', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())

    montar()

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(
      screen.getByText(/La compra inmediata todavia no esta conectada al backend/),
    ).toBeInTheDocument()
  })
})
