import type { BattleView, TurnOrderEntry } from './types'

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
