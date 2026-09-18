import { useMemo, useState } from 'react'

import clsx from 'clsx'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from '@/components/ui/icons'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'

import { BattleRoomCard } from './BattleRoomCard'
import { BattleRoomFilters, type BattleRoomModeFilter } from './BattleRoomFilters'
import { useBattleRooms, useCancelBattleRoom } from './hooks'
import { describeBattleRoomFailure } from './presentation'

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
 * con filtro de modalidad y busqueda por ID (ambos client-side) y
 * cancelacion de una sala propia. Scroll interno propio para que la pagina
 * completa no crezca sin limite si hay muchas salas (seccion 11/16).
 */
export const AvailableBattleRoomsPanel = (): React.JSX.Element => {
  const [modeFilter, setModeFilter] = useState<BattleRoomModeFilter>('ALL')
  const [search, setSearch] = useState('')
  const subject = useSession((state) => state.subject)

  const rooms = useBattleRooms()
  const cancelRoom = useCancelBattleRoom()

  const visibleRooms = useMemo(() => {
    const all = rooms.data ?? []
    const byMode = modeFilter === 'ALL' ? all : all.filter((room) => room.mode === modeFilter)
    const normalizedSearch = search.trim().toLowerCase()

    return normalizedSearch === ''
      ? byMode
      : byMode.filter((room) => room.id.toLowerCase().includes(normalizedSearch))
  }, [rooms.data, modeFilter, search])

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
                  cancelling={cancelRoom.isPending && cancelRoom.variables === room.id}
                  onCancel={(roomId) => {
                    cancelRoom.mutate(roomId)
                  }}
                />
              ))}
            </ul>
          </QueryState>
        </div>
      </div>
    </Card>
  )
}
