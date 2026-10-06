import { HttpError } from '@/lib/http'
import type {
  EncounterApi,
  MatchDetail,
  MatchSummary,
} from '@/features/tournament/registration/encounterApi'
import type {
  EncounterAdminApi,
  EncounterAdminReceipt,
} from '@/features/tournament/registration/encounterAdminApi'

/**
 * DATOS DE PRUEBA, NO ES EL SERVIDOR. Reproduce las reglas del contrato
 * `hu-85-tournament-encounter-administration-v1` en memoria para revisar la
 * interfaz sin Tournament ni Combat: E1–E4 con equipos definidos, el resto
 * esperando resultados previos, rechazo de justas sin participantes, idempotencia
 * por `operationId` y una sola sala por justa. No prueba Cognito, Combat ni
 * PostgreSQL.
 */
export const DEV_ADMIN_TOURNAMENT_ID = 'dev-admin-tournament'
const LABELS = [
  ['E1', 'MAIN', 1],
  ['E2', 'MAIN', 1],
  ['E3', 'MAIN', 1],
  ['E4', 'MAIN', 1],
  ['E5', 'MAIN', 2],
  ['E6', 'MAIN', 2],
  ['E7', 'SECONDARY', 2],
  ['E8', 'SECONDARY', 2],
  ['E9', 'SECONDARY', 3],
  ['E10', 'SECONDARY', 3],
  ['E11', 'MAIN', 3],
  ['E12', 'SECONDARY', 4],
  ['E13', 'SECONDARY', 5],
  ['Final', 'FINAL', 6],
] as const

interface FixtureOptions {
  /** Milisegundos de latencia simulada por llamada; permite ver justas simultáneas. */
  readonly delayMs?: number
  readonly actor?: string
}
export interface EncounterAdminFixture {
  readonly encounters: EncounterApi
  readonly admin: EncounterAdminApi
  /** Simula Combat caído: las siguientes acciones responden 503 sin cambiar nada. */
  readonly setCombatDown: (down: boolean) => void
  readonly calls: { prepare: number; start: number }
}

const reject = (status: number, code: string, message: string, extra: object = {}): HttpError =>
  new HttpError(status, message, { code, message, ...extra })

export const createEncounterAdminFixture = (
  options: FixtureOptions = {},
): EncounterAdminFixture => {
  const delayMs = options.delayMs ?? 0
  const actor = options.actor ?? 'dev-admin'
  let combatDown = false
  let clock = Date.parse('2026-10-12T15:00:00Z')
  const calls = { prepare: 0, start: 0 }
  const rooms = new Map<string, string>()
  const state = new Map<string, MatchSummary>(
    LABELS.map(([label, track, round]) => {
      const matchId = `${DEV_ADMIN_TOURNAMENT_ID}:${label}`
      return [
        matchId,
        {
          tournamentId: DEV_ADMIN_TOURNAMENT_ID,
          matchId,
          encounterId: matchId,
          bracketLabel: label,
          bracketTrack: track,
          round,
          status: 'WAITING_PARTICIPANTS',
          preparationStatus: round === 1 ? 'TEAMS_RESOLVED' : 'WAITING_TEAMS',
          combatRoomId: null,
          startedAt: null,
          closedAt: null,
        },
      ]
    }),
  )
  const receipts: EncounterAdminReceipt[] = []
  const byOperation = new Map<string, EncounterAdminReceipt>()
  const wait = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  const act = async (
    action: 'PREPARE' | 'START',
    id: string,
    matchId: string,
    operationId: string,
  ): Promise<EncounterAdminReceipt> => {
    await wait()
    if (id !== DEV_ADMIN_TOURNAMENT_ID)
      throw reject(404, 'TOURNAMENT_NOT_FOUND', 'El torneo no existe.')
    const previous = byOperation.get(operationId)
    if (previous !== undefined) {
      if (previous.encounterId !== matchId || previous.action !== action)
        throw reject(409, 'OPERATION_CONFLICT', 'El identificador corresponde a otra intención.')
      return { ...previous, replayed: true }
    }
    const match = state.get(matchId)
    if (match === undefined)
      throw reject(404, 'ENCOUNTER_NOT_FOUND', 'La justa no pertenece al bracket.')
    const already = receipts.find((r) => r.encounterId === matchId && r.action === action)
    if (already !== undefined) return { ...already, replayed: true }
    if (action === 'PREPARE' && match.preparationStatus === 'WAITING_TEAMS')
      throw reject(409, 'PARTICIPANTS_UNRESOLVED', 'La justa todavía no tiene los dos equipos.')
    if (action === 'START' && match.combatRoomId === null)
      throw reject(409, 'ENCOUNTER_NOT_PREPARED', 'La justa debe prepararse antes.')
    if (combatDown) throw reject(503, 'SERVICE_UNAVAILABLE', 'Combat no está disponible.')
    calls[action === 'PREPARE' ? 'prepare' : 'start'] += 1
    const roomId = rooms.get(matchId) ?? `dev-room-${matchId.split(':').at(-1) ?? matchId}`
    rooms.set(matchId, roomId)
    clock += 1000
    const next: MatchSummary =
      action === 'PREPARE'
        ? { ...match, status: 'READY', preparationStatus: 'PREPARED', combatRoomId: roomId }
        : {
            ...match,
            status: 'IN_PROGRESS',
            preparationStatus: 'IN_BATTLE',
            startedAt: new Date(clock).toISOString(),
          }
    state.set(matchId, next)
    const receipt: EncounterAdminReceipt = {
      actionId: `dev-action-${String(receipts.length + 1)}`,
      tournamentId: id,
      encounterId: matchId,
      action,
      actor,
      operationId,
      occurredAt: new Date(clock).toISOString(),
      replayed: false,
      battleId: roomId,
      status: next.status,
      preparationStatus: next.preparationStatus ?? 'PREPARED',
    }
    receipts.push(receipt)
    byOperation.set(operationId, receipt)
    return receipt
  }
  const encounters: EncounterApi = {
    list: async () => {
      await wait()
      return [...state.values()]
    },
    detail: async (_id, matchId, afterSeq): Promise<MatchDetail> => {
      await wait()
      const match = state.get(matchId)
      if (match === undefined) throw reject(404, 'ENCOUNTER_NOT_FOUND', 'No existe la justa.')
      return {
        ...match,
        teams: [],
        result: null,
        events: [],
        afterSeq,
        nextSeq: afterSeq,
        hasMore: false,
        logComplete: true,
      }
    },
  }
  const admin: EncounterAdminApi = {
    prepare: (id, matchId, operationId) => act('PREPARE', id, matchId, operationId),
    start: (id, matchId, operationId) => act('START', id, matchId, operationId),
    actions: async () => {
      await wait()
      return [...receipts]
    },
  }
  return {
    encounters,
    admin,
    calls,
    setCombatDown: (down) => {
      combatDown = down
    },
  }
}
