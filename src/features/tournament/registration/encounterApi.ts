import { httpClient } from '@/lib/http'
import type { TeamAvatar } from './api'

export interface MatchSummary {
  readonly tournamentId: string
  readonly matchId: string
  readonly round: number
  readonly bracketLabel: string
  readonly status: 'WAITING_PARTICIPANTS' | 'READY' | 'IN_PROGRESS' | 'FINISHED'
  readonly startedAt: string | null
  readonly closedAt: string | null
  readonly encounterId?: string
  readonly bracketTrack?: 'MAIN' | 'SECONDARY' | 'FINAL'
  readonly registeredTeams?: readonly ({
    readonly teamId: string
    readonly name: string
    readonly avatar: TeamAvatar
    readonly memberIds: readonly string[]
  } | null)[]
  readonly preparationStatus?:
    | 'WAITING_TEAMS'
    | 'TEAMS_RESOLVED'
    | 'PREPARING'
    | 'PREPARED'
    | 'START_PENDING'
    | 'IN_BATTLE'
    | 'FINISHED'
  readonly combatRoomId?: string | null
  readonly lastSyncedSeq?: number
  readonly engineLastSeq?: number | null
  readonly syncedAt?: string | null
}
export interface MatchDetail extends MatchSummary {
  readonly teams: readonly {
    readonly teamId: string
    readonly teamLabel: string
    readonly participants: readonly { readonly playerId: string; readonly heroId: string }[]
  }[]
  readonly result: {
    readonly winnerTeamLabel: string | null
    readonly reason: string
    readonly outcome: string
    readonly finishedAt: string
  } | null
  readonly events: readonly {
    readonly seq: number
    readonly type: string
    readonly occurredAt: string
    readonly payload: unknown
  }[]
  readonly afterSeq: number
  readonly nextSeq: number
  readonly hasMore: boolean
  readonly logComplete: boolean
}
export interface EncounterApi {
  list: (id: string) => Promise<readonly MatchSummary[]>
  detail: (id: string, matchId: string, afterSeq: number) => Promise<MatchDetail>
}
const path = (id: string, matchId?: string) =>
  `/v1/tournaments/${encodeURIComponent(id)}/matches${matchId === undefined ? '' : `/${encodeURIComponent(matchId)}`}`
export const encounterApi: EncounterApi = {
  list: (id) => httpClient.get(path(id)),
  detail: (id, matchId, afterSeq) =>
    httpClient.get(`${path(id, matchId)}?afterSeq=${String(afterSeq)}`),
}
