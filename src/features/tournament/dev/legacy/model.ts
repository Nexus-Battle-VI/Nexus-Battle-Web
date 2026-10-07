export type MatchId =
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'E5'
  | 'E6'
  | 'E7'
  | 'E8'
  | 'E9'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13'
  | 'Final'

export interface TournamentActor {
  readonly id: string
  readonly name: string
  readonly role: 'ADMIN' | 'PLAYER' | 'VISITOR'
}

export interface TournamentPlayer {
  readonly id: string
  readonly name: string
}

/** Inventory read model. Eligibility and ownership must be verified server-side. */
export interface TournamentHero {
  readonly id: string
  readonly ownerId: string
  readonly name: string
  readonly available: boolean
}

export interface TournamentPreparation {
  readonly matchId: MatchId
  readonly playerId: string
  readonly heroId: string
}

export type TeamAvatar = 'ORBIT' | 'BOLT' | 'SHIELD'

export interface TournamentTeam {
  readonly id: string
  readonly name: string
  readonly avatar: TeamAvatar
  readonly kind: 'HUMAN'
  readonly ownerId: string
  readonly playerIds: readonly [string, string]
  readonly status: 'PENDING_PAYMENT' | 'CONFIRMED'
}

export type MatchSlot =
  | { readonly kind: 'SEED'; readonly position: number }
  | { readonly kind: 'WINNER' | 'LOSER'; readonly matchId: MatchId }

export interface TournamentMatch {
  readonly id: MatchId
  readonly track: 'MAIN' | 'SECONDARY' | 'FINAL'
  readonly round: number
  readonly sources: readonly [MatchSlot, MatchSlot]
  readonly teamIds: readonly [string | null, string | null]
  readonly status: 'WAITING' | 'READY' | 'IN_PROGRESS' | 'FINISHED'
  readonly battleId: string | null
  readonly winnerId: string | null
  readonly loserId: string | null
}

export interface TournamentRecord {
  readonly id: string
  readonly matchId: MatchId
  readonly battleId: string
  readonly kind: 'STARTED' | 'FINISHED'
  readonly at: string
  readonly description: string
}

export interface TournamentSnapshot {
  readonly id: string
  readonly name: string
  readonly capacity: number
  readonly entryFee: number
  readonly status: 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED'
  readonly players: readonly TournamentPlayer[]
  readonly heroes: readonly TournamentHero[]
  readonly preparations: readonly TournamentPreparation[]
  readonly teams: readonly TournamentTeam[]
  readonly seedTeamIds: readonly string[]
  readonly matches: readonly TournamentMatch[]
  readonly records: readonly TournamentRecord[]
  readonly balances: Readonly<Record<string, number>>
  readonly transmitterId: string
  readonly selectedMatchId: MatchId | null
  readonly championId: string | null
  readonly channelUrl: string
}

export interface RegisterTeamInput {
  readonly name: string
  readonly playerIds: readonly [string, string]
  readonly avatar: TeamAvatar
}

/**
 * Port for a cached server snapshot and commands. A future HTTP/WebSocket adapter
 * implements this port; the view never imports fixtures or calculates results.
 * Actor IDs in the local adapter are NOT a production authorization mechanism.
 */
export interface TournamentGateway {
  readonly getSnapshot: () => TournamentSnapshot
  readonly subscribe: (listener: () => void) => () => void
  registerTeam(actorId: string, input: RegisterTeamInput, operationId: string): Promise<void>
  confirmEntry(actorId: string, teamId: string, operationId: string): Promise<void>
  publishBracket(actorId: string, operationId: string): Promise<void>
  preparePlayer(
    actorId: string,
    matchId: MatchId,
    heroId: string,
    operationId: string,
  ): Promise<void>
  startMatch(actorId: string, matchId: MatchId, operationId: string): Promise<void>
  selectMatch(actorId: string, matchId: MatchId): Promise<void>
}

export const MATCH_STATUS_LABELS: Readonly<Record<TournamentMatch['status'], string>> = {
  WAITING: 'Esperando equipos',
  READY: 'Equipos definidos',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
}

export const TEAM_AVATARS: Readonly<Record<TeamAvatar, { label: string; symbol: string }>> = {
  ORBIT: { label: 'Órbita', symbol: '◎' },
  BOLT: { label: 'Rayo', symbol: 'ϟ' },
  SHIELD: { label: 'Escudo', symbol: '◇' },
}
