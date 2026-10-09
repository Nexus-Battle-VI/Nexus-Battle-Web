import { httpClient } from '@/lib/http'
import type { TeamAvatar, TeamSize, TournamentMode, RoundSchedule } from './api'

export type BracketSource =
  | { readonly kind: 'SEED'; readonly position: number }
  | { readonly kind: 'WINNER' | 'LOSER'; readonly matchId: string }
export interface PublishedBracket {
  readonly version: 2 | 3
  readonly tournamentMode?: TournamentMode
  readonly teamSize?: TeamSize
  readonly acceptancePolicy?: 'ROUND_ACCEPTANCE_V1' | null
  readonly roundSchedule?: readonly RoundSchedule[]
  readonly contractVersion: string
  readonly tournamentId: string
  readonly operationId: string
  readonly publishedAt: string
  readonly publishedBy: string
  readonly startsAt: string
  readonly seeds: readonly {
    readonly position: number
    readonly teamId: string
    readonly name: string
    readonly avatar: TeamAvatar
    readonly memberIds: readonly string[]
  }[]
  readonly matches: readonly {
    readonly id: string
    readonly encounterId: string
    readonly track: 'MAIN' | 'SECONDARY' | 'FINAL'
    readonly round: number
    readonly sources: readonly [BracketSource, BracketSource]
    readonly teamIds: readonly [string | null, string | null]
    readonly status: 'TEAMS_RESOLVED' | 'WAITING'
    readonly destinations: {
      readonly winner: { readonly matchId: string; readonly side: 0 | 1 } | null
      readonly loser: { readonly matchId: string; readonly side: 0 | 1 } | null
    }
  }[]
}
export interface BracketApi {
  view: (id: string) => Promise<PublishedBracket | null>
  publish: (id: string, operationId: string) => Promise<PublishedBracket>
}
export const bracketApi: BracketApi = {
  view: async (id) =>
    (
      await httpClient.get<{ bracket: PublishedBracket | null }>(
        `/v1/tournaments/${encodeURIComponent(id)}/bracket`,
      )
    ).bracket,
  publish: (id, operationId) =>
    httpClient.post(`/v1/tournaments/admin/${encodeURIComponent(id)}/bracket`, { operationId }),
}
