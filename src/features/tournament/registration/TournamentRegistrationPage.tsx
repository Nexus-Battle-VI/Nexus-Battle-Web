import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { useSession } from '@/shared/session'
import { invalidateWallet, useRefreshWalletOn } from '@/shared/wallet'
import { registrationApi, type RegistrationApi, type EntryTeam, type EntryView } from './api'
import type { BracketApi } from './bracketApi'
import type { EncounterApi } from './encounterApi'
import type { EncounterAdminApi } from './encounterAdminApi'
import type { AvatarDownload } from './TeamAvatar'
import { CreateTournamentPanel } from './CreateTournamentPanel'
import { TournamentBracketPanel } from './TournamentBracketPanel'
import { TournamentEncountersPanel } from './TournamentEncountersPanel'
import { TournamentEncounterAdminPanel } from './TournamentEncounterAdminPanel'
import { RegisterTeamForm } from './RegisterTeamForm'
import { TeamRegistrationCard } from './TeamRegistrationCard'
import { dateLabel, priceLabel } from './presentation'
import './tournament.css'

interface Props {
  readonly api?: RegistrationApi
  readonly brackets?: BracketApi
  readonly encounters?: EncounterApi
  readonly encounterAdmin?: EncounterAdminApi
  readonly avatarDownload?: AvatarDownload
  /** Injection for isolated component previews/tests; routes always use the real session. */
  readonly identity?: { readonly subject: string | null; readonly roles: readonly string[] }
}
export const TournamentRegistrationPage = (props: Props): React.JSX.Element => {
  const subject = useSession((s) => s.subject)
  const roles = useSession((s) => s.roles)
  const identity = props.identity ?? { subject, roles }
  if (identity.subject === null)
    return <p>Inicia sesión para inscribir tu equipo o responder a un registro.</p>
  return (
    <RegistrationContent
      key={identity.subject}
      {...props}
      subject={identity.subject}
      roles={identity.roles}
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
  avatarDownload,
}: Props & { readonly subject: string; readonly roles: readonly string[] }): React.JSX.Element => {
  const client = useQueryClient()
  const [chosenId, setChosenId] = useState('')
  const list = useQuery({
    queryKey: ['tournament-registration', subject, 'list'],
    queryFn: () => api.list(),
    refetchInterval: 10000,
  })
  const selected = list.data?.some((t) => t.id === chosenId)
    ? chosenId
    : (list.data?.find((t) => t.open)?.id ?? list.data?.[0]?.id ?? chosenId)
  return (
    <section className="tournament-page grid min-w-0 gap-6" aria-label="Torneo">
      <header>
        <h1 className="font-game-display text-3xl text-ink">Torneo</h1>
        <p className="mt-2 text-muted">
          Registra a dos jugadores, acepta desde cada cuenta y confirma el cupo. Después consulta
          las llaves y el registro de las justas.
        </p>
      </header>
      {roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR') && (
        <CreateTournamentPanel
          key={subject}
          subject={subject}
          api={api}
          onCreated={(id) => {
            setChosenId(id)
            void client.invalidateQueries({ queryKey: ['tournament-registration', subject] })
          }}
        />
      )}
      <Card>
        <TextField label="Tu código de jugador" value={subject} readOnly />
        <p className="mt-2 text-sm text-muted">
          Compártelo con quien vaya a registrarte como compañero.
        </p>
      </Card>
      {list.isPending && <p role="status">Consultando torneos…</p>}
      {list.isError && (
        <div role="alert">
          <p>No se pudo consultar la lista de torneos.</p>
          <Button variant="secondary" onClick={() => void list.refetch()}>
            Volver a consultar torneos
          </Button>
        </div>
      )}
      {list.data?.length === 0 && <p>No hay torneos disponibles todavía.</p>}
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
          api={api}
          {...(brackets ? { brackets } : {})}
          {...(encounters ? { encounters } : {})}
          {...(encounterAdmin ? { encounterAdmin } : {})}
          {...(avatarDownload ? { avatarDownload } : {})}
        />
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
  avatarDownload,
}: {
  readonly id: string
  readonly subject: string
  readonly roles: readonly string[]
  readonly api: RegistrationApi
} & Props): React.JSX.Element => {
  const client = useQueryClient()
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
  const active = snapshot?.teams.find((t) => t.status !== 'CANCELLED')
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
          <Card>
            <h2 className="font-game-display text-xl">{snapshot.tournament.name}</h2>
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
              {String(snapshot.capacity.confirmed)} de 8 equipos confirmados.
            </p>
            <p className="text-sm text-muted">
              {String(snapshot.capacity.reserved)} cupos en comprobación ·{' '}
              {String(snapshot.capacity.available)} disponibles según el servidor.
            </p>
            <p className="mt-2">
              {snapshot.tournament.open ? 'Inscripciones abiertas.' : 'Inscripciones cerradas.'}
            </p>
            <p className="text-sm text-muted">
              Cierre: {dateLabel(snapshot.tournament.closesAt)} · Inicio:{' '}
              {dateLabel(snapshot.tournament.startsAt)}
            </p>
            <Button className="mt-3" variant="secondary" onClick={() => void view.refetch()}>
              Actualizar inscripción
            </Button>
          </Card>
          <section aria-label="Inscripción del equipo" className="grid gap-4">
            {active === undefined && snapshot.tournament.open && roles.includes('PLAYER') && (
              <RegisterTeamForm
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
                    No acredita un pago ni un cupo. Para cambiar integrantes hay que registrar un
                    equipo nuevo.
                  </p>
                </details>
              ))}
          </section>
          <TournamentBracketPanel
            id={id}
            subject={subject}
            roles={roles}
            confirmed={snapshot.capacity.confirmed}
            canMutate={!view.isError}
            {...(brackets ? { api: brackets } : {})}
          />
        </>
      )}
      {roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR') && (
        <TournamentEncounterAdminPanel
          id={id}
          subject={subject}
          {...(encounters ? { encounters } : {})}
          {...(encounterAdmin ? { admin: encounterAdmin } : {})}
        />
      )}
      <TournamentEncountersPanel
        id={id}
        subject={subject}
        {...(encounters ? { api: encounters } : {})}
      />
    </>
  )
}
