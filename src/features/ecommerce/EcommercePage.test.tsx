import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { EcommercePage } from './EcommercePage'

describe('EcommercePage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('mantiene el titulo E-commerce y declara que los productos son fixtures', () => {
    renderWithProviders(<EcommercePage />)

    expect(screen.getByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()
    expect(screen.getByText(/no es el catalogo oficial de gama/i)).toBeInTheDocument()
    expect(screen.getByText('Espada de una mano')).toBeInTheDocument()
  })

  it('al buscar vida prioriza el nombre Arbol de la vida', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EcommercePage />)

    await user.type(screen.getByLabelText('Buscar'), 'vida')

    const cards = screen.getAllByRole('heading', { level: 3 })
    expect(cards[0]).toHaveTextContent('Árbol de la vida')
  })

  it('agrega al carrito y permite quitar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EcommercePage />)

    const sword = screen.getByText('Espada de una mano').closest('li')
    expect(sword).not.toBeNull()
    await user.click(
      within(sword as HTMLElement).getByRole('button', { name: 'Enviar al carrito' }),
    )

    const cart = screen.getByRole('region', { name: 'Carrito' })
    expect(within(cart).getByText(/Espada de una mano/)).toBeInTheDocument()
    expect(within(cart).getByText(/Carrito \(1\)/)).toBeInTheDocument()

    await user.click(within(cart).getByRole('button', { name: 'Quitar' }))
    expect(within(cart).getByText('Tu carrito esta vacio')).toBeInTheDocument()
  })

  it('marca deseos sin exigir catalogo oficial', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EcommercePage />)

    const sword = screen.getByText('Espada de una mano').closest('li')
    await user.click(within(sword as HTMLElement).getByRole('button', { name: 'Lista de deseos' }))
    expect(within(sword as HTMLElement).getByText('En deseos')).toBeInTheDocument()
  })

  it('declina el pago simulado si la tarjeta termina en 0000', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EcommercePage />)

    const sword = screen.getByText('Espada de una mano').closest('li')
    await user.click(
      within(sword as HTMLElement).getByRole('button', { name: 'Enviar al carrito' }),
    )
    await user.click(screen.getByRole('button', { name: 'Proceder al pago' }))
    await user.type(screen.getByLabelText('Titular'), 'JUAN PEREZ')
    await user.type(screen.getByLabelText('Numero de tarjeta'), '4111111111110000')
    await user.type(screen.getByLabelText('Vencimiento'), '1229')
    await user.type(screen.getByLabelText('CVV'), '123')
    await user.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }))

    expect(
      await screen.findByText(/declinó la transacción|declino la transaccion/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Carrito' })).toHaveTextContent('Espada de una mano')
  })
})
