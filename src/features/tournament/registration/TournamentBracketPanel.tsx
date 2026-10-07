import { TournamentHeading } from '../TournamentVisuals'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { bracketApi, type BracketApi, type PublishedBracket } from './bracketApi'
import { dateLabel } from './presentation'
import { useOperation } from './useOperation'
import { progressApi, type ProgressApi } from './progressApi'
import { BracketTree } from './BracketTree'
import { sourceLabel, type GraphMatch } from './bracketLayout'
import { encounterApi, type EncounterApi } from './encounterApi'
import { matchStatus } from './presentation'

export const TournamentBracketPanel = ({
  id,
  subject,
  roles,
  confirmed,
  canMutate = true,
  api = bracketApi,
  progress = progressApi,
  onChooseMatch,
  encounters = encounterApi,
}: {
  readonly id: string
  readonly subject: string
  readonly roles: readonly string[]
  readonly confirmed: number
  readonly canMutate?: boolean
  readonly api?: BracketApi
  readonly progress?: ProgressApi
  readonly onChooseMatch?: (matchId: string) => void
  readonly encounters?: EncounterApi
}): React.JSX.Element => {
  const client = useQueryClient()
  const [selection, setSelection] = useState('')
  const key = ['tournament-bracket', subject, id]
  const view = useQuery({ queryKey: key, queryFn: () => api.view(id), refetchInterval: 5000 })
  const progression = useQuery({
    queryKey: ['tournament-progress', subject, id],
    queryFn: ({ signal }) => progress.view(id, signal),
    enabled: view.data != null,
    refetchInterval: (q) => (q.state.data?.champion ? false : 5000),
    retry: false,
  })
  const bracket = progression.data?.bracket ?? view.data
  const encountersView = useQuery({
    queryKey: ['tournament-encounters', subject, id],
    queryFn: () => encounters.list(id),
    enabled: bracket != null,
    refetchInterval: 5000,
  })
  const summaryFor = (match: GraphMatch) =>
    encountersView.data?.find((m) => m.tournamentId === id && m.matchId === match.encounterId)
  const statusLabel = (match: GraphMatch): string => {
    const summary = summaryFor(match)
    if (summary) return matchStatus(summary)
    if (match.status === 'FINISHED') return 'Resultado confirmado'
    if (match.status === 'RESOLUTION_REQUIRED') return 'Finalizó sin ganador; avance detenido'
    if (match.status === 'TEAMS_RESOLVED' || match.status === 'READY')
      return 'Equipos definidos; consulta el estado de la justa'
    return 'Esperando resultados previos'
  }
  const operation = useOperation(JSON.stringify([subject, id, 'bracket']), () => view.data != null)
  const selected = bracket?.matches.find((m) => m.id === selection)
  const state = JSON.stringify([confirmed, bracket?.publishedAt])
  const publish = async (): Promise<void> => {
    const result = await operation.run('publish', state, (operationId) =>
      api.publish(id, operationId),
    )
    if (result === null) return
    client.setQueryData<PublishedBracket>(key, result)
    await client.invalidateQueries({ queryKey: ['tournament-registration', subject] })
    await client.invalidateQueries({ queryKey: ['tournament-encounters', subject, id] })
    await client.invalidateQueries({ queryKey: ['tournament-progress', subject, id] })
  }
  return (
    <Card>
      <section
        id="tournament-bracket"
        aria-label="Llaves del torneo"
        className="grid min-w-0 gap-4"
      >
        <TournamentHeading icon="bracket">Llaves del torneo</TournamentHeading>
        {view.isPending && <p role="status">Consultando llaves…</p>}
        {view.isError && (
          <div role="alert">
            <p>No se pudieron consultar las llaves.</p>
            <Button variant="secondary" onClick={() => void view.refetch()}>
              Volver a consultar llaves
            </Button>
          </div>
        )}
        {bracket === null && (
          <>
            <p>
              {confirmed === 8
                ? 'Los ocho equipos están confirmados. Falta publicar las llaves.'
                : `${confirmed === 7 ? 'Falta 1 equipo confirmado' : `Faltan ${String(8 - confirmed)} equipos confirmados`}. Se requieren ocho equipos humanos; los registros o pagos pendientes no cuentan.`}
            </p>
            {roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR') && (
              <>
                <p className="text-sm text-muted">
                  Publicar fija las posiciones y cierra la inscripción. La preparación de cada justa
                  ocurre después.
                </p>
                {operation.intent?.phase === 'UNCERTAIN' && (
                  <p role="status">
                    Publicación pendiente de comprobar. Se conserva la misma operación.
                  </p>
                )}
                <Button
                  loading={operation.busy}
                  disabled={!canMutate || view.isError || operation.intent?.phase === 'REJECTED'}
                  onClick={() => void publish()}
                >
                  {operation.intent ? 'Comprobar publicación' : 'Publicar llaves'}
                </Button>
                {operation.intent?.phase === 'REJECTED' && (
                  <Button variant="secondary" onClick={operation.resetRejected}>
                    Volver a intentar publicación
                  </Button>
                )}
              </>
            )}
          </>
        )}
        {bracket != null && (
          <>
            <p>Llaves publicadas · ocho equipos humanos · inscripción cerrada.</p>
            {progression.isPending && <p role="status">Consultando avance del torneo…</p>}
            {progression.isError && (
              <div role="alert">
                <p>
                  No se pudo actualizar el avance. El estado mostrado es el último confirmado y
                  puede estar desactualizado.
                </p>
                <Button variant="secondary" onClick={() => void progression.refetch()}>
                  Volver a consultar avance
                </Button>
              </div>
            )}
            {progression.data?.champion ? (
              <p className="font-semibold">
                Campeón confirmado · {progression.data.champion.teamName}
              </p>
            ) : progression.data !== undefined && !progression.isError ? (
              <p>La final todavía no confirma un campeón.</p>
            ) : null}
            <p className="text-sm text-muted">
              Inicio programado: {dateLabel(bracket.startsAt)} · Una sola final.
            </p>
            <BracketTree
              bracket={bracket}
              selection={selection}
              onSelect={setSelection}
              statusLabel={statusLabel}
              timeLabel={() => 'Horario pendiente del servidor'}
              winnerLabel={(match) =>
                bracket.seeds.find((seed) => seed.teamId === match.winnerTeamId)?.name ?? null
              }
            />
            {selected && (
              <section
                aria-label={`Detalle de ${selected.id}`}
                className="grid gap-2 rounded-lg border border-border p-4"
              >
                <h3 className="font-semibold">{selected.id}</h3>
                <p>{statusLabel(selected)}</p>
                <p>
                  {sourceLabel(selected.sources[0])} vs. {sourceLabel(selected.sources[1])}
                </p>
                <p>
                  {selected.destinations.winner
                    ? `Ganador pasa a ${selected.destinations.winner.matchId}.`
                    : 'El ganador de la final es el campeón.'}
                </p>
                <p>
                  {selected.destinations.loser
                    ? `Perdedor pasa a ${selected.destinations.loser.matchId}.`
                    : 'Sin destino para el perdedor.'}
                </p>
                <p className="text-sm text-muted">
                  Los estados y resultados vigentes se consultan en el registro de justas.
                </p>
                {onChooseMatch && (
                  <a
                    href="#tournament-record"
                    className="text-brand underline"
                    onClick={() => {
                      onChooseMatch(selected.encounterId)
                    }}
                  >
                    Ver registro de {selected.id}
                  </a>
                )}
              </section>
            )}
            {progression.data && progression.data.eliminatedTeamIds.length > 0 && (
              <p>
                Equipos eliminados:{' '}
                {progression.data.eliminatedTeamIds
                  .map((teamId) => bracket.seeds.find((s) => s.teamId === teamId)?.name ?? teamId)
                  .join(', ')}
                .
              </p>
            )}
          </>
        )}
        {operation.error?.state === state && bracket == null && (
          <p role="alert">{operation.error.message}</p>
        )}
      </section>
    </Card>
  )
}
