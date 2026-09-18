import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SelectableCard } from './SelectableCard'

describe('SelectableCard', () => {
  it('es un role="radio" con aria-checked segun la seleccion', () => {
    render(<SelectableCard selected title="Opción" onSelect={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Opción' })).toHaveAttribute('aria-checked', 'true')
  })

  it('sin seleccionar reporta aria-checked=false', () => {
    render(<SelectableCard selected={false} title="Opción" onSelect={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Opción' })).toHaveAttribute('aria-checked', 'false')
  })

  it('es alcanzable y activable por teclado (Tab + Espacio/Enter, semantica nativa de <button>)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<SelectableCard selected={false} title="Opción" onSelect={onSelect} />)

    await user.tab()
    expect(screen.getByRole('radio', { name: 'Opción' })).toHaveFocus()

    await user.keyboard('{ }')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('muestra la descripcion cuando se provee', () => {
    render(
      <SelectableCard selected title="Opción" description="Detalle breve." onSelect={vi.fn()} />,
    )

    expect(screen.getByText('Detalle breve.')).toBeInTheDocument()
  })
})
