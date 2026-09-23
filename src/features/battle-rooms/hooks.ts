import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { invalidateWallet } from '@/shared/wallet'

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

/** `true` si al crear la sala el creador declara una apuesta propia (HU-23). */
const declaresStake = (input: CreateBattleRoomInput): boolean =>
  input.teamConfigs.some((team) =>
    (team.initialParticipants ?? []).some((participant) => 'stake' in participant),
  )

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
    onSuccess: (_room, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
      // HU-23: crear apostando reserva creditos (baja `available`).
      if (declaresStake(input)) {
        invalidateWallet(queryClient)
      }
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
      // HU-23: cancelar libera las apuestas reservadas.
      invalidateWallet(queryClient)
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
      // HU-23: abandonar antes de iniciar libera la apuesta propia.
      invalidateWallet(queryClient)
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
    onSuccess: (_room, { stake }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battleRooms.list })
      // HU-23: unirse apostando reserva creditos (baja `available`).
      if (stake !== undefined) {
        invalidateWallet(queryClient)
      }
    },
  })
}
