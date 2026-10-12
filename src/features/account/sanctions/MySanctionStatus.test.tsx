import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { MySanctionStatus } from './MySanctionStatus'
import type { MySanctionStatusResponse } from './api'

const SUSPENDED: MySanctionStatusResponse = {
  hasActiveSanctions: true,
  sanctions: [
    {
      id: 'sancion-1',
      targetAccountId: 'target-1',
      actorAccountId: 'actor-1',
      type: 'TEMPORARY_SUSPENSION',
      reason: 'Lenguaje ofensivo reiterado',
      reasonCode: 'HARASSMENT',
      createdAt: '2026-10-11T12:00:00.000Z',
      expiresAt: '2026-10-12T12:00:00.000Z',
      appealDeadline: '2026-11-10T12:00:00.000Z',
    },
  ],
  remainingSeconds: 3_600,
}

const NONE: MySanctionStatusResponse = { hasActiveSanctions: false, sanctions: [], remainingSeconds: null }

describe('MySanctionStatus (HU-42, §7.3.2)', () => {
  it('no muestra nada cuando la cuenta no tiene sanciones activas', async () => {
    const fetchStatus = vi.fn().mockResolvedValue(NONE)
    renderWithProviders(<MySanctionStatus fetchStatus={fetchStatus} />)

    await vi.waitFor(() => {
      expect(fetchStatus).toHaveBeenCalled()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el tipo, el motivo, el tiempo restante y el enlace para apelar', async () => {
    const fetchStatus = vi.fn().mockResolvedValue(SUSPENDED)
    renderWithProviders(<MySanctionStatus fetchStatus={fetchStatus} />)

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Tu cuenta está suspendida temporalmente')
    expect(banner).toHaveTextContent('Lenguaje ofensivo reiterado')
    expect(banner).toHaveTextContent('60 minutos de suspensión')
    expect(banner).toHaveTextContent('sancion-1')
    expect(screen.getByRole('link', { name: 'Apelar esta sanción' })).toHaveAttribute(
      'href',
      '/appeal',
    )
  })
})
