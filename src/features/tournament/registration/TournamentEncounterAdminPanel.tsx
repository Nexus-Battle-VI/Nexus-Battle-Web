import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import '@/features/battle-rooms/battle-rooms.css'
import { BattlePixelIcon } from '@/features/battle-rooms/BattlePixelIcon'
import { encounterApi, type EncounterApi, type MatchSummary } from './encounterApi'
import {
  encounterAdminApi,
  type EncounterAdminAction,
  type EncounterAdminApi,
  type EncounterAdminReceipt,
} from './encounterAdminApi'
import { explained } from './encounterAdminErrors'
import { dateLabel, matchStatus } from './presentation'
import { useOperation } from './useOperation'
import { sampleMatches, useEncounterClock, type TimedMatch } from './encounterClock'
import { MatchSchedule, AbsenceResolution } from './MatchSchedule'

type Tone = 'waiting' | 'preparing' | 'active' | 'cancelled'
/** Colores de estado del remaster «Jugar Online» (`--br-status-*`). */
const tone = (match: MatchSummary): Tone => {
  if (match.status === 'FINISHED' || match.preparationStatus === 'WAITING_TEAMS') return 'cancelled'
  if (match.status === 'IN_PROGRESS' || match.preparationStatus === 'IN_BATTLE') return 'active'
  if (match.status === 'READY' || match.preparationStatus === 'PREPARED') return 'preparing'
  return 'waiting'
}

const AdminRow = ({
  id,
  subject,
  match,
  receipts,
  admin,
  onChanged,
  fresh,
}: {
  readonly id: string
  readonly subject: string
  readonly match: TimedMatch
  readonly receipts: readonly EncounterAdminReceipt[]
  readonly admin: EncounterAdminApi
  readonly onChanged: () => void
  readonly fresh: boolean
}): React.JSX.Element => {
  const scope = (action: EncounterAdminAction): string =>
    JSON.stringify([
      'encounter-admin',
      match.contractVersion ?? 'legacy',
      subject,
      id,
      match.matchId,
      action,
    ])
  const prepare = useOperation(scope('PREPARE'))
  const start = useOperation(scope('START'))
  const state = match.preparationStatus
  const clock = useEncounterClock(match.displayClock)
  const newPolicy = match.contractVersion === 'torneos-v3.0.0'
  const timeUntilStart = clock.remaining(match.scheduledStartAt)
  const calendarReady =
    !newPolicy ||
    (match.acceptanceStatus === 'CLOSED' &&
      match.registeredTeams?.length === 2 &&
      match.registeredTeams.every(
        (team) => team !== null && team.memberIds.length === match.teamSize,
      ) &&
      match.acceptedCounts?.length === 2 &&
      match.acceptedCounts.every((count) => count === match.teamSize) &&
      timeUntilStart === 0 &&
      !match.resolution &&
      (!match.blockReason || match.blockReason.responsible === 'COMBAT_OPERATIONS'))
  const done = match.status === 'FINISHED' || state === 'IN_BATTLE' || state === 'FINISHED'
  const prepared = state === 'PREPARED' || state === 'START_PENDING'
  const canPrepare = fresh && calendarReady && !done && !prepared && match.status !== 'READY'
  const canStart =
    fresh &&
    !done &&
    calendarReady &&
    (prepared || (match.status === 'READY' && match.combatRoomId != null))
  const run = async (action: EncounterAdminAction): Promise<void> => {
    if (prepare.busy || start.busy || (action === 'PREPARE' ? !canPrepare : !canStart)) return
    const op = action === 'PREPARE' ? prepare : start
    const result = await op.run(action, action, (operationId) =>
      explained(() =>
        action === 'PREPARE'
          ? admin.prepare(id, match.matchId, operationId)
          : admin.start(id, match.matchId, operationId),
      ),
    )
    if (result !== null) onChanged()
  }
  const error = prepare.error ?? start.error
  const mine = receipts.filter((r) => r.encounterId === match.matchId)
  return (
    <li aria-label={`Justa ${match.bracketLabel}`} className="br-room-card min-w-0">
      <div className="grid min-w-0 flex-1 gap-2">
        <p className="br-section-title flex items-center gap-2">
          <BattlePixelIcon icon={match.bracketTrack === 'FINAL' ? 'victory' : 'pvp'} size="sm" />
          <span
            className={`br-room-status-dot br-room-status-dot--${tone(match)}`}
            aria-hidden="true"
          />
          {match.bracketLabel} · Ronda {String(match.round)}
        </p>
        <p className={`br-label-theme text-sm br-room-status-text--${tone(match)}`}>
          {matchStatus(match)}
        </p>
        <MatchSchedule match={match} />
        <AbsenceResolution match={match} />
        {newPolicy && !calendarReady && !match.resolution && !done && (
          <p className="text-sm text-muted">
            Preparación e inicio requieren el cierre confirmado, ambos lados completos y la hora
            prevista. El servidor verifica la acción.
          </p>
        )}
        {state === 'WAITING_TEAMS' && (
          <p className="text-sm text-muted">
            Faltan participantes: esta justa depende de resultados previos del bracket.
          </p>
        )}
        {match.combatRoomId && (
          <p className="break-all text-sm">Sala de Combat: {match.combatRoomId}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="battle-secondary"
            loading={prepare.busy}
            disabled={!canPrepare || prepare.busy || start.busy}
            aria-label={`Preparar ${match.bracketLabel}`}
            onClick={() => void run('PREPARE')}
          >
            Preparar
          </Button>
          <Button
            variant="battle-primary"
            loading={start.busy}
            disabled={!canStart || start.busy || prepare.busy || done}
            aria-label={`Iniciar ${match.bracketLabel}`}
            onClick={() => void run('START')}
          >
            Iniciar
          </Button>
        </div>
        {error !== null && (
          <p role="alert" className="text-sm text-danger">
            {error.message}
          </p>
        )}
        {mine.length > 0 && (
          <ul
            className="grid gap-1 text-xs text-muted"
            aria-label={`Acciones de ${match.bracketLabel}`}
          >
            {mine.map((r) => (
              <li key={r.actionId}>
                {r.action === 'PREPARE' ? 'Preparada' : 'Iniciada'} por{' '}
                {r.actor === 'tournament-worker' ? 'worker de Tournament' : r.actor} ·{' '}
                {dateLabel(r.occurredAt)}
                <details className="tournament-technical">
                  <summary>Auditoría de la acción</summary>
                  <p className="break-all">
                    Actor: {r.actor} · Operación: {r.operationId} · Recibo: {r.actionId}
                  </p>
                  <p>{r.replayed ? 'Recibo repetido sin una nueva acción' : 'Acción registrada'}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/**
 * HU-85.3 (Management#487). Panel administrativo de justas independientes en
 * `/tournament`, SEPARADO de la vista de consulta/transmisión: cada justa se
 * prepara e inicia por su cuenta, sin esperar a otra ni a la transmisión. Los
 * adaptadores `encounters` y `admin` son intercambiables (HTTP real o datos de
 * prueba identificados).
 */
export const TournamentEncounterAdminPanel = ({
  id,
  subject,
  encounters = encounterApi,
  admin = encounterAdminApi,
}: {
  readonly id: string
  readonly subject: string
  readonly encounters?: EncounterApi
  readonly admin?: EncounterAdminApi
}): React.JSX.Element => {
  const client = useQueryClient()
  const list = useQuery({
    queryKey: ['tournament-encounter-admin', subject, id],
    queryFn: async () => sampleMatches(await encounters.list(id)),
    refetchInterval: 5000,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  })
  const actions = useQuery({
    queryKey: ['tournament-encounter-admin-actions', subject, id],
    queryFn: () => admin.actions(id),
    refetchInterval: 5000,
  })
  const refresh = (): void => {
    void client.invalidateQueries({ queryKey: ['tournament-encounter-admin', subject, id] })
    void client.invalidateQueries({ queryKey: ['tournament-encounter-admin-actions', subject, id] })
    void client.invalidateQueries({ queryKey: ['tournament-encounters', subject, id] })
  }
  const matches = list.data?.filter((m) => m.tournamentId === id) ?? []
  return (
    <div className="br-scene br-scene-lobby br-scene-pad grid min-w-0 gap-4">
      <header className="flex items-center gap-3">
        <BattlePixelIcon icon="lobby" size="xl" className="hidden sm:inline-block" />
        <div>
          <p className="br-heading-eyebrow">Torneo · administración</p>
          <h2 className="br-heading-title">Administración de justas</h2>
        </div>
      </header>
      <Card className="br-panel br-panel--corners">
        <section aria-label="Administración de justas" className="grid min-w-0 gap-4">
          <div className="flex items-center gap-2">
            <BattlePixelIcon icon="roomList" size="md" />
            <h3 className="br-section-title text-lg">Justas del bracket</h3>
          </div>
          <p className="text-sm text-muted">
            Controles administrativos, separados de la vista de transmisión. Cada justa se prepara e
            inicia de forma independiente y no espera a otra justa ni a la transmisión. El servidor
            decide si la acción es válida y deja constancia de quién la hizo y cuándo.
          </p>
          {list.isPending && <p role="status">Consultando justas…</p>}
          {list.isError && (
            <div role="alert">
              <p>No se pudo consultar las justas para administrarlas.</p>
              <Button variant="battle-compact" onClick={() => void list.refetch()}>
                Volver a consultar justas
              </Button>
            </div>
          )}
          {actions.isError && (
            <p role="alert">No se pudo leer el historial de acciones administrativas.</p>
          )}
          {list.data !== undefined && matches.length === 0 && (
            <p>Todavía no hay justas: publica las llaves para poder administrarlas.</p>
          )}
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <AdminRow
                key={match.matchId}
                id={id}
                subject={subject}
                match={match}
                receipts={actions.data ?? []}
                admin={admin}
                onChanged={refresh}
                fresh={!list.isPaused && !list.isError && !list.isFetching && !actions.isError}
              />
            ))}
          </ul>
        </section>
      </Card>
    </div>
  )
}
