import { act, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'
import { BroadcastCapture, TournamentBroadcastPanel } from './TournamentBroadcastPanel'
import { BroadcastPreviewApi } from '@/test/tournament-broadcast'
import { SpectatorArena } from '@/features/battle-rooms/battle/SpectatorArena'

describe('HU-79/81: recorrido de observación en React', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    useSession.setState({ subject: 'adminA', roles: ['ADMINISTRATOR'] })
  })
  afterEach(() => {
    cleanup()
    act(() => {
      useSession.setState({ subject: null, roles: [] })
    })
    vi.restoreAllMocks()
  })
  it('cambia en la misma superficie y solo presenta estado de Combat, sin controles de combate', async () => {
    const api = new BroadcastPreviewApi()
    const user = userEvent.setup()
    renderWithProviders(<BroadcastCapture id="DEMO" api={api} arena={SpectatorArena} />)
    await screen.findByText('Justa E1')
    const frame = screen.getByRole('region', { name: 'Combate capturable' })
    expect(within(frame).getByRole('region', { name: 'Dragones' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /atacar|habilidad|iniciar combate/i }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mostrar E2/ }))
    await screen.findByText('Justa E2')
    expect(screen.getByRole('region', { name: 'Combate capturable' })).toBe(frame)
    expect(within(frame).queryByRole('region', { name: 'Dragones' })).not.toBeInTheDocument()
    expect(within(frame).getByRole('region', { name: 'Aurora' })).toBeInTheDocument()
  })
  it('desconexión visible, recuperación con turno actualizado y resultado sin cambio automático', async () => {
    const api = new BroadcastPreviewApi(),
      user = userEvent.setup()
    renderWithProviders(<BroadcastCapture id="DEMO" api={api} arena={SpectatorArena} />)
    await screen.findByText('Justa E1')
    api.disconnected = true
    await user.click(screen.getByRole('button', { name: 'Recuperar conexión' }))
    await screen.findByText(/Vista desconectada/)
    api.advance('encounter-01')
    api.disconnected = false
    await user.click(screen.getByRole('button', { name: 'Recuperar conexión' }))
    expect(await screen.findAllByText(/Turno de Nova E1/)).not.toHaveLength(0)
    api.finish()
    await user.click(screen.getByRole('button', { name: 'Recuperar conexión' }))
    await screen.findByText('Ganador: Dragones')
    expect(screen.getByText('Justa E1')).toBeInTheDocument()
  })
  it('solo permite observar al administrador designado y explica la sustitución', async () => {
    const api = new BroadcastPreviewApi()
    api.state.broadcasterId = 'demo-transmisor'
    const observe = vi.spyOn(api, 'observe')
    renderWithProviders(<TournamentBroadcastPanel id="DEMO" api={api} />)
    await screen.findByText(/Transmisor designado: demo-transmisor/)
    expect(observe).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Sustituir al transmisor/ })).toBeInTheDocument()
  })
  it('jugador no carga configuración ni accede al panel de transmisión', () => {
    useSession.setState({ subject: 'player', roles: ['PLAYER'] })
    const api = new BroadcastPreviewApi(),
      configuration = vi.spyOn(api, 'configuration')
    renderWithProviders(<TournamentBroadcastPanel id="DEMO" api={api} />)
    expect(configuration).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Transmisión del torneo' })).not.toBeInTheDocument()
  })
  it('sin designación, el administrador asume la emisión y selecciona la primera justa', async () => {
    const api = new BroadcastPreviewApi(),
      user = userEvent.setup()
    api.state = { tournamentId: 'DEMO', broadcasterId: null, selectedMatchId: null, revision: 0 }
    vi.spyOn(api, 'designate').mockImplementation(() => {
      api.state = { ...api.state, broadcasterId: 'adminA', revision: 1 }
      return api.configuration()
    })
    renderWithProviders(
      <TournamentBroadcastPanel id="DEMO" api={api} captureOnly arena={SpectatorArena} />,
    )
    await user.click(await screen.findByRole('button', { name: 'Designarme transmisor' }))
    await screen.findByText('Selecciona una justa en curso para preparar la captura.')
    expect(screen.getByText('Lista para seleccionar una justa')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mostrar E1/ }))
    await screen.findByText('Justa E1')
    expect(screen.getByText('Conectada a Combat')).toBeInTheDocument()
    expect(api.state.selectedMatchId).toBe('encounter-01')
  })
  it('consulta pendiente, vacío y error tienen mensajes diferentes', async () => {
    const api = new BroadcastPreviewApi()
    api.state.selectedMatchId = null
    api.snapshots.clear()
    const { unmount } = renderWithProviders(
      <BroadcastCapture id="DEMO" api={api} arena={SpectatorArena} />,
    )
    expect(screen.getByText('Conectando con Combat…')).toBeInTheDocument()
    await screen.findByText(/No hay justas en curso para transmitir/)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    unmount()
    api.disconnected = true
    renderWithProviders(<BroadcastCapture id="DEMO" api={api} arena={SpectatorArena} />)
    await screen.findByText('Conexión de prueba interrumpida.')
    expect(screen.getByText(/Vista desconectada/)).toBeInTheDocument()
  })
  it('cambiar torneo elimina la captura anterior antes de cargar la nueva', async () => {
    const old = new BroadcastPreviewApi(),
      next = new BroadcastPreviewApi()
    next.state.tournamentId = 'T2'
    next.state.selectedMatchId = null
    next.snapshots.clear()
    const { rerender } = renderWithProviders(
      <BroadcastCapture id="DEMO" api={old} arena={SpectatorArena} />,
    )
    await screen.findByText('Justa E1')
    rerender(<BroadcastCapture id="T2" api={next} arena={SpectatorArena} />)
    expect(screen.queryByText('Justa E1')).not.toBeInTheDocument()
    await screen.findByText('Selecciona una justa en curso para preparar la captura.')
  })
})
