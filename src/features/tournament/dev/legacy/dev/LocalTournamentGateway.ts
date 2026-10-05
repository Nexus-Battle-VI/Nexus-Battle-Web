import { resolveBracket } from '../bracket'
import type {
  MatchId,
  RegisterTeamInput,
  TournamentActor,
  TournamentGateway,
  TournamentMatch,
  TournamentSnapshot,
} from '../model'
import { createTournamentFixture, DEV_TOURNAMENT_ACTORS } from './fixtures'

export interface FixtureBattleResult {
  readonly eventId: string
  readonly matchId: MatchId
  readonly battleId: string
  readonly winnerId: string
}

// Validate roster values at runtime too: old fixtures may predate the human-only policy.
const validHumanRoster = (team: {
  readonly kind: string
  readonly playerIds: readonly string[]
}): boolean => team.kind === 'HUMAN' && team.playerIds.length === 2

// Exposed snapshots are stable and deeply frozen, as useSyncExternalStore requires.
const freezeSnapshot = (snapshot: TournamentSnapshot): TournamentSnapshot => {
  const freeze = (value: object): void => {
    for (const child of Object.values(value)) {
      if (typeof child === 'object' && child !== null) freeze(child as object)
    }
    Object.freeze(value)
  }
  const copy = structuredClone(snapshot)
  freeze(copy)
  return copy
}

/**
 * Development-only simulator. No network, real payments, Combat or credentials.
 * Mutations are atomic inside one JS turn; only successful operations are cached.
 * Production must enforce these invariants transactionally on the server.
 */
export class LocalTournamentGateway implements TournamentGateway {
  private snapshot: TournamentSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly operations = new Map<string, string>()
  private readonly results = new Map<string, string>()
  private sequence = 0

  constructor(initial = createTournamentFixture()) {
    this.snapshot = freezeSnapshot(initial)
  }

  readonly getSnapshot = (): TournamentSnapshot => this.snapshot

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private update(patch: Partial<TournamentSnapshot>): void {
    this.snapshot = freezeSnapshot({ ...this.snapshot, ...patch })
    for (const listener of this.listeners) listener()
  }

  private actor(id: string): TournamentActor {
    const actor = DEV_TOURNAMENT_ACTORS.find((candidate) => candidate.id === id)
    if (actor === undefined || actor.role === 'VISITOR') {
      throw new Error('Debes iniciar sesión para realizar esta acción.')
    }
    return actor
  }

  private admin(id: string): void {
    if (this.actor(id).role !== 'ADMIN') {
      throw new Error('Solo un administrador puede realizar esta acción.')
    }
  }

  private registrationOpen(): void {
    if (this.snapshot.status !== 'REGISTRATION') {
      throw new Error('Las inscripciones están cerradas: las llaves ya fueron publicadas.')
    }
  }

  private execute(operationId: string, input: unknown, action: () => void): Promise<void> {
    try {
      if (operationId.trim() === '') throw new Error('La operación necesita un identificador.')
      const signature = JSON.stringify(input)
      const previous = this.operations.get(operationId)
      if (previous !== undefined) {
        if (previous !== signature) throw new Error('Ese identificador pertenece a otra operación.')
        return Promise.resolve()
      }
      action()
      this.operations.set(operationId, signature)
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('La operación falló.'))
    }
  }

  registerTeam(actorId: string, input: RegisterTeamInput, operationId: string): Promise<void> {
    return this.execute(operationId, ['register', actorId, input], () => {
      this.actor(actorId)
      this.registrationOpen()
      const name = input.name.trim()
      if (name.length === 0 || name.length > 32) {
        throw new Error('El nombre debe tener entre 1 y 32 caracteres.')
      }
      if (input.playerIds[0] === input.playerIds[1]) {
        throw new Error('El equipo necesita dos jugadores distintos.')
      }
      if (!input.playerIds.includes(actorId)) {
        throw new Error('Debes formar parte del equipo que inscribes.')
      }
      if (!['ORBIT', 'BOLT', 'SHIELD'].includes(input.avatar)) {
        throw new Error('Selecciona un avatar disponible.')
      }
      for (const playerId of input.playerIds) {
        if (!this.snapshot.players.some((player) => player.id === playerId)) {
          throw new Error('Uno de los jugadores no está disponible.')
        }
        if (this.snapshot.teams.some((team) => team.playerIds.includes(playerId))) {
          throw new Error('Uno de los jugadores ya tiene un equipo en este torneo.')
        }
      }
      if (this.snapshot.teams.filter((team) => team.status === 'CONFIRMED').length >= 8) {
        throw new Error('Los ocho cupos ya están confirmados.')
      }
      this.sequence += 1
      this.update({
        teams: [
          ...this.snapshot.teams,
          {
            id: `registered-${String(this.sequence)}`,
            name,
            avatar: input.avatar,
            kind: 'HUMAN',
            ownerId: actorId,
            playerIds: input.playerIds,
            status: 'PENDING_PAYMENT',
          },
        ],
      })
    })
  }

  confirmEntry(actorId: string, teamId: string, operationId: string): Promise<void> {
    return this.execute(operationId, ['payment', actorId, teamId], () => {
      this.actor(actorId)
      this.registrationOpen()
      const team = this.snapshot.teams.find((candidate) => candidate.id === teamId)
      if (team?.ownerId !== actorId) {
        throw new Error('Solo quien inscribió este equipo puede confirmar su cupo.')
      }
      if (team.status === 'CONFIRMED') return
      if (this.snapshot.teams.filter((candidate) => candidate.status === 'CONFIRMED').length >= 8) {
        throw new Error('No quedan cupos. No se descontaron créditos.')
      }
      const balance = this.snapshot.balances[actorId] ?? 0
      if (balance < this.snapshot.entryFee) {
        throw new Error('Saldo de prueba insuficiente. El equipo sigue pendiente de pago.')
      }
      this.update({
        teams: this.snapshot.teams.map((candidate) =>
          candidate.id === teamId ? { ...candidate, status: 'CONFIRMED' } : candidate,
        ),
        balances: { ...this.snapshot.balances, [actorId]: balance - this.snapshot.entryFee },
      })
    })
  }

  publishBracket(actorId: string, operationId: string): Promise<void> {
    return this.execute(operationId, ['publish', actorId], () => {
      this.admin(actorId)
      if (this.snapshot.matches.length > 0) return
      this.registrationOpen()
      const teams = this.snapshot.teams.filter((team) => team.status === 'CONFIRMED')
      if (teams.length !== 8) {
        throw new Error(
          'Se necesitan ocho equipos humanos con cupo confirmado para publicar las llaves.',
        )
      }
      const players = teams.flatMap((team) => [...team.playerIds])
      if (
        teams.some((team) => !validHumanRoster(team)) ||
        new Set(teams.map((team) => team.id)).size !== 8 ||
        new Set(players).size !== 16 ||
        players.some((id) => !this.snapshot.players.some((player) => player.id === id))
      ) {
        throw new Error(
          'El torneo necesita dieciséis jugadores humanos distintos en ocho equipos válidos.',
        )
      }
      const seeds = teams.map((team) => team.id)
      this.update({
        seedTeamIds: seeds,
        matches: resolveBracket(seeds),
        status: 'IN_PROGRESS',
      })
    })
  }

  private match(id: MatchId): TournamentMatch {
    const match = this.snapshot.matches.find((candidate) => candidate.id === id)
    if (match === undefined) throw new Error('El encuentro no existe.')
    return match
  }

  private matchPlayers(match: TournamentMatch): readonly string[] {
    return match.teamIds.flatMap(
      (id) => this.snapshot.teams.find((team) => team.id === id)?.playerIds ?? [],
    )
  }

  preparePlayer(
    actorId: string,
    matchId: MatchId,
    heroId: string,
    operationId: string,
  ): Promise<void> {
    return this.execute(operationId, ['prepare', actorId, matchId, heroId], () => {
      this.actor(actorId)
      const match = this.match(matchId)
      if (match.status !== 'READY') {
        throw new Error(
          'Solo puedes preparar un encuentro con equipos definidos que aún no haya empezado.',
        )
      }
      if (!this.matchPlayers(match).includes(actorId)) {
        throw new Error('Solo puedes confirmar tu héroe en tu propio encuentro.')
      }
      const hero = this.snapshot.heroes.find((candidate) => candidate.id === heroId)
      if (hero?.ownerId !== actorId) throw new Error('Selecciona un héroe de tu propio inventario.')
      if (!hero.available) throw new Error('El héroe no está disponible para este encuentro.')
      if (
        this.snapshot.matches.some(
          (other) => other.status === 'IN_PROGRESS' && this.matchPlayers(other).includes(actorId),
        )
      ) {
        throw new Error('Ya estás jugando otro encuentro. No puedes participar en dos a la vez.')
      }
      this.update({
        preparations: [
          ...this.snapshot.preparations.filter(
            (entry) => entry.matchId !== matchId || entry.playerId !== actorId,
          ),
          { matchId, playerId: actorId, heroId },
        ],
      })
    })
  }

  startMatch(actorId: string, matchId: MatchId, operationId: string): Promise<void> {
    return this.execute(operationId, ['start', actorId, matchId], () => {
      this.admin(actorId)
      const match = this.match(matchId)
      if (match.status === 'IN_PROGRESS' || match.status === 'FINISHED') return
      if (match.status !== 'READY') throw new Error('Faltan equipos por definir en este encuentro.')
      const players = this.matchPlayers(match)
      if (
        players.length !== 4 ||
        new Set(players).size !== 4 ||
        players.some((playerId) => {
          const preparation = this.snapshot.preparations.find(
            (entry) => entry.matchId === matchId && entry.playerId === playerId,
          )
          return !this.snapshot.heroes.some(
            (hero) =>
              hero.id === preparation?.heroId && hero.ownerId === playerId && hero.available,
          )
        })
      ) {
        throw new Error(
          'Los cuatro jugadores deben confirmar su propio héroe disponible antes de iniciar.',
        )
      }
      if (
        this.snapshot.matches.some(
          (other) =>
            other.status === 'IN_PROGRESS' &&
            this.matchPlayers(other).some((id) => players.includes(id)),
        )
      ) {
        throw new Error('Uno de los jugadores sigue en otro encuentro. Espera a que termine.')
      }
      const battleId = `${this.snapshot.id}-${matchId}`
      this.update({
        matches: this.snapshot.matches.map((candidate) =>
          candidate.id === matchId ? { ...candidate, status: 'IN_PROGRESS', battleId } : candidate,
        ),
        records: [
          ...this.snapshot.records,
          {
            id: `${battleId}-started`,
            matchId,
            battleId,
            kind: 'STARTED',
            at: new Date().toISOString(),
            description: `${this.actor(actorId).name} inició ${matchId}.`,
          },
        ],
      })
    })
  }

  selectMatch(actorId: string, matchId: MatchId): Promise<void> {
    return this.execute(`select-${crypto.randomUUID()}`, ['select', actorId, matchId], () => {
      this.admin(actorId)
      if (actorId !== this.snapshot.transmitterId) {
        throw new Error('Este torneo ya tiene un único administrador transmisor asignado.')
      }
      const match = this.match(matchId)
      if (match.status !== 'IN_PROGRESS')
        throw new Error('Selecciona un encuentro que esté en curso.')
      this.update({ selectedMatchId: matchId })
    })
  }

  /** Simulator input only. Never expose a UI that lets players decide real winners. */
  receiveFixtureResult(result: FixtureBattleResult): Promise<void> {
    return this.execute(result.eventId, ['result', result], () => {
      const signature = JSON.stringify([result.matchId, result.battleId, result.winnerId])
      const match = this.match(result.matchId)
      const previous = this.results.get(result.battleId)
      if (previous !== undefined) {
        if (previous !== signature) throw new Error('La batalla ya tiene un resultado definitivo.')
        return
      }
      if (match.status !== 'IN_PROGRESS' || match.battleId !== result.battleId) {
        throw new Error('El resultado no pertenece a la batalla activa de este encuentro.')
      }
      if (!match.teamIds.includes(result.winnerId)) {
        throw new Error('El ganador no forma parte de este encuentro.')
      }
      const loserId = match.teamIds.find((teamId) => teamId !== result.winnerId) ?? null
      const updatedMatches = this.snapshot.matches.map((candidate) =>
        candidate.id === result.matchId
          ? { ...candidate, status: 'FINISHED' as const, winnerId: result.winnerId, loserId }
          : candidate,
      )
      const championId = result.matchId === 'Final' ? result.winnerId : this.snapshot.championId
      this.results.set(result.battleId, signature)
      this.update({
        matches: resolveBracket(this.snapshot.seedTeamIds, updatedMatches),
        championId,
        status: championId === null ? 'IN_PROGRESS' : 'FINISHED',
        records: [
          ...this.snapshot.records,
          {
            id: result.eventId,
            matchId: result.matchId,
            battleId: result.battleId,
            kind: 'FINISHED',
            at: new Date().toISOString(),
            description: `Resultado recibido: ganó ${this.snapshot.teams.find((team) => team.id === result.winnerId)?.name ?? result.winnerId}.`,
          },
        ],
      })
    })
  }
}
