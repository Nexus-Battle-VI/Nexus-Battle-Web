import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SecuritySection } from './SecuritySection'
import { renderWithProviders } from '@/test/render'

describe('SecuritySection', () => {
  it('reutiliza PasswordField: los tres campos nacen ocultos (type=password)', () => {
    renderWithProviders(<SecuritySection changePassword={vi.fn().mockResolvedValue(undefined)} />)

    for (const label of ['Contraseña actual', 'Contraseña nueva', 'Repite la contraseña nueva']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('type', 'password')
    }
  })

  it('integra el TotpEnrollment existente sin reimplementarlo', () => {
    renderWithProviders(<SecuritySection changePassword={vi.fn().mockResolvedValue(undefined)} />)

    expect(screen.getByRole('button', { name: 'Configurar autenticador' })).toBeInTheDocument()
  })

  it('valida en el cliente que la confirmacion coincide, sin llamar al backend', async () => {
    const user = userEvent.setup()
    const changePassword = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<SecuritySection changePassword={changePassword} />)

    await user.type(screen.getByLabelText('Contraseña actual'), 'Actual-1!')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'Nueva-2!')
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'Otra-3!')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no coincide/u)
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('envia solo actual y nueva, confirma tras el backend y limpia los campos', async () => {
    const user = userEvent.setup()
    const changePassword = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<SecuritySection changePassword={changePassword} />)

    await user.type(screen.getByLabelText('Contraseña actual'), 'Actual-1!')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'Nueva-2!')
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'Nueva-2!')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'Actual-1!',
      newPassword: 'Nueva-2!',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada.')
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('')
  })

  it('muestra el mensaje del backend cuando el cambio falla', async () => {
    const user = userEvent.setup()
    const changePassword = vi
      .fn()
      .mockRejectedValue(new Error('La contraseña actual no es correcta.'))
    renderWithProviders(<SecuritySection changePassword={changePassword} />)

    await user.type(screen.getByLabelText('Contraseña actual'), 'mala')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'Nueva-2!')
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'Nueva-2!')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('La contraseña actual no es correcta.')
    })
  })
})
