import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeroPowerPanel } from './HeroPowerPanel'

describe('HeroPowerPanel — HU-11', () => {
  it('muestra el valor actual y máximo del héroe como barra accesible', () => {
    render(
      <HeroPowerPanel
        power={{ heroId: 'hero-a', heroName: 'Guerrero Tanque', current: 6, max: 10 }}
        resolution={{ kind: 'SPENT', action: 'Mano de piedra', spent: 4 }}
      />,
    )

    expect(screen.getByText('6/10')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Poder de Guerrero Tanque' })).toHaveAttribute(
      'aria-valuetext',
      '6 de 10 puntos de Poder',
    )
    expect(screen.getByRole('status')).toHaveTextContent('Se descontaron 4 puntos de Poder')
  })

  it('explica el fallback y conserva visible el saldo cuando es insuficiente', () => {
    render(
      <HeroPowerPanel
        power={{ heroId: 'hero-a', heroName: 'Guerrero Tanque', current: 2, max: 10 }}
        resolution={{
          kind: 'INSUFFICIENT',
          action: 'Defensa feroz',
          fallbackAction: 'Ataque básico',
        }}
      />,
    )

    expect(screen.getByText('2/10')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/Ataque básico sin descontar Poder/u)
  })

  it('distingue ataque básico, acción no ejecutada, regeneración y fin de combate', () => {
    const power = { heroId: 'hero-b', heroName: 'Guerrero Armas', current: 8, max: 8 }
    const { rerender } = render(
      <HeroPowerPanel
        power={power}
        resolution={{ kind: 'UNCHANGED', action: 'Ataque básico', reason: 'basic_attack' }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/no tiene costo/u)

    rerender(
      <HeroPowerPanel
        power={power}
        resolution={{ kind: 'UNCHANGED', action: 'Embate sangriento', reason: 'not_executed' }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/no se descontó Poder/u)

    rerender(<HeroPowerPanel power={power} resolution={{ kind: 'REGENERATED', amount: 2 }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/recuperó \+2/u)

    rerender(<HeroPowerPanel power={power} resolution={{ kind: 'RESTORED' }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/restauró por completo/u)
  })

  it('representa un máximo cero sin división inválida', () => {
    render(
      <HeroPowerPanel
        power={{ heroId: 'hero-zero', heroName: 'Sin Poder', current: 0, max: 0 }}
        resolution={{ kind: 'IDLE' }}
      />,
    )

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
