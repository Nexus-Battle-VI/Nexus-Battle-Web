import type { BattleResult, ParticipantOutcome, TeamStanding } from './types'

/**
 * Textos del resultado (HU-21). Modulo PURO: recibe el resultado que publico
 * Combat y decide SOLO como contarlo. No compara vidas, no recalcula porcentajes,
 * no declara ganador y no inventa recompensas (D4: no se muestran creditos).
 *
 * El rol del espectador sale UNICAMENTE de `participants` (por `playerId`): si el
 * sujeto no participa, es espectador y recibe un texto neutro.
 */
export type ResultTone = 'won' | 'lost' | 'no-winner' | 'neutral'

export interface TeamStandingText {
  readonly teamLabel: string
  readonly text: string
  readonly eliminated: boolean
}

export interface ResultPresentation {
  readonly tone: ResultTone
  readonly headline: string
  readonly cause: string
  /** Linea adicional del desempate (solo `TIME_LIMIT`); `null` si no aplica. */
  readonly detail: string | null
  readonly standings: readonly TeamStandingText[]
}

const participantOf = (result: BattleResult, subject: string | null): ParticipantOutcome | null =>
  subject === null ? null : (result.participants.find((p) => p.playerId === subject) ?? null)

const isDisconnected = (result: BattleResult, participant: ParticipantOutcome): boolean =>
  result.disconnected !== null &&
  result.disconnected.teamLabel === participant.teamLabel &&
  result.disconnected.seat === participant.seat

const standingText = (team: TeamStanding): TeamStandingText => ({
  teamLabel: team.teamLabel,
  text: `Vida restante ${String(team.remainingHealth)} / ${String(team.maxHealth)} (${String(team.lifePercent)} %)`,
  eliminated: team.eliminated,
})

const timeLimitDetail = (result: BattleResult): string | null => {
  if (result.tiebreak === 'LIFE_PERCENT') {
    return 'Ganó el equipo con mayor porcentaje de vida restante.'
  }

  if (result.tiebreak === 'ABSOLUTE_LIFE') {
    return 'Empataron en porcentaje de vida; ganó el equipo con más vida restante.'
  }

  return result.outcome === 'NO_WINNER'
    ? 'Empataron en porcentaje y en vida restante: no hay ganador.'
    : null
}

const causeFor = (
  result: BattleResult,
  participant: ParticipantOutcome | null,
  won: boolean,
): string => {
  if (result.reason === 'ELIMINATION') {
    if (participant === null) {
      return 'Todos los héroes de un equipo fueron eliminados.'
    }

    return won ? 'Derrotaste a todos los héroes rivales.' : 'Todos tus héroes fueron eliminados.'
  }

  if (result.reason === 'DISCONNECTION') {
    if (participant === null) {
      return 'Un jugador se desconectó y no volvió a tiempo.'
    }

    if (isDisconnected(result, participant)) {
      return 'Te desconectaste y no volviste a tiempo.'
    }

    if (!won) {
      return 'Un integrante de tu equipo se desconectó.'
    }

    return 'Tu rival se desconectó y no volvió a tiempo.'
  }

  return 'Se acabó el tiempo (6 minutos).'
}

const headlineFor = (
  result: BattleResult,
  participant: ParticipantOutcome | null,
): { tone: ResultTone; headline: string } => {
  if (participant === null) {
    if (result.outcome === 'NO_WINNER' || result.winnerTeamLabel === null) {
      return { tone: 'no-winner', headline: 'Sin ganador (empate)' }
    }

    return { tone: 'neutral', headline: `Ganó el equipo ${result.winnerTeamLabel}` }
  }

  if (participant.result === 'WON') {
    return { tone: 'won', headline: '¡Victoria!' }
  }

  if (participant.result === 'LOST') {
    return { tone: 'lost', headline: 'Derrota' }
  }

  return { tone: 'no-winner', headline: 'Sin ganador (empate)' }
}

export const describeResult = (
  result: BattleResult,
  subject: string | null,
): ResultPresentation => {
  const participant = participantOf(result, subject)
  const { tone, headline } = headlineFor(result, participant)
  const won = participant?.result === 'WON'

  return {
    tone,
    headline,
    cause: causeFor(result, participant, won),
    detail: result.reason === 'TIME_LIMIT' ? timeLimitDetail(result) : null,
    standings: result.teams.map(standingText),
  }
}

/** Nombre visible de un participante del resultado; una IA es "Oponente IA". */
export const participantOutcomeName = (participant: ParticipantOutcome): string =>
  participant.kind === 'AI'
    ? 'Oponente IA'
    : (participant.displayName ?? `Asiento ${String(participant.seat + 1)}`)

/**
 * "Ganador: Equipo B (Ana, Beto) · Perdedor: Equipo A (Carla)", con el equipo
 * ganador que publico Combat. `null` sin ganador (empate): el titular ya lo dice.
 */
export const winnerLine = (result: BattleResult): string | null => {
  if (result.winnerTeamLabel === null) {
    return null
  }

  const teamText = (label: string): string => {
    const names = result.participants
      .filter((participant) => participant.teamLabel === label)
      .map(participantOutcomeName)

    return names.length === 0 ? `Equipo ${label}` : `Equipo ${label} (${names.join(', ')})`
  }
  const loser = result.teams.find((team) => team.teamLabel !== result.winnerTeamLabel)?.teamLabel

  return loser === undefined
    ? `Ganador: ${teamText(result.winnerTeamLabel)}`
    : `Ganador: ${teamText(result.winnerTeamLabel)} · Perdedor: ${teamText(loser)}`
}
