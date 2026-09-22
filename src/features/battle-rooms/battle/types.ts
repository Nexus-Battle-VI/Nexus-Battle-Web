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
 *
 * HU-19 (`docs/contracts/hu-19-skills-v1.md`) lo amplia de forma ADITIVA: en `combatants` el
 * Poder y las habilidades de cada participante, el evento `skillUsed` y el campo opcional
 * `degradedFrom` de `basicAttackResolved` (Poder insuficiente: HU-11 degrada la accion a
 * ataque basico). Web nunca decide si una habilidad se puede usar, cuanto Poder queda ni si la
 * recarga termino: lo dice Combat.
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

/** Poder de un participante (HU-19): enteros con `0 <= current <= max`. */
export interface PowerView {
  readonly current: number
  readonly max: number
}

/** Costo de Poder de una habilidad (Catalog v1): un monto fijo o todos los puntos. */
export type PowerCost =
  { readonly mode: 'FIXED'; readonly amount: number } | { readonly mode: 'ALL_AVAILABLE' }

/**
 * Estado de una habilidad segun Combat: `RECHARGING` si le faltan turnos propios de recarga,
 * `UNSUPPORTED` si su efecto todavia no se puede ejecutar, si no `READY`. El Poder no lo cambia.
 */
export const SKILL_STATUSES = ['READY', 'RECHARGING', 'UNSUPPORTED'] as const

export type SkillStatus = (typeof SKILL_STATUSES)[number]

/** Una habilidad del heroe tal como la ve el cliente: nunca lleva sus efectos. */
export interface SkillView {
  /** `productId` de Catalog: es lo unico que se envia en `useSkill`. */
  readonly abilityId: string
  readonly name: string
  readonly powerCost: PowerCost
  readonly chargeTurns: number
  /** Turnos propios que le faltan; `0` si esta disponible. */
  readonly cooldownRemaining: number
  readonly status: SkillStatus
}

/**
 * Un participante con su Vida; `health` es `null` sin perfil de combate (`AI` o batalla anterior
 * a HU-18). HU-19: `power` (`null` sin perfil o sin estado de habilidades) y `skills` (`[]` en
 * esos casos); ambos AUSENTES en un Combat anterior a HU-19.
 */
export interface CombatantView extends TargetRef {
  readonly health: HealthView | null
  readonly power?: PowerView | null
  readonly skills?: readonly SkillView[]
}

/**
 * HU-21 (`hu-21-battle-finish-v1.md`): instantes ABSOLUTOS en que vencen el turno
 * y la batalla, para que Web muestre cuentas atras con el reloj del servidor.
 * Solo presentacion: llegar a 0 no ejecuta nada (Combat publica los eventos).
 * Ausente en la vista final y en un Combat anterior a HU-21.
 */
export interface BattleViewDeadlines {
  readonly turnEndsAt: string
  readonly battleEndsAt: string
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
  /** HU-21 (aditivo): vencimientos para MOSTRAR; ausente en la vista final. */
  readonly deadlines?: BattleViewDeadlines
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
  /**
   * HU-19 (opcional): este ataque basico sustituyo a una habilidad porque el Poder no alcanzaba
   * (HU-11). Solo existe en un ataque que viene de un `useSkill`.
   */
  readonly degradedFrom?: DegradedFrom
  readonly battle: BattleView
}

/** Un `useSkill` que Combat degrado a ataque basico por Poder insuficiente. */
export interface DegradedFrom {
  readonly command: 'useSkill'
  readonly abilityId: string
  readonly reason: 'INSUFFICIENT_POWER'
}

/**
 * Una habilidad ejecutada (HU-19): el resultado del golpe, lo que aporto la habilidad, el Poder
 * y la recarga, y el `battle` posterior (Vida, Poder, recargas y turno ya actualizados), con un
 * solo `seq`. Persistido por Combat antes de difundirse.
 */
export interface SkillUsedMessage {
  readonly type: 'skillUsed'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  /** El `commandId` del actor: correlaciona el comando con su resultado. */
  readonly commandId: string
  readonly completedPosition: number
  readonly actor: TargetRef
  readonly target: TargetRef
  readonly skill: {
    readonly abilityId: string
    readonly name: string
    readonly powerCost: PowerCost
    readonly chargeTurns: number
  }
  /** Poder del actor antes y despues de pagar el costo. */
  readonly power: { readonly before: number; readonly after: number }
  /** Turnos propios que le faltan a ESTA habilidad tras la accion. */
  readonly cooldown: { readonly remainingTurns: number }
  /** Lo que aporto la habilidad; `damage` es `null` si no se tiro (golpe no efectivo o efecto 0 %). */
  readonly bonus: { readonly attack: number; readonly damage: number | null }
  readonly resolution: BasicAttackResolution
  readonly targetHealth: { readonly before: number; readonly after: number }
  readonly battle: BattleView
}

export type BattleEventMessage =
  | BattleStartedMessage
  | TurnAdvancedMessage
  | BasicAttackResolvedMessage
  | SkillUsedMessage
  | TurnTimedOutMessage
  | BattleFinishedMessage

/**
 * HU-21: el turno vigente vencio sin accion y el avance salto al siguiente
 * participante con Vida. La vista ya trae el turno avanzado y `deadlines` nuevos.
 */
export interface TurnTimedOutMessage {
  readonly type: 'turnTimedOut'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  readonly completedPosition: number
  readonly timedOut: TargetRef
  readonly battle: BattleView
}

/** HU-21: la batalla termino; la vista es la FINAL (sin `deadlines`). */
export interface BattleFinishedMessage {
  readonly type: 'battleFinished'
  readonly seq: number
  readonly roomId: string
  readonly occurredAt: string
  readonly result: BattleResult
  readonly battle: BattleView
}

/**
 * Resultado unico de la batalla (HU-21, contrato §5). Web NO lo calcula ni lo
 * corrige: lo recibe y lo pinta. `credits` no viaja aqui (HU-22/23/30).
 */
export const BATTLE_FINISH_REASONS = ['ELIMINATION', 'DISCONNECTION', 'TIME_LIMIT'] as const
export type BattleFinishReason = (typeof BATTLE_FINISH_REASONS)[number]

export const BATTLE_OUTCOMES = ['WIN', 'NO_WINNER'] as const
export type BattleOutcome = (typeof BATTLE_OUTCOMES)[number]

export const TIEBREAK_RULES = ['LIFE_PERCENT', 'ABSOLUTE_LIFE'] as const
export type TiebreakRule = (typeof TIEBREAK_RULES)[number]

export const PARTICIPANT_RESULTS = ['WON', 'LOST', 'NO_WINNER'] as const
export type ParticipantResult = (typeof PARTICIPANT_RESULTS)[number]

export type DisconnectedSeat = TargetRef

export interface TeamStanding {
  readonly teamLabel: string
  readonly remainingHealth: number
  readonly maxHealth: number
  /** Solo para mostrar, tal cual lo publica Combat (no se recalcula). */
  readonly lifePercent: number
  readonly eliminated: boolean
}

export interface ParticipantOutcome {
  readonly teamLabel: string
  readonly seat: number
  readonly kind: 'HUMAN' | 'AI'
  readonly playerId: string | null
  readonly displayName: string | null
  readonly heroId: string | null
  readonly result: ParticipantResult
}

export interface BattleResult {
  readonly reason: BattleFinishReason
  readonly outcome: BattleOutcome
  readonly winnerTeamLabel: string | null
  readonly finishedAt: string
  readonly tiebreak: TiebreakRule | null
  readonly disconnected: DisconnectedSeat | null
  readonly teams: readonly [TeamStanding, TeamStanding]
  readonly participants: readonly ParticipantOutcome[]
}

/** Instantanea completa del estado visible (respuesta de `resume` cuando no hay replay). */
export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly roomId: string
  readonly seq: number
  readonly status: string
  readonly battle: BattleView | null
  /** HU-21 (aditivo): el resultado si la sala esta `FINISHED`; `null` en otro caso. */
  readonly result?: BattleResult | null
}

export interface ResumeOkMessage {
  readonly type: 'resume.ok'
  readonly roomId: string
  readonly seq: number
  /** HU-21 (aditivo): instante del servidor para las cuentas atras de Web. */
  readonly serverTime?: string
}

/** Rechazo de un comando: llega solo a quien lo envio, con un codigo estable. */
export interface CommandRejectedMessage {
  readonly type: 'command.rejected'
  readonly code: string
  /**
   * Comando rechazado (HU-18: `attack`; HU-19: `useSkill`). Ausente en los rechazos de `resume` (HU-17),
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

/** Poder entero con `0 <= current <= max` (un heroe puede tener maximo 0). */
const isPower = (value: unknown): value is PowerView =>
  isRecord(value) &&
  isNonNegativeInteger(value.current) &&
  isNonNegativeInteger(value.max) &&
  value.current <= value.max

const isPowerCost = (value: unknown): value is PowerCost =>
  isRecord(value) &&
  (value.mode === 'ALL_AVAILABLE'
    ? Object.keys(value).length === 1
    : value.mode === 'FIXED' &&
      Object.keys(value).length === 2 &&
      isNonNegativeInteger(value.amount) &&
      value.amount >= 1)

const isSkillStatus = (value: unknown): value is SkillStatus =>
  typeof value === 'string' && (SKILL_STATUSES as readonly string[]).includes(value)

/**
 * Una habilidad, campo por campo y coherente con ella misma: disponible no tiene recarga y en
 * recarga siempre le faltan turnos. Una `UNSUPPORTED` puede traer cualquier recarga. No se calcula
 * nada: solo se rechaza lo que el contrato no permite.
 */
const isSkill = (value: unknown): value is SkillView =>
  isRecord(value) &&
  isNonEmptyString(value.abilityId) &&
  isNonEmptyString(value.name) &&
  isPowerCost(value.powerCost) &&
  isNonNegativeInteger(value.chargeTurns) &&
  value.chargeTurns >= 1 &&
  isNonNegativeInteger(value.cooldownRemaining) &&
  isSkillStatus(value.status) &&
  (value.status === 'READY'
    ? value.cooldownRemaining === 0
    : value.status === 'RECHARGING'
      ? value.cooldownRemaining > 0
      : true)

const hasUniqueAbilities = (skills: readonly SkillView[]): boolean =>
  new Set(skills.map((skill) => skill.abilityId)).size === skills.length

/**
 * HU-19: `power` y `skills` son OPCIONALES (un Combat anterior a HU-19 no los envia). Si vienen,
 * deben ser validos y las habilidades no pueden repetirse.
 */
const hasValidSkillState = (value: Record<string, unknown>): boolean =>
  (value.power === undefined || value.power === null || isPower(value.power)) &&
  (value.skills === undefined ||
    (Array.isArray(value.skills) &&
      value.skills.every(isSkill) &&
      hasUniqueAbilities(value.skills)))

const isCombatant = (value: unknown): value is CombatantView =>
  isTargetRef(value) &&
  'health' in value &&
  (value.health === null || isHealth(value.health)) &&
  hasValidSkillState(value as unknown as Record<string, unknown>)

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
    hasCoherentCombatants(value.combatants, order) &&
    (value.deadlines === undefined || isDeadlines(value.deadlines))
  )
}

/** HU-21: los dos vencimientos, ambos instantes ISO. Solo presentacion. */
const isDeadlines = (value: unknown): value is BattleViewDeadlines =>
  isRecord(value) && isTimestamp(value.turnEndsAt) && isTimestamp(value.battleEndsAt)

const isBattleFinishReason = (value: unknown): value is BattleFinishReason =>
  typeof value === 'string' && (BATTLE_FINISH_REASONS as readonly string[]).includes(value)

const isBattleOutcome = (value: unknown): value is BattleOutcome =>
  typeof value === 'string' && (BATTLE_OUTCOMES as readonly string[]).includes(value)

const isTiebreakRule = (value: unknown): value is TiebreakRule =>
  typeof value === 'string' && (TIEBREAK_RULES as readonly string[]).includes(value)

const isParticipantResult = (value: unknown): value is ParticipantResult =>
  typeof value === 'string' && (PARTICIPANT_RESULTS as readonly string[]).includes(value)

const isLifePercent = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100

const isTeamStanding = (value: unknown): value is TeamStanding =>
  isRecord(value) &&
  isNonEmptyString(value.teamLabel) &&
  isNonNegativeInteger(value.remainingHealth) &&
  isNonNegativeInteger(value.maxHealth) &&
  value.remainingHealth <= value.maxHealth &&
  isLifePercent(value.lifePercent) &&
  typeof value.eliminated === 'boolean'

const isParticipantOutcome = (value: unknown): value is ParticipantOutcome =>
  isRecord(value) &&
  isNonEmptyString(value.teamLabel) &&
  isNonNegativeInteger(value.seat) &&
  (value.kind === 'HUMAN' ? isNonEmptyString(value.playerId) : value.kind === 'AI') &&
  (value.kind === 'HUMAN' || value.playerId === null) &&
  isStringOrNull(value.displayName) &&
  isStringOrNull(value.heroId) &&
  isParticipantResult(value.result)

/**
 * HU-21: valida la FORMA y la coherencia INTERNA del resultado; NO recalcula
 * quien debio ganar (eso es de Combat y ya viene decidido). Un mensaje mal
 * formado se ignora, nunca se pinta.
 */
export const isBattleResult = (value: unknown): value is BattleResult => {
  if (!isRecord(value) || !isBattleFinishReason(value.reason) || !isBattleOutcome(value.outcome)) {
    return false
  }

  const winner = value.winnerTeamLabel

  if (!(winner === null || isNonEmptyString(winner)) || !isTimestamp(value.finishedAt)) {
    return false
  }

  if (!(
    value.tiebreak === null ||
    value.tiebreak === undefined ||
    isTiebreakRule(value.tiebreak)
  )) {
    return false
  }

  if (
    !Array.isArray(value.teams) ||
    value.teams.length !== 2 ||
    !value.teams.every(isTeamStanding) ||
    !Array.isArray(value.participants) ||
    value.participants.length === 0 ||
    !value.participants.every(isParticipantOutcome)
  ) {
    return false
  }

  const labels = value.teams.map((team) => team.teamLabel)

  if (value.outcome === 'WIN' && winner === null) {
    return false
  }

  if (winner !== null && !labels.includes(winner)) {
    return false
  }

  if (value.outcome === 'NO_WINNER') {
    if (winner !== null || !value.participants.every((p) => p.result === 'NO_WINNER')) {
      return false
    }
  }

  if (!value.participants.every((participant) => labels.includes(participant.teamLabel))) {
    return false
  }

  const disconnected = value.disconnected

  if (!(disconnected === null || disconnected === undefined || isTargetRef(disconnected))) {
    return false
  }

  if (value.reason === 'DISCONNECTION') {
    if (disconnected === null || disconnected === undefined) {
      return false
    }
  } else if (disconnected !== null && disconnected !== undefined) {
    return false
  }

  // El desempate solo existe con `TIME_LIMIT` y ganador.
  if (
    value.tiebreak !== null &&
    value.tiebreak !== undefined &&
    !(value.reason === 'TIME_LIMIT' && value.outcome === 'WIN')
  ) {
    return false
  }

  return true
}

/** HU-21: `turnTimedOut` con el turno avanzado y `deadlines` nuevos. */
export const isTurnTimedOutMessage = (value: unknown): value is TurnTimedOutMessage =>
  isRecord(value) &&
  value.type === 'turnTimedOut' &&
  hasEventEnvelope(value) &&
  isNonNegativeInteger(value.completedPosition) &&
  isTargetRef(value.timedOut) &&
  isBattleView(value.battle) &&
  isInQueue(value.battle, value.timedOut)

/** HU-21: `battleFinished` con el resultado unico y la vista FINAL. */
export const isBattleFinishedMessage = (value: unknown): value is BattleFinishedMessage =>
  isRecord(value) &&
  value.type === 'battleFinished' &&
  hasEventEnvelope(value) &&
  isBattleResult(value.result) &&
  isBattleView(value.battle)

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
  (value.degradedFrom === undefined || isDegradedFrom(value.degradedFrom)) &&
  isBattleView(value.battle) &&
  isInQueue(value.battle, value.attacker) &&
  isInQueue(value.battle, value.target)

/** `degradedFrom` exacto: solo un `useSkill` degradado por Poder insuficiente. */
const isDegradedFrom = (value: unknown): value is DegradedFrom =>
  isRecord(value) &&
  Object.keys(value).length === 3 &&
  value.command === 'useSkill' &&
  isNonEmptyString(value.abilityId) &&
  value.reason === 'INSUFFICIENT_POWER'

/**
 * `skillUsed` (HU-19): validacion ESTRICTA. Actor y objetivo deben existir en la cola del
 * `battle` que acompana al evento. El Poder solo puede bajar (o quedar igual) al pagar; el bono de
 * Dano es `null` o entero; la recarga es un entero. No se calcula nada.
 */
export const isSkillUsedMessage = (value: unknown): value is SkillUsedMessage =>
  isRecord(value) &&
  value.type === 'skillUsed' &&
  hasEventEnvelope(value) &&
  isCommandId(value.commandId) &&
  isNonNegativeInteger(value.completedPosition) &&
  isTargetRef(value.actor) &&
  isTargetRef(value.target) &&
  isRecord(value.skill) &&
  isNonEmptyString(value.skill.abilityId) &&
  isNonEmptyString(value.skill.name) &&
  isPowerCost(value.skill.powerCost) &&
  isNonNegativeInteger(value.skill.chargeTurns) &&
  value.skill.chargeTurns >= 1 &&
  isRecord(value.power) &&
  isNonNegativeInteger(value.power.before) &&
  isNonNegativeInteger(value.power.after) &&
  value.power.after <= value.power.before &&
  isRecord(value.cooldown) &&
  isNonNegativeInteger(value.cooldown.remainingTurns) &&
  isRecord(value.bonus) &&
  isNonNegativeInteger(value.bonus.attack) &&
  (value.bonus.damage === null || isNonNegativeInteger(value.bonus.damage)) &&
  isResolution(value.resolution) &&
  isTargetHealth(value.targetHealth) &&
  isBattleView(value.battle) &&
  isInQueue(value.battle, value.actor) &&
  isInQueue(value.battle, value.target)

export const isBattleEventMessage = (value: unknown): value is BattleEventMessage =>
  isRecord(value) &&
  ((hasEventEnvelope(value) &&
    (value.type === 'battleStarted' ||
      (value.type === 'turnAdvanced' && isNonNegativeInteger(value.completedPosition)))) ||
    isBasicAttackResolvedMessage(value) ||
    isSkillUsedMessage(value) ||
    isTurnTimedOutMessage(value) ||
    isBattleFinishedMessage(value))

export const isSnapshotMessage = (value: unknown): value is SnapshotMessage =>
  isRecord(value) &&
  value.type === 'snapshot' &&
  isNonEmptyString(value.roomId) &&
  isNonNegativeInteger(value.seq) &&
  isNonEmptyString(value.status) &&
  (value.battle === null || isBattleView(value.battle)) &&
  (value.result === undefined || value.result === null || isBattleResult(value.result))

export const isResumeOkMessage = (value: unknown): value is ResumeOkMessage =>
  isRecord(value) &&
  value.type === 'resume.ok' &&
  isNonEmptyString(value.roomId) &&
  isNonNegativeInteger(value.seq) &&
  (value.serverTime === undefined || isTimestamp(value.serverTime))

export const isCommandRejectedMessage = (value: unknown): value is CommandRejectedMessage =>
  isRecord(value) &&
  value.type === 'command.rejected' &&
  isNonEmptyString(value.code) &&
  (value.command === undefined || typeof value.command === 'string') &&
  (value.commandId === undefined || typeof value.commandId === 'string')
