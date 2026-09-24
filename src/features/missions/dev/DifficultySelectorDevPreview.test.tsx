import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DifficultySelectorDevPreview } from './DifficultySelectorDevPreview'

describe('DifficultySelectorDevPreview (HU-75.3)', () => {
  it('arranca sin progreso: solo Normal esta libre y nada esta elegido', () => {
    render(<DifficultySelectorDevPreview />)

    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByRole('radio', { name: 'Heroico' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByTestId('elegido')).toHaveTextContent('Nivel elegido: ninguno')
  })

  it('con Normal completada, Heroico queda libre y se puede elegir', async () => {
    const user = userEvent.setup()
    render(<DifficultySelectorDevPreview />)

    await user.click(screen.getByRole('button', { name: 'Normal completada' }))
    await user.click(screen.getByRole('radio', { name: 'Heroico' }))

    expect(screen.getByTestId('elegido')).toHaveTextContent('Nivel elegido: HEROIC')
    expect(screen.getByRole('radio', { name: 'Legendario' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('cambiar de escenario borra la eleccion anterior', async () => {
    const user = userEvent.setup()
    render(<DifficultySelectorDevPreview />)

    await user.click(screen.getByRole('button', { name: 'Normal completada' }))
    await user.click(screen.getByRole('radio', { name: 'Heroico' }))
    await user.click(screen.getByRole('button', { name: 'Sin progreso' }))

    expect(screen.getByTestId('elegido')).toHaveTextContent('Nivel elegido: ninguno')
    expect(screen.getByRole('button', { name: 'Sin progreso' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
