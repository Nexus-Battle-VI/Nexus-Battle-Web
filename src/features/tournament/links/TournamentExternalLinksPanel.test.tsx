import { act, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { HttpError } from '@/lib/http'
import type { TournamentLinks, TournamentLinksApi } from './api'
import { TournamentExternalLinksPanel } from './TournamentExternalLinksPanel'
const live = 'https://www.youtube.com/watch?v=abcdefghijk'
const OFFICIAL_YOUTUBE_CHANNEL = 'https://www.youtube.com/@qa-tournament'
const empty = (id = 'T1'): TournamentLinks => ({
  tournamentId: id,
  liveUrl: null,
  youtubeArchiveUrl: null,
  revision: 0,
  updatedAt: null,
})
const saved: TournamentLinks = {
  ...empty(),
  liveUrl: live,
  youtubeArchiveUrl: OFFICIAL_YOUTUBE_CHANNEL,
  revision: 1,
  updatedAt: '2026-10-01T12:00:00Z',
}
const setup = (snapshot = empty(), admin = true) => {
  useSession.setState({
    subject: admin ? 'admin' : 'player',
    roles: [admin ? 'ADMINISTRATOR' : 'PLAYER'],
  })
  const api: TournamentLinksApi = {
    view: vi.fn().mockResolvedValue(snapshot),
    save: vi.fn().mockResolvedValue(saved),
  }
  return { api, ...renderWithProviders(<TournamentExternalLinksPanel id="T1" api={api} />) }
}
afterEach(() => {
  cleanup()
  useSession.setState({ subject: null, roles: [] })
})
describe('HU-82 — publicar y consultar accesos externos', () => {
  it('un guardado tardío no contamina la consulta de otra identidad', async () => {
    const { api, queryClient } = setup(saved)
    let resolve: (value: TournamentLinks) => void = () => undefined
    vi.mocked(api.save).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar enlaces' }))
    vi.mocked(api.view).mockResolvedValue(empty())
    act(() => {
      useSession.setState({ subject: 'player-B', roles: ['PLAYER'] })
    })
    await screen.findByText(/El enlace de la transmisión todavía/u)
    await act(async () => {
      resolve({ ...saved, revision: 2 })
      await Promise.resolve()
    })
    expect(screen.queryByText('Enlaces guardados.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver transmisión' })).not.toBeInTheDocument()
    expect(queryClient.getQueryData(['tournament-links', 'player-B', 'T1'])).toEqual(empty())
    expect(queryClient.getQueryData(['tournament-links', 'admin', 'T1'])).toBeUndefined()
  })
  it('no prellena un canal ni ofrece enlaces vacíos y publica solo tras guardar', async () => {
    const { api } = setup(),
      user = userEvent.setup()
    expect(await screen.findByText(/El enlace de la transmisión todavía/)).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Canal de grabaciones en YouTube')).toHaveValue('')
    await user.type(screen.getByLabelText('Enlace del directo'), live)
    await user.type(
      screen.getByLabelText('Canal de grabaciones en YouTube'),
      OFFICIAL_YOUTUBE_CHANNEL,
    )
    await user.click(screen.getByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByText('Enlaces guardados.')).toBeVisible()
    expect(api.save).toHaveBeenCalledWith('T1', {
      liveUrl: live,
      youtubeArchiveUrl: OFFICIAL_YOUTUBE_CHANNEL,
      expectedRevision: 0,
    })
    const link = screen.getByRole('link', { name: 'Ver transmisión' })
    expect(link).toHaveAttribute('href', live)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Ver grabaciones en YouTube' })).toHaveAttribute(
      'href',
      OFFICIAL_YOUTUBE_CHANNEL,
    )
    expect(screen.getByText(/Un enlace publicado no confirma/)).toBeVisible()
  })
  it('jugador consulta al recargar sin controles de edición ni reproductor', async () => {
    const { api } = setup(saved, false)
    expect(await screen.findByRole('link', { name: 'Ver transmisión' })).toHaveAttribute(
      'href',
      live,
    )
    expect(screen.queryByRole('button', { name: 'Guardar enlaces' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Enlace del directo')).not.toBeInTheDocument()
    expect(document.querySelector('video,iframe')).toBeNull()
    expect(api.save).not.toHaveBeenCalled()
  })
  it('rechazo del servidor explica el motivo y mantiene ambos accesos publicados', async () => {
    const { api } = setup(saved),
      user = userEvent.setup()
    vi.mocked(api.save).mockRejectedValue(
      new HttpError(422, 'El archivo debe ser un canal de YouTube.', {}),
    )
    await user.clear(await screen.findByLabelText('Canal de grabaciones en YouTube'))
    await user.type(
      screen.getByLabelText('Canal de grabaciones en YouTube'),
      'https://twitch.tv/nexus',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo debe ser un canal de YouTube.',
    )
    expect(screen.getByRole('link', { name: 'Ver grabaciones en YouTube' })).toHaveAttribute(
      'href',
      OFFICIAL_YOUTUBE_CHANNEL,
    )
    expect(screen.getByRole('link', { name: 'Ver transmisión' })).toHaveAttribute('href', live)
  })
  it('superadministrador corrige el archivo y puede retirar el enlace del directo', async () => {
    const { api } = setup(saved),
      user = userEvent.setup()
    act(() => {
      useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    })
    vi.mocked(api.save).mockResolvedValue({
      ...saved,
      liveUrl: null,
      youtubeArchiveUrl: `${OFFICIAL_YOUTUBE_CHANNEL}/streams`,
      revision: 2,
    })
    await user.clear(await screen.findByLabelText('Enlace del directo'))
    await user.clear(screen.getByLabelText('Canal de grabaciones en YouTube'))
    await user.type(
      screen.getByLabelText('Canal de grabaciones en YouTube'),
      `${OFFICIAL_YOUTUBE_CHANNEL}/streams`,
    )
    await user.click(screen.getByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByText('Enlaces guardados.')).toBeVisible()
    expect(api.save).toHaveBeenCalledWith('T1', {
      liveUrl: null,
      youtubeArchiveUrl: `${OFFICIAL_YOUTUBE_CHANNEL}/streams`,
      expectedRevision: 1,
    })
    expect(screen.queryByRole('link', { name: 'Ver transmisión' })).not.toBeInTheDocument()
  })
  it('un conflicto recupera los últimos enlaces antes de permitir otra corrección', async () => {
    const { api } = setup(saved),
      user = userEvent.setup()
    await screen.findByLabelText('Enlace del directo')
    vi.mocked(api.save).mockRejectedValue(
      new HttpError(409, 'Otro administrador corrigió los enlaces.', {}),
    )
    vi.mocked(api.view).mockResolvedValue({
      ...saved,
      liveUrl: 'https://twitch.tv/nexus',
      revision: 2,
    })
    await user.click(screen.getByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona cambió los enlaces')
    await waitFor(() => {
      expect(screen.getByLabelText('Enlace del directo')).toHaveValue('https://twitch.tv/nexus')
    })
    expect(api.save).toHaveBeenCalledTimes(1)
  })
  it('una respuesta perdida permite repetir la misma revisión sin duplicar intención', async () => {
    const { api } = setup(saved),
      user = userEvent.setup()
    vi.mocked(api.save)
      .mockRejectedValueOnce(new Error('Respuesta perdida'))
      .mockResolvedValue(saved)
    await user.click(await screen.findByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Respuesta perdida')
    await user.click(screen.getByRole('button', { name: 'Guardar enlaces' }))
    expect(await screen.findByText('Enlaces guardados.')).toBeVisible()
    expect(vi.mocked(api.save).mock.calls[0]).toEqual(vi.mocked(api.save).mock.calls[1])
  })
  it('carga, fallo de consulta y recuperación; datos y avisos se separan por torneo', async () => {
    const { api, rerender } = setup(saved)
    expect(screen.getByText('Consultando enlaces…')).toBeVisible()
    await screen.findByRole('link', { name: 'Ver transmisión' })
    vi.mocked(api.view).mockRejectedValueOnce(new Error('Sin conexión'))
    rerender(<TournamentExternalLinksPanel id="T2" api={api} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar')
    expect(screen.queryByRole('link', { name: 'Ver transmisión' })).not.toBeInTheDocument()
    vi.mocked(api.view).mockResolvedValue(empty('T2'))
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Volver a consultar enlaces' }))
    expect(await screen.findByText(/El enlace de la transmisión todavía/)).toBeVisible()
    expect(api.view).toHaveBeenCalledWith('T2', expect.any(AbortSignal))
  })
  it('sin sesión no consulta la API ni habilita edición', () => {
    const api: TournamentLinksApi = { view: vi.fn(), save: vi.fn() }
    renderWithProviders(<TournamentExternalLinksPanel id="T1" api={api} />)
    expect(screen.getByText(/Inicia sesión/)).toBeVisible()
    expect(api.view).not.toHaveBeenCalled()
    expect(api.save).not.toHaveBeenCalled()
  })
})
