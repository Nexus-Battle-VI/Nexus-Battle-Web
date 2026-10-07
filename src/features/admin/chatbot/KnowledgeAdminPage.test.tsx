import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireAdministrator } from '@/app/RequireAdministrator'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

import { createKnowledge, exportKnowledge, fetchKnowledge, importKnowledge } from './api'
import { KnowledgeAdminPage } from './KnowledgeAdminPage'

vi.mock('./api', () => ({
  fetchKnowledge: vi.fn(),
  createKnowledge: vi.fn(),
  updateKnowledge: vi.fn(),
  deleteKnowledge: vi.fn(),
  exportKnowledge: vi.fn(),
  importKnowledge: vi.fn(),
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
    expect(screen.getByText('cuanto dura un turno')).toBeInTheDocument()
    expect(screen.getByText(/Prioridad 10/)).toBeInTheDocument()

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

  it('importa un documento y avisa cuántas entradas eran nuevas', async () => {
    vi.mocked(fetchKnowledge).mockResolvedValue([])
    vi.mocked(importKnowledge).mockResolvedValue({ created: 1, skipped: 0, reinforced: 4 })
    vi.mocked(exportKnowledge).mockResolvedValue({ schemaVersion: 1, entries: [] })
    const user = userEvent.setup()
    renderWithProviders(<KnowledgeAdminPage />)
    expect(await screen.findByText('Todavía no hay entradas.')).toBeInTheDocument()

    const file = new File([JSON.stringify({ schemaVersion: 1, entries: [] })], 'diccionario.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('Importar'), file)
    expect(importKnowledge).toHaveBeenCalledWith({ schemaVersion: 1, entries: [] })
    expect(await screen.findByText(/Entradas nuevas: 1/)).toBeInTheDocument()
    expect(screen.getByText(/Frases añadidas: 4/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(exportKnowledge).toHaveBeenCalledOnce()
  })
})
