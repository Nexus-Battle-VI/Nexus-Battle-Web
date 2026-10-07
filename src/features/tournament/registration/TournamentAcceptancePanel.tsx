import { useQuery, useQueryClient, onlineManager } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import {
  TournamentButton as Button,
  TournamentCard as Card,
  TournamentHeading,
} from '../TournamentVisuals'
import { encounterApi, type EncounterApi } from './encounterApi'
import {
  matchAcceptanceApi,
  type MatchAcceptanceApi,
  type MatchAcceptanceReceipt,
} from './encounterAdminApi'
import { sampleMatches, useEncounterClock, type TimedMatch } from './encounterClock'
import { explained } from './encounterAdminErrors'
import { MatchSchedule, AbsenceResolution } from './MatchSchedule'
import { matchStatus } from './presentation'
import { useOperation } from './useOperation'

const PersonalAcceptance = ({
  match,
  id,
  subject,
  api,
  fresh,
  refresh,
}: {
  readonly match: TimedMatch
  readonly id: string
  readonly subject: string
  readonly api: MatchAcceptanceApi
  readonly fresh: boolean
  readonly refresh: () => void
}): React.JSX.Element => {
  const clock = useEncounterClock(match.displayClock)
  const [receipt, setReceipt] = useState<MatchAcceptanceReceipt | null>(null)
  const accepted = match.myAcceptance?.subject === subject || receipt?.subject === subject
  const operation = useOperation(
    JSON.stringify(['match-acceptance', 'torneos-v3.0.0', subject, id, match.matchId]),
    () => accepted,
  )
  const selfIsMember =
    match.registeredTeams?.some((team) => team?.memberIds.includes(subject)) === true
  const canAccept =
    fresh &&
    match.contractVersion === 'torneos-v3.0.0' &&
    selfIsMember &&
    !accepted &&
    match.acceptanceStatus === 'OPEN' &&
    match.blockReason == null &&
    clock.within(match)
  const remaining = clock.remaining(match.acceptanceClosesAt)
  const combatRoomId =
    match.combatRoomId ??
    (match.resolution?.resultType === 'PLAYED' ? match.resolution.combatRoomId : null)
  const accept = async (): Promise<void> => {
    if (!canAccept || !clock.within(match)) return
    const receipt = await operation.run('accept', 'accept', async (operationId) => {
      const response = await explained(() => api.accept(id, match.matchId, operationId), 'player')
      if (
        response.tournamentId !== id ||
        response.encounterId !== match.matchId ||
        response.subject !== subject
      )
        throw new Error(
          'No se pudo comprobar tu recibo de aceptación. Actualiza la justa antes de continuar.',
        )
      return response
    })
    if (receipt) {
      setReceipt(receipt)
      refresh()
    }
  }
  return (
    <article className="grid min-w-0 gap-3" aria-label={`Tu aceptación de ${match.bracketLabel}`}>
      <h3 className="font-semibold">
        {match.bracketLabel} · {matchStatus(match)}
      </h3>
      <MatchSchedule match={match} />
      <AbsenceResolution match={match} />
      {accepted ? (
        <p role="status">Tu aceptación de esta justa está confirmada.</p>
      ) : match.acceptanceStatus === 'OPEN' && remaining === 0 ? (
        <p role="status">
          La ventana terminó. Actualiza para consultar la resolución del servidor.
        </p>
      ) : null}
      {match.acceptanceStatus === 'OPEN' && remaining !== null && remaining > 0 && (
        <p>
          Cierre en <strong>{clock.format(remaining)}</strong> · hora del servidor
        </p>
      )}
      {match.acceptanceStatus === 'OPEN' && match.displayClock === null && (
        <p role="status">
          No se pudo sincronizar la hora del servidor. Actualiza antes de aceptar.
        </p>
      )}
      {selfIsMember && !accepted && match.acceptanceStatus === 'OPEN' && (
        <Button
          disabled={!canAccept || operation.busy}
          loading={operation.busy}
          onClick={() => {
            void accept()
          }}
        >
          {operation.intent ? 'Comprobar mi aceptación' : 'Aceptar mi justa'}
        </Button>
      )}
      {operation.error && !accepted && <p role="alert">{operation.error.message}</p>}
      {combatRoomId && match.resolution?.resultType !== 'ABSENCE' && (
        <Link
          className="text-brand underline"
          to={`/play/rooms/${encodeURIComponent(combatRoomId)}/battle`}
        >
          Abrir mi combate real
        </Link>
      )}
      <Button variant="secondary" onClick={refresh}>
        Actualizar mi justa
      </Button>
    </article>
  )
}
export const TournamentAcceptancePanel = ({
  id,
  subject,
  encounters = encounterApi,
  api = matchAcceptanceApi,
}: {
  readonly id: string
  readonly subject: string
  readonly encounters?: EncounterApi
  readonly api?: MatchAcceptanceApi
}): React.JSX.Element => {
  const client = useQueryClient()
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  )
  const key = ['tournament-acceptance', 'ROUND_ACCEPTANCE_V1', subject, id]
  const list = useQuery({
    queryKey: key,
    queryFn: async () => sampleMatches(await encounters.list(id)),
    refetchInterval: 3000,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
  })
  const refresh = (): void => {
    void client.invalidateQueries({ queryKey: key })
    void client.invalidateQueries({ queryKey: ['tournament-encounters', subject, id] })
    void client.invalidateQueries({ queryKey: ['tournament-progress', subject, id] })
    void client.invalidateQueries({ queryKey: ['tournament-encounter', subject, id] })
  }
  const mine =
    list.data?.filter(
      (match) =>
        match.tournamentId === id &&
        match.registeredTeams?.some((team) => team?.memberIds.includes(subject)),
    ) ?? []
  const upcoming = mine
    .filter((match) => match.status !== 'FINISHED' && match.acceptanceStatus !== 'RESOLVED')
    .sort((a, b) => a.round - b.round)[0]
  const recent = mine
    .filter((match) => match.status === 'FINISHED' || match.resolution != null)
    .sort((a, b) => b.round - a.round)[0]
  const selected = upcoming ?? recent
  const previousAbsence = mine
    .filter((match) => match.resolution?.resultType === 'ABSENCE')
    .sort((a, b) => b.round - a.round)[0]
  return (
    <Card>
      <section className="grid min-w-0 gap-4" aria-label="Próxima justa y aceptación personal">
        <TournamentHeading icon="calendar">
          {upcoming || !recent ? 'Tu próxima justa' : 'Tu última justa'}
        </TournamentHeading>
        <p className="text-sm text-muted">
          Cada persona acepta desde su sesión durante dos minutos. Inscribirte o pagar no acepta una
          justa por ti ni por tus compañeros.
        </p>
        {list.isPending && <p role="status">Consultando tu convocatoria…</p>}
        {list.isError && (
          <div role="alert">
            <p>No se pudo actualizar tu convocatoria. Comprueba el estado antes de aceptar.</p>
            <Button variant="secondary" onClick={refresh}>
              Volver a consultar mi convocatoria
            </Button>
          </div>
        )}
        {!online && (
          <p role="status">
            Sin conexión. Al reconectar se consultarán tu aceptación y la hora del servidor.
          </p>
        )}
        {selected ? (
          <PersonalAcceptance
            key={JSON.stringify([subject, id, selected.matchId])}
            id={id}
            subject={subject}
            match={selected}
            api={api}
            fresh={online && !list.isPaused && !list.isError && !list.isFetching}
            refresh={refresh}
          />
        ) : (
          list.data && (
            <p>
              Todavía no hay una próxima justa con tu equipo resuelto. Consulta las dependencias en
              las llaves.
            </p>
          )
        )}
        {previousAbsence && previousAbsence.matchId !== selected?.matchId && (
          <AbsenceResolution match={previousAbsence} />
        )}
      </section>
    </Card>
  )
}
