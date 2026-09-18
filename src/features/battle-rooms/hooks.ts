import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { cancelBattleRoom, createBattleRoom, fetchBattleRooms } from './api'
import type { BattleRoom, CreateBattleRoomInput } from './types'

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
