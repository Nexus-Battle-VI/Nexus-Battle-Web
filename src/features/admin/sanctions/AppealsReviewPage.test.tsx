import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { AppealsReviewPage } from './AppealsReviewPage'
import type { AppealResponse } from './api'

const PENDING: AppealResponse = {
  id: 'apelacion-1',
  sanctionId: 'sancion-1',
  accountId: 'cuenta-1',
  statement: 'La sancion no corresponde a mi conducta.',
  submittedAt: '2026-10-11T12:00:00.000Z',
  decisionDueAt: '2026-11-01T12:00:00.000Z',
  status: 'SUBMITTED',
  decision: null,
  resolutionNotes: null,
  resolvedByAccountId: null,
  resolvedAt: null,
}

describe('AppealsReviewPage (HU-42, §7.3.2)', () => {
  it('muestra el estado vacio cuando no hay apelaciones pendientes', async () => {
    renderWithProviders(<AppealsReviewPage listAppeals={vi.fn().mockResolvedValue([])} />)

    expect(
      await screen.findByText('No hay apelaciones pendientes de revisión.'),
    ).toBeInTheDocument()
  })

  it('lista una apelacion pendiente y permite resolverla', async () => {
    const resolved: AppealResponse = {
      ...PENDING,
      status: 'RESOLVED',
      decision: 'OVERTURNED',
      resolutionNotes: 'La evidencia desvirtua la causal.',
      resolvedByAccountId: 'admin-1',
      resolvedAt: '2026-10-12T09:00:00.000Z',
    }
    const resolveAppeal = vi.fn().mockResolvedValue(resolved)
    const user = userEvent.setup()

    renderWithProviders(
      <AppealsReviewPage
        listAppeals={vi.fn().mockResolvedValue([PENDING])}
        resolveAppeal={resolveAppeal}
      />,
    )

    expect(await screen.findByText('La sancion no corresponde a mi conducta.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resolver' }))
    await user.click(screen.getByLabelText('Se revierte la sanción'))
    await user.type(
      screen.getByLabelText(/justificación de la decisión/iu),
      'La evidencia desvirtua la causal.',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar decisión' }))

    expect(resolveAppeal).toHaveBeenCalledWith('apelacion-1', {
      decision: 'OVERTURNED',
      notes: 'La evidencia desvirtua la causal.',
    })
    expect(
      await screen.findByText('No hay apelaciones pendientes de revisión.'),
    ).toBeInTheDocument()
  })
})
