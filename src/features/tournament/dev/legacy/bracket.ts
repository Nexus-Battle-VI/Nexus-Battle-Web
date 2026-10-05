import type { MatchId, MatchSlot, TournamentMatch } from './model'

const seed = (position: number): MatchSlot => ({ kind: 'SEED', position })
const winner = (matchId: MatchId): MatchSlot => ({ kind: 'WINNER', matchId })
const loser = (matchId: MatchId): MatchSlot => ({ kind: 'LOSER', matchId })

/** Figure 2, section 7.9 of proyecto_integrador_2.pdf. One final, no invented reset. */
export const BRACKET_DEFINITION: readonly Pick<
  TournamentMatch,
  'id' | 'track' | 'round' | 'sources'
>[] = [
  { id: 'E1', track: 'MAIN', round: 1, sources: [seed(1), seed(2)] },
  { id: 'E2', track: 'MAIN', round: 1, sources: [seed(3), seed(4)] },
  { id: 'E3', track: 'MAIN', round: 1, sources: [seed(5), seed(6)] },
  { id: 'E4', track: 'MAIN', round: 1, sources: [seed(7), seed(8)] },
  { id: 'E5', track: 'MAIN', round: 2, sources: [winner('E1'), winner('E2')] },
  { id: 'E6', track: 'MAIN', round: 2, sources: [winner('E3'), winner('E4')] },
  { id: 'E7', track: 'SECONDARY', round: 1, sources: [loser('E1'), loser('E2')] },
  { id: 'E8', track: 'SECONDARY', round: 1, sources: [loser('E3'), loser('E4')] },
  { id: 'E9', track: 'SECONDARY', round: 2, sources: [loser('E6'), winner('E7')] },
  { id: 'E10', track: 'SECONDARY', round: 2, sources: [loser('E5'), winner('E8')] },
  { id: 'E11', track: 'MAIN', round: 3, sources: [winner('E5'), winner('E6')] },
  { id: 'E12', track: 'SECONDARY', round: 3, sources: [winner('E9'), winner('E10')] },
  { id: 'E13', track: 'SECONDARY', round: 4, sources: [loser('E11'), winner('E12')] },
  { id: 'Final', track: 'FINAL', round: 4, sources: [winner('E11'), winner('E13')] },
]

export const slotLabel = (slot: MatchSlot): string => {
  if (slot.kind === 'SEED') return `Cupo ${String(slot.position)}`
  return `${slot.kind === 'WINNER' ? 'Ganador' : 'Perdedor'} de ${slot.matchId}`
}

const resolveSlot = (
  slot: MatchSlot,
  seeds: readonly string[],
  matches: readonly TournamentMatch[],
): string | null => {
  if (slot.kind === 'SEED') return seeds[slot.position - 1] ?? null
  const source = matches.find((match) => match.id === slot.matchId)
  return (slot.kind === 'WINNER' ? source?.winnerId : source?.loserId) ?? null
}

export const resolveBracket = (
  seeds: readonly string[],
  previous: readonly TournamentMatch[] = [],
): readonly TournamentMatch[] =>
  BRACKET_DEFINITION.map((definition) => {
    const existing = previous.find((match) => match.id === definition.id)
    const teamIds = definition.sources.map((slot) => resolveSlot(slot, seeds, previous))
    const left = teamIds[0] ?? null
    const right = teamIds[1] ?? null
    return {
      ...definition,
      teamIds: [left, right],
      status:
        existing?.status === 'IN_PROGRESS' || existing?.status === 'FINISHED'
          ? existing.status
          : left !== null && right !== null
            ? 'READY'
            : 'WAITING',
      battleId: existing?.battleId ?? null,
      winnerId: existing?.winnerId ?? null,
      loserId: existing?.loserId ?? null,
    }
  })
