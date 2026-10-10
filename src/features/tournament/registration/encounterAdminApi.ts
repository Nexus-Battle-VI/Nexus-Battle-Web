import { httpClient } from '@/lib/http'

/**
 * HU-85 (Management#470): administración de justas independientes. Contrato
 * `hu-85-tournament-encounter-administration-v1` y ampliación `torneos-v3.0.0`.
 * El actor lo decide el servidor con la sesión; el navegador solo
 * envía el `operationId`.
 */
export type EncounterAdminAction = 'PREPARE' | 'START'
export interface EncounterAdminReceipt {
  readonly actionId: string
  readonly tournamentId: string
  readonly encounterId: string
  readonly action: EncounterAdminAction
  readonly actor: string
  readonly operationId: string
  readonly occurredAt: string
  readonly replayed: boolean
  readonly battleId: string
  readonly status: 'READY' | 'IN_PROGRESS' | 'FINISHED' | 'WAITING_PARTICIPANTS'
  readonly preparationStatus: string
}
export interface EncounterAdminApi {
  prepare: (id: string, matchId: string, operationId: string) => Promise<EncounterAdminReceipt>
  start: (id: string, matchId: string, operationId: string) => Promise<EncounterAdminReceipt>
  actions: (id: string) => Promise<readonly EncounterAdminReceipt[]>
}
const base = (id: string): string => `/v1/tournaments/admin/${encodeURIComponent(id)}`
const match = (id: string, matchId: string): string =>
  `${base(id)}/matches/${encodeURIComponent(matchId)}`
export const encounterAdminApi: EncounterAdminApi = {
  prepare: (id, matchId, operationId) =>
    httpClient.post(`${match(id, matchId)}/prepare`, { operationId }),
  start: (id, matchId, operationId) =>
    httpClient.post(`${match(id, matchId)}/start`, { operationId }),
  actions: async (id) => {
    const response = await httpClient.get<{ readonly actions: readonly EncounterAdminReceipt[] }>(
      `${base(id)}/actions`,
    )
    return response.actions
  },
}
export interface MatchAcceptanceReceipt {
  readonly receiptId: string
  readonly tournamentId: string
  readonly encounterId: string
  readonly teamId: string
  readonly subject: string
  readonly operationId: string
  readonly acceptedAt: string
  readonly acceptanceOpensAt: string
  readonly acceptanceClosesAt: string
  readonly replayed: boolean
}
export interface MatchAcceptanceApi {
  accept: (id: string, encounterId: string, operationId: string) => Promise<MatchAcceptanceReceipt>
}
/** Player-only route. It never posts another actor, a count, a deadline or a winner. */
export const matchAcceptanceApi: MatchAcceptanceApi = {
  accept: (id, encounterId, operationId) =>
    httpClient.post(
      `/v1/tournaments/${encodeURIComponent(id)}/matches/${encodeURIComponent(encounterId)}/acceptance`,
      { operationId },
    ),
}
