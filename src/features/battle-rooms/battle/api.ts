import { httpClient } from '@/lib/http'

import type { BattleRoom } from '../types'

/**
 * `POST /v1/combat/realtime/tickets` (ADR-020). El JWT viaja en la cabecera
 * (`httpClient`); el ticket devuelto es opaco, de un solo uso y caduca a los 30 s.
 * Sin cuerpo: nadie puede pedir un ticket para otro jugador.
 */
export const issueRealtimeTicket = async (): Promise<string> => {
  const response = await httpClient.post<{ readonly ticket: string }>('/v1/combat/realtime/tickets')

  return response.ticket
}

/**
 * `GET /v1/combat/rooms/:roomId` (HU-17): la sala con su batalla, SOLO para sus
 * participantes (403 si no lo es). Existe porque `GET /rooms` solo lista salas
 * esperando jugadores.
 */
export const fetchBattleRoom = (roomId: string, signal?: AbortSignal): Promise<BattleRoom> =>
  httpClient.get<BattleRoom>(`/v1/combat/rooms/${encodeURIComponent(roomId)}`, signal)

/**
 * `POST /v1/combat/rooms/:roomId/start` (HU-17). Sin cuerpo: ningun cliente elige
 * quien inicia, el orden ni los participantes; lo decide Combat con su motor de
 * aleatoriedad. Idempotente: llamarlo con la batalla ya iniciada devuelve el
 * estado vigente.
 */
export const startBattle = (roomId: string): Promise<BattleRoom> =>
  httpClient.post<BattleRoom>(`/v1/combat/rooms/${encodeURIComponent(roomId)}/start`)

/**
 * Estado de creditos y cofre de HU-22 para el jugador autenticado en UNA
 * batalla (`hu-22-reward-contract-v1` §10). SIEMPRE el propio: el `playerId`
 * sale del testimonio, nunca de un parametro. `null` en cada campo mientras
 * Combat aun no confirmo el credito con Wallet (recien terminada la batalla).
 */
export const REWARD_DELIVERY_STATES = ['NONE', 'PENDING', 'CONFIRMED', 'FAILED'] as const
export type RewardDeliveryState = (typeof REWARD_DELIVERY_STATES)[number]

export interface RewardProduct {
  readonly productId: string
  readonly sku: string
  readonly name: string
}

export interface BattleRewardStatus {
  readonly creditsEarned: number | null
  readonly balance: number | null
  readonly victoryProgress: number | null
  readonly weeklyChestCount: number | null
  readonly chestEarned: boolean | null
  readonly rewardDelivery: RewardDeliveryState
  readonly reward: RewardProduct | null
}

/** `GET /v1/combat/rooms/:roomId/reward` (HU-22). Solo tiene sentido tras el fin de la batalla. */
export const fetchBattleReward = (
  roomId: string,
  signal?: AbortSignal,
): Promise<BattleRewardStatus> =>
  httpClient.get<BattleRewardStatus>(
    `/v1/combat/rooms/${encodeURIComponent(roomId)}/reward`,
    signal,
  )

/** El saldo vive en `@/shared/wallet`; se reexporta para los consumidores de Jugar Online. */
export { fetchWallet, type WalletSnapshot } from '@/shared/wallet'
