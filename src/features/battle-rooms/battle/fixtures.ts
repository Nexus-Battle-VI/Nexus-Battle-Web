import type { BasicAttackResolution, BattleView, TargetRef, TurnOrderEntry } from './types'

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
): Record<string, unknown> => ({ type: 'snapshot', roomId: ROOM_ID, seq, status, battle: view })

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
