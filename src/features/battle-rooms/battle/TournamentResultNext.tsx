import { useQuery } from '@tanstack/react-query'
import { progressApi } from '@/features/tournament/registration/progressApi'
import type { TournamentBattleContext } from './useTournamentBattleContext'
import type { BattleResult } from './types'

export const TournamentResultNext = ({
  context,
  result,
  subject,
}: {
  readonly context: TournamentBattleContext
  readonly result: BattleResult
  readonly subject: string | null
}): React.JSX.Element => {
  const view = useQuery({
    queryKey: ['tournament-result-next', subject, context.tournamentId, context.matchId],
    queryFn: ({ signal }) => progressApi.view(context.tournamentId, signal),
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.bracket?.matches.find((m) => m.encounterId === context.matchId)?.winnerTeamId
        ? false
        : 3000,
  })
  const match = view.data?.bracket?.matches.find((m) => m.encounterId === context.matchId)
  const own = result.participants.find((p) => p.playerId === subject)
  if (view.isError)
    return <p className="text-sm">Tu batalla terminó. Vuelve al torneo para comprobar el avance.</p>
  if (match?.status === 'RESOLUTION_REQUIRED' || result.outcome === 'NO_WINNER')
    return (
      <p className="text-sm">
        Empate: esta batalla necesita resolverse antes de avanzar en el torneo.
      </p>
    )
  if (match?.status !== 'FINISHED')
    return <p className="text-sm">Confirmando el resultado en el torneo…</p>
  if (view.data?.champion?.memberIds.includes(subject ?? ''))
    return <p className="font-semibold text-success">¡Eres campeón del torneo!</p>
  const destination =
    own?.result === 'WON'
      ? match.destinations.winner
      : own?.result === 'LOST'
        ? match.destinations.loser
        : null
  if (!destination)
    return (
      <p className="text-sm">
        {own?.result === 'LOST'
          ? 'Tu participación en este torneo terminó.'
          : 'Resultado confirmado en las llaves.'}
      </p>
    )
  const next = view.data?.bracket?.matches.find((m) => m.id === destination.matchId)
  return (
    <p className="tournament-result-progress">
      {next?.track === 'FINAL'
        ? '¡Llegaste a la final!'
        : next?.track === 'SECONDARY'
          ? own?.result === 'LOST'
            ? 'Pasaste a la llave de perdedores.'
            : '¡Avanzaste en la llave de perdedores!'
          : '¡Avanzaste en la llave de ganadores!'}
      <br />
      <span className="text-sm">
        {next?.status === 'FINISHED' ? 'Batalla posterior' : 'Siguiente batalla'}:{' '}
        {destination.matchId}
        {next ? ` · Ronda ${String(next.round)}` : ''}
      </span>
    </p>
  )
}
