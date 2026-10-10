import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArenaIcon as Crown,
  CreateIcon as Plus,
  TransmissionIcon as Radio,
  BracketIcon as Swords,
  EncounterIcon as Ticket,
  PrizeIcon as Trophy,
  TeamIcon as Users,
} from '../TournamentVisuals'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { useSession } from '@/shared/session'
import { invalidateWallet, useRefreshWalletOn } from '@/shared/wallet'
import { registrationApi, type RegistrationApi, type EntryTeam, type EntryView } from './api'
import type { BracketApi } from './bracketApi'
import type { EncounterApi } from './encounterApi'
import type { EncounterAdminApi, MatchAcceptanceApi } from './encounterAdminApi'
import { TournamentAcceptancePanel } from './TournamentAcceptancePanel'
import { TournamentEncounterAdminPanel } from './TournamentEncounterAdminPanel'
import { useTournamentAssets } from '../tournamentAssets'
import { TournamentEmptyState } from '../TournamentVisuals'
import type { AvatarDownload } from './TeamAvatar'
import { CreateTournamentPanel } from './CreateTournamentPanel'
import { TournamentBracketPanel } from './TournamentBracketPanel'
import { TournamentEncountersPanel } from './TournamentEncountersPanel'
import { RegisterTeamForm } from './RegisterTeamForm'
import { TeamRegistrationCard } from './TeamRegistrationCard'
import { TournamentExternalLinksPanel } from '@/features/tournament/links/TournamentExternalLinksPanel'
import type { TournamentLinksApi } from '@/features/tournament/links/api'
import type { ProgressApi } from './progressApi'
import { TournamentPrizePanel } from './TournamentPrizePanel'
import type { PrizeApi } from './prizeApi'
import { TournamentBroadcastPanel } from '@/features/tournament/broadcast/TournamentBroadcastPanel'
import type { BroadcastApi } from '@/features/tournament/broadcast/api'
import { dateLabel, priceLabel } from './presentation'
import { membersOf, modeOf, modalities } from './modalities'
import './tournament.css'

interface Props {
  readonly acceptance?: MatchAcceptanceApi
  readonly api?: RegistrationApi
  readonly brackets?: BracketApi
  readonly encounters?: EncounterApi
  readonly encounterAdmin?: EncounterAdminApi
  readonly avatarDownload?: AvatarDownload
  readonly links?: TournamentLinksApi
  readonly progress?: ProgressApi
  readonly prizes?: PrizeApi
  readonly broadcasts?: BroadcastApi
  /** Injection for isolated component previews/tests; routes always use the real session. */
  readonly identity?: {
    readonly subject: string | null
    readonly roles: readonly string[]
    readonly displayName?: string | null
  }
}
export const TournamentRegistrationPage = (props: Props): React.JSX.Element => {
  const subject = useSession((s) => s.subject)
  const roles = useSession((s) => s.roles)
  const displayName = useSession((s) => s.displayName)
  const identity = props.identity ?? { subject, roles, displayName }
  if (identity.subject === null)
    return <p>Inicia sesión para inscribir tu equipo o responder a un registro.</p>
  return (
    <RegistrationContent
      key={identity.subject}
      {...props}
      subject={identity.subject}
      roles={identity.roles}
      displayName={identity.displayName ?? null}
    />
  )
}
const RegistrationContent = ({
  subject,
  roles,
  api = registrationApi,
  brackets,
  encounters,
  encounterAdmin,
  acceptance,
  avatarDownload,
  links,
  progress,
  prizes,
  broadcasts,
  displayName,
}: Props & {
  readonly subject: string
  readonly roles: readonly string[]
  readonly displayName: string | null
}): React.JSX.Element => {
  const client = useQueryClient()
  const assetStyles = useTournamentAssets()
  const [chosenId, setChosenId] = useState('')
  const [creating, setCreating] = useState(false)
  const list = useQuery({
    queryKey: ['tournament-registration', subject, 'list'],
    queryFn: () => api.list(),
    refetchInterval: 10000,
  })
  const selected = list.data?.some((t) => t.id === chosenId)
    ? chosenId
    : (list.data?.find((t) => t.open)?.id ?? list.data?.[0]?.id ?? chosenId)
  return (
    <section
      style={assetStyles}
      className="tournament-page tournament-skin grid min-w-0 gap-6"
      aria-label="Torneo"
    >
      <header className="tournament-page-heading">
        <h1 className="font-game-display text-3xl text-ink">Torneo</h1>
        {roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR') && !creating && (
          <Button
            variant="secondary"
            onClick={() => {
              setCreating(true)
            }}
          >
            <Plus size={18} aria-hidden="true" /> Crear torneo
          </Button>
        )}
      </header>
      {creating ? (
        <div className="tournament-create grid gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setCreating(false)
            }}
          >
            Volver al torneo
          </Button>
          <CreateTournamentPanel
            key={subject}
            subject={subject}
            api={api}
            initiallyOpen
            onCreated={(id) => {
              setChosenId(id)
              setCreating(false)
              void client.invalidateQueries({ queryKey: ['tournament-registration', subject] })
            }}
          />
        </div>
      ) : (
        <>
          {list.isPending && <p role="status">Consultando torneos…</p>}
          {list.isError && (
            <div role="alert">
              <p>No se pudo consultar la lista de torneos.</p>
              <Button variant="secondary" onClick={() => void list.refetch()}>
                Volver a consultar torneos
              </Button>
            </div>
          )}
          {list.data?.length === 0 && (
            <TournamentEmptyState>No hay torneos disponibles todavía.</TournamentEmptyState>
          )}
          {list.data !== undefined && list.data.length > 0 && (
            <SelectField
              label="Torneo"
              value={selected}
              options={list.data.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(event) => {
                setChosenId(event.target.value)
              }}
            />
          )}
          {selected !== '' && (
            <TournamentContent
              key={JSON.stringify([subject, selected])}
              id={selected}
              subject={subject}
              roles={roles}
              displayName={displayName}
              api={api}
              {...(brackets ? { brackets } : {})}
              {...(encounters ? { encounters } : {})}
              {...(encounterAdmin ? { encounterAdmin } : {})}
              {...(acceptance ? { acceptance } : {})}
              {...(avatarDownload ? { avatarDownload } : {})}
              {...(links ? { links } : {})}
              {...(progress ? { progress } : {})}
              {...(prizes ? { prizes } : {})}
              {...(broadcasts ? { broadcasts } : {})}
            />
          )}
        </>
      )}
    </section>
  )
}
const TournamentContent = ({
  id,
  subject,
  roles,
  api,
  brackets,
  encounters,
  encounterAdmin,
  acceptance,
  avatarDownload,
  links,
  progress,
  prizes,
  broadcasts,
  displayName,
}: {
  readonly id: string
  readonly subject: string
  readonly roles: readonly string[]
  readonly api: RegistrationApi
  readonly displayName: string | null
} & Props): React.JSX.Element => {
  const client = useQueryClient()
  const [selectedMatchId, chooseMatch] = useState('')
  const [tab, setTab] = useState<
    'arena' | 'equipo' | 'llaves' | 'encuentros' | 'premio' | 'directo'
  >(roles.includes('PLAYER') ? 'equipo' : 'arena')
  const openMatch = (matchId: string): void => {
    chooseMatch(matchId)
    setTab('encuentros')
  }
  const key = ['tournament-registration', subject, id]
  const view = useQuery({
    queryKey: key,
    queryFn: () => api.view(id),
    refetchInterval: (query) =>
      query.state.data?.tournament.open ||
      query.state.data?.teams.some((t) =>
        ['AWAITING_CONSENT', 'PENDING_PAYMENT', 'PAYMENT_PENDING', 'COMPENSATING'].includes(
          t.status,
        ),
      )
        ? 3000
        : 10000,
  })
  const snapshot = view.data
  const active = snapshot?.teams.find(
    (t) => t.status !== 'CANCELLED' && membersOf(t).some((member) => member.subject === subject),
  )
  const mode = snapshot ? modeOf(snapshot.tournament) : 'DUO'
  const format = modalities[mode]
  useRefreshWalletOn(
    active?.ownerId === subject
      ? JSON.stringify([id, active.status, active.entryReceipt?.payment.chargeId, active.failure])
      : null,
  )
  const result = async (team: EntryTeam): Promise<void> => {
    client.setQueryData<EntryView>(key, (previous) =>
      previous === undefined
        ? previous
        : {
            ...previous,
            teams: [...previous.teams.filter((t) => t.id !== team.id), team],
          },
    )
    if (team.status === 'CONFIRMED' || team.status === 'COMPENSATING') invalidateWallet(client)
    await client.invalidateQueries({ queryKey: ['tournament-registration', subject] })
  }
  const bracketPanel = snapshot && (
    <TournamentBracketPanel
      id={id}
      subject={subject}
      roles={roles}
      confirmed={snapshot.capacity.confirmed}
      canMutate={!view.isError}
      {...(brackets ? { api: brackets } : {})}
      {...(progress ? { progress } : {})}
      onChooseMatch={openMatch}
      {...(encounters ? { encounters } : {})}
    />
  )
  return (
    <>
      {view.isPending && <p role="status">Consultando inscripción…</p>}
      {view.isError && (
        <div role="alert">
          <p>No se pudo actualizar la inscripción. Comprueba el estado antes de continuar.</p>
          <Button variant="secondary" onClick={() => void view.refetch()}>
            Volver a consultar inscripción
          </Button>
        </div>
      )}
      {snapshot !== undefined && (
        <>
          <header className="tournament-hero">
            <div>
              <p className="tournament-eyebrow">
                ARENA · {format.label} · {format.summary}
              </p>
              {snapshot.capacity.confirmedPeople !== undefined && (
                <p className="text-sm text-muted">
                  {snapshot.capacity.confirmedPeople} de{' '}
                  {snapshot.capacity.totalPeople ?? format.size * 8} personas confirmadas
                </p>
              )}
              <h2 className="font-game-display text-xl">{snapshot.tournament.name}</h2>
              <p className="text-sm text-muted">
                {String(snapshot.capacity.confirmed)} de 8 {format.slots} confirmados ·{' '}
                {snapshot.tournament.open ? 'Inscripciones abiertas' : 'Inscripciones cerradas'}
              </p>
            </div>
            <Trophy size={32} aria-hidden="true" />
          </header>
          <nav aria-label="Secciones del torneo" className="tournament-tabs">
            {(
              [
                ['arena', 'Arena', Crown],
                ['equipo', 'Mi equipo', Users],
                ['llaves', 'Llaves', Swords],
                ['encuentros', 'Justas e historial', Ticket],
                ['premio', 'Premio', Trophy],
                ['directo', 'Transmisión', Radio],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-current={tab === value ? 'page' : undefined}
                onClick={() => {
                  setTab(value)
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          {tab === 'arena' && (
            <div className="tournament-overview">
              <Card>
                <h3 className="font-game-display text-xl">Tu siguiente paso</h3>
                <p className="mt-2 font-semibold">
                  {snapshot.tournament.bracketPublished
                    ? 'Consulta las llaves y el registro de tu próxima justa.'
                    : active?.status === 'AWAITING_CONSENT'
                      ? membersOf(active).find((member) => member.subject === subject)
                          ?.consentAt === null
                        ? 'Acepta participar con tu equipo para continuar.'
                        : 'Cada compañero pendiente debe aceptar antes de confirmar el cupo.'
                      : active?.status === 'PENDING_PAYMENT'
                        ? active.ownerId === subject
                          ? 'Revisa el precio y confirma el cupo de tu equipo.'
                          : 'El creador del equipo debe confirmar el cupo.'
                        : active?.status === 'PAYMENT_PENDING' || active?.status === 'COMPENSATING'
                          ? 'La operación está en comprobación. Consulta su estado antes de continuar.'
                          : active?.status === 'CONFIRMED'
                            ? 'Tu equipo está inscrito. Consulta las llaves cuando se publiquen.'
                            : snapshot.tournament.open && roles.includes('PLAYER')
                              ? `Registra tu participación ${format.label} para continuar.`
                              : 'Consulta las justas y los accesos a la transmisión.'}
                </p>
                {snapshot.tournament.entryPolicy.free ? (
                  <p className="mt-2">Inscripción gratuita · sin cobro</p>
                ) : (
                  <ul className="mt-2 grid gap-1" aria-label="Importes configurados">
                    {snapshot.tournament.entryPolicy.methods.map((m) => (
                      <li key={m.method}>{priceLabel(m)}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 font-semibold">
                  {String(snapshot.capacity.confirmed)} de 8 {format.slots} confirmados.
                </p>
                <p className="font-semibold">
                  {snapshot.capacity.confirmedPeople === undefined
                    ? snapshot.tournament.contractVersion === undefined ||
                      snapshot.tournament.contractVersion === 'torneos-hu77-84-78-hu83-v2.0.0'
                      ? `${String(snapshot.capacity.confirmed * 2)} de 16 personas confirmadas.`
                      : 'Personas confirmadas: pendiente de consultar al servidor.'
                    : `${String(snapshot.capacity.confirmedPeople)} de ${String(snapshot.capacity.totalPeople ?? format.size * 8)} personas confirmadas.`}
                </p>
                <p className="text-sm text-muted">
                  {String(snapshot.capacity.reserved)} cupos en comprobación ·{' '}
                  {String(snapshot.capacity.available)} disponibles según el servidor.
                </p>
                <p className="mt-2">
                  {snapshot.tournament.open ? 'Inscripciones abiertas.' : 'Inscripciones cerradas.'}
                </p>
                <p className="text-sm text-muted">
                  Cierre de inscripción: {dateLabel(snapshot.tournament.closesAt)} ·{' '}
                  {snapshot.tournament.acceptancePolicy === 'ROUND_ACCEPTANCE_V1'
                    ? 'Primera aceptación'
                    : 'Inicio programado'}
                  : {dateLabel(snapshot.tournament.startsAt)}
                </p>
                <Button className="mt-3" variant="secondary" onClick={() => void view.refetch()}>
                  Actualizar inscripción
                </Button>
                <Button
                  className="mt-3 ml-2"
                  onClick={() => {
                    setTab(snapshot.tournament.bracketPublished ? 'llaves' : 'equipo')
                  }}
                >
                  {snapshot.tournament.bracketPublished ? 'Consultar llaves' : 'Ir a mi equipo'}
                </Button>
              </Card>
              {snapshot.tournament.roundSchedule &&
                snapshot.tournament.roundSchedule.length > 0 && (
                  <Card>
                    <div
                      className="tournament-calendar-scroll"
                      tabIndex={0}
                      aria-label="Calendario confirmado del servidor"
                    >
                      <table className="tournament-calendar">
                        <caption>Calendario confirmado · horarios fijos del servidor</caption>
                        <thead>
                          <tr>
                            <th>Ronda</th>
                            <th>Aceptación personal</th>
                            <th>Inicio previsto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.tournament.roundSchedule.map((round) => (
                            <tr key={round.round}>
                              <th>{round.round}</th>
                              <td>
                                {dateLabel(round.acceptanceOpensAt)} –{' '}
                                {dateLabel(round.acceptanceClosesAt)}
                              </td>
                              <td>{dateLabel(round.scheduledStartAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
            </div>
          )}
          {(tab === 'arena' || tab === 'encuentros') &&
            roles.includes('PLAYER') &&
            snapshot.tournament.acceptancePolicy === 'ROUND_ACCEPTANCE_V1' &&
            snapshot.tournament.bracketPublished && (
              <TournamentAcceptancePanel
                id={id}
                subject={subject}
                {...(encounters ? { encounters } : {})}
                {...(acceptance ? { api: acceptance } : {})}
              />
            )}
          {tab === 'equipo' && (
            <>
              <section
                id="tournament-entry"
                aria-label="Inscripción del equipo"
                className="grid gap-4"
              >
                {roles.includes('PLAYER') && (
                  <details className="tournament-technical">
                    <summary>Compartir mi código de jugador</summary>
                    <TextField label="Tu código de jugador" value={subject} readOnly />
                    <p className="mt-2 text-sm text-muted">
                      Compártelo con quien vaya a registrarte como compañero.
                    </p>
                  </details>
                )}
                {active === undefined && snapshot.tournament.open && roles.includes('PLAYER') && (
                  <RegisterTeamForm
                    key={JSON.stringify([id, mode, snapshot.tournament.contractVersion])}
                    id={id}
                    subject={subject}
                    api={api}
                    onResult={result}
                    canMutate={!view.isError}
                    generation={snapshot.teams
                      .filter((t) => t.status === 'CANCELLED')
                      .map((t) => t.id)
                      .join(':')}
                    avatarDownload={avatarDownload}
                    mode={mode}
                    {...(snapshot.tournament.contractVersion
                      ? { contractVersion: snapshot.tournament.contractVersion }
                      : {})}
                  />
                )}
                {active === undefined && !snapshot.tournament.open && (
                  <p>La inscripción de este torneo está cerrada.</p>
                )}
                {active !== undefined && (
                  <TeamRegistrationCard
                    key={active.id}
                    id={id}
                    subject={subject}
                    displayName={displayName}
                    team={active}
                    policy={snapshot.tournament.entryPolicy}
                    open={snapshot.tournament.open}
                    available={snapshot.capacity.available}
                    api={api}
                    onResult={result}
                    canMutate={!view.isError}
                    avatarDownload={avatarDownload}
                  />
                )}
                {snapshot.teams
                  .filter((t) => t.status === 'CANCELLED')
                  .map((team) => (
                    <details key={team.id} className="rounded-lg border border-border p-4">
                      <summary className="cursor-pointer">{team.name} · Registro cancelado</summary>
                      <p className="mt-2 break-all text-sm">
                        Comprobante de registro: {team.registrationReceipt.id}
                      </p>
                      <p className="text-sm text-muted">
                        No acredita un pago ni un cupo. Para cambiar integrantes hay que registrar
                        un equipo nuevo.
                      </p>
                    </details>
                  ))}
              </section>
            </>
          )}
          {tab === 'llaves' && bracketPanel}
        </>
      )}
      {tab === 'directo' && (
        <TournamentExternalLinksPanel
          id={id}
          identity={{ subject, roles }}
          {...(links ? { api: links } : {})}
        />
      )}
      {tab === 'encuentros' &&
        roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR') && (
          <TournamentEncounterAdminPanel
            id={id}
            subject={subject}
            {...(encounters ? { encounters } : {})}
            {...(encounterAdmin ? { admin: encounterAdmin } : {})}
          />
        )}
      {tab === 'encuentros' && (
        <TournamentEncountersPanel
          id={id}
          subject={subject}
          {...(encounters ? { api: encounters } : {})}
          selectedMatchId={selectedMatchId}
          onChooseMatch={openMatch}
        />
      )}
      {tab === 'premio' && (
        <TournamentPrizePanel
          id={id}
          identity={{ subject, roles }}
          canConfigure={snapshot?.tournament.bracketPublished === true && !view.isError}
          {...(prizes ? { api: prizes } : {})}
        />
      )}
      {tab === 'directo' && (
        <TournamentBroadcastPanel
          key={JSON.stringify([id, subject])}
          id={id}
          {...(broadcasts ? { api: broadcasts } : {})}
        />
      )}
    </>
  )
}
