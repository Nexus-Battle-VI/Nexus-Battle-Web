import type {
  BasicAttackResolution,
  BattleResult,
  BattleView,
  SkillView,
  TargetRef,
  TurnOrderEntry,
} from './types'

/**
 * Fixtures de la batalla con la FORMA EXACTA del contrato v1 de Combat (vease
 * `test/db/battle-realtime.e2e.spec.ts` en Nexus-Battle-Combat, que fija estos
 * mismos campos contra un servidor real). Solo para pruebas.
 */
export const ROOM_ID = '11111111-1111-4111-8111-111111111111'

export const entry = (
  position: number,
  overrides: Partial<TurnOrderEntry> = {},
): TurnOrderEntry => ({
  position,
  teamLabel: position % 2 === 0 ? 'B' : 'A',
  seat: 0,
  kind: 'HUMAN',
  playerId: position % 2 === 0 ? 'sujeto-bruno' : 'sujeto-ana',
  displayName: position % 2 === 0 ? 'Bruno' : 'Ana',
  heroId: `heroe-${String(position)}`,
  heroSubtype: position % 2 === 0 ? 'MAGO_FUEGO' : 'GUERRERO_ARMAS',
  ...overrides,
})

/** 1v1: Bruno (equipo B) inicia, Ana (equipo A) va segunda. */
export const battle = (
  turnsCompleted = 0,
  order: readonly TurnOrderEntry[] = [entry(0), entry(1)],
): BattleView => {
  const currentTurn = order[turnsCompleted % order.length]

  if (currentTurn === undefined) {
    throw new Error('La cola de turnos del fixture no puede estar vacia.')
  }

  return {
    battleId: ROOM_ID,
    startedAt: '2026-09-21T10:00:00.000Z',
    turnOrder: order,
    turnsCompleted,
    round: Math.floor(turnsCompleted / order.length) + 1,
    currentTurn,
  }
}

export const battleStarted = (view: BattleView = battle(), seq = 1): Record<string, unknown> => ({
  type: 'battleStarted',
  seq,
  roomId: ROOM_ID,
  occurredAt: '2026-09-21T10:00:00.000Z',
  battle: view,
})

export const turnAdvanced = (
  turnsCompleted: number,
  seq: number,
  view?: BattleView,
): Record<string, unknown> => ({
  type: 'turnAdvanced',
  seq,
  roomId: ROOM_ID,
  occurredAt: '2026-09-21T10:01:00.000Z',
  completedPosition: (turnsCompleted - 1) % 2,
  battle: view ?? battle(turnsCompleted),
})

export const snapshot = (
  seq: number,
  status: string,
  view: BattleView | null,
  /** HU-21 (opcional): el resultado si la sala esta `FINISHED`. */
  result?: BattleResult | null,
): Record<string, unknown> => ({
  type: 'snapshot',
  roomId: ROOM_ID,
  seq,
  status,
  battle: view,
  ...(result === undefined ? {} : { result }),
})

/** Vida por posicion de la cola: `[actual, maxima]`, o `null` si el participante no tiene perfil. */
export type HealthByPosition = readonly (readonly [number, number] | null)[]

/** La misma vista con `combatants` (HU-18): mismo orden que la cola, como en el contrato v1. */
export const withCombatants = (view: BattleView, health: HealthByPosition): BattleView => ({
  ...view,
  combatants: view.turnOrder.map((member, index) => {
    const value = health[index] ?? null

    return {
      teamLabel: member.teamLabel,
      seat: member.seat,
      health: value === null ? null : { current: value[0], max: value[1] },
    }
  }),
})

/** 1v1 con Vida: Bruno (equipo B, posicion 0) y Ana (equipo A, posicion 1), 44 de Vida cada uno. */
export const combatBattle = (
  turnsCompleted = 0,
  health: HealthByPosition = [
    [44, 44],
    [44, 44],
  ],
  order: readonly TurnOrderEntry[] = [entry(0), entry(1)],
): BattleView => withCombatants(battle(turnsCompleted, order), health)

/** Identidades estables del 1v1 de los fixtures. */
export const BRUNO: TargetRef = { teamLabel: 'B', seat: 0 }
export const ANA: TargetRef = { teamLabel: 'A', seat: 0 }

/** Una resolucion efectiva (critico 137 %) con la forma del contrato v1. */
export const RESOLUTION: BasicAttackResolution = {
  attackValue: 14,
  defenseValue: 11,
  effective: true,
  effect: 'CRITICAL_DAMAGE',
  percent: 137,
  baseDamage: 5,
  calculatedDamage: 6,
  appliedDamage: 6,
}

/** Un golpe que no supero la Defensa: sin efecto, porcentaje ni dano. */
export const MISS: BasicAttackResolution = {
  attackValue: 11,
  defenseValue: 11,
  effective: false,
  effect: null,
  percent: null,
  baseDamage: null,
  calculatedDamage: 0,
  appliedDamage: 0,
}

export interface AttackEventInput {
  readonly seq: number
  readonly commandId: string
  readonly attacker: TargetRef
  readonly target: TargetRef
  readonly resolution?: BasicAttackResolution
  readonly before: number
  readonly after: number
  /** Vista POSTERIOR al ataque (Vida actualizada y turno ya avanzado). */
  readonly view: BattleView
  readonly completedPosition?: number
}

/** `basicAttackResolved` con la forma EXACTA del contrato v1 (seccion 6). */
export const basicAttackResolved = (input: AttackEventInput): Record<string, unknown> => ({
  type: 'basicAttackResolved',
  seq: input.seq,
  roomId: ROOM_ID,
  occurredAt: '2026-09-21T10:01:00.000Z',
  commandId: input.commandId,
  completedPosition: input.completedPosition ?? 0,
  attacker: input.attacker,
  target: input.target,
  resolution: input.resolution ?? RESOLUTION,
  targetHealth: { before: input.before, after: input.after },
  battle: input.view,
})

/** Rechazo de un ataque: llega solo al remitente, con `command` y el codigo estable. */
export const attackRejected = (code: string, commandId?: string): Record<string, unknown> => ({
  type: 'command.rejected',
  command: 'attack',
  ...(commandId === undefined ? {} : { commandId }),
  code,
})

// ---------------------------------------------------------------------------------
// HU-19: Poder, habilidades y recarga. Forma EXACTA del contrato
// `docs/contracts/hu-19-skills-v1.md` (Nexus-Battle-Infrastructure).
// ---------------------------------------------------------------------------------

/** Una habilidad disponible que cuesta 2 de Poder (fija). */
export const SHIELD_STRIKE: SkillView = {
  abilityId: 'hab-golpe-con-escudo',
  name: 'Golpe con escudo',
  powerCost: { mode: 'FIXED', amount: 2 },
  chargeTurns: 1,
  cooldownRemaining: 0,
  status: 'READY',
}

/** Una habilidad que Combat todavia no puede ejecutar (efecto no soportado). */
export const STONE_HAND: SkillView = {
  abilityId: 'hab-mano-de-piedra',
  name: 'Mano de piedra',
  powerCost: { mode: 'FIXED', amount: 4 },
  chargeTurns: 1,
  cooldownRemaining: 0,
  status: 'UNSUPPORTED',
}

/** Una habilidad que gasta todo el Poder disponible. */
export const ALL_IN: SkillView = {
  abilityId: 'hab-descarga-total',
  name: 'Descarga total',
  powerCost: { mode: 'ALL_AVAILABLE' },
  chargeTurns: 1,
  cooldownRemaining: 0,
  status: 'READY',
}

/** La misma habilidad ya usada: le falta 1 turno propio de recarga. */
export const recharging = (skill: SkillView, remaining = 1): SkillView => ({
  ...skill,
  cooldownRemaining: remaining,
  status: 'RECHARGING',
})

/** Poder `[actual, maximo]` y habilidades de un participante, o `null` sin perfil. */
export interface SkillStateInput {
  readonly power: readonly [number, number]
  readonly skills: readonly SkillView[]
}

/** Estado de habilidades por posicion de la cola. */
export type SkillStateByPosition = readonly (SkillStateInput | null)[]

export const DEFAULT_SKILL_STATE: SkillStateInput = {
  power: [10, 10],
  skills: [SHIELD_STRIKE, STONE_HAND],
}

/** La misma vista con `power` y `skills` (HU-19) en cada participante, en el orden de la cola. */
export const withSkills = (view: BattleView, states: SkillStateByPosition): BattleView => ({
  ...view,
  combatants: view.turnOrder.map((member, index) => {
    const base = view.combatants?.find(
      (combatant) => combatant.teamLabel === member.teamLabel && combatant.seat === member.seat,
    ) ?? { teamLabel: member.teamLabel, seat: member.seat, health: null }
    const state = states[index] ?? null

    return state === null
      ? { ...base, power: null, skills: [] }
      : {
          ...base,
          power: { current: state.power[0], max: state.power[1] },
          skills: state.skills,
        }
  }),
})

/** 1v1 con Vida, Poder y habilidades (Bruno es la posicion 0 y Ana la 1). */
export const skillBattle = (
  turnsCompleted = 1,
  health: HealthByPosition = [
    [44, 44],
    [44, 44],
  ],
  states: SkillStateByPosition = [DEFAULT_SKILL_STATE, DEFAULT_SKILL_STATE],
): BattleView => withSkills(combatBattle(turnsCompleted, health), states)

export interface SkillEventInput {
  readonly seq: number
  readonly commandId: string
  readonly actor: TargetRef
  readonly target: TargetRef
  readonly skill?: SkillView
  /** Poder del actor antes y despues de pagar el costo. */
  readonly power: { readonly before: number; readonly after: number }
  /** Turnos que le faltan a la habilidad; por omision, su `chargeTurns`. */
  readonly cooldownRemaining?: number
  readonly bonus?: { readonly attack: number; readonly damage: number | null }
  readonly resolution?: BasicAttackResolution
  readonly before: number
  readonly after: number
  /** Vista POSTERIOR a la habilidad (Vida, Poder, recargas y turno ya actualizados). */
  readonly view: BattleView
  readonly completedPosition?: number
}

/** `skillUsed` con la forma EXACTA del contrato v1 (seccion 6). */
export const skillUsed = (input: SkillEventInput): Record<string, unknown> => {
  const skill = input.skill ?? SHIELD_STRIKE

  return {
    type: 'skillUsed',
    seq: input.seq,
    roomId: ROOM_ID,
    occurredAt: '2026-09-21T10:01:00.000Z',
    commandId: input.commandId,
    completedPosition: input.completedPosition ?? 1,
    actor: input.actor,
    target: input.target,
    skill: {
      abilityId: skill.abilityId,
      name: skill.name,
      powerCost: skill.powerCost,
      chargeTurns: skill.chargeTurns,
    },
    power: input.power,
    cooldown: { remainingTurns: input.cooldownRemaining ?? skill.chargeTurns },
    bonus: input.bonus ?? { attack: 0, damage: null },
    resolution: input.resolution ?? RESOLUTION,
    targetHealth: { before: input.before, after: input.after },
    battle: input.view,
  }
}

/** Rechazo de una habilidad: llega solo al remitente, con `command: 'useSkill'` y el codigo estable. */
export const skillRejected = (code: string, commandId?: string): Record<string, unknown> => ({
  type: 'command.rejected',
  command: 'useSkill',
  ...(commandId === undefined ? {} : { commandId }),
  code,
})

/** Un ataque basico que Combat puso en lugar de una habilidad por Poder insuficiente (HU-11). */
export const degradedAttackResolved = (
  input: AttackEventInput & { readonly abilityId: string },
): Record<string, unknown> => ({
  ...basicAttackResolved(input),
  degradedFrom: { command: 'useSkill', abilityId: input.abilityId, reason: 'INSUFFICIENT_POWER' },
})

/**
 * HU-21: resultados y eventos del fin de batalla con la forma exacta del
 * contrato (`hu-21-battle-finish-v1.md` §5 y §6).
 */
export const DEADLINES = {
  turnEndsAt: '2026-09-21T10:00:30.000Z',
  battleEndsAt: '2026-09-21T10:06:00.000Z',
} as const

export const withDeadlines = (view: BattleView): BattleView => ({ ...view, deadlines: DEADLINES })

export const winResult = (): BattleResult => ({
  reason: 'ELIMINATION',
  outcome: 'WIN',
  winnerTeamLabel: 'A',
  finishedAt: '2026-09-21T10:05:00.000Z',
  tiebreak: null,
  disconnected: null,
  teams: [
    { teamLabel: 'A', remainingHealth: 44, maxHealth: 44, lifePercent: 100, eliminated: false },
    { teamLabel: 'B', remainingHealth: 0, maxHealth: 44, lifePercent: 0, eliminated: true },
  ],
  participants: [
    {
      teamLabel: 'A',
      seat: 0,
      kind: 'HUMAN',
      playerId: 'sujeto-ana',
      displayName: 'Ana',
      heroId: 'heroe-1',
      result: 'WON',
    },
    {
      teamLabel: 'B',
      seat: 0,
      kind: 'HUMAN',
      playerId: 'sujeto-bruno',
      displayName: 'Bruno',
      heroId: 'heroe-0',
      result: 'LOST',
    },
  ],
})

export const noWinnerResult = (): BattleResult => ({
  reason: 'TIME_LIMIT',
  outcome: 'NO_WINNER',
  winnerTeamLabel: null,
  finishedAt: '2026-09-21T10:06:00.000Z',
  tiebreak: null,
  disconnected: null,
  teams: [
    { teamLabel: 'A', remainingHealth: 22, maxHealth: 44, lifePercent: 50, eliminated: false },
    { teamLabel: 'B', remainingHealth: 22, maxHealth: 44, lifePercent: 50, eliminated: false },
  ],
  participants: [
    {
      teamLabel: 'A',
      seat: 0,
      kind: 'HUMAN',
      playerId: 'sujeto-ana',
      displayName: 'Ana',
      heroId: 'heroe-1',
      result: 'NO_WINNER',
    },
    {
      teamLabel: 'B',
      seat: 0,
      kind: 'HUMAN',
      playerId: 'sujeto-bruno',
      displayName: 'Bruno',
      heroId: 'heroe-0',
      result: 'NO_WINNER',
    },
  ],
})

export const turnTimedOut = (view: BattleView = battle(1), seq = 2): Record<string, unknown> => ({
  type: 'turnTimedOut',
  seq,
  roomId: ROOM_ID,
  occurredAt: '2026-09-21T10:00:30.000Z',
  completedPosition: 0,
  timedOut: { teamLabel: 'B', seat: 0 },
  battle: view,
})

export const battleFinished = (
  result: BattleResult = winResult(),
  view: BattleView = battle(),
  seq = 3,
): Record<string, unknown> => ({
  type: 'battleFinished',
  seq,
  roomId: ROOM_ID,
  occurredAt: result.finishedAt,
  result,
  battle: view,
})
