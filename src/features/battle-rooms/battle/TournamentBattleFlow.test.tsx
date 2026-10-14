import { act, screen, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { TournamentAcceptancePanel } from '@/features/tournament/registration/TournamentAcceptancePanel'
import {
  calendarMatchFixture,
  acceptanceReceiptFixture,
  CALENDAR_ID,
  CALENDAR_SUBJECT,
} from '@/features/tournament/dev/calendarFixtures'
import { BattleResultView } from './BattleResultView'
import { winResult } from './fixtures'
import { progressApi } from '@/features/tournament/registration/progressApi'
import type { EncounterApi, MatchSummary } from '@/features/tournament/registration/encounterApi'

const Location = () => {
  const location = useLocation()
  return (
    <>
      <output aria-label="Ruta">{location.pathname}</output>
      <output aria-label="Contexto del torneo">{JSON.stringify(location.state)}</output>
    </>
  )
}
afterEach(() => vi.restoreAllMocks())
describe('Entrada a la arena y regreso al torneo', () => {
  const players = [
    'Carlos',
    'GABO',
    'Dabji',
    'jose_mora0905',
    'Jeffryepsteingo',
    'Stichwar',
    'zyoyoz',
    'xoo',
  ]
  it.each(players)(
    '%s entra únicamente a su encuentro entre las cuatro batallas',
    async (subject) => {
      const matches = Array.from({ length: 4 }, (_, index) => {
        const a = players[index * 2] ?? ''
        const b = players[index * 2 + 1] ?? ''
        const match = calendarMatchFixture({
          matchId: `encuentro-${String(index + 1)}`,
          bracketLabel: `E${String(index + 1)}`,
          tournamentMode: 'SOLO',
          teamSize: 1,
          status: 'READY',
          operationalStatus: 'START_PENDING',
          acceptanceStatus: 'CLOSED',
          acceptedCounts: [1, 1],
          combatRoomId: `arena-${String(index + 1)}`,
          registeredTeams: [
            {
              teamId: `equipo-${a}`,
              name: a,
              avatar: { kind: 'ACCOUNT_AVATAR', subject: a },
              memberIds: [a],
            },
            {
              teamId: `equipo-${b}`,
              name: b,
              avatar: { kind: 'ACCOUNT_AVATAR', subject: b },
              memberIds: [b],
            },
          ],
        })
        return {
          ...match,
          myAcceptance: [a, b].includes(subject)
            ? {
                ...acceptanceReceiptFixture(`aceptacion-${subject}`, match),
                subject,
                teamId: `equipo-${subject}`,
              }
            : null,
        }
      })
      const index = Math.floor(players.indexOf(subject) / 2) + 1
      renderWithProviders(
        <>
          <TournamentAcceptancePanel
            id={CALENDAR_ID}
            subject={subject}
            encounters={{ list: () => Promise.resolve(matches), detail: vi.fn() }}
          />
          <Location />
        </>,
      )
      expect(await screen.findByRole('link', { name: 'Ir a batalla' })).toHaveAttribute(
        'href',
        `/play/rooms/arena-${String(index)}/battle`,
      )
      expect(screen.getByText(/Te llevaremos a tu batalla en 2 segundos/u)).toBeVisible()
      await waitFor(
        () =>
          expect(screen.getByLabelText('Ruta')).toHaveTextContent(
            `/play/rooms/arena-${String(index)}/battle`,
          ),
        { timeout: 5000 },
      )
      expect(JSON.parse(screen.getByLabelText('Contexto del torneo').textContent)).toEqual({
        tournament: {
          tournamentId: CALENDAR_ID,
          matchId: `encuentro-${String(index)}`,
          bracketLabel: `E${String(index)}`,
        },
      })
    },
  )
  it.each(['tournamentId', 'encounterId', 'teamId', 'subject'] as const)(
    'un recibo con %s ajeno no redirige a la cuenta aunque el encuentro tenga sala',
    async (field) => {
      const match = calendarMatchFixture({
        status: 'READY',
        operationalStatus: 'START_PENDING',
        acceptanceStatus: 'CLOSED',
        combatRoomId: 'sala-local',
        myAcceptance: { ...acceptanceReceiptFixture(), [field]: 'otra-identidad' },
      })
      renderWithProviders(
        <>
          <TournamentAcceptancePanel
            id={CALENDAR_ID}
            subject={CALENDAR_SUBJECT}
            encounters={{ list: () => Promise.resolve([match]), detail: vi.fn() }}
          />
          <Location />
        </>,
      )
      await screen.findByRole('link', { name: 'Ir a batalla' })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2200))
      })
      expect(screen.getByLabelText('Ruta')).toHaveTextContent('/')
      expect(screen.queryByText(/Te llevaremos a tu batalla/u)).not.toBeInTheDocument()
    },
  )
  it('una aceptación propia entra a la sala recién preparada, antes de agotar la gracia', async () => {
    const match = calendarMatchFixture({
      status: 'READY',
      operationalStatus: 'START_PENDING',
      acceptanceStatus: 'CLOSED',
      combatRoomId: 'sala-local',
      myAcceptance: acceptanceReceiptFixture(),
    })
    let complete: ((matches: readonly MatchSummary[]) => void) | undefined
    const list = vi
      .fn<EncounterApi['list']>()
      .mockResolvedValueOnce([match])
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve
          }),
      )
    const { queryClient } = renderWithProviders(
      <>
        <TournamentAcceptancePanel
          id={CALENDAR_ID}
          subject={CALENDAR_SUBJECT}
          encounters={{ list, detail: vi.fn() }}
        />
        <Location />
      </>,
    )
    await screen.findByRole('link', { name: 'Ir a batalla' })
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ['tournament-acceptance'] })
    })
    await waitFor(
      () =>
        expect(screen.getByLabelText('Ruta')).toHaveTextContent('/play/rooms/sala-local/battle'),
      { timeout: 5000 },
    )
    expect(list).toHaveBeenCalledTimes(2)
    await act(() => {
      complete?.([match])
      return Promise.resolve()
    })
  })
  it('un fallo de actualización no retiene a una cuenta con recibo propio y arena ya confirmada', async () => {
    const match = calendarMatchFixture({
      status: 'READY',
      operationalStatus: 'START_PENDING',
      acceptanceStatus: 'CLOSED',
      combatRoomId: 'sala-confirmada',
      myAcceptance: acceptanceReceiptFixture(),
    })
    const list = vi
      .fn<EncounterApi['list']>()
      .mockResolvedValueOnce([match])
      .mockRejectedValue(new Error('Tournament temporalmente inaccesible'))
    const { queryClient } = renderWithProviders(
      <>
        <TournamentAcceptancePanel
          id={CALENDAR_ID}
          subject={CALENDAR_SUBJECT}
          encounters={{ list, detail: vi.fn() }}
        />
        <Location />
      </>,
    )
    await screen.findByRole('link', { name: 'Ir a batalla' })
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ['tournament-acceptance'] })
    })
    await screen.findByRole('alert')
    await waitFor(
      () =>
        expect(screen.getByLabelText('Ruta')).toHaveTextContent(
          '/play/rooms/sala-confirmada/battle',
        ),
      { timeout: 5000 },
    )
  })
  it('consultar una batalla terminada no entra automáticamente de nuevo a la arena', async () => {
    const match = calendarMatchFixture({
      status: 'FINISHED',
      operationalStatus: 'FINISHED',
      acceptanceStatus: 'RESOLVED',
      combatRoomId: 'sala-local',
      myAcceptance: acceptanceReceiptFixture(),
    })
    renderWithProviders(
      <>
        <TournamentAcceptancePanel
          id={CALENDAR_ID}
          subject={CALENDAR_SUBJECT}
          encounters={{ list: () => Promise.resolve([match]), detail: vi.fn() }}
        />
        <Location />
      </>,
    )
    expect(await screen.findByRole('link', { name: 'Ver resultado' })).toBeVisible()
    expect(screen.getByLabelText('Ruta')).toHaveTextContent('/')
  })
  it('volver de un resultado de Combat no reingresa aunque Tournament aún muestre el encuentro en curso', async () => {
    vi.spyOn(progressApi, 'view').mockResolvedValue({
      bracket: null,
      champion: null,
      eliminatedTeamIds: [],
    })
    const context = { tournamentId: CALENDAR_ID, matchId: 'encuentro-proyectando' }
    const source = winResult()
    const result = {
      ...source,
      participants: source.participants.map((p) =>
        p.result === 'WON' ? { ...p, playerId: CALENDAR_SUBJECT } : p,
      ),
    }
    const screenOfResult = renderWithProviders(
      <BattleResultView result={result} subject={CALENDAR_SUBJECT} tournament={context} />,
    )
    screenOfResult.unmount()
    const match = calendarMatchFixture({
      matchId: context.matchId,
      status: 'IN_PROGRESS',
      operationalStatus: 'IN_BATTLE',
      acceptanceStatus: 'CLOSED',
      combatRoomId: 'sala-con-resultado',
    })
    renderWithProviders(
      <>
        <TournamentAcceptancePanel
          id={CALENDAR_ID}
          subject={CALENDAR_SUBJECT}
          encounters={{
            list: () =>
              Promise.resolve([
                {
                  ...match,
                  myAcceptance: acceptanceReceiptFixture('aceptacion-proyectando', match),
                },
              ]),
            detail: vi.fn(),
          }}
        />
        <Location />
      </>,
    )
    expect(await screen.findByRole('link', { name: 'Ver resultado' })).toHaveAttribute(
      'href',
      '/play/rooms/sala-con-resultado/battle',
    )
    expect(screen.getByText('Confirmando resultado')).toBeVisible()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200))
    })
    expect(screen.getByLabelText('Ruta')).toHaveTextContent('/')
  })
  it('los UUID del motor no aparecen en el marcador ni en la salida del torneo', () => {
    vi.spyOn(progressApi, 'view').mockResolvedValue({
      bracket: null,
      champion: null,
      eliminatedTeamIds: [],
    })
    const source = winResult()
    const labels = ['37aee751-8ff0-4a8c-96ef-82e351d11515', '58a89f67-7fcf-4946-b6e9-30af7cfa4b9b']
    const label = (s: string) => (s === 'A' ? labels[0]! : labels[1]!)
    const result = {
      ...source,
      winnerTeamLabel: labels[0]!,
      teams: [
        { ...source.teams[0], teamLabel: labels[0]! },
        { ...source.teams[1], teamLabel: labels[1]! },
      ] as const,
      participants: source.participants.map((p) => ({ ...p, teamLabel: label(p.teamLabel) })),
    }
    const { container } = renderWithProviders(
      <BattleResultView
        result={result}
        subject="sujeto-ana"
        tournament={{ tournamentId: 'torneo-1', matchId: 'E1' }}
      />,
    )
    expect(container.textContent).not.toContain(labels[0])
    expect(container.textContent).not.toContain(labels[1])
    expect(screen.getByRole('link', { name: 'Volver al torneo' })).toHaveAttribute(
      'href',
      '/tournament?torneo=torneo-1&vista=llaves',
    )
  })
})
