import type { TournamentBattleContext } from './useTournamentBattleContext'

// Solo recuerda que Combat ya mostró un resultado; no calcula ganadores ni avance.
const seen = new Set<string>()
const key = (subject: string, context: TournamentBattleContext): string =>
  JSON.stringify(['tournament-battle-result', subject, context.tournamentId, context.matchId])

export const rememberTournamentBattleResult = (
  subject: string,
  context: TournamentBattleContext,
): void => {
  const storageKey = key(subject, context)
  seen.add(storageKey)
  try {
    sessionStorage.setItem(storageKey, 'seen')
  } catch {
    // La memoria de esta pestaña conserva el resultado si el almacenamiento está bloqueado.
    return
  }
}

export const hasTournamentBattleResult = (
  subject: string,
  context: TournamentBattleContext,
): boolean => {
  const storageKey = key(subject, context)
  if (seen.has(storageKey)) return true
  try {
    return sessionStorage.getItem(storageKey) === 'seen'
  } catch {
    return false
  }
}
