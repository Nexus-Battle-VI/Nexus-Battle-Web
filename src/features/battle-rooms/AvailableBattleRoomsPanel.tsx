import { useMemo, useState } from 'react'

import clsx from 'clsx'
import { useNavigate } from 'react-router'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from '@/components/ui/icons'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'

import { BattleRoomCard } from './BattleRoomCard'
import { BattleRoomFilters, type BattleRoomModeFilter } from './BattleRoomFilters'
import { useBattleRooms, useCancelBattleRoom, useJoinBattleRoom } from './hooks'
import { describeBattleRoomFailure, joinBattleRoomFailure } from './presentation'
import type { JoinBattleRoomFailure } from './presentation'
import type { TeamLetter } from './types'

/**
 * `QueryState` muestra `error.message` tal cual (patron compartido, ver
 * `QueryState.tsx`). El 401 de Combat no manda cuerpo estructurado (auditoria
 * seccion 11): se reescribe aqui a un mensaje comprensible antes de llegar a
 * `QueryState`, sin inventar un mecanismo de manejo de errores nuevo.
 */
const displayErrorOf = (error: unknown): unknown =>
  error instanceof HttpError && error.isUnauthorized
    ? new Error(describeBattleRoomFailure(error))
    : error

/**
 * Panel derecho de "Jugar Online": listado real de `GET /v1/combat/rooms`
 * con filtro de modalidad y busqueda por ID (ambos client-side), cancelacion
 * de una sala propia y union a un equipo (HU-15.3).
 *
 * La union NO usa actualizacion optimista y, ante un fallo, refresca el
 * listado antes de mostrar el mensaje: si otra persona ocupo el ultimo cupo
 * justo antes de que la solicitud llegara al backend, el 409 real se muestra
 * (nunca se oculta) y la tarjeta que se vuelve a pintar ya refleja la
 * ocupacion real, no la que habia cuando se pulso el boton.
 */
export const AvailableBattleRoomsPanel = (): React.JSX.Element => {
  const [modeFilter, setModeFilter] = useState<BattleRoomModeFilter>('ALL')
  const [search, setSearch] = useState('')
  const subject = useSession((state) => state.subject)
  const navigate = useNavigate()

  const rooms = useBattleRooms()
  const cancelRoom = useCancelBattleRoom()
  const joinRoom = useJoinBattleRoom()

  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [joiningTeam, setJoiningTeam] = useState<TeamLetter | null>(null)
  const [joinErrorByRoom, setJoinErrorByRoom] = useState<
    Readonly<Record<string, JoinBattleRoomFailure>>
  >({})

  const visibleRooms = useMemo(() => {
    const all = rooms.data ?? []
    const byMode = modeFilter === 'ALL' ? all : all.filter((room) => room.mode === modeFilter)
    const normalizedSearch = search.trim().toLowerCase()

    return normalizedSearch === ''
      ? byMode
      : byMode.filter((room) => room.id.toLowerCase().includes(normalizedSearch))
  }, [rooms.data, modeFilter, search])

  const handleJoin = (roomId: string, team: TeamLetter, stakeAmount: number | null): void => {
    setJoiningRoomId(roomId)
    setJoiningTeam(team)
    setJoinErrorByRoom((previous) => {
      if (!(roomId in previous)) {
        return previous
      }

      const next = Object.fromEntries(Object.entries(previous).filter(([id]) => id !== roomId))
      return next
    })

    joinRoom.mutate(
      {
        roomId,
        team,
        // HU-23: la apuesta propia viaja SOLO cuando la persona indico un
        // monto; sin ella el cuerpo de union es exactamente el de antes.
        ...(stakeAmount === null ? {} : { stake: { amount: stakeAmount } }),
      },
      {
        onSuccess: () => {
          setJoiningRoomId(null)
          setJoiningTeam(null)
          void navigate(`/play/rooms/${roomId}`)
        },
        onError: (error) => {
          setJoiningRoomId(null)
          setJoiningTeam(null)
          // Un 409 real (sala llena, version en conflicto...) no se oculta:
          // se refresca el listado para reflejar el estado real y el mensaje
          // sigue siendo el que describe exactamente que paso.
          void rooms.refetch()
          setJoinErrorByRoom((previous) => ({
            ...previous,
            [roomId]: joinBattleRoomFailure(error),
          }))
        },
      },
    )
  }

  return (
    <Card
      title="Salas disponibles"
      description="Salas esperando jugadores, en tiempo real de tu ultima consulta."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <BattleRoomFilters
            mode={modeFilter}
            onModeChange={setModeFilter}
            search={search}
            onSearchChange={setSearch}
          />
          <Button
            variant="secondary"
            disabled={rooms.isFetching}
            aria-busy={rooms.isFetching}
            onClick={() => {
              void rooms.refetch()
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={clsx('h-4 w-4', rooms.isFetching && 'motion-safe:animate-spin')}
            />
            Refrescar
          </Button>
        </div>

        {cancelRoom.error !== null && cancelRoom.error !== undefined && (
          <p role="alert" className="text-sm text-danger">
            {describeBattleRoomFailure(cancelRoom.error)}
          </p>
        )}

        <div className="max-h-[70vh] overflow-y-auto lg:max-h-[60vh]">
          <QueryState
            isLoading={rooms.isPending}
            error={displayErrorOf(rooms.error)}
            isEmpty={visibleRooms.length === 0}
            emptyMessage={
              (rooms.data?.length ?? 0) === 0
                ? 'No hay salas esperando jugadores en este momento. Crea la primera sala de batalla.'
                : 'Ninguna sala coincide con el filtro o la busqueda actual.'
            }
          >
            <ul className="flex flex-col gap-3">
              {visibleRooms.map((room) => (
                <BattleRoomCard
                  key={room.id}
                  room={room}
                  isOwn={subject !== null && subject === room.createdBy}
                  isParticipant={
                    subject !== null &&
                    room.teams.some((team) =>
                      team.participants.some((participant) => participant.playerId === subject),
                    )
                  }
                  cancelling={cancelRoom.isPending && cancelRoom.variables === room.id}
                  onCancel={(roomId) => {
                    cancelRoom.mutate(roomId)
                  }}
                  onJoin={handleJoin}
                  joiningTeam={joiningRoomId === room.id ? joiningTeam : null}
                  joinError={joinErrorByRoom[room.id] ?? null}
                />
              ))}
            </ul>
          </QueryState>
        </div>
      </div>
    </Card>
  )
}
