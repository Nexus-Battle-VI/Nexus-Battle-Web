/**
 * Tipos del contrato real de Combat (HU-14.1/14.2), expuesto tras el gateway
 * como `/api/v1/combat/rooms`. Mapean 1:1 `battle-room.dto.ts` de
 * `Nexus-Battle-Combat` — no se inventa ningun campo ni se renombra ninguno.
 */

import type { BattleResult, BattleView } from './battle/types'

/** Valores reales del contrato. La UI puede traducirlos para mostrarlos, pero
 * lo que viaja al backend es siempre uno de estos dos literales. */
export type BattleRoomMode = 'PVP' | 'PVE'

/**
 * `PREPARING` se suma en HU-15.3: Combat la usa cuando la sala se llena y
 * pasa a preparar el combate. `FINISHED` (HU-21) es el estado TERMINAL de la
 * batalla: la sala conserva su resultado y su chat queda cerrado. El resto de
 * la feature (crear, cancelar, listar) sigue viendo indistintamente cualquier
 * estado, sin asumir que solo existen los originales de HU-14.
 */
export type BattleRoomStatus =
  'WAITING_FOR_PLAYERS' | 'PREPARING' | 'IN_BATTLE' | 'FINISHED' | 'CANCELLED'

/** Los dos unicos equipos que declara el contrato de creacion (HU-14). */
export type TeamLetter = 'A' | 'B'

export type ParticipantKind = 'HUMAN' | 'AI'

export interface Participant {
  readonly kind: ParticipantKind
  readonly playerId: string | null
  readonly heroId: string | null
  readonly joinedAt: string
  /**
   * Nombre visible resuelto por el servicio (HU-15.3, nunca lo envia el
   * cliente). `null` para un participante `AI` o si Combat aun no lo resolvio.
   */
  readonly displayName?: string | null
  /**
   * HU-23 (aditivo): la apuesta del PROPIO jugador que pide la sala. Combat
   * NUNCA expone la de un rival (contrato §10): para cualquier otro
   * participante el campo esta ausente. Ausente tambien cuando no aposto.
   */
  readonly stake?: ParticipantStake
}

/**
 * Estado de una apuesta tal como lo publica Combat (contrato §4.2). Es un
 * espejo literal: Web no lo traduce al enviar nada (nunca envia estados), solo
 * lo lee para mostrarlo.
 */
export const PARTICIPANT_STAKE_STATUSES = [
  'PENDING_RESERVE',
  'ACTIVE',
  'RESERVE_FAILED',
  'RELEASED',
  'CAPTURED',
  'SETTLED_WON',
] as const

export type ParticipantStakeStatus = (typeof PARTICIPANT_STAKE_STATUSES)[number]

export interface ParticipantStake {
  readonly amount: number
  readonly status: ParticipantStakeStatus
}

export interface Team {
  readonly label: string
  readonly capacity: number
  readonly participants: readonly Participant[]
}

export interface Reward {
  readonly amount: number
}

/** Forma de respuesta compartida por crear, listar y cancelar. */
export interface BattleRoom {
  readonly id: string
  readonly mode: BattleRoomMode
  readonly status: BattleRoomStatus
  readonly teams: readonly Team[]
  readonly reward: Reward
  /** Sujeto verificado del JWT del creador. Solo lectura: nunca se envia. */
  readonly createdBy: string
  readonly createdAt: string
  readonly version: number
  /** HU-17 (aditivo): `seq` del ultimo evento de batalla. Ausente en salas anteriores. */
  readonly lastSeq?: number
  /** HU-17 (aditivo): batalla en curso; `null` hasta `IN_BATTLE`. */
  readonly battle?: BattleView | null
  /**
   * HU-21 (aditivo): resultado unico si la sala esta `FINISHED`; `null` en otro
   * caso. Misma visibilidad que `battle`.
   */
  readonly result?: BattleResult | null
  /**
   * HU-23 (aditivo, contrato §10): resumen AGREGADO de lo que hay en juego -- la
   * suma de las apuestas `ACTIVE` de la sala, sin desglosar cuanto puso cada
   * rival. `{ total: 0 }` cuando no hay ninguna. Ausente en un Combat anterior
   * a HU-23.
   */
  readonly stakePool?: { readonly total: number }
}

/**
 * Apuesta que el cliente DECLARA (al crear o al unirse): solo el monto. El
 * `operationId` y el estado los decide Combat/Wallet, nunca el cuerpo.
 * `amount` es entero `>= 1`; `0`/ausente significa no apostar (D5).
 */
export interface StakeDeclaration {
  readonly amount: number
}

/**
 * Participante inicial declarado al crear. Sin `playerId`: un `HUMAN` inicial
 * se resuelve siempre al creador (`identity.subject`) en el backend, nunca a
 * un identificador que el cliente proponga.
 */
export interface CreateParticipantInput {
  readonly kind: ParticipantKind
  readonly heroId?: string
  /**
   * HU-23: apuesta declarada del participante. En `create` el unico `HUMAN`
   * declarable es el creador, asi que este campo es la apuesta del creador.
   */
  readonly stake?: StakeDeclaration
}

export interface CreateTeamConfigInput {
  readonly capacity: number
  readonly initialParticipants?: readonly CreateParticipantInput[]
}

/**
 * Body real de `POST /api/v1/combat/rooms`. Deliberadamente NO declara
 * `createdBy` ni `playerId`: el DTO de Combat no los acepta (la identidad del
 * creador sale del JWT), y declararlos aqui invitaria a alguien a rellenarlos.
 */
export interface CreateBattleRoomInput {
  readonly mode: BattleRoomMode
  readonly teamConfigs: readonly [CreateTeamConfigInput, CreateTeamConfigInput]
  readonly reward: Reward
}

/**
 * Body real de `POST /v1/combat/rooms/:roomId/join` (HU-15.2/15.3). `team` es
 * opcional en el contrato: se envia solo cuando la persona eligio un equipo
 * explicito en la UI.
 */
export interface JoinBattleRoomInput {
  readonly team?: TeamLetter
  /**
   * HU-23 (D1): apuesta INDIVIDUAL del jugador que se une. Nadie tiene que
   * igualar a nadie; `0`/ausente significa no apostar.
   */
  readonly stake?: StakeDeclaration
}
