import { HttpError } from '@/lib/http'

import type { BattleView, TurnOrderEntry } from './types'

/** Nombre visible de un participante: nunca el `playerId` ni ningun identificador tecnico. */
export const combatantName = (entry: TurnOrderEntry): string =>
  entry.kind === 'AI' ? 'Oponente IA' : (entry.displayName ?? 'Jugador')

/** El participante que esta jugando ESTA pantalla (mismo `sub` verificado que la sesion). */
export const findSelf = (battle: BattleView, subject: string | null): TurnOrderEntry | null =>
  subject === null
    ? null
    : (battle.turnOrder.find((entry) => entry.playerId !== null && entry.playerId === subject) ??
      null)

export interface CombatantGroups {
  /** Mi equipo (incluido yo). Vacio si el espectador no participa. */
  readonly allies: readonly TurnOrderEntry[]
  /** El otro equipo. */
  readonly opponents: readonly TurnOrderEntry[]
}

/**
 * Reparte la cola entre "mi equipo" y "el rival" SIN reordenarla: el orden de cada
 * grupo es el de la cola del servidor. Si quien mira no es participante (no
 * deberia ocurrir: Combat solo entrega la batalla a sus participantes) todos los
 * de un mismo equipo quedan juntos.
 */
export const groupCombatants = (battle: BattleView, subject: string | null): CombatantGroups => {
  const self = findSelf(battle, subject)
  const myTeam = self?.teamLabel ?? battle.turnOrder[0]?.teamLabel

  return {
    allies: battle.turnOrder.filter((entry) => entry.teamLabel === myTeam),
    opponents: battle.turnOrder.filter((entry) => entry.teamLabel !== myTeam),
  }
}

export interface TurnDescription {
  readonly isMyTurn: boolean
  /** Texto visible y semantico: nunca solo color. */
  readonly headline: string
  readonly detail: string
}

/**
 * Que decir del turno vigente. Se limita a LEER `currentTurn` que publica el
 * servidor: Web nunca calcula `turno + 1` ni decide de quien es el siguiente.
 */
export const describeTurn = (battle: BattleView, subject: string | null): TurnDescription => {
  const current = battle.currentTurn
  const isMyTurn = subject !== null && current.playerId !== null && current.playerId === subject
  const opening = battle.turnsCompleted === 0

  return {
    isMyTurn,
    headline: isMyTurn ? 'Tu turno' : `Turno de ${combatantName(current)}`,
    detail: opening
      ? `${isMyTurn ? 'Tú inicias' : `Inicia ${combatantName(current)}`} la batalla · Ronda ${String(battle.round)}`
      : `Ronda ${String(battle.round)}`,
  }
}

/** Codigo estable del 422 de Combat cuando los equipos tienen distinto tamano. */
const UNSUPPORTED_TEAM_COMPOSITION = 'UNSUPPORTED_TEAM_COMPOSITION'

const isUnsupportedTeamComposition = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  'code' in body &&
  body.code === UNSUPPORTED_TEAM_COMPOSITION

/**
 * Mensaje legible para un fallo al iniciar la batalla. Textos propios por codigo,
 * nunca el texto crudo de Combat: los 409 interpolan el `roomId` y los 422 pueden
 * arrastrar detalles tecnicos.
 */
export const describeStartBattleFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'
      case 403:
        return 'No participas en esta batalla.'
      case 404:
        return 'La sala ya no existe.'
      case 409:
        return 'La sala no está lista para comenzar o cambió de estado. Vuelve a la lista de salas e inténtalo de nuevo.'
      case 422:
        if (isUnsupportedTeamComposition(error.body)) {
          return 'Los equipos de esta sala tienen distinto tamaño y el orden de turnos solo está definido para equipos con el mismo número de participantes. La batalla no comenzó; vuelve a la lista de salas.'
        }

        return 'Un participante ya no cumple los requisitos para combatir: su héroe o su equipamiento cambió. La batalla no comenzó; revisa tu héroe y vuelve a la sala.'
      case 503:
        return 'El servicio no pudo validar a los participantes en este momento. Inténtalo de nuevo en unos segundos.'
      default:
        return 'No fue posible iniciar la batalla. Inténtalo de nuevo.'
    }
  }

  return 'No fue posible iniciar la batalla. Inténtalo de nuevo.'
}

/** Motivos estables de `command.rejected` que hacen inaccesible la batalla. */
export const describeRejection = (code: string): string =>
  code === 'NOT_A_PARTICIPANT'
    ? 'No participas en esta batalla.'
    : code === 'ROOM_NOT_FOUND'
      ? 'La sala ya no existe.'
      : 'No fue posible acceder a esta batalla.'
