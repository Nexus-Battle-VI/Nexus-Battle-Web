import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { StarRatingInput } from './StarRatingInput'

describe('StarRatingInput', () => {
  it('renderiza cinco estrellas como un radiogroup, ninguna marcada sin valor', () => {
    render(<StarRatingInput value={null} onChange={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Calificación' })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
    expect(radios.every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('marca solo la estrella seleccionada', () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: '3 de 5 estrellas' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: '4 de 5 estrellas' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('invoca onChange con el numero de la estrella pulsada', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput value={null} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '5 de 5 estrellas' }))

    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('deshabilitada, ninguna estrella responde', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput value={null} onChange={onChange} disabled />)

    await user.click(screen.getByRole('radio', { name: '2 de 5 estrellas' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: '2 de 5 estrellas' })).toBeDisabled()
  })
})
