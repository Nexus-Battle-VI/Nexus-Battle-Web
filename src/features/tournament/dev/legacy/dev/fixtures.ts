import type { TournamentActor, TournamentSnapshot, TournamentTeam } from '../model'

const TEAM_NAMES = ['Centinelas', 'Nebulosa', 'Titanes', 'Fénix', 'Eclipse', 'Vanguardia']
const PLAYER_NAMES = [
  'Aster',
  'Nova',
  'Orion',
  'Vega',
  'Atlas',
  'Lyra',
  'Draco',
  'Luna',
  'Sol',
  'Iris',
  'Kai',
  'Zoe',
  'Mateo',
  'Sara',
  'Daniel',
  'Ana',
  'Medina',
  'Leo',
  'Sam',
  'Nico',
]

export const DEV_TOURNAMENT_ACTORS: readonly TournamentActor[] = [
  { id: 'p13', name: 'Mateo · administrador y transmisor', role: 'ADMIN' },
  { id: 'p15', name: 'Daniel · administrador', role: 'ADMIN' },
  { id: 'p17', name: 'Medina · jugador', role: 'PLAYER' },
  { id: 'public', name: 'Visitante · acceso público', role: 'VISITOR' },
  ...PLAYER_NAMES.flatMap((name, index): TournamentActor[] => {
    const id = `p${String(index + 1)}`
    return ['p13', 'p15', 'p17'].includes(id)
      ? []
      : [{ id, name: `${name} · jugador`, role: 'PLAYER' }]
  }),
]

/** In-memory fixture only; balances are invented test credits, never Wallet data. */
export const createTournamentFixture = (): TournamentSnapshot => {
  const teams: TournamentTeam[] = TEAM_NAMES.map((name, index) => ({
    id: `team-${String(index + 1)}`,
    name,
    avatar: 'ORBIT',
    kind: 'HUMAN',
    ownerId: `p${String(index * 2 + 1)}`,
    playerIds: [`p${String(index * 2 + 1)}`, `p${String(index * 2 + 2)}`],
    status: 'CONFIRMED',
  }))
  return {
    id: 'DEV_TOURNAMENT_FIXTURE',
    name: 'Copa Nexus · prueba Beta',
    capacity: 8,
    entryFee: 200,
    status: 'REGISTRATION',
    players: PLAYER_NAMES.map((name, index) => ({ id: `p${String(index + 1)}`, name })),
    heroes: PLAYER_NAMES.map((name, index) => ({
      id: `hero-p${String(index + 1)}`,
      ownerId: `p${String(index + 1)}`,
      name: `Guardián de ${name}`,
      available: true,
    })),
    preparations: [],
    teams,
    seedTeamIds: [],
    matches: [],
    records: [],
    balances: { p13: 1000, p15: 1000, p17: 100, p19: 1000 },
    transmitterId: 'p13',
    selectedMatchId: null,
    championId: null,
    channelUrl: 'https://www.youtube.com/channel/UCscW71t4iP--b-7HFDPFosA',
  }
}

/** Separate full-registration fixture for tests of later stages, never automated players. */
export const createConfirmedTournamentFixture = (): TournamentSnapshot => {
  const initial = createTournamentFixture()
  return {
    ...initial,
    teams: [
      ...initial.teams,
      {
        id: 'team-7',
        name: 'Guardianes Beta',
        avatar: 'BOLT',
        kind: 'HUMAN',
        ownerId: 'p13',
        playerIds: ['p13', 'p14'],
        status: 'CONFIRMED',
      },
      {
        id: 'team-8',
        name: 'Aurora',
        avatar: 'SHIELD',
        kind: 'HUMAN',
        ownerId: 'p15',
        playerIds: ['p15', 'p16'],
        status: 'CONFIRMED',
      },
    ],
  }
}
