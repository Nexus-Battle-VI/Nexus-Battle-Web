import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import {
  cancelBattleRoom,
  createBattleRoom,
  fetchBattleRooms,
  fetchMyActiveBattleRooms,
  joinBattleRoom,
  leaveBattleRoom,
} from './api'
import type { BattleRoom, CreateBattleRoomInput, StakeDeclaration, TeamLetter } from './types'

export const useBattleRooms = (): UseQueryResult<readonly BattleRoom[]> =>
  useQuery({
    queryKey: queryKeys.battleRooms.list,
    queryFn: ({ signal }) => fetchBattleRooms(signal),
  })

/**
 * Salas activas del jugador ("volver a mi sala"). `staleTime: 0`: cada vez que
 * se vuelve a Jugar Online se relee, porque el estado de la sala cambia fuera
 * de esta pantalla (se lleno, empezo o termino la batalla). Sin sondeo: las
 * mutaciones y `battle-room.updated` la invalidan.
 */
export const useMyActiveRooms = (): UseQueryResult<readonly BattleRoom[]> => {
  const subject = useSession((state) => state.subject)

  return useQuery({
    queryKey: queryKeys.battleRooms.mine,
    queryFn: ({ signal }) => fetchMyActiveBattleRooms(signal),
    enabled: subject !== null,
    staleTime: 0,
  })
}

/**
 * Invalida el listado publico y "mis salas": toda mutacion de sala cambia
 * ambas vistas.
 */
const invalidateRoomLists = (queryClient: ReturnType<typeof useQueryClient>): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
  void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.mine })
}

/**
 * Crear sala. Sin actualizacion optimista: la sala real la decide el
 * servicio (identidad del creador, `id`, `createdAt`, `version`), y no hay
 * nada valido que adivinar en el cliente mientras se espera la respuesta.
 * Tras el `201` se invalida el listado para que la sala nueva aparezca sin
 * recargar la pagina completa.
 */
export const useCreateBattleRoom = (): UseMutationResult<
  BattleRoom,
  unknown,
  CreateBattleRoomInput
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBattleRoomInput) => createBattleRoom(input),
    onSuccess: () => {
      invalidateRoomLists(queryClient)
    },
  })
}

/** Cancelar una sala propia. Misma invalidacion que crear: el listado deja de mostrarla. */
export const useCancelBattleRoom = (): UseMutationResult<BattleRoom, unknown, string> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roomId: string) => cancelBattleRoom(roomId),
    onSuccess: () => {
      invalidateRoomLists(queryClient)
    },
  })
}

/** Abandonar una sala propia (ciclo de vida del lobby). Misma invalidacion que cancelar/unirse. */
export const useLeaveBattleRoom = (): UseMutationResult<BattleRoom, unknown, string> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roomId: string) => leaveBattleRoom(roomId),
    onSuccess: () => {
      invalidateRoomLists(queryClient)
    },
  })
}

export interface JoinBattleRoomVariables {
  readonly roomId: string
  readonly team?: TeamLetter
  /** HU-23: apuesta propia opcional; `null`/ausente = no apostar. */
  readonly stake?: StakeDeclaration
}

/**
 * Unirse a una sala (HU-15.3). Misma politica que crear/cancelar: sin
 * actualizacion optimista -la ocupacion real, el `displayName` resuelto y el
 * `status`/`version` los decide Combat, no hay nada valido que adivinar
 * mientras se espera la respuesta- y se invalida el listado (unica consulta
 * GET real disponible hoy; la pantalla de lobby deriva la sala concreta de
 * ese mismo listado, ver `BattleRoomLobbyPage`).
 */
export const useJoinBattleRoom = (): UseMutationResult<
  BattleRoom,
  unknown,
  JoinBattleRoomVariables
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ roomId, team, stake }: JoinBattleRoomVariables) =>
      joinBattleRoom(roomId, {
        ...(team === undefined ? {} : { team }),
        ...(stake === undefined ? {} : { stake }),
      }),
    onSuccess: () => {
      invalidateRoomLists(queryClient)
    },
  })
}
