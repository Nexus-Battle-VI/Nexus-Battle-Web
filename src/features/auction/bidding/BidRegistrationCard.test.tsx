import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { BidRegistrationCard } from './BidRegistrationCard'

const product = {
  name: 'Espada Legendaria Nexus',
  icon: '⚔️',
  summary: 'Arma mítica',
}

describe('BidRegistrationCard', () => {
  it('registra un monto entero desde el estado en curso', async () => {
    const onRegister = vi.fn()

    renderWithProviders(
      <BidRegistrationCard
        product={product}
        stage="ready"
        currentBidCredits={1500}
        minimumBidCredits={100}
        availableCredits={5000}
        onRegister={onRegister}
      />,
    )

    await userEvent.type(screen.getByLabelText('Monto de puja'), '1600')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar puja' }))

    expect(onRegister).toHaveBeenCalledWith(1600)
  })

  it('muestra el estado de registro con progreso accesible', () => {
    renderWithProviders(<BidRegistrationCard product={product} stage="processing" minimumBidCredits={100} />)

    expect(screen.getByRole('progressbar', { name: 'Registrando tu puja' })).toBeInTheDocument()
    expect(screen.getByText('No cierres esta ventana')).toBeInTheDocument()
  })

  it('muestra los estados rechazado y superada del diseño', () => {
    const { rerender } = renderWithProviders(
      <BidRegistrationCard
        product={product}
        stage="rejected"
        minimumBidCredits={100}
        errorMessage="Monto insuficiente"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Monto insuficiente')

    rerender(
      <BidRegistrationCard
        product={product}
        stage="outbid"
        minimumBidCredits={100}
        bidCredits={1600}
      />,
    )

    expect(screen.getByText('Tu puja fue superada')).toBeInTheDocument()
    expect(screen.getByText('+1.600 créditos')).toBeInTheDocument()
  })
})

