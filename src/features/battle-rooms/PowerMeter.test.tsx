import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PowerMeter } from './PowerMeter'

const meterOf = (heroName: string): HTMLElement =>
  screen.getByRole('meter', { name: `Poder de ${heroName}` })

const barOf = (meter: HTMLElement): HTMLElement => {
  const bar = meter.firstElementChild
  if (!(bar instanceof HTMLElement)) throw new Error('se esperaba la barra dentro del medidor')
  return bar
}

describe('PowerMeter (HU-11): el nuevo valor se muestra actualizado al jugador', () => {
  it('muestra el Poder de un héroe como medidor accesible con su valor, rango y texto', () => {
    render(<PowerMeter heroName="Guerrero Tanque" power={{ current: 6, max: 10 }} />)

    const meter = meterOf('Guerrero Tanque')

    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '10')
    expect(meter).toHaveAttribute('aria-valuenow', '6')
    expect(meter).toHaveAttribute('aria-valuetext', '6 de 10')
    expect(screen.getByText('6/10')).toBeInTheDocument()
    expect(barOf(meter).style.width).toBe('60%')
  })

  it('anuncia el cambio en una región polite con el nombre del héroe', () => {
    render(<PowerMeter heroName="Guerrero Tanque" power={{ current: 6, max: 10 }} />)

    const live = screen.getByText('Poder de Guerrero Tanque: 6 de 10')

    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
    // El texto visible no se lee dos veces: «6/10» queda oculto a los lectores.
    expect(screen.getByText('6/10')).toHaveAttribute('aria-hidden', 'true')
  })

  it('cada nuevo valor se ve en el mismo renderizado: 10 → 6 → 8 → 0 → 2 → 10', () => {
    const { rerender } = render(
      <PowerMeter heroName="Guerrero Tanque" power={{ current: 10, max: 10 }} />,
    )

    const secuencia = [
      { current: 10, width: '100%' },
      { current: 6, width: '60%' },
      { current: 8, width: '80%' },
      { current: 0, width: '0%' },
      { current: 2, width: '20%' },
      { current: 10, width: '100%' },
    ] as const

    for (const paso of secuencia) {
      rerender(<PowerMeter heroName="Guerrero Tanque" power={{ current: paso.current, max: 10 }} />)

      const meter = meterOf('Guerrero Tanque')
      expect(meter).toHaveAttribute('aria-valuenow', String(paso.current))
      expect(screen.getByText(`${String(paso.current)}/10`)).toBeInTheDocument()
      expect(
        screen.getByText(`Poder de Guerrero Tanque: ${String(paso.current)} de 10`),
      ).toBeInTheDocument()
      expect(barOf(meter).style.width).toBe(paso.width)
    }
  })

  it('dos héroes del mismo jugador: el medidor de uno cambia y el del otro no', () => {
    const { rerender } = render(
      <>
        <PowerMeter heroName="Guerrero Tanque" power={{ current: 10, max: 10 }} />
        <PowerMeter heroName="Mago Fuego" power={{ current: 8, max: 8 }} />
      </>,
    )

    rerender(
      <>
        <PowerMeter heroName="Guerrero Tanque" power={{ current: 6, max: 10 }} />
        <PowerMeter heroName="Mago Fuego" power={{ current: 8, max: 8 }} />
      </>,
    )

    expect(meterOf('Guerrero Tanque')).toHaveAttribute('aria-valuenow', '6')
    expect(meterOf('Mago Fuego')).toHaveAttribute('aria-valuenow', '8')
    expect(meterOf('Mago Fuego')).toHaveAttribute('aria-valuemax', '8')
    expect(screen.getAllByTestId('power-meter')).toHaveLength(2)
  })

  it('un héroe con Poder máximo 0 muestra 0/0 y la barra vacía', () => {
    render(<PowerMeter heroName="Sin poder" power={{ current: 0, max: 0 }} />)

    expect(screen.getByText('0/0')).toBeInTheDocument()
    expect(barOf(meterOf('Sin poder')).style.width).toBe('0%')
  })

  it('un dato roto no dibuja una barra inventada: dice que no está disponible', () => {
    render(<PowerMeter heroName="Guerrero Tanque" power={{ current: 11, max: 10 }} />)

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByText(/de 10/u)).not.toBeInTheDocument()
    expect(within(screen.getByTestId('power-meter')).getByText('No disponible')).toBeInTheDocument()
  })

  it('se recupera cuando llega un dato válido después de uno roto', () => {
    const { rerender } = render(
      <PowerMeter heroName="Guerrero Tanque" power={{ current: -1, max: 10 }} />,
    )
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()

    rerender(<PowerMeter heroName="Guerrero Tanque" power={{ current: 4, max: 10 }} />)

    expect(meterOf('Guerrero Tanque')).toHaveAttribute('aria-valuenow', '4')
  })

  it('acepta una clase adicional del contenedor', () => {
    render(
      <PowerMeter heroName="Guerrero Tanque" className="w-40" power={{ current: 1, max: 2 }} />,
    )

    expect(screen.getByTestId('power-meter')).toHaveClass('w-40')
  })
})
