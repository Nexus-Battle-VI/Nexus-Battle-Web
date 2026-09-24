import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { httpClient, HttpError } from '@/lib/http'
import { PendingClaimsPage } from './PendingClaimsPage'
import type { ClaimBatchResult, PendingClaim } from './api'

const claim = (overrides: Partial<PendingClaim> = {}): PendingClaim => ({
  auctionId: 'auction-1',
  productId: 'product-1',
  winningBidId: 'bid-1',
  finalAmountCredits: 2500,
  settledAt: '2026-09-20T12:00:00.000Z',
  claimStatus: 'PENDING',
  claimDeadline: '2026-09-27T12:00:00.000Z',
  remainingClaimDays: 5,
  ...overrides,
})

const canonicalProduct = (productId: string) => ({
  productId,
  sku: `sku-${productId}`,
  name: `Producto ${productId}`,
  description: '',
  imageUrl: '',
  type: 'WEAPON',
  lifecycleStatus: 'PUBLISHED',
  creditsPrice: 0,
  premium: false,
  realMoneyPrice: null,
  averageRating: null,
  reviewCount: 0,
})

/** Enruta `httpClient.get`: la pagina y cada tarjeta comparten el mismo cliente. */
const mockGet = (claims: readonly PendingClaim[]): void => {
  vi.spyOn(httpClient, 'get').mockImplementation((path: string) => {
    if (path === '/v1/auctions/me/pending-claims') {
      return Promise.resolve(claims)
    }

    const productId = path.split('/').pop() ?? ''

    return Promise.resolve(canonicalProduct(productId))
  })
}

/**
 * Servidor falso CON ESTADO: a diferencia de `mockGet`, el listado que
 * devuelve `GET .../pending-claims` refleja los reclamos ya aplicados. Hace
 * falta para probar que, tras invalidar la consulta, la tarjeta pasa a
 * mostrar CLAIMED de verdad -con un mock estatico, el refetch posterior a un
 * reclamo exitoso seguiria devolviendo PENDING-.
 */
const createStatefulServer = (initialClaims: readonly PendingClaim[]) => {
  let claims = [...initialClaims]

  vi.spyOn(httpClient, 'get').mockImplementation((path: string) => {
    if (path === '/v1/auctions/me/pending-claims') {
      return Promise.resolve(claims)
    }

    const productId = path.split('/').pop() ?? ''

    return Promise.resolve(canonicalProduct(productId))
  })

  const applyClaimed = (auctionId: string): PendingClaim => {
    claims = claims.map((item) =>
      item.auctionId === auctionId ? { ...item, claimStatus: 'CLAIMED' as const } : item,
    )
    const updated = claims.find((item) => item.auctionId === auctionId)

    if (updated === undefined)
      throw new Error(`auctionId desconocido en el servidor falso: ${auctionId}`)

    return updated
  }

  return { applyClaimed }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('PendingClaimsPage', () => {
  it('renderiza el listado con los productos pendientes', async () => {
    mockGet([claim(), claim({ auctionId: 'auction-2', productId: 'product-2' })])

    renderWithProviders(<PendingClaimsPage />)

    expect(await screen.findByText('Producto product-1')).toBeInTheDocument()
    expect(screen.getByText('Producto product-2')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Productos pendientes de reclamo' }),
    ).toBeInTheDocument()
  })

  it('estado vacio: sin pendientes muestra el mensaje, sin toolbar', async () => {
    mockGet([])

    renderWithProviders(<PendingClaimsPage />)

    expect(
      await screen.findByText('No tienes productos pendientes de reclamo.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Seleccionar todos')).not.toBeInTheDocument()
    expect(screen.queryByText('Recoger todo')).not.toBeInTheDocument()
  })

  it('muestra el estado de carga mientras resuelve la consulta', () => {
    vi.spyOn(httpClient, 'get').mockReturnValue(new Promise(() => undefined))

    renderWithProviders(<PendingClaimsPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...')
  })

  it('reclamo individual exitoso: invalida y refresca el listado', async () => {
    const user = userEvent.setup()
    const server = createStatefulServer([claim()])
    const post = vi
      .spyOn(httpClient, 'post')
      .mockImplementation(() => Promise.resolve(server.applyClaimed('auction-1')))

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('button', { name: 'Reclamar' }))

    expect(post).toHaveBeenCalledWith('/v1/auctions/me/pending-claims/auction-1/claim')
    await waitFor(() => {
      expect(screen.getByText('Reclamado')).toBeInTheDocument()
    })
    expect(screen.getByText('Añadido a tu inventario.')).toBeInTheDocument()
  })

  it.each([
    [403, 'No eres el titular de este reclamo.'],
    [404, 'Este producto ya no está disponible para reclamar.'],
    [409, 'El estado del reclamo cambió; actualiza la página e intenta de nuevo.'],
  ])(
    'reclamo individual con error %i muestra el mensaje correspondiente',
    async (status, message) => {
      const user = userEvent.setup()
      mockGet([claim()])
      vi.spyOn(httpClient, 'post').mockRejectedValue(new HttpError(status, 'x', null))

      renderWithProviders(<PendingClaimsPage />)

      await user.click(await screen.findByRole('button', { name: 'Reclamar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      // El item sigue PENDING: un rechazo no lo hace desaparecer del listado.
      expect(screen.getByRole('button', { name: 'Reclamar' })).toBeInTheDocument()
    },
  )

  it('reclamo individual con 422 marca la tarjeta como plazo vencido', async () => {
    const user = userEvent.setup()
    mockGet([claim()])
    vi.spyOn(httpClient, 'post').mockRejectedValue(new HttpError(422, 'plazo vencido', null))

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('button', { name: 'Reclamar' }))

    expect(await screen.findByText('Plazo vencido')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reclamar' })).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'El plazo de reclamo venció. El producto se perdió: no se revierte la compra ni se reembolsan los créditos.',
      ),
    ).toBeInTheDocument()
  })

  it('reclamo individual con fallo de red muestra un mensaje generico', async () => {
    const user = userEvent.setup()
    mockGet([claim()])
    vi.spyOn(httpClient, 'post').mockRejectedValue(new Error('network down'))

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('button', { name: 'Reclamar' }))

    expect(
      await screen.findByText('No se pudo reclamar el producto. Intenta nuevamente.'),
    ).toBeInTheDocument()
  })

  it('previene doble clic: un segundo click mientras la mutacion esta en curso no reenvia', async () => {
    const user = userEvent.setup()
    const server = createStatefulServer([claim()])
    let resolvePost!: (value: PendingClaim) => void
    const post = vi.spyOn(httpClient, 'post').mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )

    renderWithProviders(<PendingClaimsPage />)

    const button = await screen.findByRole('button', { name: 'Reclamar' })
    await user.click(button)
    expect(await screen.findByRole('button', { name: /Reclamando/u })).toBeDisabled()

    // Un segundo evento de click sobre el mismo boton (ya deshabilitado) no debe reenviar.
    await user.click(screen.getByRole('button', { name: /Reclamando/u }))
    expect(post).toHaveBeenCalledTimes(1)

    resolvePost(server.applyClaimed('auction-1'))
    await waitFor(() => {
      expect(screen.getByText('Reclamado')).toBeInTheDocument()
    })
  })

  it('reclamo en bloque 100% exitoso tras confirmar en dos pasos', async () => {
    const user = userEvent.setup()
    mockGet([claim(), claim({ auctionId: 'auction-2', productId: 'product-2' })])
    const result: ClaimBatchResult = {
      results: [
        {
          auctionId: 'auction-1',
          status: 'CLAIMED',
          claim: claim({ claimStatus: 'CLAIMED' }),
          message: null,
        },
        {
          auctionId: 'auction-2',
          status: 'CLAIMED',
          claim: claim({ auctionId: 'auction-2', productId: 'product-2', claimStatus: 'CLAIMED' }),
          message: null,
        },
      ],
    }
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue(result)

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar todos' }))
    expect(screen.getByText('2 de 2 seleccionados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recoger todo' }))
    expect(
      screen.getByText('¿Confirmas que quieres recoger los 2 productos seleccionados?'),
    ).toBeInTheDocument()
    // No se envia nada hasta la segunda confirmacion explicita.
    expect(post).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sí, recoger todo' }))

    expect(post).toHaveBeenCalledWith('/v1/auctions/me/pending-claims/claim-batch', {
      auctionIds: ['auction-1', 'auction-2'],
    })
    expect(await screen.findByText('Reclamaste 2 productos correctamente.')).toBeInTheDocument()
    expect(
      screen.queryByText('¿Confirmas que quieres recoger los 2 productos seleccionados?'),
    ).not.toBeInTheDocument()
  })

  it('reclamo en bloque parcialmente exitoso refleja cada resultado sin tratarlo como error global', async () => {
    const user = userEvent.setup()
    const server = createStatefulServer([
      claim(),
      claim({ auctionId: 'auction-2', productId: 'product-2' }),
      claim({ auctionId: 'auction-3', productId: 'product-3' }),
    ])
    vi.spyOn(httpClient, 'post').mockImplementation(() => {
      const claimed = server.applyClaimed('auction-1')
      const result: ClaimBatchResult = {
        results: [
          { auctionId: 'auction-1', status: 'CLAIMED', claim: claimed, message: null },
          { auctionId: 'auction-2', status: 'NOT_OWNED', claim: null, message: 'no owner' },
          { auctionId: 'auction-3', status: 'EXPIRED', claim: null, message: 'vencido' },
        ],
      }

      return Promise.resolve(result)
    })

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar todos' }))
    await user.click(screen.getByRole('button', { name: 'Recoger todo' }))
    await user.click(screen.getByRole('button', { name: 'Sí, recoger todo' }))

    const summaryHeading = await screen.findByText('Reclamaste 1 de 3 productos seleccionados.')
    const summary = summaryHeading.parentElement!
    expect(within(summary).getByText(/auction-2: no te pertenece/u)).toBeInTheDocument()
    expect(within(summary).getByText(/auction-3: plazo vencido/u)).toBeInTheDocument()
    // El fallo parcial no oculta ni revierte el item que si se reclamo.
    expect(screen.getByText('Reclamado')).toBeInTheDocument()
  })

  it('el boton "Recoger todo" empieza deshabilitado sin seleccion', async () => {
    mockGet([claim()])

    renderWithProviders(<PendingClaimsPage />)

    expect(await screen.findByRole('button', { name: 'Recoger todo' })).toBeDisabled()
  })

  it('cancelar la confirmacion de lote no envia nada', async () => {
    const user = userEvent.setup()
    mockGet([claim()])
    const post = vi.spyOn(httpClient, 'post')

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar todos' }))
    await user.click(screen.getByRole('button', { name: 'Recoger todo' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(post).not.toHaveBeenCalled()
    expect(
      screen.queryByText('¿Confirmas que quieres recoger los 1 productos seleccionados?'),
    ).not.toBeInTheDocument()
  })

  it('muestra el aviso role=status aria-live=polite mientras el lote esta en curso', async () => {
    const user = userEvent.setup()
    mockGet([claim()])
    vi.spyOn(httpClient, 'post').mockReturnValue(new Promise(() => undefined))

    renderWithProviders(<PendingClaimsPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar todos' }))
    await user.click(screen.getByRole('button', { name: 'Recoger todo' }))
    await user.click(screen.getByRole('button', { name: 'Sí, recoger todo' }))

    const status = await screen.findByText('Reclamando productos seleccionados...')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status.tagName.toLowerCase()).toBe('p')
    expect(status).toHaveAttribute('role', 'status')
  })
})
