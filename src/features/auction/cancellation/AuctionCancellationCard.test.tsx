import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { AuctionCancellationCard } from './AuctionCancellationCard'
import { formatCancellationCredits } from './formatCancellationCredits'

const props = {
  publicationFeeCredits: 1,
  bidCount: 0,
  loading: false,
  confirmation: null,
  error: null,
  onCancel: vi.fn(),
}

describe('AuctionCancellationCard', () => {
  it('muestra la accion y la confirmacion con medios creditos sin truncar', async () => {
    renderWithProviders(<AuctionCancellationCard {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar subasta' }))
    expect(screen.getAllByText('0,5 créditos')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Sí, cancelar subasta' })).toBeInTheDocument()
  })

  it('preserva 1.5 creditos', () => {
    expect(formatCancellationCredits((_, options) => `${options.value} créditos`, 1.5)).toBe(
      '1,5 créditos',
    )
  })

  it.each([
    [
      'CONFIRMED',
      'CONFIRMED',
      'Subasta cancelada. El producto fue devuelto y se procesó el reembolso correspondiente.',
    ],
    [
      'PENDING',
      'CONFIRMED',
      'La subasta fue cancelada. La devolución del producto o el reembolso todavía se está procesando.',
    ],
    [
      'RETRYABLE',
      'CONFIRMED',
      'La subasta fue cancelada. La devolución del producto o el reembolso todavía se está procesando.',
    ],
    [
      'TERMINAL_ERROR',
      'CONFIRMED',
      'La subasta fue cancelada, pero una operación asociada requiere revisión.',
    ],
  ] as const)(
    'muestra el estado real %s/%s',
    (walletRefundStatus, inventoryReleaseStatus, message) => {
      renderWithProviders(
        <AuctionCancellationCard
          {...props}
          confirmation={{
            auctionId: 'auction-1',
            status: 'CANCELLED',
            cancelledAt: '2026-10-03T12:00:00.000Z',
            refundAmountCredits: 0.5,
            walletRefundStatus,
            inventoryReleaseStatus,
            replayed: false,
          }}
        />,
      )
      expect(screen.getByText(message)).toBeInTheDocument()
    },
  )

  it('deshabilita el CTA preventivamente si ya hay pujas', () => {
    renderWithProviders(<AuctionCancellationCard {...props} bidCount={1} />)
    expect(screen.getByRole('button', { name: 'Cancelar subasta' })).toBeDisabled()
  })
})
