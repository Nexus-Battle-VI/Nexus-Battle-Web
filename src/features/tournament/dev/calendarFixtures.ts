import type {
  MatchDetail,
  MatchSummary,
  TournamentResolution,
} from '@/features/tournament/registration/encounterApi'
import type { MatchAcceptanceReceipt } from '@/features/tournament/registration/encounterAdminApi'

/** Explicit DTO doubles for component tests / DEV review. Not a clock or winner resolver. */
export const CALENDAR_ID = 'qa-calendar-trio'
export const CALENDAR_SUBJECT = 'qa-0-0'
export const calendarMatchFixture = (overrides: Partial<MatchDetail> = {}): MatchDetail => ({
  tournamentId: CALENDAR_ID,
  matchId: 'E1',
  encounterId: 'E1',
  bracketLabel: 'E1',
  round: 1,
  contractVersion: 'torneos-v3.0.0',
  tournamentMode: 'TRIO',
  teamSize: 3,
  status: 'WAITING_PARTICIPANTS',
  preparationStatus: 'TEAMS_RESOLVED',
  acceptanceStatus: 'OPEN',
  operationalStatus: 'IDLE',
  acceptanceOpensAt: '2026-10-07T19:00:00Z',
  acceptanceClosesAt: '2026-10-07T19:02:00Z',
  scheduledStartAt: '2026-10-07T19:02:00Z',
  serverNow: '2026-10-07T19:00:30Z',
  acceptedCounts: [2, 3],
  myAcceptance: null,
  blockReason: null,
  resolution: null,
  winnerTeamId: null,
  loserTeamId: null,
  startedAt: null,
  closedAt: null,
  combatRoomId: null,
  bracketTrack: 'MAIN',
  registeredTeams: [
    {
      teamId: 'qa-team-0',
      name: 'Guardianes del Amanecer y las Tierras del Norte',
      avatar: { kind: 'ACCOUNT_AVATAR', subject: CALENDAR_SUBJECT },
      memberIds: [CALENDAR_SUBJECT, 'qa-0-1', 'qa-0-2'],
    },
    {
      teamId: 'qa-team-1',
      name: 'Caballeros de la Última Fortaleza',
      avatar: { kind: 'ACCOUNT_AVATAR', subject: 'qa-1-0' },
      memberIds: ['qa-1-0', 'qa-1-1', 'qa-1-2'],
    },
  ],
  teams: [],
  result: null,
  events: [],
  afterSeq: 0,
  nextSeq: 0,
  hasMore: false,
  logComplete: false,
  ...overrides,
})
export const acceptanceReceiptFixture = (
  operationId = 'qa-acceptance',
  match: MatchSummary = calendarMatchFixture(),
): MatchAcceptanceReceipt => ({
  receiptId: 'qa-receipt',
  tournamentId: match.tournamentId,
  encounterId: match.matchId,
  teamId: 'qa-team-0',
  subject: CALENDAR_SUBJECT,
  operationId,
  acceptedAt: '2026-10-07T19:00:31Z',
  acceptanceOpensAt: match.acceptanceOpensAt ?? '',
  acceptanceClosesAt: match.acceptanceClosesAt ?? '',
  replayed: false,
})
export const absenceFixture = (
  ruleApplied: TournamentResolution['ruleApplied'] = 'HIGHER_ACCEPTANCE_COUNT',
): TournamentResolution => ({
  resultType: 'ABSENCE',
  resolutionId: 'qa-durable-resolution',
  resolvedAt: '2026-10-07T19:02:00Z',
  teamIds: ['qa-team-0', 'qa-team-1'],
  winnerTeamId: 'qa-team-0',
  loserTeamId: 'qa-team-1',
  teamSize: 3,
  reason: 'ACCEPTANCE_WINDOW_CLOSED',
  ruleApplied,
  acceptedCounts:
    ruleApplied === 'ONE_COMPLETE'
      ? [3, 0]
      : ruleApplied === 'TIED_ACCEPTANCE_COUNT'
        ? [0, 0]
        : [2, 1],
  tieBreak:
    ruleApplied === 'TIED_ACCEPTANCE_COUNT'
      ? { kind: 'UNBIASED_50_50', drawId: 'qa-server-draw', selectedSide: 0 }
      : null,
})
