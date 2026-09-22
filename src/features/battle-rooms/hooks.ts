import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import {
  cancelBattleRoom,
  createBattleRoom,
  fetchBattleRooms,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
    },
  })
}

/** Cancelar una sala propia. Misma invalidacion que crear: el listado deja de mostrarla. */
export const useCancelBattleRoom = (): UseMutationResult<BattleRoom, unknown, string> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roomId: string) => cancelBattleRoom(roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
    },
  })
}

/** Abandonar una sala propia (ciclo de vida del lobby). Misma invalidacion que cancelar/unirse. */
export const useLeaveBattleRoom = (): UseMutationResult<BattleRoom, unknown, string> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roomId: string) => leaveBattleRoom(roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
    },
  })
}
