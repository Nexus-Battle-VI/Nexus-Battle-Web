import type { TournamentMode } from '@/features/tournament/registration/api'
import type { PublishedBracket } from '@/features/tournament/registration/bracketApi'
import type { EncounterApi, MatchDetail } from '@/features/tournament/registration/encounterApi'
import type {
  EncounterAdminApi,
  MatchAcceptanceApi,
} from '@/features/tournament/registration/encounterAdminApi'
import type { ProgressApi, ProgressBracket } from '@/features/tournament/registration/progressApi'
import { calendarMatchFixture, acceptanceReceiptFixture, absenceFixture } from './calendarFixtures'
import { modalities } from '@/features/tournament/registration/modalities'

/** Captured-shape DTO scenarios. All people/rooms/receipts here are fictitious. */
export const calendarPreviewApis = (
  bracket: PublishedBracket,
  mode: TournamentMode,
  state: string,
) => {
  const teamSize = modalities[mode].size
  const opening = Date.parse(bracket.startsAt)
  const sampleRound = state === 'blocked' ? 3 : state === 'final' ? 6 : 1
  const now = opening + (sampleRound - 1) * 600000 + (state === 'open' ? 30000 : 130000)
  const records: MatchDetail[] = bracket.matches.map((match) => {
    const roundOpens = opening + (match.round - 1) * 600000
    const target = match.id === (state === 'blocked' ? 'E9' : state === 'final' ? 'Final' : 'E1')
    const seeds = match.teamIds.map(
      (teamId, side) =>
        bracket.seeds.find((seed) => seed.teamId === teamId) ??
        (target ? bracket.seeds[side === 0 ? 0 : state === 'final' ? 7 : 1] : undefined),
    )
    const registeredTeams = seeds.map((seed) =>
      seed ? { ...seed, avatar: seed.avatar, teamId: seed.teamId } : null,
    )
    const base = calendarMatchFixture({
      tournamentId: bracket.tournamentId,
      matchId: match.encounterId,
      encounterId: match.encounterId,
      bracketLabel: match.id,
      round: match.round,
      bracketTrack: match.track,
      tournamentMode: mode,
      teamSize,
      sources: match.sources,
      registeredTeams,
      acceptanceOpensAt: new Date(roundOpens).toISOString(),
      acceptanceClosesAt: new Date(roundOpens + 120000).toISOString(),
      scheduledStartAt: new Date(roundOpens + 120000).toISOString(),
      serverNow: new Date(now).toISOString(),
      acceptanceStatus: match.round === 1 && state === 'open' ? 'OPEN' : 'SCHEDULED',
      acceptedCounts:
        match.round === 1 && state === 'open' ? [Math.max(0, teamSize - 1), teamSize] : [0, 0],
      preparationStatus: seeds.every((seed) => seed !== undefined)
        ? 'TEAMS_RESOLVED'
        : 'WAITING_TEAMS',
    })
    if (
      (state === 'ready' && match.round === 1) ||
      (state === 'running' && ['E1', 'E2'].includes(match.id))
    ) {
      const running = state === 'running'
      return {
        ...base,
        acceptanceStatus: 'CLOSED',
        operationalStatus: running ? 'IN_BATTLE' : 'START_PENDING',
        status: running ? 'IN_PROGRESS' : 'READY',
        preparationStatus: running ? 'IN_BATTLE' : 'PREPARED',
        acceptedCounts: [teamSize, teamSize],
        combatRoomId: `qa-room-${match.id}`,
        teams: registeredTeams.flatMap((team, index) =>
          team
            ? [
                {
                  teamId: team.teamId,
                  teamLabel: index === 0 ? 'A' : 'B',
                  participants: team.memberIds.map((playerId) => ({
                    playerId,
                    heroId: `qa-hero-${playerId}`,
                  })),
                },
              ]
            : [],
        ),
      }
    }
    if (target && (state.startsWith('absence') || state === 'final')) {
      const rule =
        state === 'absence-tie'
          ? 'TIED_ACCEPTANCE_COUNT'
          : state === 'absence-full' || state === 'final'
            ? 'ONE_COMPLETE'
            : 'HIGHER_ACCEPTANCE_COUNT'
      const ids = [seeds[0]?.teamId ?? 'qa-team-0', seeds[1]?.teamId ?? 'qa-team-1'] as const
      const resolution = {
        ...absenceFixture(rule),
        resolvedAt: new Date(roundOpens + 120000).toISOString(),
        teamSize,
        teamIds: ids,
        winnerTeamId: ids[0],
        loserTeamId: ids[1],
        acceptedCounts:
          rule === 'ONE_COMPLETE'
            ? ([teamSize, 0] as const)
            : rule === 'TIED_ACCEPTANCE_COUNT'
              ? ([0, 0] as const)
              : ([Math.max(0, teamSize - 1), 0] as const),
      }
      return {
        ...base,
        resolution,
        acceptanceStatus: 'RESOLVED',
        operationalStatus: 'FINISHED',
        status: 'FINISHED',
        preparationStatus: 'FINISHED',
        winnerTeamId: ids[0],
        loserTeamId: ids[1],
        acceptedCounts: resolution.acceptedCounts,
        closedAt: resolution.resolvedAt,
      }
    }
    if (target && state === 'blocked')
      return {
        ...base,
        acceptanceStatus: 'BLOCKED_DELAY',
        operationalStatus: 'DEPENDENCY_ERROR',
        blockReason: {
          code: 'PREVIOUS_RESULT_PENDING',
          message:
            'El resultado de E6 llegó después de abrir la ventana. Requiere revisión de Tournament; sin ganador ni cambio de horario.',
          since: new Date(roundOpens).toISOString(),
          responsible: 'TOURNAMENT_OPERATIONS',
        },
      }
    return ['blocked', 'final'].includes(state) && match.round < sampleRound
      ? { ...base, status: 'FINISHED', acceptanceStatus: 'RESOLVED', operationalStatus: 'FINISHED' }
      : base
  })
  const encounters: EncounterApi = {
    list: () => Promise.resolve(records),
    detail: (_, matchId) => {
      const match = records.find((m) => m.matchId === matchId)
      return match
        ? Promise.resolve(match)
        : Promise.reject(new Error('La justa no pertenece al escenario DEV.'))
    },
  }
  const acceptance: MatchAcceptanceApi = {
    accept: (_, matchId, operationId) => {
      const record = records.find((m) => m.matchId === matchId)
      if (!record) return Promise.reject(new Error('Escenario DEV sin justa.'))
      const receipt = acceptanceReceiptFixture(operationId, record)
      const own = record.registeredTeams?.[0]
      const response = {
        ...receipt,
        acceptedAt: new Date(now + 1000).toISOString(),
        subject: own?.memberIds[0] ?? '',
        teamId: own?.teamId ?? '',
      }
      records.splice(records.indexOf(record), 1, {
        ...record,
        myAcceptance: response,
        acceptedCounts: [teamSize, teamSize],
      })
      return Promise.resolve(response)
    },
  }
  const admin: EncounterAdminApi = {
    prepare: () =>
      Promise.reject(new Error('Revisión visual: preparar requiere el servidor real.')),
    start: () => Promise.reject(new Error('Revisión visual: iniciar requiere el servidor real.')),
    actions: () =>
      Promise.resolve(
        records
          .filter((m) => m.status === 'IN_PROGRESS')
          .map((m) => ({
            actionId: `qa-worker-${m.bracketLabel}`,
            tournamentId: m.tournamentId,
            encounterId: m.matchId,
            action: 'START',
            actor: 'tournament-worker',
            operationId: `qa-start-${m.bracketLabel}`,
            occurredAt: m.scheduledStartAt ?? '',
            replayed: false,
            battleId: m.combatRoomId ?? '',
            status: m.status,
            preparationStatus: 'IN_BATTLE',
          })),
      ),
  }
  const projected: ProgressBracket = {
    ...bracket,
    matches: bracket.matches.map((m) => {
      const record = records.find((r) => r.matchId === m.encounterId)
      return {
        ...m,
        teamIds: [
          record?.registeredTeams?.[0]?.teamId ?? null,
          record?.registeredTeams?.[1]?.teamId ?? null,
        ],
        winnerTeamId: record?.winnerTeamId ?? null,
        loserTeamId: record?.loserTeamId ?? null,
        status:
          record?.status === 'FINISHED'
            ? 'FINISHED'
            : m.status === 'TEAMS_RESOLVED'
              ? 'READY'
              : 'WAITING',
      }
    }),
  }
  const progress: ProgressApi = {
    view: () =>
      Promise.resolve({
        bracket: projected,
        champion:
          state === 'final'
            ? {
                teamId: bracket.seeds[0]?.teamId ?? '',
                teamName: bracket.seeds[0]?.name ?? '',
                memberIds: bracket.seeds[0]?.memberIds ?? [],
                finalRoomId: null,
                finalEncounterId:
                  bracket.matches.find((m) => m.track === 'FINAL')?.encounterId ?? '',
                declaredAt: new Date(now).toISOString(),
                heroes: [],
              }
            : null,
        eliminatedTeamIds: [],
      }),
  }
  return { encounters, acceptance, admin, progress }
}
