import type { EntryTeam, EntryTournament, RegistrationMember, TournamentMode } from './api'

export const modalities = {
  SOLO: { size: 1, label: '1v1', slots: 'jugadores', summary: 'Ocho jugadores · 8 personas' },
  DUO: { size: 2, label: '2v2', slots: 'parejas', summary: 'Ocho parejas · 16 personas' },
  TRIO: { size: 3, label: '3v3', slots: 'tríos', summary: 'Ocho tríos · 24 personas' },
} as const
export const modeOf = (tournament: EntryTournament): TournamentMode =>
  tournament.tournamentMode ?? 'DUO'
/** v2 remains a pair; never reconstruct a third identity or consent. */
export const membersOf = (team: EntryTeam): readonly RegistrationMember[] =>
  team.members ?? [
    {
      subject: team.ownerId,
      position: 0,
      consentAt: team.createdAt,
      consentVersion: 'team-registration-v2',
    },
    ...(team.companionId === null
      ? []
      : [
          {
            subject: team.companionId,
            position: 1,
            consentAt: team.consentAt,
            consentVersion: team.consentVersion,
          },
        ]),
  ]
