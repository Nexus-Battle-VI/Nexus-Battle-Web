import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/form/SelectField'

import type { TournamentActor, TournamentMatch, TournamentSnapshot } from './model'

interface PlayerPreparationPanelProps {
  readonly snapshot: TournamentSnapshot
  readonly actor: TournamentActor
  readonly match: TournamentMatch | undefined
  readonly busy: boolean
  readonly onConfirm: (heroId: string) => void
}

/** Each actor prepares only their own hero. Combat remains the owner of gameplay. */
export const PlayerPreparationPanel = ({
  snapshot,
  actor,
  match,
  busy,
  onConfirm,
}: PlayerPreparationPanelProps): React.JSX.Element => {
  const [heroId, setHeroId] = useState('')
  const heroes = snapshot.heroes.filter((hero) => hero.ownerId === actor.id && hero.available)
  const preparation = snapshot.preparations.find(
    (entry) => entry.matchId === match?.id && entry.playerId === actor.id,
  )
  const players =
    match?.teamIds.flatMap(
      (teamId) => snapshot.teams.find((team) => team.id === teamId)?.playerIds ?? [],
    ) ?? []
  const ready = snapshot.preparations.filter(
    (entry) => entry.matchId === match?.id && players.includes(entry.playerId),
  ).length

  return (
    <Card
      title="Mi encuentro"
      description="2 contra 2 · cada jugador participa con un héroe propio."
    >
      {actor.role === 'VISITOR' ? (
        <p className="text-sm text-muted">Inicia sesión para preparar y jugar tus encuentros.</p>
      ) : match === undefined ? (
        <p className="text-sm text-muted">
          {snapshot.status === 'REGISTRATION'
            ? 'Confirma el cupo de tu equipo. Tu encuentro aparecerá cuando se publiquen las llaves.'
            : snapshot.status === 'FINISHED'
              ? 'El torneo terminó. Puedes consultar el resultado y el registro.'
              : 'No tienes un encuentro disponible. Consulta las llaves y espera los resultados anteriores.'}
        </p>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ink">Tu encuentro: {match.id}</p>
            <p className="text-sm text-muted">Listos: {String(ready)} / 4</p>
          </div>
          <ul aria-label={`Jugadores de ${match.id}`} className="grid gap-2 sm:grid-cols-2">
            {players.map((playerId) => {
              const selected = snapshot.preparations.find(
                (entry) => entry.matchId === match.id && entry.playerId === playerId,
              )
              const hero = snapshot.heroes.find((candidate) => candidate.id === selected?.heroId)
              const team = snapshot.teams.find((candidate) =>
                candidate.playerIds.includes(playerId),
              )
              return (
                <li key={playerId} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-ink">
                    {snapshot.players.find((player) => player.id === playerId)?.name}
                    {playerId === actor.id && ' · tú'}
                  </p>
                  <p className="text-xs text-muted">{team?.name}</p>
                  <p className={`mt-2 text-sm ${hero === undefined ? 'text-muted' : 'text-brand'}`}>
                    {hero === undefined ? 'Pendiente de confirmar héroe' : `${hero.name} · listo`}
                  </p>
                </li>
              )
            })}
          </ul>
          {match.status === 'READY' ? (
            <div className="grid max-w-md gap-3">
              <SelectField
                label="Mi héroe"
                placeholder="Selecciona tu héroe disponible"
                value={heroId}
                options={heroes.map((hero) => ({ value: hero.id, label: hero.name }))}
                onChange={(event) => {
                  setHeroId(event.target.value)
                }}
              />
              {heroes.length === 0 && (
                <p className="text-sm text-muted">No tienes un héroe disponible para esta justa.</p>
              )}
              <Button
                disabled={busy || heroId === ''}
                className="justify-self-start"
                onClick={() => {
                  onConfirm(heroId)
                }}
              >
                {preparation === undefined ? 'Confirmar mi héroe' : 'Actualizar mi héroe'}
              </Button>
              <p className="text-xs text-muted">
                Cada compañero confirma el suyo. El administrador inicia cuando los cuatro están
                listos.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Encuentro en curso. La conexión con la sala de Combat está pendiente en esta prueba
              local.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
