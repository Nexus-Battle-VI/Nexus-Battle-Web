import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  bracketApi,
  type BracketApi,
  type BracketSource,
  type PublishedBracket,
} from './bracketApi'
import { dateLabel } from './presentation'
import { useOperation } from './useOperation'

const sourceLabel = (source: BracketSource): string =>
  source.kind === 'SEED'
    ? `Cupo ${String(source.position)}`
    : `${source.kind === 'WINNER' ? 'Ganador' : 'Perdedor'} de ${source.matchId}`
const tracks = [
  ['MAIN', 'Árbol de ganadores'],
  ['SECONDARY', 'Árbol de secundarios'],
  ['FINAL', 'Final'],
] as const
export const TournamentBracketPanel = ({
  id,
  subject,
  roles,
  confirmed,
  canMutate = true,
  api = bracketApi,
}: {
  readonly id: string
  readonly subject: string
  readonly roles: readonly string[]
  readonly confirmed: number
  readonly canMutate?: boolean
  readonly api?: BracketApi
}): React.JSX.Element => {
  const client = useQueryClient()
  const [selection, setSelection] = useState('')
  const key = ['tournament-bracket', subject, id]
  const view = useQuery({ queryKey: key, queryFn: () => api.view(id), refetchInterval: 5000 })
  const bracket = view.data
  const operation = useOperation(JSON.stringify([subject, id, 'bracket']), () => bracket != null)
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
  }
  const teamLabel = (teamId: string | null, source: BracketSource): string =>
    bracket?.seeds.find((s) => s.teamId === teamId)?.name ?? sourceLabel(source)
  return (
    <Card>
      <section aria-label="Llaves del torneo" className="grid min-w-0 gap-4">
        <h2 className="font-game-display text-xl">Llaves del torneo</h2>
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
                  disabled={confirmed !== 8 || !canMutate || view.isError}
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
            <p className="text-sm text-muted">
              Inicio programado: {dateLabel(bracket.startsAt)} · Una sola final.
            </p>
            <ol aria-label="Posiciones de equipos" className="grid gap-2 sm:grid-cols-2">
              {bracket.seeds.map((seed) => (
                <li key={seed.teamId}>
                  Cupo {String(seed.position)} · {seed.name}
                </li>
              ))}
            </ol>
            <div className="grid min-w-0 gap-5 lg:grid-cols-3">
              {tracks.map(([track, title]) => (
                <section
                  key={track}
                  aria-label={title}
                  className="grid min-w-0 content-start gap-2"
                >
                  <h3 className="font-semibold">{title}</h3>
                  {bracket.matches
                    .filter((m) => m.track === track)
                    .map((match) => (
                      <button
                        key={match.encounterId}
                        type="button"
                        aria-pressed={selection === match.id}
                        className="min-w-0 rounded-lg border border-border p-3 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
                        onClick={() => {
                          setSelection(match.id)
                        }}
                      >
                        <span className="block font-semibold">
                          {match.id} · Ronda {String(match.round)}
                        </span>
                        <span className="block">
                          {teamLabel(match.teamIds[0], match.sources[0])} vs.{' '}
                          {teamLabel(match.teamIds[1], match.sources[1])}
                        </span>
                        <span className="block text-muted">
                          {match.status === 'TEAMS_RESOLVED'
                            ? 'Equipos definidos; preparación pendiente'
                            : 'Esperando resultados previos'}
                        </span>
                      </button>
                    ))}
                </section>
              ))}
            </div>
            {selected && (
              <section
                aria-label={`Detalle de ${selected.id}`}
                className="grid gap-2 rounded-lg border border-border p-4"
              >
                <h3 className="font-semibold">{selected.id}</h3>
                <p className="break-all text-sm">Identidad del encuentro: {selected.encounterId}</p>
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
              </section>
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
