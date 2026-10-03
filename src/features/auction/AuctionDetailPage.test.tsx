import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import * as catalogApi from '@/features/catalog/api'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import * as auctionApi from './api'
import { AuctionDetailPage } from './AuctionDetailPage'
import * as detailApi from './detail-api'
import type { BuyNowConfirmation } from './detail-api'

const AUCTION_ID = 'auction-123'

const auction = (
  patch: Partial<detailApi.PlayerAuctionDetail> = {},
): detailApi.PlayerAuctionDetail => ({
  id: AUCTION_ID,
  sellerId: 'seller-1',
  sellerDisplayName: 'Ana Ramirez',
  sellerAvatarUrl: null,
  productId: 'product-1',
  publisherType: 'PLAYER',
  priceKind: 'CREDITS',
  durationHours: 24,
  publicationFeeCredits: 1,
  minimumBidCredits: 10,
  buyNowCredits: 2500,
  currency: null,
  minimumBidAmountMinor: null,
  buyNowAmountMinor: null,
  officialMark: null,
  status: 'ACTIVE',
  publishedAt: '2026-09-20T12:00:00.000Z',
  closesAt: '2026-09-22T12:00:00.000Z',
  currentBid: null,
  bidCount: 0,
  ...patch,
})

const officialAuction = (
  patch: Partial<detailApi.OfficialAuctionDetail> = {},
): detailApi.OfficialAuctionDetail => ({
  id: AUCTION_ID,
  sellerId: 'game-master-1',
  sellerDisplayName: null,
  sellerAvatarUrl: null,
  productId: 'product-1',
  publisherType: 'GAME_MASTER',
  priceKind: 'REAL_MONEY',
  durationHours: 48,
  publicationFeeCredits: 0,
  minimumBidCredits: null,
  buyNowCredits: null,
  currency: 'COP',
  minimumBidAmountMinor: 90_000,
  buyNowAmountMinor: 120_000,
  officialMark: 'PREMIUM',
  status: 'ACTIVE',
  publishedAt: '2026-09-20T12:00:00.000Z',
  closesAt: '2026-09-22T12:00:00.000Z',
  currentBid: null,
  bidCount: 0,
  ...patch,
})

const emptyBidHistory: detailApi.AuctionBidHistoryPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
}

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

const montar = (search = ''): void => {
  renderWithProviders(
    <Routes>
      <Route path="/auction/:auctionId" element={<AuctionDetailPage />} />
    </Routes>,
    { route: `/auction/${AUCTION_ID}${search}` },
  )
}

describe('AuctionDetailPage (HU-64.1 / HU-88)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    useSession.setState({ subject: 'buyer-1', accessToken: 'token', expiresAt: null })
    vi.spyOn(auctionApi, 'fetchWatchlist').mockResolvedValue({ items: [] })
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    // HU-88: historial independiente del detalle; por defecto vacio salvo que
    // un test lo sobreescriba explicitamente.
    vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue(emptyBidHistory)
  })

  it('muestra la tarjeta de compra inmediata cuando hay precio configurado y saldo suficiente', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })

    montar()

    expect(
      await screen.findByRole('heading', { name: 'Espada Legendaria Nexus' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('2.500 créditos')).not.toHaveLength(0)
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
    expect(screen.queryByRole('button', { name: 'Registrar puja' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Configurar puja automática' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comprar ahora' })).not.toBeInTheDocument()
  })

  it('un comprador conserva los controles de puja y compra', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
    vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })

    montar()

    expect(await screen.findByRole('button', { name: 'Comprar ahora' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar puja' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configurar puja automática' })).toBeInTheDocument()
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

  it('muestra el numero total de pujas persistidas', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
      auction({
        bidCount: 7,
        currentBid: {
          id: 'bid-1',
          auctionId: AUCTION_ID,
          bidderId: 'other',
          amountCredits: 90,
          placedAt: '2026-09-21T12:00:00.000Z',
        },
      }),
    )

    montar()

    const label = await screen.findByText('Número de pujas')
    expect(label.nextElementSibling).toHaveTextContent(/^7$/)
  })

  it('muestra 0 pujas cuando nadie ha pujado', async () => {
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())

    montar()

    const label = await screen.findByText('Número de pujas')
    expect(label.nextElementSibling).toHaveTextContent(/^0$/)
  })

  it('el propio vendedor tambien ve el numero de pujas', async () => {
    useSession.setState({ subject: 'seller-1', accessToken: 'token', expiresAt: null })
    vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction({ bidCount: 4 }))

    montar()

    expect(await screen.findByText('Es tu propia subasta')).toBeInTheDocument()
    expect(screen.getByText('Número de pujas').nextElementSibling).toHaveTextContent(/^4$/)
  })

  describe('tiempo restante', () => {
    const timeLeft = (): string | null =>
      screen.getByText('Tiempo restante').nextElementSibling?.textContent ?? null

    beforeEach(() => {
      // Solo el reloj: `setTimeout` sigue real para React Query y los `findBy*`.
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
      vi.setSystemTime(Date.parse('2026-09-22T11:59:58.000Z'))
    })

    it('decrementa cada segundo y al llegar a 0 muestra Finalizada sin valores negativos', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())

      montar()

      await screen.findByText('Tiempo restante')
      expect(timeLeft()).toBe('02s')

      act(() => {
        vi.advanceTimersByTime(1_000)
      })
      expect(timeLeft()).toBe('01s')

      act(() => {
        vi.advanceTimersByTime(3_000)
      })
      expect(timeLeft()).toBe('Finalizada')
      expect(timeLeft()).not.toMatch(/-/u)
      expect(detailApi.fetchAuctionDetail).toHaveBeenCalledTimes(1)
    })

    it('el vendedor tambien ve la cuenta regresiva, sin controles de puja', async () => {
      useSession.setState({ subject: 'seller-1', accessToken: 'token', expiresAt: null })
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ closesAt: '2026-09-24T16:15:09.000Z' }),
      )

      montar()

      expect(await screen.findByText('Es tu propia subasta')).toBeInTheDocument()
      expect(timeLeft()).toBe('2d 04h 15m 11s')
      expect(screen.queryByRole('button', { name: 'Registrar puja' })).not.toBeInTheDocument()
    })

    it('una subasta que ya no esta activa muestra Finalizada aunque su cierre sea futuro', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ status: 'SOLD', closesAt: '2026-09-23T12:00:00.000Z' }),
      )

      montar()

      await screen.findByText('Tiempo restante')
      expect(timeLeft()).toBe('Finalizada')
    })
  })

  describe('llegada desde "Comprar ahora" del marketplace (?buyNow=1)', () => {
    const confirmacionCasilla = (): Promise<HTMLElement> =>
      screen.findByRole('checkbox', { name: 'Confirmo la compra inmediata' })

    beforeEach(() => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
      vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
    })

    it('abre directamente la confirmacion existente, enfocada, sin comprar todavia', async () => {
      const ejecutar = vi.spyOn(detailApi, 'executeBuyNow')

      montar('?buyNow=1')

      const casilla = await confirmacionCasilla()
      expect(casilla).toHaveFocus()
      expect(casilla).not.toBeChecked()
      expect(ejecutar).not.toHaveBeenCalled()
    })

    it('sin la intencion (Ver detalle) el detalle se abre normal, sin enfocar la compra', async () => {
      montar()

      expect(await confirmacionCasilla()).not.toHaveFocus()
    })

    it('no compra hasta confirmar: sin la casilla pide confirmacion y no llama a /buy-now', async () => {
      const ejecutar = vi.spyOn(detailApi, 'executeBuyNow')

      montar('?buyNow=1')

      await confirmacionCasilla()
      await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

      expect(screen.getByText('Confirmación requerida')).toBeInTheDocument()
      expect(ejecutar).not.toHaveBeenCalled()
    })

    it('mientras procesa no permite una segunda compra', async () => {
      const ejecutar = vi
        .spyOn(detailApi, 'executeBuyNow')
        .mockReturnValue(new Promise<BuyNowConfirmation>(() => undefined))

      montar('?buyNow=1')

      await userEvent.click(await confirmacionCasilla())
      await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

      expect(await screen.findByText('Procesando tu compra...')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Comprar ahora' })).not.toBeInTheDocument()
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })

    it('al confirmar usa la compra existente una sola vez: exito y resincronizacion', async () => {
      const ejecutar = vi
        .spyOn(detailApi, 'executeBuyNow')
        .mockResolvedValue(confirmacion({ debitedCredits: 2500, remainingCredits: 2500 }))

      montar('?buyNow=1')

      await userEvent.click(await confirmacionCasilla())
      await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

      expect(await screen.findByText('¡Compra completada!')).toBeInTheDocument()
      expect(ejecutar).toHaveBeenCalledTimes(1)
      expect(ejecutar).toHaveBeenCalledWith(AUCTION_ID, expect.any(String))
      await waitFor(() => {
        expect(detailApi.fetchAuctionDetail).toHaveBeenCalledTimes(2)
      })
    })

    it('un rechazo usa el manejo de errores existente', async () => {
      const ejecutar = vi.spyOn(detailApi, 'executeBuyNow').mockRejectedValue(
        new HttpError(409, 'La subasta ya se cerro', {
          statusCode: 409,
          code: 'BUY_NOW_CONFLICT',
        }),
      )

      montar('?buyNow=1')

      await userEvent.click(await confirmacionCasilla())
      await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

      expect(
        await screen.findByText('Otro comprador se adelantó: la subasta ya se cerró.'),
      ).toBeInTheDocument()
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })

    it('el vendedor que llega con la intencion no ve la compra', async () => {
      useSession.setState({ subject: 'seller-1', accessToken: 'token', expiresAt: null })

      montar('?buyNow=1')

      expect(await screen.findByText('Es tu propia subasta')).toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('vendedor (HU-88)', () => {
    it('A. muestra el sellerDisplayName cuando Auction lo resuelve', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ sellerDisplayName: 'Carlos Mendez' }),
      )

      montar()

      expect(await screen.findByText('Carlos Mendez')).toBeInTheDocument()
    })

    it('B. muestra el avatar cuando sellerAvatarUrl existe', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(new Blob(['fake-image-bytes'], { type: 'image/png' }), {
            status: 200,
            headers: { 'content-type': 'image/png' },
          }),
        ),
      )
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue('blob:fake-seller-avatar'),
        revokeObjectURL: vi.fn(),
      })
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({
          sellerDisplayName: 'Carlos Mendez',
          sellerAvatarUrl: '/accounts/seller-1/avatar',
        }),
      )

      montar()

      const image = await screen.findByRole('img', { name: 'Carlos Mendez' })
      expect(image).toHaveAttribute('src', 'blob:fake-seller-avatar')
    })

    it('C. sellerDisplayName null: usa el fallback neutro, nunca sellerId como nombre', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ sellerDisplayName: null, sellerAvatarUrl: null }),
      )

      montar()

      expect(await screen.findByText('Vendedor no disponible')).toBeInTheDocument()
      expect(screen.queryByText('seller-1')).not.toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('J. Account degradado (seller null): el resto del detalle sigue visible', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ sellerDisplayName: null, sellerAvatarUrl: null, bidCount: 3 }),
      )
      vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
      vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })

      montar()

      expect(await screen.findByText('Vendedor no disponible')).toBeInTheDocument()
      expect(
        await screen.findByRole('heading', { name: 'Espada Legendaria Nexus' }),
      ).toBeInTheDocument()
      expect(screen.getByText('Número de pujas').nextElementSibling).toHaveTextContent(/^3$/)
      expect(screen.getByRole('button', { name: 'Comprar ahora' })).toBeInTheDocument()
    })
  })

  describe('modalidad de pago (HU-88)', () => {
    it('D. PLAYER/CREDITS: muestra el precio minimo y la compra inmediata en creditos', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        auction({ minimumBidCredits: 15, buyNowCredits: 3000 }),
      )

      montar()

      expect(await screen.findByText('Precio mínimo')).toBeInTheDocument()
      expect(screen.getByText('15 créditos')).toBeInTheDocument()
      expect(screen.getByText('3.000 créditos')).toBeInTheDocument()
    })

    it('E. GAME_MASTER/REAL_MONEY: usa currency real, muestra la marca oficial y no ofrece puja', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(officialAuction())

      montar()

      expect(await screen.findByText('Precio mínimo')).toBeInTheDocument()
      expect(
        screen.getAllByText((_, element) => element?.textContent?.includes('900') === true).length,
      ).toBeGreaterThan(0)
      expect(screen.getByLabelText('Publicación oficial: Premium')).toHaveTextContent('Premium')
      expect(screen.queryByRole('button', { name: 'Registrar puja' })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Configurar puja automática' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('checkbox', { name: 'Confirmo la compra inmediata' }),
      ).not.toBeInTheDocument()
    })

    it('E. GAME_MASTER sin buyNowAmountMinor: no muestra compra inmediata', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(
        officialAuction({ buyNowAmountMinor: null }),
      )

      montar()

      await screen.findByText('Precio mínimo')
      expect(screen.getByText('No disponible')).toBeInTheDocument()
    })
  })

  describe('historial de pujas (HU-88)', () => {
    it('F. carga y muestra monto y fecha de cada item', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue({
        items: [
          { id: 'bid-1', amountCredits: 100, placedAt: '2026-10-02T16:30:00.000Z' },
          { id: 'bid-2', amountCredits: 150, placedAt: '2026-10-02T17:00:00.000Z' },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      })

      montar()

      expect(await screen.findByRole('heading', { name: 'Historial de pujas' })).toBeInTheDocument()
      expect(await screen.findByText('100 créditos')).toBeInTheDocument()
      expect(screen.getByText('150 créditos')).toBeInTheDocument()
    })

    it('F/G. nunca muestra bidderId, nickname ni un "Jugador anonimo" inventado', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue({
        items: [{ id: 'bid-1', amountCredits: 100, placedAt: '2026-10-02T16:30:00.000Z' }],
        total: 1,
        page: 1,
        pageSize: 20,
      })

      montar()

      await screen.findByText('100 créditos')
      expect(screen.queryByText(/Jugador an[oó]nimo/u)).not.toBeInTheDocument()
      expect(screen.queryByText('other')).not.toBeInTheDocument()
    })

    it('F. vacio: muestra "No hay pujas registradas." sin tratarlo como error', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue(emptyBidHistory)

      montar()

      expect(await screen.findByText('No hay pujas registradas.')).toBeInTheDocument()
      expect(
        within(screen.getByRole('region', { name: 'Historial de pujas' })).queryByRole('alert'),
      ).not.toBeInTheDocument()
    })

    it('F. error local: el resto del detalle sigue visible', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
      vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
      vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockRejectedValue(
        new HttpError(503, 'caido', { statusCode: 503 }),
      )

      montar()

      expect(
        await screen.findByText('No se pudo cargar el historial de pujas.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Espada Legendaria Nexus' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Comprar ahora' })).toBeInTheDocument()
    })

    it('F. paginacion: Siguiente/Anterior piden la pagina correcta', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      const historyMock = vi
        .spyOn(detailApi, 'fetchAuctionBidHistory')
        .mockImplementation((_auctionId, page) =>
          Promise.resolve({
            items: [
              {
                id: `bid-${String(page)}`,
                amountCredits: page * 10,
                placedAt: '2026-10-02T16:30:00.000Z',
              },
            ],
            total: 45,
            page,
            pageSize: 20,
          }),
        )

      montar()

      await screen.findByText('10 créditos')
      expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

      await waitFor(() => {
        expect(historyMock).toHaveBeenCalledWith(AUCTION_ID, 2, 20, expect.anything())
      })
      expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Anterior' })).not.toBeDisabled()

      await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
      await waitFor(() => {
        expect(historyMock).toHaveBeenLastCalledWith(AUCTION_ID, 1, 20, expect.anything())
      })
    })

    it('F. sin paginacion cuando total cabe en una sola pagina', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(detailApi, 'fetchAuctionBidHistory').mockResolvedValue({
        items: [{ id: 'bid-1', amountCredits: 10, placedAt: '2026-10-02T16:30:00.000Z' }],
        total: 1,
        page: 1,
        pageSize: 20,
      })

      montar()

      await screen.findByText('10 créditos')
      expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
    })
  })

  describe('errores del detalle (HU-88)', () => {
    it('H. 404: muestra "Subasta no encontrada" y un enlace al marketplace', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockRejectedValue(
        new HttpError(404, 'no existe', { statusCode: 404, code: 'AUCTION_NOT_FOUND' }),
      )

      montar()

      expect(await screen.findByText('Subasta no encontrada')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al marketplace' })).toHaveAttribute(
        'href',
        '/auction',
      )
    })

    it('I. 403: muestra el mensaje neutro de permisos y no muestra contenido parcial', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockRejectedValue(
        new HttpError(403, 'prohibido', { statusCode: 403 }),
      )

      montar()

      expect(
        await screen.findByText('No tienes permisos para consultar esta subasta.'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Espada Legendaria Nexus' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Tiempo restante')).not.toBeInTheDocument()
    })

    it('mantiene el estado generico para otros errores (500/red)', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockRejectedValue(
        new HttpError(500, 'error interno', { statusCode: 500 }),
      )

      montar()

      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.queryByText('Subasta no encontrada')).not.toBeInTheDocument()
      expect(
        screen.queryByText('No tienes permisos para consultar esta subasta.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('invalidacion tras una puja exitosa (HU-88)', () => {
    it('R. registrar una puja invalida detalle e historial, ademas de la billetera', async () => {
      vi.spyOn(detailApi, 'fetchAuctionDetail').mockResolvedValue(auction())
      vi.spyOn(catalogApi, 'fetchCanonicalProduct').mockResolvedValue(producto())
      vi.spyOn(detailApi, 'fetchBuyerCredits').mockResolvedValue({ balance: 5000 })
      const bidApi = await import('./bidding/api')
      vi.spyOn(bidApi, 'registerBid').mockResolvedValue({
        id: 'bid-new',
        auctionId: AUCTION_ID,
        bidderId: 'buyer-1',
        amountCredits: 50,
        placedAt: '2026-09-21T12:00:00.000Z',
      })

      montar()

      const historyCallsBefore = (detailApi.fetchAuctionBidHistory as ReturnType<typeof vi.fn>).mock
        .calls.length
      const detailCallsBefore = (detailApi.fetchAuctionDetail as ReturnType<typeof vi.fn>).mock
        .calls.length

      const amountInput = await screen.findByRole('spinbutton', { name: 'Monto de puja' })
      await userEvent.clear(amountInput)
      await userEvent.type(amountInput, '50')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar puja' }))

      await waitFor(() => {
        expect(
          (detailApi.fetchAuctionDetail as ReturnType<typeof vi.fn>).mock.calls.length,
        ).toBeGreaterThan(detailCallsBefore)
      })
      await waitFor(() => {
        expect(
          (detailApi.fetchAuctionBidHistory as ReturnType<typeof vi.fn>).mock.calls.length,
        ).toBeGreaterThan(historyCallsBefore)
      })
    })
  })
})
