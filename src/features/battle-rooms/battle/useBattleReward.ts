import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { fetchBattleReward, type BattleRewardStatus } from './api'

const POLL_MS = 1_500

/**
 * Estado de creditos/cofre de HU-22 (`hu-22-reward-contract-v1` §10) para la
 * batalla terminada. Recuperacion sin depender del evento en tiempo real
 * (HU-22 no anade un tipo de mensaje WS nuevo, ver `useBattleRealtime.ts`):
 * un `useQuery` normal, activado solo cuando la batalla ya termino.
 *
 * Sondeo corto mientras la entrega no llego a un estado final: el flujo de
 * Combat -> Wallet -> Inventory puede tardar mas que el primer render de esta
 * pantalla. Se detiene solo al llegar a `CONFIRMED` o a `NONE` con progreso ya
 * conocido (sin cofre, nada que esperar).
 */
export const useBattleReward = (
  roomId: string,
  enabled: boolean,
): UseQueryResult<BattleRewardStatus> =>
  useQuery({
    queryKey: queryKeys.battleRooms.reward(roomId),
    queryFn: ({ signal }) => fetchBattleReward(roomId, signal),
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data

      if (data === undefined) {
        return POLL_MS
      }

      // CONFIRMED: cofre entregado, nada mas que esperar. NONE con balance ya
      // conocido: el credito se confirmo y no corresponde cofre (COMPLETED
      // sin cofre). PENDING sigue en curso (CHEST_ELIGIBLE/REWARD_SELECTED o
      // el credito aun no llega) y debe seguir sondeando.
      const settled =
        data.rewardDelivery === 'CONFIRMED' ||
        (data.rewardDelivery === 'NONE' && data.balance !== null)

      return settled ? false : POLL_MS
    },
  })
