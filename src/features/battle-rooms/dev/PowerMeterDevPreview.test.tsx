import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PowerMeterDevPreview } from './PowerMeterDevPreview'

const tanque = (): HTMLElement => screen.getByRole('meter', { name: 'Poder de Guerrero Tanque' })
const fuego = (): HTMLElement => screen.getByRole('meter', { name: 'Poder de Mago Fuego' })

describe('PowerMeterDevPreview (HU-11)', () => {
  it('arranca con cada héroe en su Poder máximo', () => {
    render(<PowerMeterDevPreview />)

    expect(tanque()).toHaveAttribute('aria-valuenow', '10')
    expect(tanque()).toHaveAttribute('aria-valuemax', '10')
    expect(fuego()).toHaveAttribute('aria-valuenow', '8')
    expect(fuego()).toHaveAttribute('aria-valuemax', '8')
    expect(screen.getByTestId('evento')).toHaveTextContent('Evento 1 de 6')
  })

  it('cada evento actualiza el medidor del héroe afectado de inmediato y no toca al otro', async () => {
    const user = userEvent.setup()
    render(<PowerMeterDevPreview />)

    const esperado = [6, 8, 0, 2, 10]
    for (const [i, valor] of esperado.entries()) {
      await user.click(screen.getByRole('button', { name: 'Siguiente evento' }))

      expect(tanque()).toHaveAttribute('aria-valuenow', String(valor))
      expect(fuego()).toHaveAttribute('aria-valuenow', '8')
      expect(screen.getByTestId('evento')).toHaveTextContent(`Evento ${String(i + 2)} de 6`)
    }
  })

  it('al llegar al último evento no se puede avanzar más, y Reiniciar vuelve al principio', async () => {
    const user = userEvent.setup()
    render(<PowerMeterDevPreview />)

    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Siguiente evento' }))
    }
    expect(screen.getByRole('button', { name: 'Siguiente evento' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Reiniciar' }))

    expect(screen.getByRole('button', { name: 'Siguiente evento' })).toBeEnabled()
    expect(tanque()).toHaveAttribute('aria-valuenow', '10')
    expect(screen.getByTestId('evento')).toHaveTextContent('Evento 1 de 6')
  })

  it('muestra los estados de la barra, incluido un dato roto sin barra inventada', () => {
    render(<PowerMeterDevPreview />)

    const estados = screen.getByRole('heading', { name: 'Estados del medidor' }).closest('section')
    if (estados === null) throw new Error('se esperaba la sección de estados')

    const medidores = within(estados).getAllByTestId('power-meter')
    expect(medidores).toHaveLength(5)
    expect(within(estados).getAllByRole('meter')).toHaveLength(4)
    expect(within(estados).getByText('No disponible')).toBeInTheDocument()
    expect(within(estados).getByText('0/0')).toBeInTheDocument()
  })
})
