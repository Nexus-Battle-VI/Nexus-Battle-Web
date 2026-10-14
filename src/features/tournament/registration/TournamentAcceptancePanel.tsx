import { useQuery, useQueryClient, onlineManager } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router'
import { Swords, CheckCircle2 } from 'lucide-react'
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
import { hasTournamentBattleResult } from '@/features/battle-rooms/battle/tournamentBattleResults'

const PersonalAcceptance = ({
  match,
  id,
  subject,
  api,
  fresh,
  navigationReady,
  isTest,
  refresh,
}: {
  readonly match: TimedMatch
  readonly id: string
  readonly subject: string
  readonly api: MatchAcceptanceApi
  readonly fresh: boolean
  readonly navigationReady: boolean
  readonly isTest: boolean
  readonly refresh: () => void
}): React.JSX.Element => {
  const clock = useEncounterClock(match.displayClock)
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<MatchAcceptanceReceipt | null>(null)
  const ownTeam = match.registeredTeams?.find((team) => team?.memberIds.includes(subject))
  const accepted = [match.myAcceptance, receipt].some(
    (confirmation) =>
      ownTeam != null &&
      confirmation?.subject === subject &&
      confirmation.tournamentId === id &&
      confirmation.encounterId === match.matchId &&
      confirmation.teamId === ownTeam.teamId,
  )
  const operation = useOperation(
    JSON.stringify(['match-acceptance', 'torneos-v3.0.0', subject, id, match.matchId]),
    () => accepted,
  )
  const selfIsMember = ownTeam != null
  const combatFinished = hasTournamentBattleResult(subject, {
    tournamentId: id,
    matchId: match.matchId,
  })
  const canAccept =
    fresh &&
    match.contractVersion === 'torneos-v3.0.0' &&
    selfIsMember &&
    !combatFinished &&
    !accepted &&
    match.acceptanceStatus === 'OPEN' &&
    match.blockReason == null &&
    clock.within(match)
  const remaining = clock.remaining(match.acceptanceClosesAt)
  const combatRoomId =
    match.combatRoomId ??
    (match.resolution?.resultType === 'PLAYED' ? match.resolution.combatRoomId : null)
  const battleContext = {
    ...(isTest ? { isTest: true } : {}),
    tournamentId: id,
    matchId: match.matchId,
    bracketLabel: match.bracketLabel,
  }
  const finished = match.status === 'FINISHED' || match.resolution != null || combatFinished
  // La aceptación es explícita; al aparecer la sala se entra antes de gastar la gracia en el torneo.
  useEffect(() => {
    if (!accepted || !navigationReady || !combatRoomId || finished) return
    const timer = window.setTimeout(() => {
      void navigate(`/play/rooms/${encodeURIComponent(combatRoomId)}/battle`, {
        state: {
          tournament: {
            ...(isTest ? { isTest: true } : {}),
            tournamentId: id,
            matchId: match.matchId,
            bracketLabel: match.bracketLabel,
          },
        },
      })
    }, 2000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [
    accepted,
    navigationReady,
    combatRoomId,
    finished,
    navigate,
    id,
    match.matchId,
    match.bracketLabel,
    subject,
    isTest,
  ])
  const accept = async (): Promise<void> => {
    if (!canAccept || !clock.within(match)) return
    const receipt = await operation.run('accept', 'accept', async (operationId) => {
      const response = await explained(() => api.accept(id, match.matchId, operationId), 'player')
      if (
        response.tournamentId !== id ||
        response.encounterId !== match.matchId ||
        response.subject !== subject ||
        response.teamId !== ownTeam.teamId
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
    <article
      className="tournament-battle-card"
      aria-label={`Tu aceptación de ${match.bracketLabel}`}
    >
      <div className="tournament-battle-heading">
        <span className="tournament-eyebrow">
          RONDA {match.round} · {match.bracketLabel}
        </span>
        <span className="tournament-battle-status">
          {combatFinished && match.status !== 'FINISHED'
            ? 'Confirmando resultado'
            : matchStatus(match)}
        </span>
      </div>
      <div className="tournament-battle-versus">
        {match.registeredTeams?.map((team, index) => (
          <div
            key={index}
            className={
              team?.memberIds.includes(subject)
                ? 'tournament-battle-team tournament-battle-team--mine'
                : 'tournament-battle-team'
            }
          >
            <span className="tournament-battle-team-caption">
              {team?.memberIds.includes(subject) ? 'TÚ / TU EQUIPO' : 'RIVAL'}
            </span>
            <strong>{team?.name ?? 'Rival por definir'}</strong>
            {match.acceptedCounts && (
              <span className="text-sm text-muted">
                {match.acceptedCounts[index]} / {match.teamSize} listos
              </span>
            )}
          </div>
        ))}
        <span className="tournament-battle-vs" aria-hidden="true">
          VS
        </span>
      </div>
      <details className="tournament-battle-details">
        <summary>Horario y detalles</summary>
        <MatchSchedule match={match} />
      </details>
      <AbsenceResolution match={match} />
      {selfIsMember && !finished && (
        <p className="text-sm text-muted">
          Debes llegar a la arena y mantenerte conectado. Si no conectas durante 30 segundos al
          iniciar, el servidor resuelve la batalla por desconexión.
        </p>
      )}
      {accepted ? (
        <p role="status" className="tournament-ready">
          <CheckCircle2 size={20} aria-hidden="true" />
          {finished
            ? 'Batalla terminada. Consulta tu avance en las llaves.'
            : combatRoomId
              ? navigationReady
                ? 'Tu arena está lista. Te llevaremos a tu batalla en 2 segundos. También puedes entrar ahora.'
                : 'Tu arena está lista. Recupera la conexión para entrar a tu batalla.'
              : '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.'}
        </p>
      ) : match.acceptanceStatus === 'OPEN' && remaining === 0 ? (
        <p role="status">
          La ventana terminó. Actualiza para consultar la resolución del servidor.
        </p>
      ) : null}
      {match.acceptanceStatus === 'OPEN' && remaining !== null && remaining > 0 && (
        <p>
          Acepta antes de <strong>{clock.format(remaining)}</strong>
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
          className="tournament-battle-cta"
          onClick={() => {
            void accept()
          }}
        >
          <Swords size={26} aria-hidden="true" />
          {operation.intent ? 'Comprobar aceptación' : 'Aceptar batalla'}
        </Button>
      )}
      {operation.error && !accepted && <p role="alert">{operation.error.message}</p>}
      {combatRoomId && match.resolution?.resultType !== 'ABSENCE' && (
        <Link
          className="tournament-battle-cta"
          to={`/play/rooms/${encodeURIComponent(combatRoomId)}/battle`}
          state={{ tournament: battleContext }}
        >
          <Swords size={26} aria-hidden="true" />
          {finished ? 'Ver resultado' : 'Ir a batalla'}
        </Link>
      )}
      <Button variant="secondary" className="tournament-battle-refresh" onClick={refresh}>
        Actualizar estado
      </Button>
    </article>
  )
}
export const TournamentAcceptancePanel = ({
  id,
  subject,
  isTest = false,
  encounters = encounterApi,
  api = matchAcceptanceApi,
}: {
  readonly id: string
  readonly subject: string
  readonly isTest?: boolean
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
    refetchIntervalInBackground: true,
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
    <Card className="tournament-my-battle">
      <section className="grid min-w-0 gap-4" aria-label="Próxima justa y aceptación personal">
        <TournamentHeading icon="calendar">Mi batalla</TournamentHeading>
        <p className="text-sm text-muted">
          {selected?.status === 'FINISHED'
            ? 'Tu resultado y tu siguiente paso, aquí.'
            : 'Acepta y prepara tu héroe. Tienes dos minutos para confirmar.'}
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
            isTest={isTest}
            api={api}
            fresh={online && !list.isPaused && !list.isError && !list.isFetching}
            navigationReady={online && !list.isPaused}
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
          <details className="tournament-battle-details">
            <summary>Batalla anterior</summary>
            <AbsenceResolution match={previousAbsence} />
          </details>
        )}
      </section>
    </Card>
  )
}
