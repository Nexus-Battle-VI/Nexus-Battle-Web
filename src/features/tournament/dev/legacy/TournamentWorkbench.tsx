import { useState, useSyncExternalStore } from 'react'
import type { SyntheticEvent } from 'react'
import { ArrowUpRight, Check, Radio, Trophy, Users } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { slotLabel } from './bracket'
import { MATCH_STATUS_LABELS, TEAM_AVATARS } from './model'
import { PlayerPreparationPanel } from './PlayerPreparationPanel'
import type {
  TeamAvatar,
  TournamentActor,
  TournamentGateway,
  TournamentMatch,
  TournamentSnapshot,
  TournamentTeam,
} from './model'

type Section = 'registration' | 'bracket' | 'participation' | 'matches' | 'broadcast' | 'history'
const SECTIONS: readonly { id: Section; label: string }[] = [
  { id: 'registration', label: 'Inscripción' },
  { id: 'bracket', label: 'Llaves' },
  { id: 'participation', label: 'Mi encuentro' },
  { id: 'matches', label: 'Encuentros' },
  { id: 'broadcast', label: 'Transmisión' },
  { id: 'history', label: 'Registro' },
]
const teamName = (snapshot: TournamentSnapshot, teamId: string | null): string =>
  snapshot.teams.find((team) => team.id === teamId)?.name ?? 'Por definir'

interface MatchCardProps {
  readonly match: TournamentMatch
  readonly snapshot: TournamentSnapshot
  readonly actor: TournamentActor
  readonly busy: boolean
  readonly onStart: () => void
  readonly onSelect: () => void
}

const MatchCard = ({ match, snapshot, actor, busy, onStart, onSelect }: MatchCardProps) => {
  const ready = snapshot.preparations.filter((entry) => entry.matchId === match.id).length
  return (
    <article
      aria-label={`Encuentro ${match.id}`}
      className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-ink">{match.id}</h4>
        <span
          className={`rounded-full px-2 py-1 text-xs ${match.status === 'IN_PROGRESS' ? 'bg-brand/10 text-brand' : 'bg-surface text-muted'}`}
        >
          {MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>
      {match.teamIds.map((id, index) => (
        <div key={index} className="min-w-0 rounded-md bg-surface p-2">
          <p className="break-words text-sm font-medium text-ink">
            {id === null
              ? slotLabel(match.sources[index] ?? match.sources[0])
              : teamName(snapshot, id)}
          </p>
          {id !== null && (
            <p className="text-xs text-muted">
              {slotLabel(match.sources[index] ?? match.sources[0])}
            </p>
          )}
        </div>
      ))}
      {match.winnerId !== null && (
        <p className="text-sm text-brand">Ganó {teamName(snapshot, match.winnerId)}</p>
      )}
      {match.status === 'READY' && (
        <p className="text-xs text-muted">Héroes confirmados: {String(ready)} / 4</p>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        {actor.role === 'ADMIN' && match.status === 'READY' && (
          <Button
            disabled={busy || ready !== 4}
            onClick={onStart}
            aria-label={`Iniciar ${match.id}`}
          >
            Iniciar {match.id}
          </Button>
        )}
        {actor.id === snapshot.transmitterId && match.status === 'IN_PROGRESS' && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={onSelect}
            aria-label={`Ver ${match.id} para transmitir`}
          >
            <Radio size={14} aria-hidden="true" /> Ver para transmitir
          </Button>
        )}
      </div>
    </article>
  )
}

interface RegistrationFormProps {
  readonly actor: TournamentActor
  readonly snapshot: TournamentSnapshot
  readonly busy: boolean
  readonly onSubmit: (name: string, companionId: string, avatar: TeamAvatar) => void
}

const RegistrationForm = ({ actor, snapshot, busy, onSubmit }: RegistrationFormProps) => {
  const [name, setName] = useState('')
  const [companionId, setCompanionId] = useState('')
  const [avatar, setAvatar] = useState<TeamAvatar>('ORBIT')
  const player = snapshot.players.find((candidate) => candidate.id === actor.id)
  const available = snapshot.players.filter(
    (candidate) =>
      candidate.id !== actor.id &&
      !snapshot.teams.some((team) => team.playerIds.includes(candidate.id)),
  )
  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    onSubmit(name, companionId, avatar)
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <TextField
        label="Nombre del equipo"
        value={name}
        maxLength={32}
        onChange={(event) => {
          setName(event.target.value)
        }}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Primer jugador" value={player?.name ?? actor.name} readOnly />
        <SelectField
          label="Segundo jugador"
          placeholder="Selecciona un compañero"
          value={companionId}
          onChange={(event) => {
            setCompanionId(event.target.value)
          }}
          options={available.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          required
        />
      </div>
      <SelectField
        label="Avatar del equipo"
        value={avatar}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'ORBIT' || value === 'BOLT' || value === 'SHIELD') setAvatar(value)
        }}
        options={Object.entries(TEAM_AVATARS).map(([value, item]) => ({
          value,
          label: `${item.symbol} ${item.label}`,
        }))}
      />
      <p className="text-sm text-muted">
        Dos jugadores por equipo. El cupo se confirma después del pago.
      </p>
      <Button type="submit" loading={busy} className="justify-self-start">
        Inscribir equipo
      </Button>
    </form>
  )
}

const TeamList = ({
  teams,
  snapshot,
}: {
  readonly teams: readonly TournamentTeam[]
  readonly snapshot: TournamentSnapshot
}) => (
  <ul className="grid gap-2" aria-label="Equipos inscritos">
    {teams.map((team) => (
      <li key={team.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xl text-brand"
        >
          {TEAM_AVATARS[team.avatar].symbol}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-ink">{team.name}</p>
          <p className="break-words text-xs text-muted">
            {team.playerIds
              .map(
                (id) =>
                  snapshot.players.find((player) => player.id === id)?.name ??
                  'Jugador no disponible',
              )
              .join(' + ')}
          </p>
        </div>
        <span className={`text-xs ${team.status === 'CONFIRMED' ? 'text-brand' : 'text-muted'}`}>
          {team.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente de pago'}
        </span>
      </li>
    ))}
  </ul>
)

export interface TournamentWorkbenchProps {
  readonly gateway: TournamentGateway
  readonly actor: TournamentActor
}

/** Reusable UI. All authoritative transitions are delegated to the injected gateway. */
export const TournamentWorkbench = ({
  gateway,
  actor,
}: TournamentWorkbenchProps): React.JSX.Element => {
  const snapshot = useSyncExternalStore(gateway.subscribe, gateway.getSnapshot, gateway.getSnapshot)
  const [section, setSection] = useState<Section>('registration')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const confirmed = snapshot.teams.filter((team) => team.status === 'CONFIRMED')
  const myTeam = snapshot.teams.find((team) => team.playerIds.includes(actor.id))
  const myMatches = snapshot.matches.filter(
    (match) => myTeam !== undefined && match.teamIds.includes(myTeam.id),
  )
  const myMatch =
    myMatches.find((match) => match.status === 'IN_PROGRESS') ??
    myMatches.find((match) => match.status === 'READY')
  const inProgress = snapshot.matches.filter((match) => match.status === 'IN_PROGRESS')
  const selected = snapshot.matches.find((match) => match.id === snapshot.selectedMatchId)
  const transmitter = actor.id === snapshot.transmitterId && actor.role === 'ADMIN'

  const run = async (
    command: () => Promise<void>,
    text: string,
    nextSection?: Section,
  ): Promise<void> => {
    setBusy(true)
    setNotice(null)
    try {
      await command()
      setNotice({ text, error: false })
      if (nextSection !== undefined) setSection(nextSection)
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'No se pudo completar la acción.',
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }
  const matchCard = (match: TournamentMatch) => (
    <MatchCard
      key={match.id}
      match={match}
      snapshot={snapshot}
      actor={actor}
      busy={busy}
      onStart={() => {
        void run(
          () => gateway.startMatch(actor.id, match.id, crypto.randomUUID()),
          `${match.id} iniciado. Los demás encuentros pueden continuar.`,
        )
      }}
      onSelect={() => {
        void run(
          () => gateway.selectMatch(actor.id, match.id),
          `Vista de captura: ${match.id}.`,
          'broadcast',
        )
      }}
    />
  )

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Torneo</h1>
          <p className="text-sm text-muted">
            Inscribe tu equipo, consulta las llaves y sigue los encuentros.
          </p>
          <p className="mt-2 text-sm font-medium text-ink">{snapshot.name}</p>
          <p className="mt-1 text-xs text-brand">
            8 equipos humanos · 2 contra 2 · un héroe por jugador
          </p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
          href={snapshot.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Canal de YouTube <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Cupos confirmados',
            value: `${String(confirmed.length)} / ${String(snapshot.capacity)}`,
            icon: Users,
          },
          { label: 'Encuentros en curso', value: String(inProgress.length), icon: Radio },
          {
            label: 'Inscripciones',
            value: snapshot.status === 'REGISTRATION' ? 'Abiertas' : 'Cerradas',
            icon: Check,
          },
          {
            label: 'Campeón',
            value:
              snapshot.championId === null
                ? 'Por definir'
                : teamName(snapshot, snapshot.championId),
            icon: Trophy,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-lg border border-border bg-surface-raised p-4"
          >
            <p className="flex items-center gap-2 text-xs text-muted">
              <Icon size={15} aria-hidden="true" />
              {label}
            </p>
            <p className="mt-2 break-words text-lg font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {actor.role === 'ADMIN' && snapshot.status === 'REGISTRATION' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/25 bg-brand/5 p-4">
          <p className="max-w-2xl text-sm text-ink">
            {confirmed.length === 8
              ? 'Los ocho equipos tienen cupo confirmado. Ya puedes publicar las llaves y cerrar las inscripciones.'
              : `${confirmed.length === 7 ? 'Falta 1 equipo humano' : `Faltan ${String(8 - confirmed.length)} equipos humanos`} con cupo confirmado. Las inscripciones siguen abiertas.`}
          </p>
          <Button
            disabled={busy || confirmed.length !== 8}
            onClick={() => {
              void run(
                () => gateway.publishBracket(actor.id, crypto.randomUUID()),
                'Llaves publicadas. Cada jugador debe confirmar su héroe antes de iniciar.',
                'bracket',
              )
            }}
          >
            Publicar llaves
          </Button>
        </div>
      )}
      <nav
        aria-label="Secciones del torneo"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {SECTIONS.map((item) => (
          <Button
            key={item.id}
            variant={section === item.id ? 'primary' : 'secondary'}
            aria-pressed={section === item.id}
            onClick={() => {
              setSection(item.id)
              setNotice(null)
            }}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      {notice !== null && (
        <p
          role={notice.error ? 'alert' : 'status'}
          className={`rounded-lg border p-3 text-sm ${notice.error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-brand/25 bg-brand/5 text-ink'}`}
        >
          {notice.text}
        </p>
      )}

      {section === 'registration' && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card
            title="Tu equipo"
            description={`Inscripción: ${String(snapshot.entryFee)} créditos por equipo.`}
          >
            {actor.role === 'VISITOR' ? (
              <p className="text-sm text-muted">
                Inicia sesión para inscribir un equipo. Puedes consultar las llaves y abrir el canal
                público.
              </p>
            ) : myTeam !== undefined ? (
              <div className="grid gap-4">
                <p className="text-lg font-semibold text-ink">{myTeam.name}</p>
                <p className="text-sm text-muted">
                  {myTeam.status === 'CONFIRMED'
                    ? 'Cupo confirmado. Tu equipo aparecerá en las llaves.'
                    : 'Equipo inscrito. El cupo todavía no está confirmado.'}
                </p>
                <p className="text-sm text-muted">
                  Saldo de prueba: {String(snapshot.balances[actor.id] ?? 0)} créditos
                </p>
                {myTeam.status === 'PENDING_PAYMENT' &&
                  snapshot.status === 'REGISTRATION' &&
                  myTeam.ownerId === actor.id && (
                    <Button
                      disabled={busy}
                      className="justify-self-start"
                      onClick={() => {
                        void run(
                          () => gateway.confirmEntry(actor.id, myTeam.id, crypto.randomUUID()),
                          'Pago de prueba confirmado. Tu equipo ya tiene cupo.',
                        )
                      }}
                    >
                      Confirmar cupo · pago de prueba
                    </Button>
                  )}
              </div>
            ) : snapshot.status === 'REGISTRATION' && confirmed.length < snapshot.capacity ? (
              <RegistrationForm
                key={actor.id}
                actor={actor}
                snapshot={snapshot}
                busy={busy}
                onSubmit={(name, companionId, avatar) => {
                  void run(
                    () =>
                      gateway.registerTeam(
                        actor.id,
                        { name, playerIds: [actor.id, companionId], avatar },
                        crypto.randomUUID(),
                      ),
                    'Equipo inscrito. Falta confirmar el pago para obtener el cupo.',
                  )
                }}
              />
            ) : (
              <p className="text-sm text-muted">No hay inscripciones disponibles en este torneo.</p>
            )}
          </Card>
          <Card
            title="Equipos inscritos"
            description="Los equipos pendientes de pago aún no ocupan un cupo confirmado."
          >
            <TeamList teams={snapshot.teams} snapshot={snapshot} />
          </Card>
        </div>
      )}

      {section === 'bracket' &&
        (snapshot.matches.length === 0 ? (
          <Card title="Llaves por publicar">
            <p className="text-sm text-muted">
              Se necesitan ocho equipos humanos con cupo confirmado para publicar las llaves.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {(['MAIN', 'SECONDARY', 'FINAL'] as const).map((track) => (
              <section
                key={track}
                aria-label={
                  track === 'MAIN'
                    ? 'Cuadro principal'
                    : track === 'SECONDARY'
                      ? 'Cuadro secundario'
                      : 'Final del torneo'
                }
              >
                <h2 className="mb-3 text-lg font-semibold text-ink">
                  {track === 'MAIN'
                    ? 'Cuadro principal'
                    : track === 'SECONDARY'
                      ? 'Cuadro secundario'
                      : 'Final del torneo'}
                </h2>
                <div className="grid items-start gap-3 lg:grid-cols-4">
                  {[1, 2, 3, 4]
                    .filter((round) =>
                      snapshot.matches.some(
                        (match) => match.track === track && match.round === round,
                      ),
                    )
                    .map((round) => (
                      <div key={round} className="grid gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {track === 'FINAL' ? 'Campeonato' : `Ronda ${String(round)}`}
                        </h3>
                        {snapshot.matches
                          .filter((match) => match.track === track && match.round === round)
                          .map(matchCard)}
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        ))}

      {section === 'participation' && (
        <PlayerPreparationPanel
          key={`${actor.id}-${myMatch?.id ?? 'waiting'}`}
          actor={actor}
          snapshot={snapshot}
          match={myMatch}
          busy={busy}
          onConfirm={(heroId) => {
            if (myMatch === undefined) return
            void run(
              () => gateway.preparePlayer(actor.id, myMatch.id, heroId, crypto.randomUUID()),
              `Tu héroe está confirmado para ${myMatch.id}.`,
            )
          }}
        />
      )}

      {section === 'matches' && (
        <Card
          title="Encuentros"
          description="Con cuatro héroes confirmados, cada encuentro puede empezar aunque otros sigan en curso."
        >
          {snapshot.matches.length === 0 ? (
            <p className="text-sm text-muted">Publica las llaves para habilitar los encuentros.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.matches.filter((match) => match.status !== 'WAITING').map(matchCard)}
            </div>
          )}
        </Card>
      )}

      {section === 'broadcast' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card
            title={transmitter ? 'Vista para capturar con OBS' : 'Transmisión pública'}
            description={
              transmitter
                ? 'Selecciona cualquier encuentro en curso. Esta vista es de solo lectura.'
                : 'Las emisiones y sus grabaciones se consultan en el canal de YouTube.'
            }
          >
            {transmitter ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2" aria-label="Elegir encuentro para transmitir">
                  {inProgress.map((match) => (
                    <Button
                      key={match.id}
                      disabled={busy}
                      variant={selected?.id === match.id ? 'primary' : 'secondary'}
                      aria-pressed={selected?.id === match.id}
                      onClick={() => {
                        void run(
                          () => gateway.selectMatch(actor.id, match.id),
                          `Vista de captura: ${match.id}.`,
                        )
                      }}
                    >
                      Ver {match.id}
                    </Button>
                  ))}
                </div>
                <section
                  aria-label="Vista de captura"
                  className="min-w-0 rounded-xl border border-brand/30 bg-surface p-5 sm:p-8"
                >
                  {selected === undefined ? (
                    <p className="text-sm text-muted">
                      Inicia un encuentro y selecciónalo para preparar la captura.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                        {selected.id} · {MATCH_STATUS_LABELS[selected.status]}
                      </p>
                      <h3 className="my-6 break-words text-center text-xl font-semibold text-ink sm:text-3xl">
                        {teamName(snapshot, selected.teamIds[0])}
                        <span className="mx-3 text-muted">vs.</span>
                        {teamName(snapshot, selected.teamIds[1])}
                      </h3>
                      {selected.winnerId !== null && (
                        <p className="text-center font-medium text-brand">
                          Ganador: {teamName(snapshot, selected.winnerId)}
                        </p>
                      )}
                      <ul
                        className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-muted"
                        aria-label="Registro del encuentro seleccionado"
                      >
                        {snapshot.records
                          .filter(
                            (record) =>
                              record.matchId === selected.id &&
                              record.battleId === selected.battleId,
                          )
                          .map((record) => (
                            <li key={record.id}>{record.description}</li>
                          ))}
                      </ul>
                    </>
                  )}
                </section>
              </div>
            ) : (
              <p className="text-sm text-muted">
                {actor.role === 'ADMIN'
                  ? 'El control de captura pertenece al administrador transmisor asignado.'
                  : 'Puedes ver la emisión sin tener una cuenta en Nexus Battles.'}
              </p>
            )}
          </Card>
          <Card title="Canal oficial">
            <p className="font-semibold text-ink">NexusBattlesVI</p>
            <p className="mt-3 text-sm text-muted">
              El canal ya está creado. Aún falta comprobar una emisión pública con imagen y audio.
            </p>
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand underline underline-offset-4"
              href={snapshot.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir YouTube <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            {transmitter && (
              <ol className="mt-5 list-inside list-decimal space-y-2 text-sm text-muted">
                <li>Selecciona el encuentro.</li>
                <li>Captura esta vista con OBS.</li>
                <li>Inicia la emisión desde OBS y YouTube.</li>
                <li>Comprueba imagen y audio desde el enlace público.</li>
              </ol>
            )}
            <p className="mt-5 text-xs text-muted">
              Los vídeos se conservan en YouTube. Nexus registra los encuentros.
            </p>
          </Card>
        </div>
      )}

      {section === 'history' && (
        <Card
          title="Registro del torneo"
          description="Incluye todos los encuentros, aunque el transmisor esté viendo otro."
        >
          {snapshot.records.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay encuentros registrados.</p>
          ) : (
            <ol className="grid gap-3">
              {snapshot.records.map((record) => (
                <li key={record.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <span className="shrink-0 rounded-md bg-brand/10 px-2 py-1 text-sm font-semibold text-brand">
                    {record.matchId}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm text-ink">{record.description}</p>
                    <time className="text-xs text-muted" dateTime={record.at}>
                      {new Date(record.at).toLocaleTimeString('es-CO')}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  )
}
