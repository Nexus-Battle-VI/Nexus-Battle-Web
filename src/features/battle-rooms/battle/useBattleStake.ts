import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { fetchBattleRoom } from './api'
import { ownStakeOf } from './stakePresentation'
import type { ParticipantStake } from '../types'

const POLL_MS = 2_000

/**
 * Estados en los que la apuesta propia ya no va a cambiar: la liquidacion o
 * liberacion quedo confirmada (o el rechazo es terminal). Mismo criterio que
 * `useBattleReward`: nunca sondear indefinidamente algo ya resuelto.
 */
const TERMINAL_STATES: ReadonlySet<ParticipantStake['status']> = new Set([
  'RELEASED',
  'CAPTURED',
  'SETTLED_WON',
  'RESERVE_FAILED',
])

/**
 * La apuesta del PROPIO jugador en una batalla terminada (HU-23).
 *
 * No existe un endpoint aparte de la apuesta (el contrato §7 no lo fija):
 * Combat publica `stake` en el DTO de la sala, y `GET /rooms/:roomId` ya
 * exigia ser participante. Se comparte la clave `detail` con el lobby para no
 * pedir dos veces el mismo recurso; `select` extrae solo la apuesta propia
 * (nunca la de un rival, contrato §10).
 *
 * Sondeo corto mientras el estado no es terminal: la liquidacion de Combat ->
 * Wallet puede tardar mas que el primer render de la pantalla de resultado.
 */
export const useBattleStake = (
  roomId: string,
  subject: string | null,
  enabled: boolean,
): UseQueryResult<ParticipantStake | undefined> =>
  useQuery({
    queryKey: queryKeys.battleRooms.detail(roomId),
    queryFn: ({ signal }) => fetchBattleRoom(roomId, signal),
    enabled: enabled && subject !== null,
    select: (room) => ownStakeOf(room, subject),
    refetchInterval: (query) => {
      const stake = ownStakeOf(query.state.data ?? null, subject)

      if (stake === undefined) {
        return false
      }

      return TERMINAL_STATES.has(stake.status) ? false : POLL_MS
    },
  })
