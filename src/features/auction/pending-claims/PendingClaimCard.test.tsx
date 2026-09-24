import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { httpClient } from '@/lib/http'
import { PendingClaimCard } from './PendingClaimCard'
import type { PendingClaim } from './api'

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

const noop = (): void => undefined

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(httpClient, 'get').mockResolvedValue({
    productId: 'product-1',
    sku: 'sku-1',
    name: 'Espada mítica',
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
})

describe('PendingClaimCard', () => {
  it('PENDING: muestra checkbox, monto, plazo y boton Reclamar', async () => {
    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="PENDING"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={noop}
        />
      </ul>,
    )

    expect(await screen.findByText('Espada mítica')).toBeInTheDocument()
    expect(screen.getByText('2.500 créditos')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Seleccionar/u })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reclamar' })).toBeInTheDocument()
    expect(screen.getByText(/Quedan 5 días/u)).toBeInTheDocument()
  })

  it('remainingClaimDays <= 1 resalta el plazo en rojo', async () => {
    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim({ remainingClaimDays: 1 })}
          displayStatus="PENDING"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={noop}
        />
      </ul>,
    )

    const notice = await screen.findByText('Vence hoy o mañana')
    expect(notice.className).toContain('text-danger')
  })

  it('llama onToggleSelected al marcar la casilla', async () => {
    const user = userEvent.setup()
    const onToggleSelected = vi.fn()

    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="PENDING"
          selected={false}
          claiming={false}
          onToggleSelected={onToggleSelected}
          onClaim={noop}
        />
      </ul>,
    )

    await user.click(await screen.findByRole('checkbox', { name: /Seleccionar/u }))

    expect(onToggleSelected).toHaveBeenCalledWith('auction-1')
  })

  it('llama onClaim al presionar Reclamar, y evita doble clic mientras claiming', async () => {
    const user = userEvent.setup()
    const onClaim = vi.fn()

    const { rerender } = renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="PENDING"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={onClaim}
        />
      </ul>,
    )

    await user.click(await screen.findByRole('button', { name: 'Reclamar' }))
    expect(onClaim).toHaveBeenCalledWith('auction-1')

    rerender(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="PENDING"
          selected={false}
          claiming
          onToggleSelected={noop}
          onClaim={onClaim}
        />
      </ul>,
    )

    const claimingButton = screen.getByRole('button', { name: /Reclamando/u })
    expect(claimingButton).toBeDisabled()
    expect(claimingButton).toHaveAttribute('aria-busy', 'true')
  })

  it('CLAIMED: sin checkbox ni boton, muestra confirmacion de inventario', async () => {
    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim({ claimStatus: 'CLAIMED' })}
          displayStatus="CLAIMED"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={noop}
        />
      </ul>,
    )

    expect(await screen.findByText('Reclamado')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reclamar/u })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Añadido a tu inventario.')
  })

  it('EXPIRED (sintetizado localmente): sin checkbox ni boton, avisa perdida sin reembolso', async () => {
    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="EXPIRED"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={noop}
        />
      </ul>,
    )

    expect(await screen.findByText('Plazo vencido')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reclamar/u })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El plazo de reclamo venció. El producto se perdió: no se revierte la compra ni se reembolsan los créditos.',
    )
  })

  it('si el catalogo falla, usa el productId como respaldo del nombre', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('catalog down'))

    renderWithProviders(
      <ul>
        <PendingClaimCard
          claim={claim()}
          displayStatus="PENDING"
          selected={false}
          claiming={false}
          onToggleSelected={noop}
          onClaim={noop}
        />
      </ul>,
    )

    expect(await screen.findByText('product-1')).toBeInTheDocument()
  })
})
