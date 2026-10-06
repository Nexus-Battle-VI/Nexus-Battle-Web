import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireAdministrator } from '@/app/RequireAdministrator'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

import { createKnowledge, fetchKnowledge } from './api'
import { KnowledgeAdminPage } from './KnowledgeAdminPage'

vi.mock('./api', () => ({
  fetchKnowledge: vi.fn(),
  createKnowledge: vi.fn(),
  updateKnowledge: vi.fn(),
  deleteKnowledge: vi.fn(),
}))

const entry = {
  id: 'entrada-1',
  intent: 'regla_turno',
  language: 'es',
  priority: 10,
  answer: 'El combate es por turnos.',
  variations: ['cuanto dura un turno'],
  view: null,
}

describe('KnowledgeAdminPage', () => {
  beforeEach(() => {
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    vi.mocked(fetchKnowledge).mockReset()
    vi.mocked(createKnowledge).mockReset()
  })

  it('lista una entrada y crea otra con las preguntas separadas', async () => {
    vi.mocked(fetchKnowledge).mockResolvedValue([entry])
    vi.mocked(createKnowledge).mockResolvedValue({ ...entry, id: 'entrada-2' })
    const user = userEvent.setup()
    renderWithProviders(<KnowledgeAdminPage />)

    expect(await screen.findByRole('heading', { name: 'es: regla_turno' })).toBeInTheDocument()
    expect(screen.getByText('El combate es por turnos.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Intención'), 'modo_mision')
    await user.type(screen.getByLabelText('Respuesta'), 'Una mision bloquea al heroe.')
    await user.type(
      screen.getByLabelText('Preguntas de ejemplo'),
      'que es una mision{enter}rotaciones',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar entrada' }))

    expect(createKnowledge).toHaveBeenCalledWith({
      intent: 'modo_mision',
      language: 'es',
      priority: 1,
      answer: 'Una mision bloquea al heroe.',
      variations: ['que es una mision', 'rotaciones'],
      view: null,
    })
  })

  it('un jugador no entra al diccionario', () => {
    useSession.setState({ roles: ['PLAYER'] })
    renderWithProviders(
      <RequireAdministrator>
        <KnowledgeAdminPage />
      </RequireAdministrator>,
    )
    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  })
})
