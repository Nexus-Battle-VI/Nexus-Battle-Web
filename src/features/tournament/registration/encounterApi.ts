import { httpClient } from '@/lib/http'
import type { TeamAvatar, TeamSize, TournamentMode } from './api'
import type { BracketSource } from './bracketApi'
import type { MatchAcceptanceReceipt } from './encounterAdminApi'
export interface TournamentResolution {
  readonly resultType: 'ABSENCE'
  readonly resolutionId: string
  readonly teamIds: readonly [string, string]
  readonly winnerTeamId: string
  readonly loserTeamId: string
  readonly reason: 'ACCEPTANCE_WINDOW_CLOSED'
  readonly ruleApplied: 'ONE_COMPLETE' | 'HIGHER_ACCEPTANCE_COUNT' | 'TIED_ACCEPTANCE_COUNT'
  readonly teamSize: TeamSize
  readonly acceptedCounts: readonly [number, number]
  readonly tieBreak: {
    readonly kind: 'UNBIASED_50_50'
    readonly drawId: string
    readonly selectedSide: 0 | 1
  } | null
  readonly resolvedAt: string
}
export interface CombatMatchResult {
  readonly winnerTeamLabel: string | null
  readonly reason: string
  readonly outcome: string
  readonly finishedAt: string
}
export interface PlayedResolution {
  readonly resultType: 'PLAYED'
  readonly resolutionId: string
  readonly resolvedAt: string
  readonly teamIds: readonly [string, string]
  readonly winnerTeamId: string | null
  readonly loserTeamId: string | null
  readonly combatRoomId: string
  readonly combatResult: CombatMatchResult
}

export interface MatchSummary {
  readonly tournamentId: string
  readonly matchId: string
  readonly round: number
  readonly bracketLabel: string
  readonly status: 'WAITING_PARTICIPANTS' | 'READY' | 'IN_PROGRESS' | 'FINISHED'
  readonly contractVersion?: 'torneos-v3.0.0'
  readonly tournamentMode?: TournamentMode
  readonly teamSize?: TeamSize
  readonly acceptanceOpensAt?: string
  readonly acceptanceClosesAt?: string
  readonly scheduledStartAt?: string
  readonly serverNow?: string
  readonly acceptanceStatus?: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'BLOCKED_DELAY' | 'RESOLVED'
  readonly operationalStatus?:
    | 'IDLE'
    | 'RESOLUTION_PENDING'
    | 'PREPARE_PENDING'
    | 'START_PENDING'
    | 'IN_BATTLE'
    | 'FINISHED'
    | 'DEPENDENCY_ERROR'
  readonly acceptedCounts?: readonly [number, number]
  readonly myAcceptance?: MatchAcceptanceReceipt | null
  readonly blockReason?: {
    readonly code: string
    readonly message: string
    readonly since: string
    readonly responsible: string
  } | null
  readonly resolution?: TournamentResolution | PlayedResolution | null
  readonly winnerTeamId?: string | null
  readonly loserTeamId?: string | null
  readonly sources?: readonly [BracketSource, BracketSource]
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
  readonly result: CombatMatchResult | null
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
