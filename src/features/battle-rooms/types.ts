/**
 * Tipos del contrato real de Combat (HU-14.1/14.2), expuesto tras el gateway
 * como `/api/v1/combat/rooms`. Mapean 1:1 `battle-room.dto.ts` de
 * `Nexus-Battle-Combat` — no se inventa ningun campo ni se renombra ninguno.
 */

/** Valores reales del contrato. La UI puede traducirlos para mostrarlos, pero
 * lo que viaja al backend es siempre uno de estos dos literales. */
export type BattleRoomMode = 'PVP' | 'PVE'

/**
 * `PREPARING` se suma en HU-15.3: Combat la usa cuando la sala se llena y
 * pasa a preparar el combate. El resto de la feature (crear, cancelar,
 * listar) sigue viendo indistintamente cualquier estado, sin asumir que solo
 * existen los dos originales de HU-14.
 */
export type BattleRoomStatus = 'WAITING_FOR_PLAYERS' | 'PREPARING' | 'CANCELLED'

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
}

/**
 * Participante inicial declarado al crear. Sin `playerId`: un `HUMAN` inicial
 * se resuelve siempre al creador (`identity.subject`) en el backend, nunca a
 * un identificador que el cliente proponga.
 */
export interface CreateParticipantInput {
  readonly kind: ParticipantKind
  readonly heroId?: string
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
}
