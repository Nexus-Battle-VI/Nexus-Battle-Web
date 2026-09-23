import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { formatCredits } from './formatCredits'
import { ImmediatePurchaseCard, type ImmediatePurchaseCardProps } from './ImmediatePurchaseCard'

const SWORD = { name: 'Espada Legendaria Nexus', icon: '⚔️', summary: 'Arma mítica · Poder 95' }
const TRANSACTION = { id: '#TXN-2692847', debitedCredits: 2500, remainingCredits: 2500 }

const renderCard = (overrides: Partial<ImmediatePurchaseCardProps> = {}) => {
  const props: ImmediatePurchaseCardProps = {
    product: SWORD,
    stage: 'available',
    priceCredits: 2500,
    availableCredits: 5000,
    confirmed: false,
    onConfirmedChange: vi.fn(),
    onBuy: vi.fn(),
    ...overrides,
  }

  return { props, ...render(<ImmediatePurchaseCard {...props} />) }
}

describe('formatCredits', () => {
  it('agrupa los miles con punto y no depende del locale', () => {
    expect(formatCredits(2500)).toBe('2.500 créditos')
    expect(formatCredits(500)).toBe('500 créditos')
    expect(formatCredits(1234567)).toBe('1.234.567 créditos')
  })
})

describe('ImmediatePurchaseCard', () => {
  it('muestra el precio, los creditos y la casilla de confirmacion', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Espada Legendaria Nexus' })).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('2.500 créditos')).toBeInTheDocument()
    expect(screen.getByText('5.000 créditos')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Confirmo la compra inmediata' })).not.toBeChecked()
  })

  it('CA-04: sin confirmar, comprar no ejecuta la compra y pide la confirmacion', async () => {
    const { props } = renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(props.onBuy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Confirmación requerida')
    expect(screen.getByRole('button', { name: 'Comprar ahora' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('puede abrirse con el aviso de confirmacion ya visible', () => {
    renderCard({ initialConfirmationAttempted: true })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Debes marcar la casilla de confirmación antes de continuar.',
    )
  })

  it('marcar la casilla avisa al padre y retira el aviso', async () => {
    const { props, rerender } = renderCard({ initialConfirmationAttempted: true })

    await userEvent.click(screen.getByRole('checkbox'))

    expect(props.onConfirmedChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<ImmediatePurchaseCard {...props} confirmed />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('con la confirmacion marcada, comprar invoca onBuy una vez', async () => {
    const { props } = renderCard({ confirmed: true })

    await userEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(props.onBuy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('procesando: comunica el progreso y no ofrece acciones', () => {
    renderCard({ stage: 'processing' })

    expect(screen.getByText('Procesando')).toBeInTheDocument()
    expect(screen.getByText('Procesando tu compra...')).toBeInTheDocument()
    expect(screen.getByText('No cierres esta ventana')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('CA-01: compra exitosa muestra la transaccion y navega a pendientes', async () => {
    const onViewPending = vi.fn()
    renderCard({ stage: 'success', transaction: TRANSACTION, onViewPending })

    expect(screen.getByText('Vendida')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('¡Compra completada!')
    expect(screen.getByText('#TXN-2692847')).toBeInTheDocument()
    expect(screen.getByText('-2.500 créditos')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver pendientes de recoger' }))

    expect(onViewPending).toHaveBeenCalledTimes(1)
  })

  it('CA-03: sin precio de compra inmediata ofrece ir a pujar', async () => {
    const onGoToBid = vi.fn()
    renderCard({
      product: { name: 'Escudo Antiguo', icon: '🛡️' },
      stage: 'unavailable',
      onGoToBid,
    })

    expect(screen.getByText('En subasta solo')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Compra inmediata no disponible')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ir a pujar' }))

    expect(onGoToBid).toHaveBeenCalledTimes(1)
  })

  it('CA-02: creditos insuficientes detalla lo que falta y bloquea la compra', () => {
    const { props } = renderCard({
      stage: 'insufficient-credits',
      priceCredits: 3000,
      availableCredits: 2500,
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Necesitas 3.000 créditos y solo tienes 2.500 créditos disponibles.',
    )
    expect(screen.getByText('Créditos faltantes')).toBeInTheDocument()
    expect(screen.getByText('500 créditos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprar ahora' })).toBeDisabled()
    expect(props.onBuy).not.toHaveBeenCalled()
  })

  it('pendiente de retiro muestra la fecha limite y permite ver otros productos', async () => {
    const onViewOtherProducts = vi.fn()
    renderCard({
      stage: 'pending-pickup',
      transaction: TRANSACTION,
      pickupDeadline: '27 de septiembre, 2026',
      onViewOtherProducts,
    })

    expect(screen.getByRole('status')).toHaveTextContent('Tu compra está lista para reclamar')
    expect(screen.getByText('27 de septiembre, 2026')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver otros productos' }))

    expect(onViewOtherProducts).toHaveBeenCalledTimes(1)
  })

  it('respeta los dias de retiro configurados', () => {
    renderCard({ stage: 'success', transaction: TRANSACTION, pickupDays: 10 })

    expect(screen.getByRole('status')).toHaveTextContent('Tienes 10 días para reclamarlo.')
  })
})
