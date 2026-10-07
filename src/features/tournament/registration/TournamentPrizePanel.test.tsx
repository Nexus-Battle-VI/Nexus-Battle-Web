import { screen, waitFor, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { TournamentPrizePanel } from './TournamentPrizePanel'
import type { PrizeApi, PrizeView } from './prizeApi'
const fixture = (): PrizeView => ({
  configuration: {
    operationId: 'approved',
    approvedBy: 'admin',
    approvedAt: '2026-10-01T12:00:00Z',
    allocations: [
      { memberIndex: 0, credits: '501', epicProductId: 'epic-test' },
      { memberIndex: 1, credits: '499', epicProductId: null },
    ],
  },
  champion: {
    teamId: 'team-1',
    memberIds: ['p1', 'p2'],
    heroes: [
      { playerId: 'p1', heroId: 'h1' },
      { playerId: 'p2', heroId: 'h2' },
    ],
    finalEncounterId: 'T1:Final',
    finalRoomId: 'room-Final',
    declaredAt: '2026-10-01T12:00:00Z',
  },
  delivery: null,
})
const partial = (): PrizeView => ({
  ...fixture(),
  delivery: {
    requestedAt: '2026-10-01T12:01:00Z',
    requestedBy: 'admin',
    status: 'PARTIAL',
    lines: [
      {
        operationId: 'credit1',
        playerId: 'p1',
        heroId: 'h1',
        kind: 'CREDITS',
        amount: '501',
        productId: null,
        status: 'DELIVERED',
        receiptId: 'r1',
        deliveredAt: '2026-10-01T12:01:00Z',
        lastError: null,
      },
      {
        operationId: 'epic1',
        playerId: 'p1',
        heroId: 'h1',
        kind: 'EPIC',
        amount: null,
        productId: 'epic-test',
        status: 'PENDING',
        receiptId: null,
        deliveredAt: null,
        lastError: 'PRIZE_DESTINATION_UNAVAILABLE',
      },
    ],
  },
})
describe('HU-86: premio y recuperación', () => {
  beforeEach(() => {
    useSession.setState({ subject: 'admin', roles: ['ADMINISTRATOR'] })
  })
  afterEach(() => {
    cleanup()
    useSession.setState({ subject: null, roles: [] })
  })
  const apiFor = (initial: PrizeView): PrizeApi => ({
    view: vi.fn().mockResolvedValue(initial),
    approve: vi.fn(),
    deliver: vi.fn(),
  })
  it('sin campeón/configuración no permite entregar; jugador solo consulta', async () => {
    useSession.setState({ subject: 'p1', roles: ['PLAYER'] })
    const api = apiFor({ configuration: null, champion: null, delivery: null })
    renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    expect(await screen.findByText(/El premio se entregará cuando/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Entregar premio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar premio' })).not.toBeInTheDocument()
    expect(api.deliver).not.toHaveBeenCalled()
  })
  it('aprobar especifica el reparto y reintenta con el mismo ID tras respuesta perdida', async () => {
    const api = apiFor({ configuration: null, champion: null, delivery: null }),
      user = userEvent.setup()
    vi.mocked(api.approve)
      .mockRejectedValueOnce(new Error('Respuesta perdida'))
      .mockResolvedValueOnce({ ...fixture(), champion: null })
    renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    await screen.findByText(/No hay premio aprobado/)
    await user.type(screen.getByRole('textbox', { name: 'Créditos del integrante 1' }), '501')
    await user.type(screen.getByRole('textbox', { name: 'Créditos del integrante 2' }), '499')
    await user.type(screen.getByLabelText('Código de épica del integrante 1'), 'epic-test')
    await user.click(screen.getByRole('button', { name: 'Aprobar premio' }))
    expect(await screen.findByText('Respuesta perdida')).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Aprobar premio' })).toBeEnabled(),
    )
    await user.click(screen.getByRole('button', { name: 'Aprobar premio' }))
    expect(await screen.findByText('Premio aprobado')).toBeVisible()
    expect(vi.mocked(api.approve).mock.calls[0]![1]).toEqual(
      vi.mocked(api.approve).mock.calls[1]![1],
    )
    expect(vi.mocked(api.approve).mock.calls[0]![1].allocations).toEqual(
      fixture().configuration!.allocations,
    )
    expect(screen.queryByRole('button', { name: 'Entregar premio' })).not.toBeInTheDocument()
  })
  it('muestra entrega parcial, conserva recibos y reintenta hasta completar', async () => {
    const initial = partial(),
      api = apiFor(initial),
      user = userEvent.setup()
    const completed = {
      ...initial,
      delivery: {
        ...initial.delivery!,
        status: 'COMPLETED' as const,
        lines: initial.delivery!.lines.map((l) => ({
          ...l,
          status: 'DELIVERED' as const,
          receiptId: l.receiptId ?? 'r2',
          lastError: null,
        })),
      },
    }
    vi.mocked(api.deliver).mockResolvedValue(completed)
    renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    expect(await screen.findByText('Premio parcialmente entregado')).toBeVisible()
    expect(screen.getByText('Comprobante: r1')).toBeVisible()
    expect(screen.getByText('Épica epic-test · Pendiente')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reintentar pendientes' }))
    expect(await screen.findByText('Premio completado')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Reintentar pendientes' })).not.toBeInTheDocument()
    expect(api.deliver).toHaveBeenCalledWith('T1')
  })
  it('cambio de torneo o sesión no muestra premio del contexto anterior', async () => {
    const api: PrizeApi = {
      ...apiFor(fixture()),
      view: vi.fn((id) =>
        Promise.resolve(
          id === 'T1' ? fixture() : { configuration: null, champion: null, delivery: null },
        ),
      ),
    }
    const { rerender } = renderWithProviders(<TournamentPrizePanel key="T1" id="T1" api={api} />)
    expect(await screen.findByText(/Campeón confirmado/)).toBeVisible()
    rerender(<TournamentPrizePanel key="T2" id="T2" api={api} />)
    expect(await screen.findByText(/El premio se entregará cuando/)).toBeVisible()
    expect(screen.queryByText(/team-1/)).not.toBeInTheDocument()
    act(() => {
      useSession.setState({ subject: 'p2', roles: ['PLAYER'] })
    })
    await waitFor(() => {
      expect(api.view).toHaveBeenCalledTimes(3)
    })
  })
  it('error de consulta ofrece recuperación sin permitir entrega', async () => {
    const api = apiFor(fixture())
    vi.mocked(api.view).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(fixture())
    renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    expect(await screen.findByRole('button', { name: 'Volver a consultar premio' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Entregar premio' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver a consultar premio' }))
    expect(await screen.findByText('Premio listo para entregar.')).toBeVisible()
  })
  it('un reparto incierto permanece fijo al desmontar y reintenta el mismo propósito', async () => {
    const api = apiFor({ configuration: null, champion: null, delivery: null })
    vi.mocked(api.approve)
      .mockRejectedValueOnce(new Error('Respuesta perdida'))
      .mockResolvedValueOnce({ ...fixture(), champion: null })
    const user = userEvent.setup()
    const first = renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    await user.type(
      await screen.findByRole('textbox', { name: 'Créditos del integrante 1' }),
      '501',
    )
    await user.type(screen.getByRole('textbox', { name: 'Créditos del integrante 2' }), '499')
    await user.type(screen.getByLabelText('Código de épica del integrante 1'), 'epic-test')
    await user.click(screen.getByRole('button', { name: 'Aprobar premio' }))
    await screen.findByText('Respuesta perdida')
    expect(screen.getByRole('textbox', { name: 'Créditos del integrante 1' })).toBeDisabled()
    const command = vi.mocked(api.approve).mock.calls[0]![1]
    first.unmount()
    renderWithProviders(<TournamentPrizePanel id="T1" api={api} />)
    expect(await screen.findByRole('textbox', { name: 'Créditos del integrante 1' })).toHaveValue(
      '501',
    )
    expect(screen.getByRole('textbox', { name: 'Créditos del integrante 1' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Aprobar premio' }))
    expect(await screen.findByText('Premio aprobado')).toBeVisible()
    expect(vi.mocked(api.approve).mock.calls[1]![1]).toEqual(command)
  })
  it('solo invalida saldo e inventario por recibos confirmados de esta cuenta', async () => {
    useSession.setState({ subject: 'p1', roles: ['PLAYER'] })
    const initial = partial()
    const pending = {
      ...initial,
      delivery: {
        ...initial.delivery!,
        status: 'PENDING' as const,
        lines: initial.delivery!.lines.map((l) => ({
          ...l,
          status: 'PENDING' as const,
          receiptId: null,
        })),
      },
    }
    const { queryClient } = renderWithProviders(
      <TournamentPrizePanel id="T1" api={apiFor(pending)} />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await screen.findByText('Premio pendiente')
    expect(invalidate).not.toHaveBeenCalled()
    act(() => {
      queryClient.setQueryData(['tournament-prize', 'p1', 'T1'], initial)
    })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wallet', 'me'] })
    })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['inventory', 'me'] })
    const completed = {
      ...initial,
      delivery: {
        ...initial.delivery!,
        status: 'COMPLETED' as const,
        lines: initial.delivery!.lines.map((l) => ({
          ...l,
          status: 'DELIVERED' as const,
          receiptId: l.receiptId ?? 'epic-receipt',
        })),
      },
    }
    act(() => {
      queryClient.setQueryData(['tournament-prize', 'p1', 'T1'], completed)
    })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['inventory', 'me'] })
    })
    const count = invalidate.mock.calls.length
    act(() => {
      queryClient.setQueryData(['tournament-prize', 'p1', 'T1'], structuredClone(completed))
    })
    expect(invalidate).toHaveBeenCalledTimes(count)
  })
  it('un conflicto de destino necesita revisión y no ofrece repetirlo como pendiente normal', async () => {
    const conflicted = partial()
    conflicted.delivery!.lines[1]!.lastError = 'PRIZE_DESTINATION_CONFLICT'
    renderWithProviders(<TournamentPrizePanel id="T1" api={apiFor(conflicted)} />)
    expect(await screen.findByText(/requiere revisión administrativa/u)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Reintentar pendientes' })).not.toBeInTheDocument()
  })
})
