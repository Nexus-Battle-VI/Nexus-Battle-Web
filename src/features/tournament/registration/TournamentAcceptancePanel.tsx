import { useQuery, useQueryClient, onlineManager } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Swords,
  CheckCircle2,
  Clock3,
  Trophy,
  CircleHelp,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react'
import {
  TournamentButton as Button,
  TournamentCard as Card,
  TournamentHeading,
  TournamentIcon,
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
import { TournamentSelectedHero } from './TournamentSelectedHero'

const AUTO_ENTRY_DELAY_MS = 5000

const PersonalAcceptance = ({
  match,
  id,
  subject,
  api,
  fresh,
  navigationReady,
  isTest,
  refresh,
  matches,
}: {
  readonly match: TimedMatch
  readonly id: string
  readonly subject: string
  readonly api: MatchAcceptanceApi
  readonly fresh: boolean
  readonly navigationReady: boolean
  readonly isTest: boolean
  readonly refresh: () => void
  readonly matches: readonly TimedMatch[]
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
    match.registeredTeams?.filter(Boolean).length === 2 &&
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
  const ownIndex =
    match.registeredTeams?.findIndex((team) => team?.memberIds.includes(subject)) ?? -1
  const rivalIndex = ownIndex === 0 ? 1 : 0
  const rival = match.registeredTeams?.[rivalIndex]
  const waitingRival = !finished && rival == null
  const winnerId = match.resolution?.winnerTeamId ?? match.winnerTeamId
  const won = ownTeam != null && winnerId === ownTeam.teamId
  const confirmedResult = finished && winnerId != null
  const source = match.sources?.[rivalIndex]
  const dependency =
    source && source.kind !== 'SEED'
      ? matches.find(
          (candidate) =>
            candidate.tournamentId === id &&
            (candidate.bracketLabel === source.matchId || candidate.matchId === source.matchId),
        )
      : undefined
  const dependencyNames = dependency?.registeredTeams?.map((team) => team?.name).filter(Boolean)
  const dependencyText =
    dependencyNames?.length === 2 && source?.kind !== 'SEED'
      ? `Tu rival será el ${source?.kind === 'LOSER' ? 'perdedor' : 'ganador'} de ${dependencyNames.join(' vs. ')}.`
      : 'Tu rival se definirá al terminar la batalla anterior de su llave.'
  const stage = finished ? 4 : accepted ? 3 : waitingRival ? 1 : 2
  const title = finished
    ? confirmedResult
      ? won
        ? '¡Victoria!'
        : 'Batalla finalizada'
      : 'Confirmando resultado'
    : waitingRival
      ? 'Esperando rival'
      : combatRoomId && accepted
        ? 'Tu arena está lista'
        : accepted
          ? 'Aceptación confirmada'
          : match.acceptanceStatus === 'OPEN'
            ? 'Acepta tu batalla'
            : 'Tu próxima batalla'
  const instruction = finished
    ? confirmedResult
      ? won
        ? 'Ganaste esta batalla. Consulta tu siguiente paso en las llaves.'
        : 'Consulta el resultado y tu siguiente paso en las llaves.'
      : 'El servidor está comprobando el resultado. No necesitas aceptar de nuevo.'
    : waitingRival
      ? 'Por ahora no necesitas hacer nada. Mantén esta pantalla abierta.'
      : accepted
        ? combatRoomId
          ? 'Entra a tu propia arena y mantente conectado durante la pelea.'
          : 'Ya aceptaste. Esperamos a los demás jugadores y al inicio programado.'
        : match.acceptanceStatus === 'OPEN'
          ? 'Confirma que vas a jugar. Cada persona acepta desde su propia sesión.'
          : 'Mantén esta pantalla abierta. Podrás aceptar cuando se abra tu ventana.'
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
    }, AUTO_ENTRY_DELAY_MS)
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
      className={`tournament-battle-card tournament-hub-battle ${finished ? 'tournament-hub-battle--result' : ''}`}
      aria-label={`Tu aceptación de ${match.bracketLabel}`}
    >
      <div className="tournament-battle-heading">
        <span className="tournament-eyebrow">
          RONDA {match.round} · {match.bracketLabel}
        </span>
        <span className="tournament-battle-status">
          {waitingRival
            ? 'Esperando rival'
            : accepted && !finished
              ? combatRoomId
                ? 'Arena lista'
                : 'Aceptación confirmada'
              : combatFinished && match.status !== 'FINISHED'
                ? 'Confirmando resultado'
                : matchStatus(match)}
        </span>
      </div>
      <div className="tournament-hub-versus">
        <div className="tournament-hub-combatant tournament-hub-combatant--mine">
          <span className="tournament-battle-team-caption">TÚ / TU EQUIPO</span>
          <div className="tournament-combatant-name">
            <div className="tournament-combatant-seal" aria-hidden="true">
              <TournamentIcon icon="team" size={38} />
            </div>
            <div className="tournament-combatant-title">
              <strong>{ownTeam?.name ?? 'Tu equipo'}</strong>
              {match.acceptedCounts && ownIndex >= 0 && (
                <span className="tournament-player-ready">
                  {match.acceptedCounts[ownIndex]} / {match.teamSize} listos
                </span>
              )}
            </div>
          </div>
          {!finished && <TournamentSelectedHero subject={subject} />}
          {finished && (
            <div className="tournament-outcome-seal">
              <Trophy size={38} aria-hidden="true" />
              <span>
                {confirmedResult
                  ? won
                    ? 'Batalla ganada'
                    : 'Resultado confirmado'
                  : 'Comprobando resultado'}
              </span>
            </div>
          )}
        </div>
        <div className="tournament-hub-center">
          <div className="tournament-hub-vs" aria-hidden="true">
            VS
          </div>
          <div className="tournament-action-message" role="status">
            {finished ? (
              <Trophy size={24} aria-hidden="true" />
            ) : waitingRival ? (
              <Clock3 size={24} aria-hidden="true" />
            ) : accepted ? (
              <ShieldCheck size={24} aria-hidden="true" />
            ) : (
              <Swords size={24} aria-hidden="true" />
            )}
            <h3>{title}</h3>
            <p>{instruction}</p>
          </div>
          {!waitingRival &&
            !accepted &&
            !finished &&
            match.acceptanceStatus === 'OPEN' &&
            remaining !== null &&
            remaining > 0 && (
              <div className="tournament-action-clock">
                <span>Acepta antes de</span>
                <strong>{clock.format(remaining)}</strong>
              </div>
            )}
          {!waitingRival && !accepted && !finished && match.acceptanceStatus === 'SCHEDULED' && (
            <p className="tournament-upcoming-date">
              Aceptación:{' '}
              {match.acceptanceOpensAt
                ? new Date(match.acceptanceOpensAt).toLocaleString('es-CO')
                : 'Horario por confirmar'}
            </p>
          )}
        </div>
        <div
          className={`tournament-hub-combatant ${waitingRival ? 'tournament-hub-combatant--pending' : ''}`}
        >
          <span className="tournament-battle-team-caption">RIVAL</span>
          <div className="tournament-combatant-name">
            <div className="tournament-combatant-seal" aria-hidden="true">
              {rival ? <TournamentIcon icon="arena" size={38} /> : <CircleHelp size={40} />}
            </div>
            <div className="tournament-combatant-title">
              <strong>{rival?.name ?? 'Pendiente por definir'}</strong>
              {rival && match.acceptedCounts && (
                <span className="tournament-player-ready">
                  {match.acceptedCounts[rivalIndex]} / {match.teamSize} listos
                </span>
              )}
            </div>
          </div>
          <p className="tournament-rival-context">
            {waitingRival
              ? dependencyText
              : finished
                ? 'La batalla ya terminó. El resultado lo confirma el servidor.'
                : 'Cada participante debe aceptar y entrar a su propia batalla.'}
          </p>
          {!finished && (
            <div className="tournament-rival-hero">
              <ShieldCheck size={26} aria-hidden="true" />
              <span>
                {waitingRival ? 'Esperando al siguiente oponente' : 'Verás sus héroes en la arena'}
              </span>
            </div>
          )}
        </div>
      </div>
      <AbsenceResolution match={match} />
      {accepted ? (
        <p role="status" className="tournament-ready">
          <CheckCircle2 size={20} aria-hidden="true" />
          {finished
            ? 'Batalla terminada. Consulta tu avance en las llaves.'
            : combatRoomId
              ? navigationReady
                ? `Tu arena está lista. Te llevaremos a tu batalla en ${String(AUTO_ENTRY_DELAY_MS / 1000)} segundos. También puedes entrar ahora.`
                : 'Tu arena está lista. Recupera la conexión para entrar a tu batalla.'
              : '¡Estás listo! Mantén esta pantalla abierta: entrarás a tu batalla automáticamente cuando esté lista.'}
        </p>
      ) : match.acceptanceStatus === 'OPEN' && remaining === 0 ? (
        <p role="status">
          La ventana terminó. Actualiza para consultar la resolución del servidor.
        </p>
      ) : null}
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
      {combatRoomId && (accepted || finished) && match.resolution?.resultType !== 'ABSENCE' && (
        <Link
          className="tournament-battle-cta"
          to={`/play/rooms/${encodeURIComponent(combatRoomId)}/battle`}
          state={{ tournament: battleContext }}
        >
          {finished ? (
            <Trophy size={26} aria-hidden="true" />
          ) : (
            <Swords size={26} aria-hidden="true" />
          )}
          {finished ? 'Ver resultado' : 'Ir a batalla'}
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
      )}
      {match.resolution?.resultType !== 'ABSENCE' && (
        <ol className="tournament-battle-steps" aria-label="Tu progreso en esta batalla">
          {[
            'Inscrito',
            waitingRival ? 'Definiendo rival' : 'Rival definido',
            accepted ? 'Aceptación confirmada' : 'Aceptar batalla',
            finished ? 'Batalla finalizada' : 'Jugar',
          ].map((label, index) => (
            <li
              key={index}
              className={index < stage ? 'is-complete' : index === stage ? 'is-current' : ''}
              aria-current={index === stage ? 'step' : undefined}
            >
              <span className="tournament-step-icon" aria-hidden="true">
                {index < stage ? (
                  <CheckCircle2 size={24} />
                ) : index === 1 ? (
                  <Swords size={23} />
                ) : index === 2 ? (
                  <Clock3 size={23} />
                ) : index === 3 ? (
                  <ArrowRight size={23} />
                ) : (
                  <CheckCircle2 size={23} />
                )}
              </span>
              <strong>{label}</strong>
              <span>
                {index < stage ? 'Confirmado' : index === stage ? 'En curso' : 'Pendiente'}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="tournament-battle-note">
        <Info size={18} aria-hidden="true" />
        <p>
          {match.bracketTrack === 'FINAL'
            ? 'La final decide al campeón en una sola batalla.'
            : !finished && combatRoomId
              ? 'Tienes 2 minutos para entrar o reconectar al iniciar. Mantente conectado durante la batalla.'
              : 'Doble eliminación: una derrota te lleva a la llave de perdedores; la segunda termina tu participación.'}
        </p>
      </div>
      <div className="tournament-battle-tools">
        <details className="tournament-battle-details">
          <summary>Horario y detalles</summary>
          <MatchSchedule match={match} />
        </details>
        <Button variant="secondary" className="tournament-battle-refresh" onClick={refresh}>
          Actualizar estado
        </Button>
      </div>
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
        <TournamentHeading icon="arena">
          {selected?.status === 'FINISHED' ? 'Resultado de tu batalla' : 'Tu batalla y tu héroe'}
        </TournamentHeading>
        <p className="text-sm text-muted">
          {selected?.status === 'FINISHED'
            ? 'Tu resultado y tu siguiente paso, aquí.'
            : 'Tu héroe, tu rival y un siguiente paso claro.'}
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
            matches={list.data ?? []}
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
