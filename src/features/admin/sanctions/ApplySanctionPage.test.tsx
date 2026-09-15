import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'
import { ApplySanctionPage } from './ApplySanctionPage'
import type { AppliedSanction, ApplySanctionInput } from './api'

const appliedSanction = (overrides: Partial<AppliedSanction> = {}): AppliedSanction => ({
  id: 'sanction-1',
  targetAccountId: 'account-1',
  actorAccountId: 'moderator-1',
  type: 'TEMPORARY_SUSPENSION',
  reason: 'Incumplimiento reiterado',
  createdAt: '2026-09-15T12:00:00.000Z',
  expiresAt: '2026-09-22T12:00:00.000Z',
  appealDeadline: '2026-10-15T12:00:00.000Z',
  ...overrides,
})

const fillReason = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(
    screen.getByRole('textbox', { name: 'Causal de la sanción' }),
    'Incumplimiento reiterado',
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  useSession.setState({ roles: [], accessToken: null, expiresAt: null })
})

describe('ApplySanctionPage', () => {
  it('convierte los días a minutos y muestra solo los datos de la respuesta de Account', async () => {
    const user = userEvent.setup()
    const submit = vi
      .fn<(targetId: string, input: ApplySanctionInput) => Promise<AppliedSanction>>()
      .mockResolvedValue(appliedSanction())
    useSession.setState({ roles: ['MODERATOR'] })

    renderWithProviders(
      <ApplySanctionPage
        initialTarget={{ targetAccountId: 'account-1', displayName: 'MiraSong' }}
        submitSanction={submit}
      />,
    )

    await fillReason(user)
    await user.click(screen.getByRole('radio', { name: /Suspensión temporal/u }))
    await user.type(
      screen.getByRole('spinbutton', { name: 'Duración de la suspensión (días)' }),
      '7',
    )
    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    expect(submit).toHaveBeenCalledWith('account-1', {
      type: 'TEMPORARY_SUSPENSION',
      reason: 'Incumplimiento reiterado',
      suspensionDurationMinutes: 10_080,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Sanción registrada y aplicada')
    expect(screen.getByText('MiraSong')).toBeInTheDocument()
    expect(screen.getByText('moderator-1 (Moderador)')).toBeInTheDocument()
    expect(screen.getByText('Vigente hasta')).toBeInTheDocument()
    expect(screen.getByText('Apelación hasta')).toBeInTheDocument()
    expect(screen.queryByText(/enviada por correo/iu)).not.toBeInTheDocument()
  })

  it('exige causal, tipo y objetivo antes de enviar', async () => {
    const user = userEvent.setup()
    const submit =
      vi.fn<(targetId: string, input: ApplySanctionInput) => Promise<AppliedSanction>>()
    useSession.setState({ roles: ['MODERATOR'] })

    renderWithProviders(<ApplySanctionPage submitSanction={submit} />)

    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    expect(screen.getByText('Indica el ID de la cuenta que se sancionará.')).toBeInTheDocument()
    expect(screen.getByText('La causal es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un tipo de sanción.')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it('oculta el baneo para Moderador y pide confirmación reforzada a Administrador', async () => {
    const user = userEvent.setup()
    const submit = vi
      .fn<(targetId: string, input: ApplySanctionInput) => Promise<AppliedSanction>>()
      .mockResolvedValue(appliedSanction({ type: 'PERMANENT_BAN', expiresAt: null }))
    useSession.setState({ roles: ['MODERATOR'] })

    const view = renderWithProviders(
      <ApplySanctionPage
        initialTarget={{ targetAccountId: 'account-1' }}
        submitSanction={submit}
      />,
    )

    expect(screen.getByRole('radio', { name: /Baneo definitivo/u })).toBeDisabled()
    view.unmount()

    useSession.setState({ roles: ['ADMINISTRATOR'] })
    renderWithProviders(
      <ApplySanctionPage
        initialTarget={{ targetAccountId: 'account-1' }}
        submitSanction={submit}
      />,
    )
    await fillReason(user)
    await user.click(screen.getByRole('radio', { name: /Baneo definitivo/u }))
    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    const dialog = screen.getByRole('region', { name: 'Esta acción es irreversible' })
    expect(within(dialog).getByText('Esta acción es irreversible')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar baneo' }))
    expect(submit).toHaveBeenCalledWith('account-1', {
      type: 'PERMANENT_BAN',
      reason: 'Incumplimiento reiterado',
    })
  })

  it('distingue el rechazo de autorización y no declara que el usuario quedó sin sanción', async () => {
    const user = userEvent.setup()
    const submit = vi
      .fn<(targetId: string, input: ApplySanctionInput) => Promise<AppliedSanction>>()
      .mockRejectedValue(new HttpError(403, 'Tipo de sanción no permitido', null))
    useSession.setState({ roles: ['ADMINISTRATOR'] })

    renderWithProviders(
      <ApplySanctionPage
        initialTarget={{ targetAccountId: 'account-1' }}
        submitSanction={submit}
      />,
    )
    await fillReason(user)
    await user.click(screen.getByRole('radio', { name: /Advertencia/u }))
    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Account rechazó la operación')
    expect(screen.getByRole('alert')).not.toHaveTextContent('El usuario no fue sancionado')
  })
})
