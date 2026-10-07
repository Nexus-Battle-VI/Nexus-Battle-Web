import { httpClient } from '@/lib/http'
export interface BroadcastState {
  tournamentId: string
  broadcasterId: string | null
  selectedMatchId: string | null
  revision: number
}
export interface BroadcastSnapshot {
  tournamentId: string
  tournamentName: string
  matchId: string
  encounterId: string
  bracketLabel: string
  combatRoomId: string
  track: 'MAIN' | 'SECONDARY' | 'FINAL'
  round: number
  status: 'IN_PROGRESS' | 'FINISHED'
  seq: number
  observedAt: string
  teams: { teamId: string; teamLabel: string; name: string }[]
  battleRound: number
  turnsCompleted: number
  currentPlayerId: string
  combatants: {
    teamLabel: string
    playerId: string
    heroId: string
    displayName: string | null
    position: number
    health: { current: number; max: number } | null
    power: { current: number; max: number } | null
  }[]
  lastAction: { type: string; occurredAt: string }
  result: {
    outcome: 'WIN' | 'NO_WINNER'
    winnerTeamLabel: string | null
    reason: string
    finishedAt: string
  } | null
}
export interface BroadcastObservation {
  state: BroadcastState
  snapshot: BroadcastSnapshot | null
}
export interface ActiveBroadcastMatch {
  matchId: string
  encounterId: string
  bracketLabel: string
  track: BroadcastSnapshot['track']
  round: number
  teams: { teamId: string; name: string }[]
}
export interface BroadcastApi {
  configuration(id: string, signal?: AbortSignal): Promise<BroadcastState>
  designate(id: string, expectedRevision?: number): Promise<BroadcastState>
  active(id: string, signal?: AbortSignal): Promise<{ matches: ActiveBroadcastMatch[] }>
  observe(id: string, signal: AbortSignal): Promise<BroadcastObservation>
  select(
    id: string,
    matchId: string,
    expectedRevision: number,
    signal?: AbortSignal,
  ): Promise<BroadcastObservation>
}
const path = (id: string): string => `/v1/tournaments/${encodeURIComponent(id)}/broadcast`
export const broadcastApi: BroadcastApi = {
  configuration: (id, signal) =>
    httpClient.get(`/v1/tournaments/admin/${encodeURIComponent(id)}/broadcast`, signal),
  designate: (id, expectedRevision) =>
    httpClient.post(
      `/v1/tournaments/admin/${encodeURIComponent(id)}/broadcast/designate`,
      expectedRevision === undefined ? {} : { expectedRevision },
    ),
  active: (id, signal) => httpClient.get(`${path(id)}/active`, signal),
  observe: (id, signal) => httpClient.get(`${path(id)}/view`, signal),
  select: (id, matchId, expectedRevision, signal) =>
    httpClient.request(`${path(id)}/selection`, {
      method: 'POST',
      body: { matchId, expectedRevision },
      ...(signal === undefined ? {} : { signal }),
    }),
}
