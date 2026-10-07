import {
  TOURNAMENT_CONTRACT_VERSION,
  type EntryTeam,
  type EntryTournament,
  type RegistrationApi,
} from '@/features/tournament/registration/api'
import type { BracketApi, PublishedBracket } from '@/features/tournament/registration/bracketApi'
import type { EncounterApi, MatchDetail } from '@/features/tournament/registration/encounterApi'
import type { AvatarDownload } from '@/features/tournament/registration/TeamAvatar'

export const DEV_REGISTRATION_TOURNAMENT: EntryTournament = {
  id: 'dev-tournament-v2',
  name: 'Torneo de prueba · v2',
  entryPolicy: {
    version: 1,
    free: false,
    methods: [
      { method: 'CREDITS', amount: 100 },
      { method: 'SIMULATED_MONEY', amountMinor: 125050, currency: 'COP', minorUnit: 2 },
    ],
  },
  entryFee: 100,
  open: true,
  bracketPublished: false,
  opensAt: '2026-10-01T00:00:00Z',
  closesAt: '2026-10-10T00:00:00Z',
  startsAt: '2026-10-12T00:00:00Z',
}
export const registrationTeamFixture = (
  status: EntryTeam['status'] = 'PENDING_PAYMENT',
): EntryTeam => ({
  id: 'dev-team-A-B',
  tournamentId: DEV_REGISTRATION_TOURNAMENT.id,
  name: 'Equipo de prueba',
  avatar: { kind: 'ACCOUNT_AVATAR', subject: 'dev-player-A' },
  ownerId: 'dev-player-A',
  companionId: 'dev-player-B',
  status,
  createdAt: '2026-10-05T15:00:00Z',
  consentAt: status === 'AWAITING_CONSENT' ? null : '2026-10-05T15:01:00Z',
  consentVersion: status === 'AWAITING_CONSENT' ? null : 'team-registration-v2',
  confirmedAt: null,
  slot: null,
  failure: null,
  entryReceipt: null,
  registrationReceipt: {
    id: 'dev-registration-receipt',
    kind: 'TEAM_REGISTRATION',
    tournamentId: DEV_REGISTRATION_TOURNAMENT.id,
    teamId: 'dev-team-A-B',
    memberIds: ['dev-player-A', 'dev-player-B'],
    registeredAt: '2026-10-05T15:00:00Z',
    status: 'REGISTERED',
  },
})
export const createRegistrationPreviewApis = () => {
  let team: EntryTeam | null = null
  let published: PublishedBracket | null = null
  let tournament = DEV_REGISTRATION_TOURNAMENT
  const saved = new Map<string, EntryTeam>()
  const api: RegistrationApi = {
    list: () => Promise.resolve([tournament]),
    view: () =>
      Promise.resolve({
        tournament,
        capacity: {
          confirmed: team?.status === 'CONFIRMED' ? 8 : 7,
          reserved: 0,
          available: team?.status === 'CONFIRMED' ? 0 : 1,
        },
        teams: team === null ? [] : [team],
      }),
    create: () => Promise.resolve(tournament),
    register: async (_id, input) => {
      await Promise.resolve()
      const cached = saved.get(input.operationId)
      if (cached) return cached
      team = {
        ...registrationTeamFixture('AWAITING_CONSENT'),
        name: input.name,
        companionId: input.companionId,
        avatar: input.avatar,
      }
      saved.set(input.operationId, team)
      return team
    },
    consent: async (_id, _teamId, _operationId, accept) => {
      await Promise.resolve()
      team = {
        ...(team ?? registrationTeamFixture()),
        status: accept ? 'PENDING_PAYMENT' : 'CANCELLED',
        consentAt: accept ? '2026-10-05T15:01:00Z' : null,
        consentVersion: accept ? 'team-registration-v2' : null,
      }
      return team
    },
    cancel: async () => {
      await Promise.resolve()
      team = { ...(team ?? registrationTeamFixture()), status: 'CANCELLED' }
      return team
    },
    enter: async (_id, _teamId, input) => {
      await Promise.resolve()
      const cached = saved.get(input.operationId)
      if (cached) return cached
      const payment =
        input.method === 'SIMULATED_MONEY'
          ? {
              method: 'SIMULATED_MONEY' as const,
              amountMinor: 125050,
              currency: 'COP',
              minorUnit: 2,
              payerId: 'dev-player-A',
              realMoneyMoved: false as const,
              chargeId: 'dev-simulated-charge',
              reference: 'sim-dev-transaction',
              maskedCard: '****1111',
              simulated: true as const,
            }
          : {
              method: 'CREDITS' as const,
              amount: 100,
              chargeId: 'dev-wallet-charge',
              payerId: 'dev-player-A',
              realMoneyMoved: false as const,
            }
      team = {
        ...(team ?? registrationTeamFixture()),
        status: 'CONFIRMED',
        confirmedAt: '2026-10-05T15:03:00Z',
        slot: 8,
        entryReceipt: {
          id: 'dev-entry-receipt',
          kind: 'ENTRY_CONFIRMATION',
          tournamentId: tournament.id,
          teamId: 'dev-team-A-B',
          slot: 8,
          confirmedAt: '2026-10-05T15:03:00Z',
          payment,
        },
      }
      saved.set(input.operationId, team)
      return team
    },
  }
  const graph = [
    ['E1', 'MAIN', 1, 'S1', 'S2'],
    ['E2', 'MAIN', 1, 'S3', 'S4'],
    ['E3', 'MAIN', 1, 'S5', 'S6'],
    ['E4', 'MAIN', 1, 'S7', 'S8'],
    ['E5', 'MAIN', 2, 'WE1', 'WE2'],
    ['E6', 'MAIN', 2, 'WE3', 'WE4'],
    ['E7', 'SECONDARY', 2, 'LE1', 'LE2'],
    ['E8', 'SECONDARY', 2, 'LE3', 'LE4'],
    ['E9', 'SECONDARY', 3, 'LE6', 'WE7'],
    ['E10', 'SECONDARY', 3, 'LE5', 'WE8'],
    ['E11', 'MAIN', 3, 'WE5', 'WE6'],
    ['E12', 'SECONDARY', 4, 'WE9', 'WE10'],
    ['E13', 'SECONDARY', 5, 'LE11', 'WE12'],
    ['Final', 'FINAL', 6, 'WE11', 'WE13'],
  ] as const
  const source = (value: string) =>
    value.startsWith('S')
      ? { kind: 'SEED' as const, position: Number(value.slice(1)) }
      : {
          kind: value.startsWith('W') ? ('WINNER' as const) : ('LOSER' as const),
          matchId: value.slice(1),
        }
  const brackets: BracketApi = {
    view: () => Promise.resolve(published),
    publish: async (_id, operationId) => {
      await Promise.resolve()
      const matches: PublishedBracket['matches'] = graph.map(([id, track, round, a, b]) => {
        const destination = (kind: 'W' | 'L'): { matchId: string; side: 0 | 1 } | null => {
          for (const node of graph) {
            const side = [node[3], node[4]].findIndex((v) => v === kind + id)
            if (side === 0 || side === 1) return { matchId: node[0], side }
          }
          return null
        }
        return {
          id,
          encounterId: tournament.id + ':' + id,
          track,
          round,
          sources: [source(a), source(b)],
          teamIds: [
            a.startsWith('S') ? 'dev-team-' + a : null,
            b.startsWith('S') ? 'dev-team-' + b : null,
          ],
          status: a.startsWith('S') ? 'TEAMS_RESOLVED' : 'WAITING',
          destinations: { winner: destination('W'), loser: destination('L') },
        }
      })
      published = {
        version: 2,
        contractVersion: TOURNAMENT_CONTRACT_VERSION,
        tournamentId: tournament.id,
        operationId,
        publishedAt: '2026-10-05T15:05:00Z',
        publishedBy: 'dev-admin',
        startsAt: tournament.startsAt,
        seeds: Array.from({ length: 8 }, (_, index) => ({
          position: index + 1,
          teamId: 'dev-team-S' + String(index + 1),
          name: 'Equipo de prueba ' + String(index + 1),
          avatar: { kind: 'ACCOUNT_AVATAR', subject: 'dev-player-A' },
          memberIds: [
            'dev-member-' + String(index * 2),
            'dev-member-' + String(index * 2 + 1),
          ] as const,
        })),
        matches,
      }
      tournament = { ...tournament, bracketPublished: true, open: false }
      return published
    },
  }
  const encounters: EncounterApi = {
    list: async () => {
      await Promise.resolve()
      return (
        published?.matches.map((m) => ({
          tournamentId: tournament.id,
          matchId: m.encounterId,
          bracketLabel: m.id,
          round: m.round,
          status: 'WAITING_PARTICIPANTS',
          preparationStatus: m.status === 'TEAMS_RESOLVED' ? 'TEAMS_RESOLVED' : 'WAITING_TEAMS',
          bracketTrack: m.track,
          startedAt: null,
          closedAt: null,
        })) ?? []
      )
    },
    detail: async (_id, matchId, afterSeq): Promise<MatchDetail> => {
      await Promise.resolve()
      const match = (await encounters.list(tournament.id)).find((m) => m.matchId === matchId)
      if (match === undefined) throw new Error('No existe la justa de prueba.')
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
  return { api, brackets, encounters }
}
// Explicitly unavailable test avatar; never substitute a fabricated image for an account avatar.
export const devAvatarDownload: AvatarDownload = async () => {
  await Promise.resolve()
  throw new Error('La demo no lee avatares reales.')
}
