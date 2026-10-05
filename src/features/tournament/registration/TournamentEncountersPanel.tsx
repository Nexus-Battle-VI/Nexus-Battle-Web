import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { encounterApi, type EncounterApi } from './encounterApi'
import { dateLabel, matchStatus } from './presentation'

const eventLabel: Record<string, string> = {
  battleStarted: 'Comienza el combate',
  turnAdvanced: 'Cambio de turno',
  basicAttackResolved: 'Ataque básico',
  skillUsed: 'Habilidad utilizada',
  turnTimedOut: 'Turno agotado',
  battleFinished: 'Finaliza el combate',
}
export const TournamentEncountersPanel = ({
  id,
  subject,
  api = encounterApi,
}: {
  readonly id: string
  readonly subject: string
  readonly api?: EncounterApi
}): React.JSX.Element => {
  const [matchId, setMatchId] = useState('')
  const list = useQuery({
    queryKey: ['tournament-encounters', subject, id],
    queryFn: () => api.list(id),
    refetchInterval: 5000,
  })
  const detail = useInfiniteQuery({
    queryKey: ['tournament-encounter', subject, id, matchId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.detail(id, matchId, pageParam),
    getNextPageParam: (page) =>
      page.hasMore && page.nextSeq > page.afterSeq ? page.nextSeq : undefined,
    enabled: matchId !== '',
    refetchInterval: (query) =>
      query.state.data?.pages[0]?.status === 'FINISHED' && query.state.data.pages[0].logComplete
        ? false
        : 5000,
  })
  const first = detail.data?.pages[0]
  const view = first?.tournamentId === id && first.matchId === matchId ? first : undefined
  const events =
    detail.data?.pages.flatMap((page) =>
      page.tournamentId === id && page.matchId === matchId ? page.events : [],
    ) ?? []
  // Server owns sequence/order. Remove repeats when a refreshed page boundary shifts.
  const seen = new Set<number>()
  const uniqueEvents = events.filter((event) => {
    if (seen.has(event.seq)) return false
    seen.add(event.seq)
    return true
  })
  const refresh = (): void => {
    void list.refetch()
    if (matchId !== '') void detail.refetch()
  }
  return (
    <Card>
      <section aria-label="Registro de justas" className="grid min-w-0 gap-4">
        <h2 className="font-game-display text-xl">Justas y registro de combates</h2>
        <p className="text-sm text-muted">
          Cada justa conserva su propio registro, aunque no se haya transmitido.
        </p>
        {list.isPending && <p role="status">Consultando justas…</p>}
        {list.isError && <p role="alert">No se pudo consultar el registro de justas.</p>}
        <div>
          <Button variant="secondary" onClick={refresh}>
            Actualizar registro
          </Button>
        </div>
        {list.data?.length === 0 && <p>Todavía no hay justas registradas en este torneo.</p>}
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.data
            ?.filter((m) => m.tournamentId === id)
            .map((match) => (
              <button
                key={match.matchId}
                type="button"
                aria-pressed={matchId === match.matchId}
                onClick={() => {
                  setMatchId(match.matchId)
                }}
                className="min-w-0 rounded-lg border border-border p-3 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="block font-semibold">
                  {match.bracketLabel} · Ronda {String(match.round)}
                </span>
                <span className="block text-sm">{matchStatus(match)}</span>
              </button>
            ))}
        </div>
        {matchId !== '' && detail.isPending && <p role="status">Consultando el combate…</p>}
        {matchId !== '' && detail.isError && (
          <div role="alert">
            <p>
              No se pudo actualizar este combate. Su referencia puede no existir o no pertenecer al
              torneo.
            </p>
            <Button variant="secondary" onClick={() => void detail.refetch()}>
              Volver a consultar combate
            </Button>
          </div>
        )}
        {view && (
          <section
            aria-label={`Registro del combate ${view.bracketLabel}`}
            className="grid min-w-0 gap-3 rounded-lg border border-border p-4"
          >
            <h3 className="font-semibold">
              {view.bracketLabel} · {matchStatus(view)}
            </h3>
            <p>
              {view.bracketTrack === 'MAIN'
                ? 'Árbol de ganadores'
                : view.bracketTrack === 'SECONDARY'
                  ? 'Árbol de secundarios'
                  : view.bracketTrack === 'FINAL'
                    ? 'Final'
                    : view.bracketLabel}{' '}
              · Ronda {String(view.round)}
            </p>
            <p className="break-all text-sm">Identidad del encuentro: {view.matchId}</p>
            {view.combatRoomId && (
              <p className="break-all text-sm">Sala de Combat: {view.combatRoomId}</p>
            )}
            {view.registeredTeams?.map((team, index) =>
              team === null ? (
                <p key={index}>Equipo pendiente de resolver.</p>
              ) : (
                <div key={team.teamId}>
                  <p className="font-semibold">{team.name}</p>
                  <ul className="grid gap-1 text-sm">
                    {team.memberIds.map((member) => (
                      <li key={member} className="break-all">
                        Jugador: {member}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
            {view.teams.map((team) => (
              <div key={team.teamId}>
                <p className="font-semibold">Equipo {team.teamLabel}</p>
                <ul className="grid gap-1 text-sm">
                  {team.participants.map((participant) => (
                    <li key={participant.playerId} className="break-all">
                      Jugador {participant.playerId} · Héroe {participant.heroId}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {view.startedAt && <p>Inicio: {dateLabel(view.startedAt)}</p>}
            {view.status === 'FINISHED' && view.result !== null ? (
              <>
                <p>Cierre: {dateLabel(view.closedAt ?? view.result.finishedAt)}</p>
                <p>
                  {view.result.outcome === 'WIN' && view.result.winnerTeamLabel !== null
                    ? `Ganador informado por Combat: ${view.result.winnerTeamLabel}`
                    : view.result.outcome === 'NO_WINNER'
                      ? 'Combat finalizó sin ganador.'
                      : `Resultado informado por Combat: ${view.result.outcome}`}
                </p>
                <p className="text-sm">Motivo: {view.result.reason}</p>
              </>
            ) : (
              <p>Sin resultado final confirmado.</p>
            )}
            {view.syncedAt && (
              <p className="text-sm text-muted">
                Última sincronización del archivo: {dateLabel(view.syncedAt)}.
              </p>
            )}
            {!view.logComplete && (
              <p role="status">
                El archivo todavía no ha alcanzado todos los eventos conocidos de Combat.
              </p>
            )}
            <h4 className="font-semibold">Turnos y eventos</h4>
            {uniqueEvents.length === 0 && <p>Todavía no hay eventos conservados.</p>}
            <ol className="grid min-w-0 gap-2" aria-label="Eventos del combate">
              {uniqueEvents.map((event) => (
                <li key={event.seq} className="min-w-0 rounded border border-border p-3">
                  <p>
                    {String(event.seq)}. {eventLabel[event.type] ?? event.type} ·{' '}
                    {dateLabel(event.occurredAt)}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-sm">Ver registro de la acción</summary>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ol>
            {detail.hasNextPage && (
              <Button
                variant="secondary"
                loading={detail.isFetchingNextPage}
                onClick={() => void detail.fetchNextPage()}
              >
                Ver siguientes eventos
              </Button>
            )}
          </section>
        )}
      </section>
    </Card>
  )
}
