import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Coins } from '@/components/ui/icons'
import { ChatPanel } from './ChatPanel'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchBattleRoom, startBattle } from './battle/api'
import { describeStartBattleFailure } from './battle/presentation'
import { describeOwnStake, ownStakeOf } from './battle/stakePresentation'
import { useBattleRooms, useCancelBattleRoom, useLeaveBattleRoom } from './hooks'
import { useBattleRoomRealtime } from './useBattleRoomRealtime'
import { describeBattleRoomFailure, modeLabel, teamByLetter } from './presentation'
import type { Participant, Team } from './types'

const initialsOfDisplayName = (name: string): string => {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?'
}

const participantLabel = (participant: Participant): string =>
  participant.kind === 'AI' ? 'Oponente IA' : (participant.displayName ?? 'Jugador')

interface TeamColumnProps {
  readonly letter: string
  readonly team: Team | undefined
  /**
   * `room.createdBy` (HU-15.4, hallazgo BAJO-01): permite marcar visualmente
   * quien es el propietario dentro de la lista de participantes SIN ampliar
   * el contrato de Combat -- `Participant.playerId` y `room.createdBy` ya
   * son datos del contrato existente, solo faltaba compararlos aqui. Se
   * compara por `playerId`, nunca se muestra el valor crudo en pantalla.
   */
  readonly ownerPlayerId: string
}

/**
 * Columna de un equipo dentro del lobby. Solo muestra `displayName` y
 * avatar de cada participante -datos publicos segun el contrato de
 * Combat/Account-; NUNCA `playerId` ni ningun identificador tecnico. Los
 * cupos vacios se representan como una fila propia, visualmente distinta de
 * un participante real.
 */
const TeamColumn = ({ letter, team, ownerPlayerId }: TeamColumnProps): React.JSX.Element => {
  const capacity = team?.capacity ?? 0
  const participants = team?.participants ?? []
  const emptySlots = Math.max(capacity - participants.length, 0)

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Equipo {letter}</h3>
        <span className="text-xs text-muted">
          {participants.length}/{capacity}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {participants.map((participant, index) => {
          const label = participantLabel(participant)
          const isRoomOwner =
            participant.playerId !== null && participant.playerId === ownerPlayerId

          return (
            // Combat no expone un id estable por participante en la
            // respuesta de la sala: la posicion es la unica clave disponible.
            <li key={`${participant.kind}-${String(index)}`} className="flex items-center gap-2">
              <Avatar
                avatarUrl={null}
                alt={label}
                initials={initialsOfDisplayName(label)}
                size="sm"
              />
              <span className="truncate text-sm text-ink">{label}</span>
              {isRoomOwner && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                  Propietario
                </span>
              )}
            </li>
          )
        })}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li key={`empty-${String(index)}`} className="flex items-center gap-2 opacity-60">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border"
            />
            <span className="text-sm text-muted">Esperando jugador…</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Lobby / pantalla de preparacion de una sala (HU-15.3, punto C).
 *
 * Reutiliza `useBattleRooms` (la unica consulta GET real disponible hoy) y
 * deriva la sala concreta por `roomId` en el cliente: no existe un
 * `GET /v1/combat/rooms/:id` documentado, y esta pantalla no inventa uno.
 * El WebSocket (`useBattleRoomRealtime`) solo dispara el refetch de esa
 * misma consulta; la fuente de verdad sigue siendo React Query.
 *
 * NO se muestra el UUID de la sala, ni `playerId`/`subject` de nadie: solo
 * `displayName` y avatar, que son publicos segun el contrato.
 *
 * LIMITACION DE CONTRATO, documentada explicitamente: `GET /v1/combat/rooms`
 * solo devuelve salas `WAITING_FOR_PLAYERS` (`ListAvailableBattleRooms`,
 * Combat) -- en cuanto la sala pasa a `PREPARING` (se lleno normalmente),
 * `CANCELLED`, `IN_BATTLE` o `FINISHED`, desaparece de esa lista. Para esos
 * casos se cae a `GET /rooms/:roomId` (`fetchBattleRoom`, solo participantes),
 * que SI trae el detalle completo (equipos, `createdBy`).
 *
 * HU-17 (2026-09-22, control de inicio del propietario): `PREPARING` YA NO
 * navega automaticamente a `/battle` -- todos los participantes permanecen
 * en ESTE lobby, usando el detalle de `GET /rooms/:roomId` en lugar del
 * listado, hasta que el propietario pulsa "Iniciar partida"
 * (`POST /rooms/:roomId/start`, ver `battle/api.ts`). Solo `IN_BATTLE` y
 * `FINISHED` navegan a la pantalla de batalla, y lo hacen para CUALQUIER
 * participante en cuanto Combat publica `battle-room.updated` (WebSocket) --
 * nunca por temporizador ni por quien pulso el boton.
 */
export const BattleRoomLobbyPage = (): React.JSX.Element => {
  const { roomId = null } = useParams<{ roomId: string }>()
  const subject = useSession((state) => state.subject)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const rooms = useBattleRooms()
  const realtime = useBattleRoomRealtime(roomId)
  const cancelRoom = useCancelBattleRoom()
  const leaveRoom = useLeaveBattleRoom()
  // Invalida ademas de lo que ya hace `battle-room.updated` por WebSocket
  // (`useBattleRoomRealtime`): red de seguridad si la conexion en tiempo real
  // esta reconectando justo cuando el propietario recibe el 200 de `/start`.
  const startRoom = useMutation({
    mutationFn: (id: string) => startBattle(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
      if (roomId !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.detail(roomId) })
      }
    },
  })
  const [actionError, setActionError] = useState<string | null>(null)

  const listRoom = rooms.data?.find((candidate) => candidate.id === roomId) ?? null

  // HU-17: `GET /rooms` solo lista salas esperando jugadores. Cuando la sala deja
  // de estar en esa lista (se lleno, esta en batalla o se cancelo) se lee por
  // `GET /rooms/:roomId` (solo participantes) para saber a donde llevar a la
  // persona, en lugar de quedarse sin datos.
  //
  // HU-23: ademas, mientras la sala es terminal y la apuesta propia sigue
  // `ACTIVE`, se sondea corto para ver el paso a `RELEASED`/`CAPTURED` que
  // confirma Wallet -- sin afirmar "recuperado" antes de que el dato lo diga.
  const detail = useQuery({
    queryKey: queryKeys.battleRooms.detail(roomId ?? ''),
    queryFn: ({ signal }) => fetchBattleRoom(roomId ?? '', signal),
    enabled: roomId !== null && rooms.isSuccess && listRoom === null,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data

      if (data === undefined) {
        return false
      }

      const terminal = data.status === 'CANCELLED' || data.status === 'FINISHED'
      const stake = ownStakeOf(data, subject)

      return terminal && stake?.status === 'ACTIVE' ? 2_000 : false
    },
  })

  // HU-17: una sala PREPARING ya no esta en `rooms.data` (arriba), pero SI tiene
  // detalle completo -- se sigue mostrando ESTE lobby (equipos, chat, control de
  // inicio) con esos datos, en vez de saltar a /battle antes de que el propietario
  // decida iniciar.
  const room = listRoom ?? (detail.data?.status === 'PREPARING' ? detail.data : null)

  if (rooms.isPending) {
    return (
      <p role="status" className="text-sm text-muted">
        Cargando...
      </p>
    )
  }

  if (rooms.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {describeBattleRoomFailure(rooms.error)}
      </p>
    )
  }

  if (room === null) {
    if (detail.data?.status === 'IN_BATTLE' || detail.data?.status === 'FINISHED') {
      // La batalla ya empezo (o ya termino): esa pantalla vive aparte. `PREPARING`
      // YA NO navega aqui -- se queda en ESTE lobby (ver `room` arriba) hasta que
      // el propietario inicia y Combat publica el evento realtime.
      return <Navigate to={`/play/rooms/${encodeURIComponent(roomId ?? '')}/battle`} replace />
    }

    if (detail.isLoading) {
      return (
        <p role="status" className="text-sm text-muted">
          Cargando...
        </p>
      )
    }

    if (detail.data?.status === 'CANCELLED' || realtime.lastRoomStatus === 'CANCELLED') {
      const cancelledStake = describeOwnStake(ownStakeOf(detail.data ?? null, subject))

      return (
        <section className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-danger">
            La sala fue cancelada por su propietario. Selecciona otra sala para continuar.
          </p>
          {/* HU-23: el estado REAL que publico Combat; "liberándose" mientras
              Wallet no confirme, nunca "recuperado" por adelantado. */}
          {cancelledStake !== null && (
            <p role="status" className="text-sm text-muted">
              {cancelledStake}
            </p>
          )}
        </section>
      )
    }

    return <p className="text-sm text-muted">Esta sala ya no está disponible.</p>
  }

  const isOwner = subject !== null && subject === room.createdBy
  const isParticipant =
    subject !== null &&
    room.teams.some((team) =>
      team.participants.some((participant) => participant.playerId === subject),
    )
  const ownStakeLine = describeOwnStake(ownStakeOf(room, subject))

  const handleCancel = (): void => {
    setActionError(null)
    cancelRoom.mutate(room.id, {
      onError: (error) => {
        setActionError(describeBattleRoomFailure(error))
      },
    })
  }

  const handleLeave = (): void => {
    setActionError(null)
    leaveRoom.mutate(room.id, {
      onSuccess: () => {
        void navigate('/play')
      },
      onError: (error) => {
        setActionError(describeBattleRoomFailure(error))
      },
    })
  }

  const handleStart = (): void => {
    setActionError(null)
    startRoom.mutate(room.id, {
      onError: (error) => {
        // Mensajes propios por codigo (403 no-propietario, 422 elegibilidad/
        // composicion de equipos, etc.), nunca el texto crudo de Combat: ver
        // `describeStartBattleFailure`.
        setActionError(describeStartBattleFailure(error))
      },
    })
  }

  return (
    <section aria-label="Sala de batalla" className="flex flex-col gap-6">
      <Card
        title="Sala de batalla"
        description={
          room.status === 'PREPARING'
            ? 'La sala se llenó: preparando batalla.'
            : 'Esperando jugadores.'
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={room.status} />
            <span className="text-sm font-medium text-ink">{modeLabel(room.mode)}</span>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="text-sm text-muted">
              {room.teams[0]?.capacity ?? 0} vs {room.teams[1]?.capacity ?? 0}
            </span>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Coins aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand" />
              {room.reward.amount.toLocaleString('es-CO')}
            </span>
            {realtime.connection === 'reconnecting' && (
              <span role="status" className="text-xs text-muted">
                Reconectando en tiempo real…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TeamColumn letter="A" team={teamByLetter(room, 'A')} ownerPlayerId={room.createdBy} />
            <TeamColumn letter="B" team={teamByLetter(room, 'B')} ownerPlayerId={room.createdBy} />
          </div>

          <p className="text-xs text-muted">
            La batalla comienza cuando la sala se llena: Combat valida a los participantes y decide
            el orden de los turnos.
          </p>

          {/*
           * Seccion 12 del prompt maestro de estabilizacion: revisar la propia
           * preparacion sin abandonar la sala. Un modal que reutilizara
           * `HeroConfigurator` no es viable aqui -- ninguna feature importa
           * componentes de otra (`eslint.config.js`); la comunicacion es por
           * rutas. Enlazar a Mi Inventario NO abandona la sala (no llama
           * `leave`); Combat sigue siendo quien de verdad protege el `start`
           * contra un equipamiento vencido (HU-16, `HERO_CHANGED_SINCE_JOIN`/
           * `HERO_LOADOUT_CHANGED`, ya traducido arriba en `actionError`). No
           * se construye aqui ningun bloqueo nuevo -eso es HU-29, todavia en
           * dos PR abiertos (Player-Inventory #26, Web #90): revisar este
           * enlace cuando esos se integren, por si entonces conviene enlazar
           * a algo mas especifico que el inventario general.
           */}
          {isParticipant && (
            <Link
              to="/inventory"
              className="self-start text-sm font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Revisar mi equipamiento
            </Link>
          )}

          {ownStakeLine !== null && (
            <p role="status" className="text-sm font-medium text-brand">
              {ownStakeLine}
            </p>
          )}

          {actionError !== null && (
            <p role="alert" className="text-xs text-danger">
              {actionError}
            </p>
          )}

          {isParticipant && room.status === 'WAITING_FOR_PLAYERS' && (
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <Button variant="danger" loading={cancelRoom.isPending} onClick={handleCancel}>
                  Cancelar sala
                </Button>
              ) : (
                <Button variant="secondary" loading={leaveRoom.isPending} onClick={handleLeave}>
                  Abandonar sala
                </Button>
              )}
            </div>
          )}

          {/*
           * HU-17: solo el propietario puede iniciar (Combat lo exige server-side,
           * este boton es UX -- ver `StartBattle.execute`). El resto ve un texto de
           * espera y conserva la salida de "Abandonar sala" (Combat SI permite
           * `leave` en PREPARING; solo `cancel` queda restringido a WAITING).
           */}
          {isParticipant && room.status === 'PREPARING' && (
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <Button loading={startRoom.isPending} onClick={handleStart}>
                  Iniciar partida
                </Button>
              ) : (
                <>
                  <p role="status" className="text-sm text-muted">
                    Esperando a que el creador inicie la partida…
                  </p>
                  <Button variant="secondary" loading={leaveRoom.isPending} onClick={handleLeave}>
                    Abandonar sala
                  </Button>
                </>
              )}
            </div>
          )}

          {!isParticipant && (
            <p className="text-xs text-muted">Aún no eres participante de esta sala.</p>
          )}
        </div>
      </Card>

      {isParticipant && (
        <ChatPanel
          channel={{ kind: 'room', roomId: room.id }}
          title="Chat de la sala"
          description="Solo lo ven los participantes de esta sala."
        />
      )}
    </section>
  )
}
