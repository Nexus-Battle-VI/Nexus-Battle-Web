import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import {
  createRegistrationPreviewApis,
  DEV_REGISTRATION_TOURNAMENT,
} from '@/features/tournament/dev/registrationFixtures'
import { TournamentBracketPanel } from './TournamentBracketPanel'
import type { ProgressBracket, ProgressView } from './progressApi'

afterEach(() => {
  vi.restoreAllMocks()
})
const setup = async (transform: (view: ProgressView) => ProgressView = (view) => view) => {
  const { brackets } = createRegistrationPreviewApis()
  const snapshot = await brackets.publish(DEV_REGISTRATION_TOURNAMENT.id, 'qa-publish')
  const projection: ProgressBracket = {
    ...snapshot,
    matches: snapshot.matches.map((m) => ({
      ...m,
      status: m.teamIds.every((id) => id !== null) ? 'READY' : 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
    })),
  }
  const view = transform({ bracket: projection, champion: null, eliminatedTeamIds: [] })
  const progress = { view: vi.fn().mockResolvedValue(view) }
  const choose = vi.fn()
  const rendered = renderWithProviders(
    <TournamentBracketPanel
      id={snapshot.tournamentId}
      subject="qa-player"
      roles={['PLAYER']}
      confirmed={8}
      api={{ view: vi.fn().mockResolvedValue(snapshot), publish: vi.fn() }}
      progress={progress}
      onChooseMatch={choose}
    />,
  )
  await screen.findByText(
    view.champion
      ? `Campeón confirmado · ${view.champion.teamName}`
      : 'La final todavía no confirma un campeón.',
  )
  return { snapshot, view, progress, choose, queryClient: rendered.queryClient }
}
describe('HU-80: avance en las llaves existentes, con respuestas de prueba', () => {
  it('distingue espera y equipos resueltos de preparación real y enlaza por encounterId', async () => {
    const { snapshot, choose } = await setup()
    const e1 = screen.getByRole('button', { name: /^E1 · Ronda/u })
    expect(e1).toHaveTextContent('Equipos definidos; consulta el estado de la justa')
    expect(screen.getByRole('button', { name: /^E13 · Ronda/u })).toHaveTextContent(
      'Esperando resultados previos',
    )
    await userEvent.click(e1)
    await userEvent.click(screen.getByRole('link', { name: 'Ver registro de E1' }))
    expect(choose).toHaveBeenCalledWith(snapshot.matches[0]!.encounterId)
    expect(choose).not.toHaveBeenCalledWith('E1')
  })
  it('NO_WINNER bloquea el avance sin añadir ganador ni acción para imponerlo', async () => {
    await setup((view) => ({
      ...view,
      bracket: {
        ...view.bracket!,
        matches: [
          { ...view.bracket!.matches[0]!, status: 'RESOLUTION_REQUIRED' },
          ...view.bracket!.matches.slice(1),
        ],
      },
    }))
    expect(screen.getByRole('button', { name: /^E1 · Ronda/u })).toHaveTextContent(
      'Finalizó sin ganador; avance detenido',
    )
    expect(
      screen.queryByRole('button', { name: /^(Elegir|Confirmar) ganador|^Desempatar|^Avanzar/iu }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Final' })).queryByText(/Campeón confirmado/u),
    ).not.toBeInTheDocument()
  })
  it('un servicio no disponible no sustituye la consulta por resultados de ejemplo', async () => {
    const { progress, queryClient, snapshot } = await setup()
    progress.view.mockRejectedValue(new Error('No disponible'))
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tournament-progress', 'qa-player', snapshot.tournamentId],
      })
    })
    expect(
      await screen.findByRole('button', { name: 'Volver a consultar avance' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Campeón confirmado/u)).not.toBeInTheDocument()
    expect(screen.queryByText('La final todavía no confirma un campeón.')).not.toBeInTheDocument()
  })
  it('muestra el campeón y eliminados solo desde la respuesta del servidor', async () => {
    const { view } = await setup((view) => ({
      ...view,
      champion: {
        teamId: view.bracket!.seeds[0]!.teamId,
        teamName: view.bracket!.seeds[0]!.name,
        memberIds: view.bracket!.seeds[0]!.memberIds,
        heroes: [
          { playerId: view.bracket!.seeds[0]!.memberIds[0]!, heroId: 'qa-hero-1' },
          { playerId: view.bracket!.seeds[0]!.memberIds[1]!, heroId: 'qa-hero-2' },
        ],
        finalEncounterId: view.bracket!.matches.at(-1)!.encounterId,
        finalRoomId: 'qa-final-room',
        declaredAt: '2026-10-06T12:00:00Z',
      },
      eliminatedTeamIds: [view.bracket!.seeds[1]!.teamId],
    }))
    expect(screen.getByText(`Campeón confirmado · ${view.champion!.teamName}`)).toBeVisible()
    expect(screen.getByText(`Equipos eliminados: ${view.bracket!.seeds[1]!.name}.`)).toBeVisible()
  })
})
