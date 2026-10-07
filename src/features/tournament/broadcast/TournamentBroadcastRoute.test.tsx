import { cleanup, render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/routes/routes'
import { useSession } from '@/shared/session'
import { createTestQueryClient } from '@/test/render'

const open = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/tournament/T1/broadcast'] })}
      />
    </QueryClientProvider>,
  )
afterEach(() => {
  cleanup()
  useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})

describe('ruta productiva de captura', () => {
  it.each(['PLAYER', 'MODERATOR'])(
    'el rol %s no monta observación ni consulta APIs',
    async (role) => {
      useSession.setState({
        subject: 'qa-player',
        roles: [role],
        accessToken: 'qa-token',
        expiresAt: Date.now() + 60000,
      })
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      open()
      expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Combate capturable' })).not.toBeInTheDocument()
      expect(fetch).not.toHaveBeenCalled()
    },
  )
  it('sin sesión presenta la guarda y no consulta observación', async () => {
    useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    open()
    expect(await screen.findByRole('heading', { name: 'Para continuar' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('admin abre una ventana propia sin navegación general ni widget de chat', async () => {
    useSession.setState({
      subject: 'qa-admin',
      roles: ['ADMINISTRATOR'],
      accessToken: 'qa-token',
      expiresAt: Date.now() + 60000,
    })
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tournamentId: 'T1',
          broadcasterId: null,
          selectedMatchId: null,
          revision: 0,
        }),
      ),
    )
    vi.stubGlobal('fetch', fetch)
    open()
    expect(await screen.findByRole('button', { name: 'Designarme transmisor' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al torneo' })).toHaveAttribute(
      'href',
      '/tournament',
    )
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Abrir.*chat/iu })).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/tournaments/admin/T1/broadcast',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
