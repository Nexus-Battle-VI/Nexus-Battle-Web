import type { SpectatorArenaProps } from '@/shared/battle/observation'
import { BattleScreen } from './BattleScreen'
import type { BattleView, TurnOrderEntry } from './types'

/** La misma arena de Jugar Online, sin sesión de jugador, comandos ni consultas de premios. */
export const SpectatorArena = ({
  observation,
  connected,
}: SpectatorArenaProps): React.JSX.Element => {
  const turnOrder: TurnOrderEntry[] = observation.combatants.map((entry) => ({
    position: entry.position,
    teamLabel: entry.teamLabel,
    seat: entry.seat,
    kind: 'HUMAN',
    playerId: entry.playerId,
    displayName: entry.displayName,
    heroId: entry.heroId,
    heroSubtype: entry.heroSubtype,
  }))
  const currentTurn = turnOrder.find((entry) => entry.playerId === observation.currentPlayerId)
  if (currentTurn === undefined)
    return <p role="alert">El turno observado no tiene participante.</p>
  const battle: BattleView = {
    battleId: observation.combatRoomId,
    startedAt: observation.startedAt,
    round: observation.battleRound,
    turnsCompleted: observation.turnsCompleted,
    turnOrder,
    currentTurn,
    combatants: observation.combatants.map((entry) => ({
      teamLabel: entry.teamLabel,
      seat: entry.seat,
      health: entry.health,
      power: entry.power,
    })),
  }
  return (
    <BattleScreen
      battle={battle}
      subject={null}
      connection={connected ? 'open' : 'reconnecting'}
      synced={connected}
      spectator={{
        ended: observation.status === 'FINISHED',
        teamNames: Object.fromEntries(observation.teams.map((team) => [team.teamLabel, team.name])),
      }}
    />
  )
}
