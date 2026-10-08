import { HttpError } from '@/lib/http'
import type {
  BroadcastApi,
  BroadcastObservation,
  BroadcastSnapshot,
  BroadcastState,
} from '@/features/tournament/broadcast/api'

/** DEV_BROADCAST_FIXTURE: explicit examples, never a combat engine or a production API. */
export const previewSnapshot = (
  matchId = 'encounter-01',
  teamSize: 1 | 2 | 3 = 2,
): BroadcastSnapshot => ({
  tournamentId: 'DEMO',
  tournamentName: 'Torneo de prueba · HU-79/81',
  matchId,
  encounterId: matchId,
  bracketLabel: matchId === 'encounter-01' ? 'E1' : 'E2',
  combatRoomId: `demo-room:${matchId}`,
  startedAt: '2026-10-07T12:00:00.000Z',
  track: 'MAIN',
  round: 1,
  status: 'IN_PROGRESS',
  seq: 1,
  observedAt: new Date().toISOString(),
  teams: [
    {
      teamId: `${matchId}-A`,
      teamLabel: 'A',
      name: matchId === 'encounter-01' ? 'Dragones' : 'Aurora',
    },
    {
      teamId: `${matchId}-B`,
      teamLabel: 'B',
      name: matchId === 'encounter-01' ? 'Fénix' : 'Titanes',
    },
  ],
  battleRound: 1,
  turnsCompleted: 0,
  currentPlayerId: `${matchId}-p1`,
  combatants: ['Aster', 'Nova', 'Orion', 'Vega', 'Lyra', 'Atlas']
    .slice(0, teamSize * 2)
    .map((name, i) => ({
      playerId: `${matchId}-p${String(i + 1)}`,
      heroId: `qa-owned-hero-${String(i + 1)}`,
      seat: i % teamSize,
      heroSubtype:
        [
          'guerrero-tanque',
          'guerrero-armas',
          'mago-fuego',
          'mago-hielo',
          'picaro-veneno',
          'picaro-machete',
        ][i]
          ?.replaceAll('-', '_')
          .toUpperCase() ?? null,
      teamLabel: i < teamSize ? 'A' : 'B',
      displayName: `${name} ${matchId === 'encounter-01' ? 'E1' : 'E2'}`,
      position: i,
      health: { current: 100, max: 100 },
      power: { current: 20, max: 30 },
    })),
  lastAction: { type: 'battleStarted', occurredAt: new Date().toISOString() },
  result: null,
})
export class BroadcastPreviewApi implements BroadcastApi {
  state: BroadcastState = {
    tournamentId: 'DEMO',
    broadcasterId: 'adminA',
    selectedMatchId: 'encounter-01',
    revision: 2,
  }
  readonly snapshots: Map<string, BroadcastSnapshot>
  constructor(teamSize: 1 | 2 | 3 = 2) {
    this.snapshots = new Map([
      ['encounter-01', previewSnapshot('encounter-01', teamSize)],
      ['encounter-02', previewSnapshot('encounter-02', teamSize)],
    ])
  }
  disconnected = false
  revoked = false
  setDisconnected(value: boolean): void {
    this.disconnected = value
  }
  revoke(): void {
    this.revoked = true
  }
  private access(): void {
    if (this.revoked) throw new HttpError(403, 'La designación fue revocada.', null)
    if (this.disconnected) throw new HttpError(503, 'Conexión de prueba interrumpida.', null)
  }
  configuration(): Promise<BroadcastState> {
    return Promise.resolve(structuredClone(this.state))
  }
  designate(): Promise<BroadcastState> {
    return this.configuration()
  }
  active(): ReturnType<BroadcastApi['active']> {
    if (this.revoked) return Promise.reject(new HttpError(403, 'Sin permiso.', null))
    return Promise.resolve({
      matches: [...this.snapshots.values()]
        .filter((s) => s.status === 'IN_PROGRESS')
        .map((s) => ({
          matchId: s.matchId,
          encounterId: s.encounterId,
          bracketLabel: s.bracketLabel,
          track: s.track,
          round: s.round,
          teams: s.teams,
        })),
    })
  }
  observe(): Promise<BroadcastObservation> {
    try {
      this.access()
      const snapshot = this.snapshots.get(this.state.selectedMatchId ?? '')
      return Promise.resolve(
        structuredClone({
          state: this.state,
          snapshot: snapshot ? { ...snapshot, observedAt: new Date().toISOString() } : null,
        }),
      )
    } catch (error: unknown) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }
  select(_id: string, matchId: string, expectedRevision: number): Promise<BroadcastObservation> {
    try {
      this.access()
      if (this.state.revision !== expectedRevision)
        throw new HttpError(409, 'La selección cambió.', null)
      const snapshot = this.snapshots.get(matchId)
      if (snapshot?.status !== 'IN_PROGRESS')
        throw new HttpError(409, 'La justa ya no está en curso.', null)
      if (this.state.selectedMatchId !== matchId) {
        this.state.selectedMatchId = matchId
        this.state.revision++
      }
      return this.observe()
    } catch (error: unknown) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }
  advance(matchId: string): void {
    const s = this.snapshots.get(matchId)
    if (!s || s.status === 'FINISHED') return
    s.seq++
    s.turnsCompleted++
    s.battleRound = 1 + Math.floor(s.turnsCompleted / s.combatants.length)
    s.currentPlayerId =
      s.combatants[s.turnsCompleted % s.combatants.length]?.playerId ?? s.currentPlayerId
    const target = s.combatants.at(-1)
    if (target) target.health = { current: Math.max(0, 100 - s.turnsCompleted * 8), max: 100 }
    s.lastAction = { type: 'basicAttackResolved', occurredAt: new Date().toISOString() }
  }
  finish(): void {
    const s = this.snapshots.get(this.state.selectedMatchId ?? '')
    if (!s || s.status === 'FINISHED') return
    s.status = 'FINISHED'
    s.seq++
    s.result = {
      outcome: 'WIN',
      winnerTeamLabel: 'A',
      reason: 'ELIMINATION',
      finishedAt: new Date().toISOString(),
    }
    s.lastAction = { type: 'battleFinished', occurredAt: new Date().toISOString() }
  }
}
