/**
 * Contrato de la batalla (HU-17, RF-17) tal como lo publica Combat. Espejo del
 * contrato v1 de `Nexus-Battle-Infrastructure`
 * (`docs/contracts/hu-17-battle-turn-order-v1.md`): no se inventa ningun campo ni
 * se renombra ninguno.
 *
 * Web NO calcula nada de esto: solo lo recibe y lo pinta. En particular nunca
 * decide `turno + 1`: el turno vigente es `currentTurn`, que llega del servidor.
 */

/** Un participante dentro de la cola de turnos (inmutable durante toda la batalla). */
export interface TurnOrderEntry {
  /** Indice 0-based en la cola. */
  readonly position: number
  readonly teamLabel: string
  /** Indice 0-based del participante dentro de su equipo. */
  readonly seat: number
  readonly kind: 'HUMAN' | 'AI'
  /** Sujeto del participante (ya viaja en `BattleRoom`, HU-15); `null` para `AI`. */
  readonly playerId: string | null
  readonly displayName: string | null
  readonly heroId: string | null
  /** Subtipo canonico para elegir el modelo visual; `null` para `AI`. */
  readonly heroSubtype: string | null
}

export interface BattleView {
  /** Igual al `roomId`: una sala produce como maximo una batalla. */
  readonly battleId: string
  readonly startedAt: string
  readonly turnOrder: readonly TurnOrderEntry[]
  readonly turnsCompleted: number
  readonly round: number
  readonly currentTurn: TurnOrderEntry
}

export interface BattleStartedMessage {
  readonly type: 'battleStarted'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  readonly battle: BattleView
}

export interface TurnAdvancedMessage {
  readonly type: 'turnAdvanced'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  readonly completedPosition: number
  readonly battle: BattleView
}

export type BattleEventMessage = BattleStartedMessage | TurnAdvancedMessage

/** Instantanea completa del estado visible (respuesta de `resume` cuando no hay replay). */
export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly roomId: string
  readonly seq: number
  readonly status: string
  readonly battle: BattleView | null
}

export interface ResumeOkMessage {
  readonly type: 'resume.ok'
  readonly roomId: string
  readonly seq: number
}

/** Rechazo de un comando: llega solo a quien lo envio, con un codigo estable. */
export interface CommandRejectedMessage {
  readonly type: 'command.rejected'
  readonly code: string
  readonly commandId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isEntry = (value: unknown): value is TurnOrderEntry =>
  isRecord(value) &&
  typeof value.position === 'number' &&
  typeof value.teamLabel === 'string' &&
  typeof value.seat === 'number' &&
  (value.kind === 'HUMAN' || value.kind === 'AI')

/** Valida la FORMA de una vista de batalla: un mensaje malformado se ignora, nunca se pinta. */
export const isBattleView = (value: unknown): value is BattleView =>
  isRecord(value) &&
  typeof value.battleId === 'string' &&
  typeof value.turnsCompleted === 'number' &&
  typeof value.round === 'number' &&
  Array.isArray(value.turnOrder) &&
  value.turnOrder.length > 0 &&
  value.turnOrder.every(isEntry) &&
  isEntry(value.currentTurn)

export const isBattleEventMessage = (value: unknown): value is BattleEventMessage =>
  isRecord(value) &&
  (value.type === 'battleStarted' || value.type === 'turnAdvanced') &&
  typeof value.seq === 'number' &&
  Number.isInteger(value.seq) &&
  value.seq >= 1 &&
  typeof value.roomId === 'string' &&
  isBattleView(value.battle)

export const isSnapshotMessage = (value: unknown): value is SnapshotMessage =>
  isRecord(value) &&
  value.type === 'snapshot' &&
  typeof value.roomId === 'string' &&
  typeof value.seq === 'number' &&
  Number.isInteger(value.seq) &&
  value.seq >= 0 &&
  typeof value.status === 'string' &&
  (value.battle === null || isBattleView(value.battle))

export const isResumeOkMessage = (value: unknown): value is ResumeOkMessage =>
  isRecord(value) &&
  value.type === 'resume.ok' &&
  typeof value.roomId === 'string' &&
  typeof value.seq === 'number'

export const isCommandRejectedMessage = (value: unknown): value is CommandRejectedMessage =>
  isRecord(value) && value.type === 'command.rejected' && typeof value.code === 'string'
