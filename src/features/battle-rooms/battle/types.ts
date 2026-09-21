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

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

/** Instante ISO valido: un texto cualquiera no es una fecha. */
const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

/**
 * Un participante completo, campo por campo. Un `HUMAN` siempre trae su `playerId`;
 * un `AI` nunca (el contrato lo declara `null` para la IA).
 */
const isEntry = (value: unknown): value is TurnOrderEntry =>
  isRecord(value) &&
  isNonNegativeInteger(value.position) &&
  isNonEmptyString(value.teamLabel) &&
  isNonNegativeInteger(value.seat) &&
  (value.kind === 'HUMAN' ? isNonEmptyString(value.playerId) : value.kind === 'AI') &&
  (value.kind === 'HUMAN' || value.playerId === null) &&
  isStringOrNull(value.displayName) &&
  isStringOrNull(value.heroId) &&
  isStringOrNull(value.heroSubtype)

/** Mismo participante: la identidad de una entrada de la cola, sin depender de campos de presentacion. */
const isSameEntry = (a: TurnOrderEntry, b: TurnOrderEntry): boolean =>
  a.position === b.position &&
  a.teamLabel === b.teamLabel &&
  a.seat === b.seat &&
  a.kind === b.kind &&
  a.playerId === b.playerId

/**
 * Valida una vista de batalla: la FORMA de cada campo y la coherencia entre ellos.
 * Un mensaje malformado se ignora, nunca se pinta.
 *
 * Coherencia (sin calcular nada del turno): las posiciones de la cola son 0, 1, 2...
 * en orden, y `currentTurn` es ese mismo participante dentro de `turnOrder`.
 */
export const isBattleView = (value: unknown): value is BattleView => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.battleId) ||
    !isTimestamp(value.startedAt) ||
    !isNonNegativeInteger(value.turnsCompleted) ||
    !isNonNegativeInteger(value.round) ||
    value.round < 1 ||
    !Array.isArray(value.turnOrder) ||
    value.turnOrder.length === 0 ||
    !value.turnOrder.every(isEntry) ||
    !isEntry(value.currentTurn)
  ) {
    return false
  }

  const order: readonly TurnOrderEntry[] = value.turnOrder
  const current = value.currentTurn

  return (
    order.every((entry, index) => entry.position === index) &&
    order.some((entry) => isSameEntry(entry, current))
  )
}

export const isBattleEventMessage = (value: unknown): value is BattleEventMessage =>
  isRecord(value) &&
  (value.type === 'battleStarted' ||
    (value.type === 'turnAdvanced' && isNonNegativeInteger(value.completedPosition))) &&
  typeof value.seq === 'number' &&
  Number.isInteger(value.seq) &&
  value.seq >= 1 &&
  isNonEmptyString(value.roomId) &&
  isTimestamp(value.occurredAt) &&
  isBattleView(value.battle)

export const isSnapshotMessage = (value: unknown): value is SnapshotMessage =>
  isRecord(value) &&
  value.type === 'snapshot' &&
  isNonEmptyString(value.roomId) &&
  isNonNegativeInteger(value.seq) &&
  isNonEmptyString(value.status) &&
  (value.battle === null || isBattleView(value.battle))

export const isResumeOkMessage = (value: unknown): value is ResumeOkMessage =>
  isRecord(value) &&
  value.type === 'resume.ok' &&
  isNonEmptyString(value.roomId) &&
  isNonNegativeInteger(value.seq)

export const isCommandRejectedMessage = (value: unknown): value is CommandRejectedMessage =>
  isRecord(value) && value.type === 'command.rejected' && isNonEmptyString(value.code)
