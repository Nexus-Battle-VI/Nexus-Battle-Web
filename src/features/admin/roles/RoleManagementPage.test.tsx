import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { RoleManagementPage } from './RoleManagementPage'
import type { ManagedAccount } from './api'

const account = (overrides: Partial<ManagedAccount> = {}): ManagedAccount => ({
  id: 'account-1',
  email: 'persona@nexus.test',
  displayName: 'Persona Prueba',
  status: 'ACTIVE',
  roles: ['PLAYER'],
  mfaEnrolled: false,
  ...overrides,
})

const searchForAccount = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/correo de la cuenta/i), 'persona@nexus.test')
  await userEvent.click(screen.getByRole('button', { name: /buscar cuenta/i }))
}

describe('RoleManagementPage', () => {
  it('muestra el rol vigente por precedencia y el estado TOTP', async () => {
    const onSearch = vi.fn().mockResolvedValue(
      account({
        roles: ['PLAYER', 'MODERATOR', 'ADMINISTRATOR'],
        mfaEnrolled: true,
      }),
    )

    renderWithProviders(<RoleManagementPage onSearch={onSearch} />)
    await searchForAccount()

    expect((await screen.findByText('Rol vigente')).parentElement).toHaveTextContent(
      'Administrador',
    )
    expect(screen.getByText('Inscrita')).toBeInTheDocument()
  })

  it('deshabilita ADMINISTRATOR antes de llamar al backend si falta TOTP', async () => {
    const onAssign = vi.fn()
    renderWithProviders(
      <RoleManagementPage onSearch={vi.fn().mockResolvedValue(account())} onAssign={onAssign} />,
    )
    await searchForAccount()

    await userEvent.selectOptions(screen.getByLabelText(/rol a asignar/i), 'ADMINISTRATOR')

    expect(screen.getByRole('button', { name: /asignar rol/i })).toBeDisabled()
    expect(screen.getByText(/Mi Cuenta > Seguridad/i)).toBeInTheDocument()
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('confirma, asigna MODERATOR y vuelve a buscar para refrescar el rol', async () => {
    const initial = account()
    const updated = account({ roles: ['PLAYER', 'MODERATOR'] })
    const onSearch = vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(updated)
    const onAssign = vi.fn().mockResolvedValue(updated)

    renderWithProviders(
      <RoleManagementPage onSearch={onSearch} onAssign={onAssign} confirmAction={() => true} />,
    )
    await searchForAccount()
    await userEvent.click(screen.getByRole('button', { name: /asignar rol/i }))

    await waitFor(() => {
      expect(onAssign).toHaveBeenCalledWith('account-1', 'MODERATOR')
      expect(onSearch).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByText('Rol vigente').parentElement).toHaveTextContent('Moderador')
    expect(screen.getByRole('status')).toHaveTextContent(/se asigno/i)
  })

  it('retira un rol existente y refresca la cuenta', async () => {
    const initial = account({ roles: ['PLAYER', 'MODERATOR'] })
    const updated = account()
    const onSearch = vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(updated)
    const onRevoke = vi.fn().mockResolvedValue(updated)

    renderWithProviders(
      <RoleManagementPage onSearch={onSearch} onRevoke={onRevoke} confirmAction={() => true} />,
    )
    await searchForAccount()
    await userEvent.click(screen.getByRole('button', { name: /retirar moderador/i }))

    await waitFor(() => {
      expect(onRevoke).toHaveBeenCalledWith('account-1', 'MODERATOR')
    })
    expect(screen.getByText('Jugador')).toBeInTheDocument()
  })
})
