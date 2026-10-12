import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { ApplySanctionForm } from './ApplySanctionForm'
import type { SanctionResponse } from './api'

const SANCTION: SanctionResponse = {
  id: 'sancion-1',
  targetAccountId: 'target-1',
  actorAccountId: 'actor-1',
  type: 'TEMPORARY_SUSPENSION',
  reason: 'Lenguaje ofensivo reiterado',
  reasonCode: 'HARASSMENT',
  createdAt: '2026-10-11T12:00:00.000Z',
  expiresAt: '2026-10-12T12:00:00.000Z',
  appealDeadline: '2026-11-10T12:00:00.000Z',
}

const fillBaseForm = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.selectOptions(screen.getByLabelText(/^causal/iu), 'HARASSMENT')
  await user.selectOptions(screen.getByLabelText(/^tipo de sanción/iu), 'TEMPORARY_SUSPENSION')
  await user.type(screen.getByLabelText(/^duración/iu), '60')
  await user.type(screen.getByLabelText(/^motivo/iu), 'Lenguaje ofensivo reiterado')
}

describe('ApplySanctionForm (HU-42)', () => {
  it('oculta el baneo definitivo para un Moderador', () => {
    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        actorRoles={['PLAYER', 'MODERATOR']}
        onApplied={vi.fn()}
      />,
    )

    const typeOptions = screen.getByLabelText(/^tipo de sanción/iu)
    expect(within(typeOptions).queryByText('Baneo definitivo')).not.toBeInTheDocument()
  })

  it('muestra el baneo definitivo para un Administrador', () => {
    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        actorRoles={['PLAYER', 'ADMINISTRATOR']}
        onApplied={vi.fn()}
      />,
    )

    expect(screen.getByText('Baneo definitivo')).toBeInTheDocument()
  })

  it('exige causal, tipo y motivo antes de avanzar a revisar', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        actorRoles={['PLAYER', 'ADMINISTRATOR']}
        onApplied={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Revisar' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona la causal y el tipo de sanción.',
    )
  })

  it('exige una duracion valida para una suspension temporal', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        actorRoles={['PLAYER', 'ADMINISTRATOR']}
        onApplied={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText(/^causal/iu), 'HARASSMENT')
    await user.selectOptions(screen.getByLabelText(/^tipo de sanción/iu), 'TEMPORARY_SUSPENSION')
    await user.type(screen.getByLabelText(/^motivo/iu), 'Motivo de prueba')
    await user.click(screen.getByRole('button', { name: 'Revisar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Indica una duración válida en minutos.')
  })

  it('una suspension temporal pasa a revision y aplica tras confirmar', async () => {
    const apply = vi.fn().mockResolvedValue(SANCTION)
    const onApplied = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        targetLabel="Jugador de prueba"
        actorRoles={['PLAYER', 'ADMINISTRATOR']}
        apply={apply}
        onApplied={onApplied}
      />,
    )

    await fillBaseForm(user)
    await user.click(screen.getByRole('button', { name: 'Revisar' }))

    expect(screen.getByText('Jugador de prueba')).toBeInTheDocument()
    expect(screen.getByText('Suspensión temporal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aplicar sanción' }))

    expect(apply).toHaveBeenCalledWith('target-1', {
      type: 'TEMPORARY_SUSPENSION',
      reasonCode: 'HARASSMENT',
      reason: 'Lenguaje ofensivo reiterado',
      suspensionDurationMinutes: 60,
    })
    await screen.findByText('Jugador de prueba')
    expect(onApplied).toHaveBeenCalledWith(SANCTION)
  })

  it('un baneo definitivo exige la casilla de confirmacion adicional', async () => {
    const apply = vi.fn().mockResolvedValue({ ...SANCTION, type: 'PERMANENT_BAN', expiresAt: null })
    const user = userEvent.setup()

    renderWithProviders(
      <ApplySanctionForm
        targetAccountId="target-1"
        actorRoles={['PLAYER', 'ADMINISTRATOR']}
        apply={apply}
        onApplied={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText(/^causal/iu), 'FRAUD_OR_MANIPULATION')
    await user.selectOptions(screen.getByLabelText(/^tipo de sanción/iu), 'PERMANENT_BAN')
    await user.type(screen.getByLabelText(/^motivo/iu), 'Fraude confirmado')
    await user.click(screen.getByRole('button', { name: 'Revisar' }))

    const confirmButton = screen.getByRole('button', { name: 'Aplicar sanción' })
    expect(confirmButton).toBeDisabled()

    await user.click(
      screen.getByText('Confirmo que entiendo que el baneo definitivo es permanente.'),
    )
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(apply).toHaveBeenCalledWith('target-1', {
      type: 'PERMANENT_BAN',
      reasonCode: 'FRAUD_OR_MANIPULATION',
      reason: 'Fraude confirmado',
    })
  })
})
