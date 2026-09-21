import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Coins } from '@/components/ui/icons'
import { ChatPanel } from './ChatPanel'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchBattleRoom } from './battle/api'
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
 * Combat) -- en cuanto la sala pasa a `PREPARING` (se lleno normalmente) o a
 * `CANCELLED`, desaparece de esa lista por igual y esta pantalla deja de
 * tener datos de equipos/participantes para mostrar (no existe un
 * `GET /rooms/:id` que los reponga, y esta pantalla no inventa uno). Lo
 * unico que SI se puede distinguir sin un endpoint nuevo es el `status` del
 * ultimo evento `battle-room.updated` recibido por WebSocket
 * (`useBattleRoomRealtime`): se usa solo para elegir el MENSAJE correcto
 * ("cancelada por su propietario" vs. "se llenó, preparando"), nunca para
 * reconstruir datos de participantes que el contrato ya no expone.
 */
export const BattleRoomLobbyPage = (): React.JSX.Element => {
  const { roomId = null } = useParams<{ roomId: string }>()
  const subject = useSession((state) => state.subject)
  const navigate = useNavigate()
  const rooms = useBattleRooms()
  const realtime = useBattleRoomRealtime(roomId)
  const cancelRoom = useCancelBattleRoom()
  const leaveRoom = useLeaveBattleRoom()
  const [actionError, setActionError] = useState<string | null>(null)

  const room = rooms.data?.find((candidate) => candidate.id === roomId) ?? null

  // HU-17: `GET /rooms` solo lista salas esperando jugadores. Cuando la sala deja
  // de estar en esa lista (se lleno, esta en batalla o se cancelo) se lee por
  // `GET /rooms/:roomId` (solo participantes) para saber a donde llevar a la
  // persona, en lugar de quedarse sin datos.
  const detail = useQuery({
    queryKey: queryKeys.battleRooms.detail(roomId ?? ''),
    queryFn: ({ signal }) => fetchBattleRoom(roomId ?? '', signal),
    enabled: roomId !== null && rooms.isSuccess && room === null,
    retry: false,
  })

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
    if (detail.data?.status === 'PREPARING' || detail.data?.status === 'IN_BATTLE') {
      // La sala se lleno: la batalla continua en su propia pantalla. El servidor
      // decide cuando empieza; esta pantalla solo lleva a quien participa.
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
      return (
        <p role="alert" className="text-sm text-danger">
          La sala fue cancelada por su propietario. Selecciona otra sala para continuar.
        </p>
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

          {actionError !== null && (
            <p role="alert" className="text-xs text-danger">
              {actionError}
            </p>
          )}

          {isParticipant && (
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
