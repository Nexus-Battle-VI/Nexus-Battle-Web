import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { AutoBidConfigCard } from './AutoBidConfigCard'

describe('AutoBidConfigCard', () => {
  it('configura un limite entero desde el estado sin configurar', async () => {
    const onConfigure = vi.fn()

    renderWithProviders(
      <AutoBidConfigCard stage="ready" availableCredits={5000} onConfigure={onConfigure} />,
    )

    await userEvent.type(screen.getByLabelText('Límite máximo'), '3000')
    await userEvent.click(screen.getByRole('button', { name: 'Configurar puja automática' }))

    expect(onConfigure).toHaveBeenCalledWith(3000)
  })

  it('muestra el estado de guardado con progreso accesible', () => {
    renderWithProviders(<AutoBidConfigCard stage="processing" />)

    expect(screen.getByRole('progressbar', { name: 'Guardando tu límite' })).toBeInTheDocument()
    expect(screen.getByText('No cierres esta ventana')).toBeInTheDocument()
  })

  it('muestra el limite y la fecha configurados al activarse', () => {
    renderWithProviders(
      <AutoBidConfigCard
        stage="configured"
        maxAmountCredits={5000}
        configuredAt="2026-09-22T12:00:00.000Z"
      />,
    )

    expect(screen.getByText('Puja automática configurada')).toBeInTheDocument()
    expect(screen.getByText('5.000 créditos')).toBeInTheDocument()
  })

  it('muestra los estados rechazado, propia subasta y subasta inactiva', () => {
    const { rerender } = renderWithProviders(
      <AutoBidConfigCard stage="rejected" errorMessage="Límite inválido" />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Límite inválido')

    rerender(<AutoBidConfigCard stage="own-auction" />)

    expect(
      screen.getByText('No puedes configurar puja automática en tu propia subasta'),
    ).toBeInTheDocument()

    rerender(<AutoBidConfigCard stage="auction-not-active" />)

    expect(screen.getByText('Esta subasta ya no está activa')).toBeInTheDocument()
  })

  it('rechaza un envio vacio antes de llamar a onConfigure', async () => {
    const onConfigure = vi.fn()

    renderWithProviders(<AutoBidConfigCard stage="ready" onConfigure={onConfigure} />)

    // El campo no es `required`: un envio vacio no dispara la validacion
    // nativa `min`/`step` del input (solo aplica sobre un valor presente), asi
    // que si llega hasta la validacion propia del componente.
    await userEvent.click(screen.getByRole('button', { name: 'Configurar puja automática' }))

    expect(onConfigure).not.toHaveBeenCalled()
    expect(screen.getByText('Ingresa un límite entero mayor que 0.')).toBeInTheDocument()
  })
})
