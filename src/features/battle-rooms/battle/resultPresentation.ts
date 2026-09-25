import type { BattleResult, ParticipantOutcome, TeamStanding } from './types'
import { i18n } from '@/shared/i18n/i18n'

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
  text: i18n.t('battle:result.standing', {
    remaining: String(team.remainingHealth),
    max: String(team.maxHealth),
    percent: String(team.lifePercent),
  }),
  eliminated: team.eliminated,
})

const timeLimitDetail = (result: BattleResult): string | null => {
  if (result.tiebreak === 'LIFE_PERCENT') {
    return i18n.t('battle:result.tiebreak.LIFE_PERCENT')
  }

  if (result.tiebreak === 'ABSOLUTE_LIFE') {
    return i18n.t('battle:result.tiebreak.ABSOLUTE_LIFE')
  }

  return result.outcome === 'NO_WINNER' ? i18n.t('battle:result.tiebreak.none') : null
}

const causeFor = (
  result: BattleResult,
  participant: ParticipantOutcome | null,
  won: boolean,
): string => {
  if (result.reason === 'ELIMINATION') {
    if (participant === null) {
      return i18n.t('battle:result.cause.eliminationAll')
    }

    return won
      ? i18n.t('battle:result.cause.eliminationWon')
      : i18n.t('battle:result.cause.eliminationLost')
  }

  if (result.reason === 'DISCONNECTION') {
    if (participant === null) {
      return i18n.t('battle:result.cause.disconnectAll')
    }

    if (isDisconnected(result, participant)) {
      return i18n.t('battle:result.cause.disconnectYou')
    }

    if (!won) {
      return i18n.t('battle:result.cause.disconnectTeam')
    }

    return i18n.t('battle:result.cause.disconnectRival')
  }

  return i18n.t('battle:result.cause.timeLimit')
}

const headlineFor = (
  result: BattleResult,
  participant: ParticipantOutcome | null,
): { tone: ResultTone; headline: string } => {
  if (participant === null) {
    if (result.outcome === 'NO_WINNER' || result.winnerTeamLabel === null) {
      return { tone: 'no-winner', headline: i18n.t('battle:result.noWinner') }
    }

    return {
      tone: 'neutral',
      headline: i18n.t('battle:result.teamWon', { team: result.winnerTeamLabel }),
    }
  }

  if (participant.result === 'WON') {
    return { tone: 'won', headline: i18n.t('battle:result.victory') }
  }

  if (participant.result === 'LOST') {
    return { tone: 'lost', headline: i18n.t('battle:result.defeat') }
  }

  return { tone: 'no-winner', headline: i18n.t('battle:result.noWinner') }
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
    ? i18n.t('battle:ai')
    : (participant.displayName ?? i18n.t('battle:seat', { seat: String(participant.seat + 1) }))

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

    return names.length === 0
      ? i18n.t('battle:team', { team: label })
      : i18n.t('battle:result.teamNames', { team: label, names: names.join(', ') })
  }
  const loser = result.teams.find((team) => team.teamLabel !== result.winnerTeamLabel)?.teamLabel

  return loser === undefined
    ? i18n.t('battle:result.winner', { winner: teamText(result.winnerTeamLabel) })
    : i18n.t('battle:result.winnerLoser', {
        winner: teamText(result.winnerTeamLabel),
        loser: teamText(loser),
      })
}
