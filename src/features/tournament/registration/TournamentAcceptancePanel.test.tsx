import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import {
  CALENDAR_ID,
  CALENDAR_SUBJECT,
  calendarMatchFixture,
  acceptanceReceiptFixture,
  absenceFixture,
} from '@/features/tournament/dev/calendarFixtures'
import type { MatchDetail } from './encounterApi'
import type {
  EncounterAdminApi,
  EncounterAdminReceipt,
  MatchAcceptanceApi,
} from './encounterAdminApi'
import { TournamentAcceptancePanel } from './TournamentAcceptancePanel'
import { TournamentEncounterAdminPanel } from './TournamentEncounterAdminPanel'
import { TournamentEncountersPanel } from './TournamentEncountersPanel'
import { sampleMatches, useEncounterClock } from './encounterClock'
import { AbsenceResolution, MatchSchedule } from './MatchSchedule'
import { TournamentRegistrationPage } from './TournamentRegistrationPage'
import { dateLabel } from './presentation'
import {
  createRegistrationPreviewApis,
  DEV_REGISTRATION_TOURNAMENT,
} from '@/features/tournament/dev/registrationFixtures'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  sessionStorage.clear()
  onlineManager.setOnline(true)
})
const setup = (
  match = calendarMatchFixture(),
  accept = vi.fn<MatchAcceptanceApi['accept']>().mockResolvedValue(acceptanceReceiptFixture()),
) => {
  const list = vi.fn().mockResolvedValue([match])
  renderWithProviders(
    <TournamentAcceptancePanel
      id={CALENDAR_ID}
      subject={CALENDAR_SUBJECT}
      encounters={{ list, detail: vi.fn() }}
      api={{ accept }}
    />,
  )
  return { list, accept }
}
describe('aceptación personal · contrato v3 y reloj del servidor', () => {
  it('la entrada automática espera cinco segundos y navega solo a la sala de la aceptación personal', async () => {
    const timer = vi.spyOn(window, 'setTimeout')
    const LocationProbe = () => {
      const location = useLocation()
      return <output aria-label="Destino personal">{location.pathname}</output>
    }
    const match = calendarMatchFixture({
      combatRoomId: 'own-personal-room',
      myAcceptance: acceptanceReceiptFixture(),
      acceptanceStatus: 'CLOSED',
      operationalStatus: 'IN_BATTLE',
    })
    renderWithProviders(
      <>
        <TournamentAcceptancePanel
          id={CALENDAR_ID}
          subject={CALENDAR_SUBJECT}
          encounters={{ list: () => Promise.resolve([match]), detail: vi.fn() }}
        />
        <LocationProbe />
      </>,
    )
    expect(await screen.findByRole('link', { name: 'Ir a batalla' })).toHaveAttribute(
      'href',
      '/play/rooms/own-personal-room/battle',
    )
    expect(screen.getByLabelText('Destino personal')).toHaveTextContent(/^\/$/u)
    const callback = timer.mock.calls.find(([, delay]) => delay === 5000)?.[0]
    expect(typeof callback).toBe('function')
    act(() => {
      ;(callback as () => void)()
    })
    expect(screen.getByLabelText('Destino personal')).toHaveTextContent(
      '/play/rooms/own-personal-room/battle',
    )
  })
  it('espera al rival real de la otra llave sin prometer una hora ni permitir aceptar por anticipado', async () => {
    const own = calendarMatchFixture().registeredTeams![0]!
    const pending = calendarMatchFixture({
      matchId: 'E5',
      bracketLabel: 'E5',
      round: 2,
      acceptanceStatus: 'SCHEDULED',
      registeredTeams: [null, own],
      sources: [
        { kind: 'WINNER', matchId: 'E2' },
        { kind: 'WINNER', matchId: 'E1' },
      ],
    })
    const dependency = calendarMatchFixture({
      matchId: 'E2',
      bracketLabel: 'E2',
      registeredTeams: [
        { ...own, teamId: 'other-A', name: 'Dabji', memberIds: ['Dabji'] },
        { ...own, teamId: 'other-B', name: 'jose_mora0905', memberIds: ['jose_mora0905'] },
      ],
    })
    renderWithProviders(
      <TournamentAcceptancePanel
        id={CALENDAR_ID}
        subject={CALENDAR_SUBJECT}
        encounters={{ list: () => Promise.resolve([dependency, pending]), detail: vi.fn() }}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Esperando rival' })).toBeVisible()
    expect(screen.getByText('Tu rival será el ganador de Dabji vs. jose_mora0905.')).toBeVisible()
    expect(screen.getByText('Definiendo rival').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.queryByText('Acepta antes de')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar batalla' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a batalla' })).not.toBeInTheDocument()
  })
  it('una sala conocida y un recibo de otra persona no habilitan la entrada a batalla', async () => {
    setup(
      calendarMatchFixture({
        combatRoomId: 'another-room',
        myAcceptance: { ...acceptanceReceiptFixture(), subject: 'another-player' },
      }),
    )
    expect(await screen.findByRole('button', { name: 'Aceptar batalla' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Ir a batalla' })).not.toBeInTheDocument()
  })
  it('un combate finalizado sin ganador confirmado sigue esperando la comprobación del servidor', async () => {
    setup(
      calendarMatchFixture({
        status: 'FINISHED',
        acceptanceStatus: 'CLOSED',
        operationalStatus: 'RESOLUTION_PENDING',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Confirmando resultado' })).toBeVisible()
    expect(screen.queryByText('¡Victoria!')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar batalla' })).not.toBeInTheDocument()
  })
  it('un resultado confirmado muestra la victoria personal sin proclamar un campeón del torneo', async () => {
    setup(
      calendarMatchFixture({
        status: 'FINISHED',
        acceptanceStatus: 'RESOLVED',
        winnerTeamId: 'qa-team-0',
        combatRoomId: 'own-finished-room',
        myAcceptance: acceptanceReceiptFixture(),
      }),
    )
    expect(await screen.findByRole('heading', { name: '¡Victoria!' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ver resultado' })).toHaveAttribute(
      'href',
      '/play/rooms/own-finished-room/battle',
    )
    expect(
      screen.getByText('Ganaste esta batalla. Consulta tu siguiente paso en las llaves.'),
    ).toBeVisible()
    expect(screen.queryByText(/Campeón confirmado/u)).not.toBeInTheDocument()
  })
  it('solo envía el intento de la persona; un doble click no duplica la solicitud ni incrementa conteos', async () => {
    let complete: ((receipt: ReturnType<typeof acceptanceReceiptFixture>) => void) | undefined
    const accept = vi.fn<MatchAcceptanceApi['accept']>().mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    setup(calendarMatchFixture(), accept)
    const button = await screen.findByRole('button', { name: 'Aceptar batalla' })
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith(CALENDAR_ID, 'E1', expect.any(String))
    expect(screen.getByText('2 / 3 listos')).toBeVisible()
    expect(screen.getByText('3 / 3 listos')).toBeVisible()
    expect(
      screen.queryByText(
        '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.',
      ),
    ).not.toBeInTheDocument()
    await act(() => {
      complete?.(acceptanceReceiptFixture())
      return Promise.resolve()
    })
    expect(
      await screen.findByText(
        '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Aceptar batalla' })).not.toBeInTheDocument()
    expect(screen.getByText('2 / 3 listos')).toBeVisible()
  })
  it.each([
    ['apertura exacta', '2026-10-07T19:00:00Z', true],
    ['un milisegundo antes de abrir', '2026-10-07T18:59:59.999Z', false],
    ['cierre exacto', '2026-10-07T19:02:00Z', false],
    ['sin reloj válido', 'no-es-una-fecha', false],
  ])(
    '%s: habilitación según el reloj recibido aunque el reloj del cliente esté desfasado',
    async (_, serverNow, enabled) => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2037-01-01T00:00:00Z'))
      vi.spyOn(performance, 'now').mockReturnValue(100)
      const { accept } = setup(calendarMatchFixture({ serverNow }))
      const button = await screen.findByRole('button', { name: 'Aceptar batalla' })
      await waitFor(() => {
        if (enabled) expect(button).toBeEnabled()
        else expect(button).toBeDisabled()
      })
      if (!enabled) {
        fireEvent.click(button)
        expect(accept).not.toHaveBeenCalled()
      }
    },
  )
  it('el contador usa el tiempo monotónico y se detiene en cero sin decidir un ganador', () => {
    vi.useFakeTimers()
    let monotonic = 10
    vi.spyOn(performance, 'now').mockImplementation(() => monotonic)
    const sample = sampleMatches([
      calendarMatchFixture({ serverNow: '2026-10-07T19:01:59.999Z' }),
    ])[0]!
    const { result } = renderHook(() => useEncounterClock(sample.displayClock))
    expect(result.current.within(sample)).toBe(true)
    monotonic += 1
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.within(sample)).toBe(false)
    expect(result.current.remaining(sample.acceptanceClosesAt)).toBe(0)
    expect(result.current.format(0)).toBe('0:00')
  })
  it('una cuenta fuera del roster no obtiene una acción para aceptar por otro', async () => {
    const { accept } = setup(calendarMatchFixture({ registeredTeams: [] }))
    expect(await screen.findByText(/Todavía no hay una próxima justa/u)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Aceptar batalla/u })).not.toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })
  it('revalida el límite al hacer click aunque todavía no haya ocurrido el siguiente tick visual', async () => {
    let monotonic = 100
    vi.spyOn(performance, 'now').mockImplementation(() => monotonic)
    const { accept } = setup(calendarMatchFixture({ serverNow: '2026-10-07T19:01:59.999Z' }))
    const button = await screen.findByRole('button', { name: 'Aceptar batalla' })
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
    monotonic = 101
    fireEvent.click(button)
    expect(accept).not.toHaveBeenCalled()
  })
  it.each([
    [401, 'Tu sesión venció'],
    [403, 'No puedes aceptar por otra persona'],
    [409, 'ventana de aceptación no está abierta'],
    [503, 'se conserva el mismo intento'],
  ])(
    'error %i conserva la intención para comprobarla y no fabrica aceptación',
    async (status, message) => {
      const accept = vi.fn<MatchAcceptanceApi['accept']>().mockRejectedValue(
        new HttpError(status, 'No se pudo aceptar', {
          code: status === 409 ? 'ACCEPTANCE_CLOSED' : 'FAILURE',
        }),
      )
      setup(calendarMatchFixture(), accept)
      await userEvent.click(await screen.findByRole('button', { name: 'Aceptar batalla' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      await userEvent.click(screen.getByRole('button', { name: 'Comprobar aceptación' }))
      expect(accept.mock.calls[0]).toEqual(accept.mock.calls[1])
      expect(
        screen.queryByText(
          '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.',
        ),
      ).not.toBeInTheDocument()
    },
  )
  it('al reconectar consulta la nueva hora, el conteo y mi recibo antes de permitir otra aceptación', async () => {
    const { list, accept } = setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Aceptar batalla' })).toBeEnabled()
    })
    act(() => {
      onlineManager.setOnline(false)
    })
    expect(screen.getByRole('button', { name: 'Aceptar batalla' })).toBeDisabled()
    list.mockResolvedValue([
      calendarMatchFixture({
        serverNow: '2026-10-07T19:02:00Z',
        acceptanceStatus: 'CLOSED',
        acceptedCounts: [3, 3],
        myAcceptance: acceptanceReceiptFixture(),
      }),
    ])
    act(() => {
      onlineManager.setOnline(true)
    })
    expect(
      await screen.findByText(
        '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.',
      ),
    ).toBeVisible()
    expect(screen.getAllByText('3 / 3 listos')).toHaveLength(2)
    expect(list).toHaveBeenCalledTimes(2)
    expect(accept).not.toHaveBeenCalled()
  })
  it('rechaza un recibo de otra persona y conserva la comprobación pendiente', async () => {
    setup(
      calendarMatchFixture(),
      vi
        .fn<MatchAcceptanceApi['accept']>()
        .mockResolvedValue({ ...acceptanceReceiptFixture(), subject: 'otra-persona' }),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar batalla' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo comprobar tu recibo')
    expect(screen.getByRole('button', { name: 'Comprobar aceptación' })).toBeEnabled()
  })
})
describe('resoluciones y administración · datos del servidor', () => {
  it('consume roundSchedule devuelto por Tournament en lugar de recalcular el calendario confirmado', async () => {
    const baseline = createRegistrationPreviewApis()
    const window = {
      round: 1,
      acceptanceOpensAt: '2026-10-09T23:17:00Z',
      acceptanceClosesAt: '2026-10-09T23:19:00Z',
      scheduledStartAt: '2026-10-09T23:19:00Z',
    }
    const tournament = {
      ...DEV_REGISTRATION_TOURNAMENT,
      contractVersion: 'torneos-v3.0.0',
      tournamentMode: 'TRIO' as const,
      teamSize: 3 as const,
      acceptancePolicy: 'ROUND_ACCEPTANCE_V1' as const,
      roundSchedule: [window],
    }
    renderWithProviders(
      <TournamentRegistrationPage
        identity={{ subject: 'outsider', roles: ['PLAYER'] }}
        api={{
          ...baseline.api,
          list: () => Promise.resolve([tournament]),
          view: () =>
            Promise.resolve({
              tournament,
              teams: [],
              capacity: {
                confirmed: 7,
                reserved: 1,
                available: 0,
                confirmedPeople: 21,
                totalPeople: 24,
              },
            }),
        }}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Centro del torneo' }))
    const table = screen.getByRole('table', { name: /Calendario confirmado/u })
    expect(table).toHaveTextContent(dateLabel(window.acceptanceOpensAt))
    expect(table).toHaveTextContent(dateLabel(window.scheduledStartAt))
    expect(screen.getByText('21 de 24 personas confirmadas.')).toBeVisible()
  })
  it('muestra combatResult tipado de PLAYED aunque el archivo legado todavía no tenga result', async () => {
    const view = calendarMatchFixture({
      status: 'FINISHED',
      resolution: {
        resultType: 'PLAYED',
        resolutionId: 'qa-combat-result',
        resolvedAt: '2026-10-07T19:03:00Z',
        teamIds: ['qa-team-0', 'qa-team-1'],
        winnerTeamId: 'qa-team-0',
        loserTeamId: 'qa-team-1',
        combatRoomId: 'qa-real-room',
        combatResult: {
          outcome: 'WIN',
          winnerTeamLabel: 'A',
          reason: 'ALL_OPPONENTS_DEFEATED',
          finishedAt: '2026-10-07T19:03:00Z',
        },
      },
      result: null,
    })
    renderWithProviders(
      <TournamentEncountersPanel
        id={CALENDAR_ID}
        subject={CALENDAR_SUBJECT}
        selectedMatchId="E1"
        api={{ list: () => Promise.resolve([view]), detail: () => Promise.resolve(view) }}
      />,
    )
    expect(await screen.findByText(/^Ganador:/)).toBeVisible()
    expect(screen.queryByText('Sin resultado final confirmado.')).not.toBeInTheDocument()
  })
  it.each(['ONE_COMPLETE', 'HIGHER_ACCEPTANCE_COUNT', 'TIED_ACCEPTANCE_COUNT'] as const)(
    'muestra %s con su recibo sin sortear ni recalcular el ganador',
    async (rule) => {
      const random = vi.spyOn(Math, 'random')
      renderWithProviders(
        <AbsenceResolution match={calendarMatchFixture({ resolution: absenceFixture(rule) })} />,
      )
      expect(screen.getByText(/Victoria por ausencia · Guardianes/u)).toBeVisible()
      expect(screen.getByText(/Esta justa terminó sin combate/u)).toBeVisible()
      await userEvent.click(screen.getByText('Recibo de resolución'))
      expect(screen.getByText('qa-durable-resolution')).toBeVisible()
      if (rule === 'TIED_ACCEPTANCE_COUNT')
        expect(screen.getByText(/Sorteo conservado: qa-server-draw/u)).toBeVisible()
      expect(random).not.toHaveBeenCalled()
    },
  )
  const adminReceipt = (match: MatchDetail): EncounterAdminReceipt => ({
    actionId: 'qa-action',
    tournamentId: CALENDAR_ID,
    encounterId: match.matchId,
    action: 'PREPARE',
    actor: 'tournament-worker',
    operationId: 'qa-worker-operation',
    occurredAt: match.scheduledStartAt!,
    replayed: true,
    battleId: 'qa-room',
    status: 'READY',
    preparationStatus: 'PREPARED',
  })
  it.each([
    [
      'antes del cierre',
      { serverNow: '2026-10-07T19:01:00Z', acceptanceStatus: 'CLOSED', acceptedCounts: [3, 3] },
    ],
    [
      'roster incompleto',
      { serverNow: '2026-10-07T19:02:00Z', acceptanceStatus: 'CLOSED', acceptedCounts: [2, 3] },
    ],
    [
      'dependencia retrasada',
      {
        acceptanceStatus: 'BLOCKED_DELAY',
        blockReason: {
          code: 'PREVIOUS_RESULT_PENDING',
          message: 'Falta E6',
          since: '2026-10-07T19:00:00Z',
          responsible: 'TOURNAMENT_OPERATIONS',
        },
      },
    ],
    ['resuelta por ausencia', { acceptanceStatus: 'RESOLVED', resolution: absenceFixture() }],
  ] as const)('impide preparación e inicio %s incluso si existe una sala', async (_, overrides) => {
    const prepare = vi.fn(),
      start = vi.fn()
    renderWithProviders(
      <TournamentEncounterAdminPanel
        id={CALENDAR_ID}
        subject="admin"
        encounters={{
          list: () =>
            Promise.resolve([
              calendarMatchFixture({
                ...overrides,
                status: 'READY',
                preparationStatus: 'PREPARED',
                combatRoomId: 'qa-room',
              }),
            ]),
          detail: vi.fn(),
        }}
        admin={{ prepare, start, actions: () => Promise.resolve([]) }}
      />,
    )
    const row = await screen.findByRole('listitem', { name: 'Justa E1' })
    expect(within(row).getByRole('button', { name: 'Preparar E1' })).toBeDisabled()
    expect(within(row).getByRole('button', { name: 'Iniciar E1' })).toBeDisabled()
    fireEvent.click(within(row).getByRole('button', { name: 'Iniciar E1' }))
    expect(prepare).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })
  it('permite recuperar Combat después del cierre completo y conserva el actor real del worker', async () => {
    const match = calendarMatchFixture({
      serverNow: '2026-10-07T19:02:00Z',
      acceptanceStatus: 'CLOSED',
      acceptedCounts: [3, 3],
      operationalStatus: 'PREPARE_PENDING',
      blockReason: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Combat no está disponible',
        since: '2026-10-07T19:02:00Z',
        responsible: 'COMBAT_OPERATIONS',
      },
    })
    const prepare = vi.fn<EncounterAdminApi['prepare']>().mockResolvedValue(adminReceipt(match))
    renderWithProviders(
      <TournamentEncounterAdminPanel
        id={CALENDAR_ID}
        subject="admin"
        encounters={{ list: () => Promise.resolve([match]), detail: vi.fn() }}
        admin={{ prepare, start: vi.fn(), actions: () => Promise.resolve([adminReceipt(match)]) }}
      />,
    )
    const button = await screen.findByRole('button', { name: 'Preparar E1' })
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
    expect(screen.getByText(/Preparada por worker de Tournament/u)).toBeVisible()
    await userEvent.click(button)
    expect(prepare).toHaveBeenCalledWith(CALENDAR_ID, 'E1', expect.any(String))
  })
  it('la consulta por ausencia oculta eventos y resultado de Combat aunque una respuesta inconsistente los incluya', async () => {
    const view = calendarMatchFixture({
      status: 'FINISHED',
      resolution: absenceFixture(),
      events: [{ seq: 1, type: 'battleStarted', occurredAt: '2026-10-07T19:02:00Z', payload: {} }],
    })
    renderWithProviders(
      <TournamentEncountersPanel
        id={CALENDAR_ID}
        subject={CALENDAR_SUBJECT}
        selectedMatchId="E1"
        api={{ list: () => Promise.resolve([view]), detail: () => Promise.resolve(view) }}
      />,
    )
    expect(
      await screen.findByRole('region', { name: 'Resolución por ausencia de E1' }),
    ).toBeVisible()
    expect(screen.queryByText(/Historial de acciones/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sin resultado final confirmado/u)).not.toBeInTheDocument()
  })
  it('la consulta conserva los tres participantes de cada lado de Combat', async () => {
    const base = calendarMatchFixture({
      status: 'IN_PROGRESS',
      acceptanceStatus: 'CLOSED',
      operationalStatus: 'IN_BATTLE',
      combatRoomId: 'qa-room',
    })
    const view = {
      ...base,
      teams: base.registeredTeams!.flatMap((team, index) =>
        team
          ? [
              {
                teamId: team.teamId,
                teamLabel: index === 0 ? 'A' : 'B',
                participants: team.memberIds.map((playerId) => ({
                  playerId,
                  heroId: `qa-hero-${playerId}`,
                })),
              },
            ]
          : [],
      ),
    }
    renderWithProviders(
      <TournamentEncountersPanel
        id={CALENDAR_ID}
        subject={CALENDAR_SUBJECT}
        selectedMatchId="E1"
        api={{ list: () => Promise.resolve([view]), detail: () => Promise.resolve(view) }}
      />,
    )
    const region = await screen.findByRole('region', { name: 'Registro del combate E1' })
    await userEvent.click(within(region).getByText('Héroes de la batalla'))
    const participants = within(region).getAllByRole('list', { name: /^Participantes de Combat/u })
    expect(participants).toHaveLength(2)
    expect(participants.map((list) => within(list).getAllByRole('listitem').length)).toEqual([3, 3])
  })
})

describe('mensajes operativos del calendario', () => {
  it('muestra la espera de Combat solo durante preparación o inicio pendientes', () => {
    renderWithProviders(
      <MatchSchedule
        match={calendarMatchFixture({
          acceptanceStatus: 'CLOSED',
          operationalStatus: 'PREPARE_PENDING',
        })}
      />,
    )
    expect(screen.getByText('Aceptación cerrada. Esperando la operación de Combat.')).toBeVisible()
  })
  it.each(['IN_PROGRESS', 'FINISHED'] as const)('no anuncia espera para una justa %s', (status) => {
    renderWithProviders(
      <MatchSchedule
        match={calendarMatchFixture({
          status,
          acceptanceStatus: 'CLOSED',
          operationalStatus: 'IN_BATTLE',
        })}
      />,
    )
    expect(screen.queryByText(/Esperando la operación de Combat/u)).not.toBeInTheDocument()
  })
  it('un bloqueo muestra su motivo sin anunciar otra espera contradictoria', () => {
    renderWithProviders(
      <MatchSchedule
        match={calendarMatchFixture({
          acceptanceStatus: 'CLOSED',
          operationalStatus: 'PREPARE_PENDING',
          blockReason: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Combat desconectado',
            responsible: 'COMBAT_OPERATIONS',
            since: '2026-10-07T19:02:00Z',
          },
        })}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Combat desconectado')
    expect(screen.queryByText(/Esperando la operación de Combat/u)).not.toBeInTheDocument()
  })
})
