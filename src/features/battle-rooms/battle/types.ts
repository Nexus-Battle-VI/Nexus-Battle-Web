/**
 * Contrato de la batalla (HU-17, RF-17) tal como lo publica Combat. Espejo del
 * contrato v1 de `Nexus-Battle-Infrastructure`
 * (`docs/contracts/hu-17-battle-turn-order-v1.md`): no se inventa ningun campo ni
 * se renombra ninguno.
 *
 * Web NO calcula nada de esto: solo lo recibe y lo pinta. En particular nunca
 * decide `turno + 1`: el turno vigente es `currentTurn`, que llega del servidor.
 *
 * HU-18 (`docs/contracts/hu-18-basic-attack-v1.md`) amplia este contrato de forma
 * ADITIVA: `BattleView.combatants` (la Vida, unico sitio donde viaja) y el evento
 * `basicAttackResolved`. Web nunca calcula dano, Ataque contra Defensa ni Vida: solo
 * valida la forma de lo que llega y lo pinta.
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

/** Identidad estable de un participante en la batalla (`memberKey` de HU-17). Nunca `heroId`. */
export interface TargetRef {
  readonly teamLabel: string
  readonly seat: number
}

/** Vida de un participante: enteros con `0 <= current <= max`. */
export interface HealthView {
  readonly current: number
  readonly max: number
}

/** Un participante con su Vida; `health` es `null` sin perfil de combate (`AI` o batalla anterior a HU-18). */
export interface CombatantView extends TargetRef {
  readonly health: HealthView | null
}

export interface BattleView {
  /** Igual al `roomId`: una sala produce como maximo una batalla. */
  readonly battleId: string
  readonly startedAt: string
  readonly turnOrder: readonly TurnOrderEntry[]
  readonly turnsCompleted: number
  readonly round: number
  readonly currentTurn: TurnOrderEntry
  /**
   * HU-18: la Vida, en el mismo orden que `turnOrder`. Ausente (Combat anterior a
   * HU-18) o vacio (batalla iniciada antes de HU-18) significa «sin estado de combate».
   */
  readonly combatants?: readonly CombatantView[]
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

/** Efectos que HU-25 entrega y HU-18 reenvia sin reinterpretar (contrato v1, seccion 4). */
export const RANDOM_EFFECTS = [
  'DAMAGE',
  'CRITICAL_DAMAGE',
  'EVADE',
  'RESIST',
  'ESCAPE',
  'NO_DAMAGE',
] as const

export type RandomEffect = (typeof RANDOM_EFFECTS)[number]

/** Lo que el servidor resolvio en un ataque basico. Web solo lo muestra. */
export interface BasicAttackResolution {
  /** Ataque final y Defensa que se compararon. */
  readonly attackValue: number
  readonly defenseValue: number
  readonly effective: boolean
  /** `null` si el golpe no fue efectivo. */
  readonly effect: RandomEffect | null
  /** Entero 0..180, o `null` si el golpe no fue efectivo. */
  readonly percent: number | null
  /** Dano base materializado, o `null` si no se tiro. */
  readonly baseDamage: number | null
  readonly calculatedDamage: number
  /** Lo que realmente se resto de la Vida del objetivo. */
  readonly appliedDamage: number
}

/**
 * Un unico evento por ataque: el resultado Y el `battle` posterior (Vida actualizada y
 * turno ya avanzado), con un solo `seq`. Persistido por Combat antes de difundirse.
 */
export interface BasicAttackResolvedMessage {
  readonly type: 'basicAttackResolved'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  /** El `commandId` del atacante: correlaciona el comando con su resultado. */
  readonly commandId: string
  readonly completedPosition: number
  readonly attacker: TargetRef
  readonly target: TargetRef
  readonly resolution: BasicAttackResolution
  readonly targetHealth: { readonly before: number; readonly after: number }
  readonly battle: BattleView
}

export type BattleEventMessage =
  BattleStartedMessage | TurnAdvancedMessage | BasicAttackResolvedMessage

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
  /**
   * Comando rechazado (HU-18: `attack`). Ausente en los rechazos de `resume` (HU-17),
   * que hacen inaccesible la batalla.
   */
  readonly command?: string
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

/** Vida entera con `0 <= current <= max` y `max >= 1`. */
const isHealth = (value: unknown): value is HealthView =>
  isRecord(value) &&
  isNonNegativeInteger(value.current) &&
  isNonNegativeInteger(value.max) &&
  value.max >= 1 &&
  value.current <= value.max

const isTargetRef = (value: unknown): value is TargetRef =>
  isRecord(value) && isNonEmptyString(value.teamLabel) && isNonNegativeInteger(value.seat)

const isCombatant = (value: unknown): value is CombatantView =>
  isTargetRef(value) && 'health' in value && (value.health === null || isHealth(value.health))

/** Mismo participante: la identidad de una entrada de la cola, sin depender de campos de presentacion. */
const isSameEntry = (a: TurnOrderEntry, b: TurnOrderEntry): boolean =>
  a.position === b.position &&
  a.teamLabel === b.teamLabel &&
  a.seat === b.seat &&
  a.kind === b.kind &&
  a.playerId === b.playerId

/**
 * `combatants` es opcional (Combat anterior a HU-18) y puede ir vacio (batalla iniciada
 * antes de HU-18). Si trae participantes, son EXACTAMENTE los de la cola y en el mismo
 * orden.
 */
const hasCoherentCombatants = (value: unknown, order: readonly TurnOrderEntry[]): boolean => {
  if (value === undefined) {
    return true
  }

  if (!Array.isArray(value) || !value.every(isCombatant)) {
    return false
  }

  const combatants: readonly CombatantView[] = value

  return (
    combatants.length === 0 ||
    (combatants.length === order.length &&
      combatants.every(
        (combatant, index) =>
          combatant.teamLabel === order[index]?.teamLabel && combatant.seat === order[index].seat,
      ))
  )
}

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
    order.some((entry) => isSameEntry(entry, current)) &&
    hasCoherentCombatants(value.combatants, order)
  )
}

/** Tope del porcentaje de efecto (critico maximo, HU-25). */
const MAX_EFFECT_PERCENT = 180

/** Efecto de un ataque efectivo: uno de los seis de HU-25. */
const isRandomEffect = (value: unknown): value is RandomEffect =>
  typeof value === 'string' && (RANDOM_EFFECTS as readonly string[]).includes(value)

/**
 * La resolucion, campo por campo y coherente con ella misma: un golpe no efectivo no
 * trae efecto ni porcentaje; uno efectivo trae ambos; lo aplicado nunca supera lo
 * calculado. No se calcula nada: solo se rechaza lo que el contrato no permite.
 */
const isResolution = (value: unknown): value is BasicAttackResolution =>
  isRecord(value) &&
  isNonNegativeInteger(value.attackValue) &&
  isNonNegativeInteger(value.defenseValue) &&
  typeof value.effective === 'boolean' &&
  (value.effective
    ? isRandomEffect(value.effect) &&
      isNonNegativeInteger(value.percent) &&
      value.percent <= MAX_EFFECT_PERCENT
    : value.effect === null && value.percent === null) &&
  (value.baseDamage === null || isNonNegativeInteger(value.baseDamage)) &&
  isNonNegativeInteger(value.calculatedDamage) &&
  isNonNegativeInteger(value.appliedDamage) &&
  value.appliedDamage <= value.calculatedDamage

/** `commandId` del contrato: cadena de 1 a 100 caracteres. */
const isCommandId = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 1 && value.length <= 100

const isTargetHealth = (value: unknown): value is { before: number; after: number } =>
  isRecord(value) &&
  isNonNegativeInteger(value.before) &&
  isNonNegativeInteger(value.after) &&
  value.after <= value.before

const isInQueue = (battle: BattleView, ref: TargetRef): boolean =>
  battle.turnOrder.some((entry) => entry.teamLabel === ref.teamLabel && entry.seat === ref.seat)

/** Campos comunes de todo evento con `seq`: sin ellos el mensaje se ignora. */
const hasEventEnvelope = (value: Record<string, unknown>): boolean =>
  typeof value.seq === 'number' &&
  Number.isInteger(value.seq) &&
  value.seq >= 1 &&
  isNonEmptyString(value.roomId) &&
  isTimestamp(value.occurredAt) &&
  isBattleView(value.battle)

/**
 * `basicAttackResolved` (HU-18): validacion ESTRICTA. Atacante y objetivo deben existir
 * en la cola del `battle` que acompana al evento (con ella se pintan los nombres).
 */
export const isBasicAttackResolvedMessage = (value: unknown): value is BasicAttackResolvedMessage =>
  isRecord(value) &&
  value.type === 'basicAttackResolved' &&
  hasEventEnvelope(value) &&
  isCommandId(value.commandId) &&
  isNonNegativeInteger(value.completedPosition) &&
  isTargetRef(value.attacker) &&
  isTargetRef(value.target) &&
  isResolution(value.resolution) &&
  isTargetHealth(value.targetHealth) &&
  isBattleView(value.battle) &&
  isInQueue(value.battle, value.attacker) &&
  isInQueue(value.battle, value.target)

export const isBattleEventMessage = (value: unknown): value is BattleEventMessage =>
  isRecord(value) &&
  ((hasEventEnvelope(value) &&
    (value.type === 'battleStarted' ||
      (value.type === 'turnAdvanced' && isNonNegativeInteger(value.completedPosition)))) ||
    isBasicAttackResolvedMessage(value))

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
  isRecord(value) &&
  value.type === 'command.rejected' &&
  isNonEmptyString(value.code) &&
  (value.command === undefined || typeof value.command === 'string') &&
  (value.commandId === undefined || typeof value.commandId === 'string')
