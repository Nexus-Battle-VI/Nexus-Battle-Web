import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/routes/routes'
import { useSession } from '@/shared/session'
import { createTestQueryClient } from '@/test/render'
import { BroadcastPreviewApi } from '@/test/tournament-broadcast'

const open = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/tournament/T1/broadcast'] })}
      />
    </QueryClientProvider>,
  )
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  cleanup()
  useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ruta productiva de captura', () => {
  it.each([1, 2, 3] as const)(
    'captura y cambia entre justas de %i integrante(s) por lado mediante HTTP',
    async (teamSize) => {
      useSession.setState({
        subject: 'qa-admin',
        roles: ['ADMINISTRATOR'],
        accessToken: 'qa-token',
        expiresAt: Date.now() + 60000,
      })
      const api = new BroadcastPreviewApi(teamSize)
      api.state.tournamentId = 'T1'
      api.state.broadcasterId = 'qa-admin'
      for (const snapshot of api.snapshots.values()) snapshot.tournamentId = 'T1'
      const fetch = vi.fn(async (input: string, init?: RequestInit) => {
        const prefix = '/api/v1/tournaments/'
        let result: unknown
        if (input === `${prefix}admin/T1/broadcast`) result = await api.configuration()
        else if (input === `${prefix}T1/broadcast/active`) result = await api.active()
        else if (input === `${prefix}T1/broadcast/view`) result = await api.observe()
        else if (input === `${prefix}T1/broadcast/selection`) {
          if (typeof init?.body !== 'string')
            throw new Error('La selección requiere un cuerpo JSON')
          const body = JSON.parse(init.body) as {
            matchId: string
            expectedRevision: number
          }
          result = await api.select('T1', body.matchId, body.expectedRevision)
        } else throw new Error(`Petición inesperada: ${input}`)
        return new Response(JSON.stringify(result))
      })
      vi.stubGlobal('fetch', fetch)
      const user = userEvent.setup()
      open()
      await screen.findByText('Justa E1')
      expect(screen.getByText('Conectada a Combat')).toBeInTheDocument()
      const frame = screen.getByRole('region', { name: 'Combate capturable' })
      expect(within(frame).getByRole('region', { name: 'Batalla' })).toBeInTheDocument()
      expect(within(frame).getAllByRole('meter', { name: /^Vida de /u })).toHaveLength(teamSize * 2)
      expect(within(frame).getAllByRole('img', { name: /Guerrero|Mago|Pícaro/u })).toHaveLength(
        teamSize * 2,
      )
      expect(within(frame).queryByRole('button')).toBeNull()
      await user.click(screen.getByRole('button', { name: /Mostrar E2/ }))
      await screen.findByText('Justa E2')
      expect(within(frame).getAllByRole('meter', { name: /^Vida de /u })).toHaveLength(teamSize * 2)
      expect(within(frame).getByRole('region', { name: 'Aurora' })).toBeInTheDocument()
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/tournaments/T1/broadcast/selection',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(screen.queryByRole('button', { name: /atacar|habilidad|iniciar combate/i })).toBeNull()
    },
  )
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
