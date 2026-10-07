import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireAdministrator } from '@/app/RequireAdministrator'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

import { fetchSupportTickets } from './api'
import { TicketsAdminPage } from './TicketsAdminPage'

vi.mock('./api', () => ({
  fetchSupportTickets: vi.fn(),
}))

describe('TicketsAdminPage', () => {
  beforeEach(() => {
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    vi.mocked(fetchSupportTickets).mockReset()
  })

  it('lista la pregunta redactada, la vista y quién la hizo', async () => {
    vi.mocked(fetchSupportTickets).mockResolvedValue([
      {
        id: 'ticket-1',
        actor: 'player:ana',
        question: 'no entiendo el turno',
        view: '/ecommerce',
        createdAt: '2026-10-07T03:00:00+00:00',
      },
    ])
    renderWithProviders(<TicketsAdminPage />)

    expect(await screen.findByText('no entiendo el turno')).toBeInTheDocument()
    expect(screen.getByText(/player:ana/)).toBeInTheDocument()
    expect(screen.getByText(/\/ecommerce/)).toBeInTheDocument()
    expect(screen.getByText('2026-10-07T03:00:00+00:00')).toBeInTheDocument()
  })

  it('un listado vacío no es un error', async () => {
    vi.mocked(fetchSupportTickets).mockResolvedValue([])
    renderWithProviders(<TicketsAdminPage />)

    expect(await screen.findByText('Todavía no hay tickets.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un jugador no entra al listado', () => {
    useSession.setState({ roles: ['PLAYER'] })
    renderWithProviders(
      <RequireAdministrator>
        <TicketsAdminPage />
      </RequireAdministrator>,
    )

    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  })
})
