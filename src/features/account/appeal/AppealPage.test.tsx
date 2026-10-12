import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HttpError } from '@/lib/http'
import { useAppealSession } from '@/shared/appealSession'
import { renderWithProviders } from '@/test/render'
import { AppealPage } from './AppealPage'
import type { AppealResponse } from '@/features/admin/sanctions/api'

const APPEAL: AppealResponse = {
  id: 'apelacion-1',
  sanctionId: 'sancion-1',
  accountId: 'cuenta-1',
  statement: 'Justificacion de prueba.',
  submittedAt: '2026-10-11T12:00:00.000Z',
  decisionDueAt: '2026-11-01T12:00:00.000Z',
  status: 'SUBMITTED',
  decision: null,
  resolutionNotes: null,
  resolvedByAccountId: null,
  resolvedAt: null,
}

afterEach(() => {
  useAppealSession.getState().clear()
})

describe('AppealPage (HU-42, §6 "identidad restringida")', () => {
  it('rechaza credenciales invalidas sin distinguir el motivo exacto', async () => {
    const authenticate = vi.fn().mockRejectedValue(new HttpError(401, 'no autorizado', {}))
    const user = userEvent.setup()

    renderWithProviders(<AppealPage authenticate={authenticate} />)

    await user.type(screen.getByLabelText(/correo o apodo/iu), 'jugador@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo, apodo o contraseña incorrectos.',
    )
  })

  it('autentica, lista las apelaciones propias y permite presentar una nueva', async () => {
    const authenticate = vi.fn().mockResolvedValue({ appealToken: 'token-123', expiresIn: 1_800 })
    const listAppeals = vi.fn().mockResolvedValue([APPEAL])
    const submit = vi.fn().mockResolvedValue({ ...APPEAL, id: 'apelacion-2' })
    const user = userEvent.setup()

    renderWithProviders(
      <AppealPage authenticate={authenticate} listAppeals={listAppeals} submit={submit} />,
    )

    await user.type(screen.getByLabelText(/correo o apodo/iu), 'jugador@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123!')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(authenticate).toHaveBeenCalledWith({
      identifier: 'jugador@nexus.test',
      password: 'Secreta123!',
    })
    expect(useAppealSession.getState().appealToken).toBe('token-123')

    expect(await screen.findByText('Sanción sancion-1')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/referencia de la sanción/iu), 'sancion-2')
    await user.type(screen.getByLabelText(/justificación/iu), 'Nueva justificacion.')
    await user.click(screen.getByRole('button', { name: 'Presentar apelación' }))

    expect(submit).toHaveBeenCalledWith({
      sanctionId: 'sancion-2',
      statement: 'Nueva justificacion.',
    })
    expect(
      await screen.findByText('Apelación presentada. Referencia: apelacion-2.'),
    ).toBeInTheDocument()
  })
})
