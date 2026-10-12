import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'
import * as api from './api'
import { SanctionsModerationPage } from './SanctionsModerationPage'
import type { SanctionResponse } from './api'

afterEach(() => {
  vi.restoreAllMocks()
  useSession.setState({ roles: [] })
})

describe('SanctionsModerationPage (HU-42, superficie limitada de moderacion)', () => {
  it('pide el id de la cuenta antes de mostrar el formulario de sancion', () => {
    useSession.setState({ roles: ['PLAYER', 'MODERATOR'] })
    renderWithProviders(<SanctionsModerationPage />)

    expect(screen.queryByRole('button', { name: 'Revisar' })).not.toBeInTheDocument()
  })

  it('Moderador no ve el enlace a la busqueda completa de cuentas (no tiene acceso a esa pantalla)', () => {
    useSession.setState({ roles: ['PLAYER', 'MODERATOR'] })
    renderWithProviders(<SanctionsModerationPage />)

    expect(screen.queryByRole('link', { name: 'Administrar usuarios' })).not.toBeInTheDocument()
  })

  it('Administrador ve un enlace a la busqueda completa de cuentas por apodo o correo', () => {
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })
    renderWithProviders(<SanctionsModerationPage />)

    const link = screen.getByRole('link', { name: 'Administrar usuarios' })
    expect(link).toHaveAttribute('href', '/account/admin-users')
  })

  it('con un id valido, muestra el formulario y aplica la sancion', async () => {
    useSession.setState({ roles: ['PLAYER', 'MODERATOR'] })

    const sanction: SanctionResponse = {
      id: 'sancion-1',
      targetAccountId: 'cuenta-objetivo',
      actorAccountId: 'actor-1',
      type: 'WARNING',
      reason: 'Lenguaje ofensivo',
      reasonCode: 'OFFENSIVE_LANGUAGE',
      createdAt: '2026-10-11T12:00:00.000Z',
      expiresAt: null,
      appealDeadline: '2026-11-10T12:00:00.000Z',
    }
    vi.spyOn(api, 'applySanction').mockResolvedValue(sanction)

    const user = userEvent.setup()
    renderWithProviders(<SanctionsModerationPage />)

    await user.type(screen.getByLabelText(/id de la cuenta/iu), 'cuenta-objetivo')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Sancionar cuenta cuenta-objetivo')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^causal/iu), 'OFFENSIVE_LANGUAGE')
    await user.selectOptions(screen.getByLabelText(/^tipo de sanción/iu), 'WARNING')
    await user.type(screen.getByLabelText(/^motivo/iu), 'Lenguaje ofensivo')
    await user.click(screen.getByRole('button', { name: 'Revisar' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    expect(api.applySanction).toHaveBeenCalledWith('cuenta-objetivo', {
      type: 'WARNING',
      reasonCode: 'OFFENSIVE_LANGUAGE',
      reason: 'Lenguaje ofensivo',
    })
    expect(await screen.findByText(/se aplicó: advertencia/iu)).toBeInTheDocument()
  })
})
