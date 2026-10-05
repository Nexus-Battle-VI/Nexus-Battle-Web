import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import {
  createRegistrationPreviewApis,
  DEV_REGISTRATION_TOURNAMENT,
} from '@/features/tournament/dev/registrationFixtures'
import { TournamentBracketPanel } from './TournamentBracketPanel'
import { TournamentEncountersPanel } from './TournamentEncountersPanel'
import type { MatchDetail, MatchSummary } from './encounterApi'
import type { BracketApi } from './bracketApi'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})
describe('llaves del servidor, permisos y ocho humanos', () => {
  it.each([5, 7])(
    'bloquea publicación con %i confirmados sin tratar pendientes como plazas',
    async (confirmed) => {
      const api = { view: vi.fn().mockResolvedValue(null), publish: vi.fn() }
      renderWithProviders(
        <TournamentBracketPanel
          id="T1"
          subject="admin"
          roles={['ADMINISTRATOR']}
          confirmed={confirmed}
          api={api}
        />,
      )
      const button = await screen.findByRole('button', { name: 'Publicar llaves' })
      expect(button).toBeDisabled()
      expect(screen.getByText(/Se requieren ocho equipos humanos/u)).toBeInTheDocument()
      expect(api.publish).not.toHaveBeenCalled()
    },
  )
  it('un jugador consulta bloqueo sin botón administrativo', async () => {
    renderWithProviders(
      <TournamentBracketPanel
        id="T1"
        subject="player"
        roles={['PLAYER']}
        confirmed={8}
        api={{ view: vi.fn().mockResolvedValue(null), publish: vi.fn() }}
      />,
    )
    expect(
      await screen.findByText('Los ocho equipos están confirmados. Falta publicar las llaves.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar llaves' })).not.toBeInTheDocument()
  })
  it('publica snapshot v2 con ambos árboles, final e identidad distinta de etiqueta', async () => {
    const { brackets } = createRegistrationPreviewApis()
    const api: BracketApi = {
      view: vi.fn().mockResolvedValue(null),
      publish: vi.fn(brackets.publish),
    }
    renderWithProviders(
      <TournamentBracketPanel
        id={DEV_REGISTRATION_TOURNAMENT.id}
        subject="admin"
        roles={['SUPER_ADMINISTRATOR']}
        confirmed={8}
        api={api}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar llaves' }))
    expect(
      await screen.findByText('Llaves publicadas · ocho equipos humanos · inscripción cerrada.'),
    ).toBeInTheDocument()
    for (const name of ['Árbol de ganadores', 'Árbol de secundarios', 'Final'])
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Árbol de ganadores' })).getAllByRole('button'),
    ).toHaveLength(7)
    expect(
      within(screen.getByRole('region', { name: 'Árbol de secundarios' })).getAllByRole('button'),
    ).toHaveLength(6)
    await userEvent.click(screen.getByRole('button', { name: /E9 · Ronda/u }))
    expect(screen.getByText('Identidad del encuentro: dev-tournament-v2:E9')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Detalle de E9' })).getByText(
        'Perdedor de E6 vs. Ganador de E7',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ganó/u)).not.toBeInTheDocument()
  })
  it('repite la misma publicación tras respuesta perdida', async () => {
    const { brackets } = createRegistrationPreviewApis()
    const publish = vi
      .fn(brackets.publish)
      .mockRejectedValueOnce(new TypeError('Publicación incierta'))
    renderWithProviders(
      <TournamentBracketPanel
        id={DEV_REGISTRATION_TOURNAMENT.id}
        subject="admin"
        roles={['ADMINISTRATOR']}
        confirmed={8}
        api={{ view: vi.fn().mockResolvedValue(null), publish }}
      />,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Publicar llaves' }))
    await user.click(await screen.findByRole('button', { name: 'Comprobar publicación' }))
    expect(publish.mock.calls[1]?.[1]).toBe(publish.mock.calls[0]?.[1])
    expect(
      await screen.findByText('Llaves publicadas · ocho equipos humanos · inscripción cerrada.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Publicación incierta')).not.toBeInTheDocument()
  })
})
const summary = (label: string, status: MatchSummary['status'] = 'IN_PROGRESS'): MatchSummary => ({
  tournamentId: 'T1',
  matchId: 'server/stable:' + label,
  bracketLabel: label,
  round: 1,
  status,
  startedAt: status === 'WAITING_PARTICIPANTS' ? null : '2026-10-05T15:00:00Z',
  closedAt: null,
})
const detail = (label = 'E2'): MatchDetail => ({
  ...summary(label),
  teams: [
    {
      teamId: 'registered-team',
      teamLabel: 'Motor A',
      participants: [{ playerId: 'real-subject-from-server', heroId: 'real-hero-from-server' }],
    },
  ],
  result: null,
  events: [],
  afterSeq: 0,
  nextSeq: 0,
  hasMore: false,
  logComplete: false,
})
describe('consulta HU83 publicada y metadatos aditivos', () => {
  it('recibe array y usa matchId completo; no confunde encuentros simultáneos', async () => {
    const api = {
      list: vi.fn().mockResolvedValue([summary('E1'), summary('E2'), summary('E3')]),
      detail: vi.fn().mockResolvedValue(detail()),
    }
    renderWithProviders(<TournamentEncountersPanel id="T1" subject="player" api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: /E2 · Ronda/u }))
    expect(api.detail).toHaveBeenCalledWith('T1', 'server/stable:E2', 0)
    expect(await screen.findByText('E2 · En curso')).toBeInTheDocument()
    expect(
      screen.getByText('Jugador real-subject-from-server · Héroe real-hero-from-server'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sin resultado final confirmado.')).toBeInTheDocument()
    expect(screen.queryByText(/Ganador informado/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cierre:/u)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Iniciar justa|Preparar justa/u }),
    ).not.toBeInTheDocument()
  })
  it('teams vacíos con TEAMS_RESOLVED muestra miembros conocidos sin inventar héroes', async () => {
    const waiting: MatchDetail = {
      ...detail('E1'),
      status: 'WAITING_PARTICIPANTS',
      startedAt: null,
      teams: [],
      preparationStatus: 'TEAMS_RESOLVED',
      registeredTeams: [
        {
          teamId: 'team-registered',
          name: 'Equipo registrado',
          avatar: { kind: 'ACCOUNT_AVATAR', subject: 'A' },
          memberIds: ['A', 'B'],
        },
      ],
    }
    renderWithProviders(
      <TournamentEncountersPanel
        id="T1"
        subject="player"
        api={{
          list: vi.fn().mockResolvedValue([waiting]),
          detail: vi.fn().mockResolvedValue(waiting),
        }}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: /E1 · Ronda/u }))
    expect(await screen.findByText('Equipo registrado')).toBeInTheDocument()
    expect(screen.getByText('Jugador: A')).toBeInTheDocument()
    expect(screen.queryByText(/Héroe/u)).not.toBeInTheDocument()
    expect(screen.getByText('Sin resultado final confirmado.')).toBeInTheDocument()
  })
  it('paginas de 100 eventos usan nextSeq aunque logComplete sea true; sin mezclar payloads', async () => {
    const event = (seq: number) => ({
      seq,
      type: 'basicAttackResolved',
      occurredAt: '2026-10-05T15:01:00Z',
      payload: { ownMatch: 'E2', seq },
    })
    const first: MatchDetail = {
      ...detail(),
      status: 'FINISHED',
      closedAt: '2026-10-05T15:10:00Z',
      result: {
        outcome: 'WIN',
        winnerTeamLabel: 'Motor A',
        reason: 'VICTORY',
        finishedAt: '2026-10-05T15:10:00Z',
      },
      events: Array.from({ length: 100 }, (_, i) => event(i + 1)),
      nextSeq: 100,
      hasMore: true,
      logComplete: true,
    }
    const next: MatchDetail = {
      ...first,
      events: [event(101)],
      afterSeq: 100,
      nextSeq: 101,
      hasMore: false,
    }
    const api = {
      list: vi.fn().mockResolvedValue([summary('E2', 'FINISHED')]),
      detail: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(next),
    }
    renderWithProviders(<TournamentEncountersPanel id="T1" subject="player" api={api} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /E2 · Ronda/u }))
    await user.click(await screen.findByRole('button', { name: 'Ver siguientes eventos' }))
    expect(api.detail).toHaveBeenLastCalledWith('T1', 'server/stable:E2', 100)
    expect(await screen.findByText(/101. Ataque básico/u)).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Eventos del combate' })).getAllByRole('listitem'),
    ).toHaveLength(101)
    expect(screen.getByText('Ganador informado por Combat: Motor A')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver siguientes eventos' })).not.toBeInTheDocument()
  })
  it('finalizada NO_WINNER no inventa campeón', async () => {
    const finished: MatchDetail = {
      ...detail(),
      status: 'FINISHED',
      result: {
        outcome: 'NO_WINNER',
        winnerTeamLabel: null,
        reason: 'DOUBLE_ABANDON',
        finishedAt: '2026-10-05T15:10:00Z',
      },
    }
    renderWithProviders(
      <TournamentEncountersPanel
        id="T1"
        subject="player"
        api={{
          list: vi.fn().mockResolvedValue([finished]),
          detail: vi.fn().mockResolvedValue(finished),
        }}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: /E2 · Ronda/u }))
    expect(await screen.findByText('Combat finalizó sin ganador.')).toBeInTheDocument()
    expect(screen.queryByText(/Ganador informado/u)).not.toBeInTheDocument()
  })
  it.each([
    ['WIN', null],
    ['UNKNOWN_PUBLISHED_OUTCOME', null],
  ])(
    'no deduce ausencia de ganador de resultado %s sin etiqueta',
    async (outcome, winnerTeamLabel) => {
      const finished: MatchDetail = {
        ...detail(),
        status: 'FINISHED',
        result: {
          outcome,
          winnerTeamLabel,
          reason: 'SERVER_REASON',
          finishedAt: '2026-10-05T15:10:00Z',
        },
      }
      renderWithProviders(
        <TournamentEncountersPanel
          id="T1"
          subject="player"
          api={{
            list: vi.fn().mockResolvedValue([finished]),
            detail: vi.fn().mockResolvedValue(finished),
          }}
        />,
      )
      await userEvent.click(await screen.findByRole('button', { name: /E2 · Ronda/u }))
      expect(
        await screen.findByText(`Resultado informado por Combat: ${outcome}`),
      ).toBeInTheDocument()
      expect(screen.queryByText('Combat finalizó sin ganador.')).not.toBeInTheDocument()
      expect(screen.queryByText(/Ganador informado/u)).not.toBeInTheDocument()
    },
  )
  it('404 con reintento y respuesta ajena no muestran otro combate', async () => {
    const api = {
      list: vi.fn().mockResolvedValue([summary('E2')]),
      detail: vi
        .fn()
        .mockRejectedValueOnce(new HttpError(404, 'No existe', {}))
        .mockResolvedValueOnce({ ...detail(), tournamentId: 'T2' }),
    }
    renderWithProviders(<TournamentEncountersPanel id="T1" subject="player" api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: /E2 · Ronda/u }))
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a consultar combate' }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(api.detail).toHaveBeenCalledTimes(2)
    expect(
      screen.queryByRole('region', { name: 'Registro del combate E2' }),
    ).not.toBeInTheDocument()
  })
  it('cambiar de selección elimina el detalle anterior durante la carga', async () => {
    const api = {
      list: vi.fn().mockResolvedValue([summary('E1'), summary('E2')]),
      detail: vi
        .fn()
        .mockResolvedValueOnce(detail('E1'))
        .mockImplementationOnce(() => new Promise<MatchDetail>(() => undefined)),
    }
    renderWithProviders(<TournamentEncountersPanel id="T1" subject="player" api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: /E1 · Ronda/u }))
    expect(
      await screen.findByRole('region', { name: 'Registro del combate E1' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /E2 · Ronda/u }))
    expect(
      screen.queryByRole('region', { name: 'Registro del combate E1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Consultando el combate…')).toBeInTheDocument()
  })
})
