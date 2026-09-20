import { useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useSession } from '@/shared/session'

import { useBattleRooms } from './hooks'
import { useBattleRoomRealtime } from './useBattleRoomRealtime'
import { describeBattleRoomFailure, teamByLetter } from './presentation'
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
}

/**
 * Columna de un equipo dentro del lobby. Solo muestra `displayName` y
 * avatar de cada participante -datos publicos segun el contrato de
 * Combat/Account-; NUNCA `playerId` ni ningun identificador tecnico. Los
 * cupos vacios se representan como una fila propia, visualmente distinta de
 * un participante real.
 */
const TeamColumn = ({ letter, team }: TeamColumnProps): React.JSX.Element => {
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
 */
export const BattleRoomLobbyPage = (): React.JSX.Element => {
  const { roomId = null } = useParams<{ roomId: string }>()
  const subject = useSession((state) => state.subject)
  const rooms = useBattleRooms()
  const realtime = useBattleRoomRealtime(roomId)

  const room = rooms.data?.find((candidate) => candidate.id === roomId) ?? null

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
    return <p className="text-sm text-muted">Esta sala ya no está disponible.</p>
  }

  const isParticipant =
    subject !== null &&
    room.teams.some((team) =>
      team.participants.some((participant) => participant.playerId === subject),
    )

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
            {realtime === 'reconnecting' && (
              <span role="status" className="text-xs text-muted">
                Reconectando en tiempo real…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TeamColumn letter="A" team={teamByLetter(room, 'A')} />
            <TeamColumn letter="B" team={teamByLetter(room, 'B')} />
          </div>

          <Button
            variant="secondary"
            disabled
            title="Disponible en una futura HU de inicio de combate"
          >
            Empezar partida — Próximamente
          </Button>

          {!isParticipant && (
            <p className="text-xs text-muted">Aún no eres participante de esta sala.</p>
          )}
        </div>
      </Card>
    </section>
  )
}
