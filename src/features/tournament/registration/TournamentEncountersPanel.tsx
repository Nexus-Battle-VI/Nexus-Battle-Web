import { TournamentHeading } from '../TournamentVisuals'
import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { SelectField } from '@/components/ui/form/SelectField'
import { encounterApi, type EncounterApi } from './encounterApi'
import { dateLabel, matchStatus } from './presentation'
import { MatchSchedule, AbsenceResolution } from './MatchSchedule'

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
  selectedMatchId,
  onChooseMatch,
}: {
  readonly id: string
  readonly subject: string
  readonly api?: EncounterApi
  readonly selectedMatchId?: string
  readonly onChooseMatch?: (matchId: string) => void
}): React.JSX.Element => {
  const [localMatchId, setMatchId] = useState('')
  const matchId = selectedMatchId ?? localMatchId
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
      query.state.data?.pages[0]?.resolution?.resultType === 'ABSENCE' ||
      (query.state.data?.pages[0]?.status === 'FINISHED' && query.state.data.pages[0].logComplete)
        ? false
        : 5000,
  })
  const first = detail.data?.pages[0]
  const view = first?.tournamentId === id && first.matchId === matchId ? first : undefined
  const result =
    view?.resolution?.resultType === 'PLAYED' ? view.resolution.combatResult : view?.result
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
      <section
        id="tournament-record"
        aria-label="Registro de justas"
        className="grid min-w-0 gap-4"
      >
        <TournamentHeading icon="encounters">Justas y registro de combates</TournamentHeading>
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
        {list.data !== undefined && list.data.length > 0 && (
          <SelectField
            label="Elegir justa"
            value={matchId}
            placeholder="Elige el encuentro"
            options={list.data
              .filter((match) => match.tournamentId === id)
              .map((match) => ({
                value: match.matchId,
                label: `${match.bracketLabel} · Ronda ${String(match.round)} · ${matchStatus(match)}`,
              }))}
            onChange={(event) => {
              setMatchId(event.target.value)
              onChooseMatch?.(event.target.value)
            }}
          />
        )}
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
            <MatchSchedule match={view} />
            <AbsenceResolution match={view} />
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
            <details className="tournament-technical">
              <summary>Referencias del encuentro y sus integrantes</summary>
              <p className="break-all text-sm">Identidad del encuentro: {view.matchId}</p>
              {view.combatRoomId && (
                <p className="break-all text-sm">Sala de Combat: {view.combatRoomId}</p>
              )}
              {view.teams
                .flatMap((team) => team.participants)
                .map((participant) => (
                  <p key={participant.playerId} className="break-all text-sm">
                    Jugador {participant.playerId} · Héroe {participant.heroId}
                  </p>
                ))}
              {view.registeredTeams
                ?.flatMap((team) => team?.memberIds ?? [])
                .map((member) => (
                  <p key={member} className="break-all text-sm">
                    Jugador: {member}
                  </p>
                ))}
            </details>
            {view.registeredTeams?.map((team, index) =>
              team === null ? (
                <p key={index}>Equipo pendiente de resolver.</p>
              ) : (
                <div key={team.teamId}>
                  <p className="font-semibold">{team.name}</p>
                  <ul
                    className="grid gap-1 text-sm"
                    aria-label={`Integrantes inscritos de ${team.name}`}
                  >
                    {team.memberIds.map((member, memberIndex) => (
                      <li key={member} className="break-all">
                        {member === subject
                          ? 'Tu cuenta'
                          : `Nombre del jugador ${String(memberIndex + 1)} pendiente`}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
            {view.resolution?.resultType !== 'ABSENCE' &&
              view.teams.map((team) => (
                <div key={team.teamId}>
                  <p className="font-semibold">Equipo {team.teamLabel}</p>
                  <ul
                    className="grid gap-1 text-sm"
                    aria-label={`Participantes de Combat del lado ${team.teamLabel}`}
                  >
                    {team.participants.map((participant, participantIndex) => (
                      <li key={participant.playerId} className="break-all">
                        {participant.playerId === subject
                          ? 'Tu héroe'
                          : `Héroe del jugador ${String(participantIndex + 1)}`}{' '}
                        · Metadatos pendientes
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {view.resolution?.resultType !== 'ABSENCE' && view.startedAt && (
              <p>Inicio: {dateLabel(view.startedAt)}</p>
            )}
            {view.resolution?.resultType !== 'ABSENCE' &&
              (view.status === 'FINISHED' && result != null ? (
                <>
                  <p>Cierre: {dateLabel(view.closedAt ?? result.finishedAt)}</p>
                  <p>
                    {result.outcome === 'WIN' && result.winnerTeamLabel !== null
                      ? `Ganador informado por Combat: ${result.winnerTeamLabel}`
                      : result.outcome === 'NO_WINNER'
                        ? 'Combat finalizó sin ganador.'
                        : `Resultado informado por Combat: ${result.outcome}`}
                  </p>
                  <p className="text-sm">Motivo: {result.reason}</p>
                </>
              ) : (
                <p>Sin resultado final confirmado.</p>
              ))}
            {view.syncedAt && (
              <p className="text-sm text-muted">
                Última sincronización del archivo: {dateLabel(view.syncedAt)}.
              </p>
            )}
            {!view.logComplete &&
              view.combatRoomId &&
              typeof view.engineLastSeq === 'number' &&
              typeof view.lastSyncedSeq === 'number' &&
              view.lastSyncedSeq < view.engineLastSeq && (
                <p role="status">
                  El archivo todavía no ha alcanzado todos los eventos conocidos de Combat.
                </p>
              )}
            {view.resolution?.resultType !== 'ABSENCE' && (
              <details className="tournament-history">
                <summary className="cursor-pointer font-semibold">
                  Historial de acciones ({String(uniqueEvents.length)})
                </summary>
                {uniqueEvents.length === 0 && <p>Todavía no hay eventos conservados.</p>}
                <ol className="grid min-w-0 gap-2" aria-label="Eventos del combate">
                  {uniqueEvents.map((event) => (
                    <li key={event.seq} className="min-w-0 rounded border border-border p-3">
                      <p>
                        {String(event.seq)}. {eventLabel[event.type] ?? event.type} ·{' '}
                        {dateLabel(event.occurredAt)}
                      </p>
                      <details>
                        <summary className="cursor-pointer text-sm">
                          Ver registro de la acción
                        </summary>
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
              </details>
            )}
          </section>
        )}
      </section>
    </Card>
  )
}
