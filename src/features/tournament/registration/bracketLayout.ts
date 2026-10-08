import type { BracketSource, PublishedBracket } from './bracketApi'

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 108
export const COLUMN_STEP = 280
export const SIDE_PORTS = [39, 67] as const
export const RESULT_PORTS = { WINNER: 88, LOSER: 100 } as const
const ROW_STEP = 132
export type GraphMatch = Omit<PublishedBracket['matches'][number], 'status'> & {
  readonly status: string
  readonly winnerTeamId?: string | null
  readonly loserTeamId?: string | null
}
export const sourceLabel = (source: BracketSource): string =>
  source.kind === 'SEED'
    ? `Cupo ${String(source.position)}`
    : `${source.kind === 'WINNER' ? 'Ganador' : 'Perdedor'} de ${source.matchId}`
export interface NodePosition {
  readonly x: number
  readonly y: number
}
export interface BracketEdge {
  readonly from: string
  readonly to: string
  readonly side: 0 | 1
  readonly kind: 'WINNER' | 'LOSER'
  readonly path: string
  readonly consistent: boolean
}

/** Layout uses round/track and source relationships, never an E-number routing table. */
export function layoutBracket(matches: readonly GraphMatch[], track?: GraphMatch['track']) {
  const positions = new Map<string, NodePosition>()
  const ordered = matches
    .filter((m) => track === undefined || m.track === track)
    .sort((a, b) => a.round - b.round)
  const rounds = [...new Set(ordered.map((m) => m.round))].sort((a, b) => a - b)
  const mainRoots = ordered.filter(
    (m) => m.track === 'MAIN' && m.sources.every((s) => s.kind === 'SEED'),
  )
  const firstTop = 80
  const lowerTop = firstTop + Math.max(1, mainRoots.length) * ROW_STEP + 40
  const rootRows = new Map<string, number>()
  for (const track of ['MAIN', 'SECONDARY', 'FINAL'] as const) {
    const trackMatches = ordered.filter((m) => m.track === track)
    const firstRound = trackMatches[0]?.round
    trackMatches
      .filter((m) => m.round === firstRound)
      .forEach((m, index) => rootRows.set(m.id, index))
  }
  for (const match of ordered) {
    const sameTrack = match.sources.flatMap((source) => {
      if (source.kind === 'SEED') return []
      const prior = ordered.find((m) => m.id === source.matchId)
      const position = positions.get(source.matchId)
      return prior && position && (prior.track === match.track || match.track === 'FINAL')
        ? [position.y]
        : []
    })
    const y =
      sameTrack.length > 0
        ? sameTrack.reduce((a, b) => a + b, 0) / sameTrack.length
        : (track === undefined && match.track === 'SECONDARY' ? lowerTop : firstTop) +
          (rootRows.get(match.id) ?? 0) * ROW_STEP
    positions.set(match.id, { x: 16 + rounds.indexOf(match.round) * COLUMN_STEP, y })
  }
  const edges: BracketEdge[] = []
  const missingSources: string[] = []
  for (const match of ordered) {
    const target = positions.get(match.id)
    if (!target) continue
    match.sources.forEach((source, sideIndex) => {
      if (source.kind === 'SEED') return
      const origin = positions.get(source.matchId)
      const originMatch = matches.find((m) => m.id === source.matchId)
      if (!originMatch) {
        missingSources.push(`${source.matchId} → ${match.id}`)
        return
      }
      // An origin in another branch remains in the contract, not in this viewport.
      if (!origin) return
      const side = sideIndex as 0 | 1
      const destination =
        source.kind === 'WINNER' ? originMatch.destinations.winner : originMatch.destinations.loser
      const x1 = origin.x + NODE_WIDTH
      const y1 = origin.y + RESULT_PORTS[source.kind]
      const y2 = target.y + SIDE_PORTS[side]
      const channel = x1 + 16 + (edges.length % 4) * 10
      edges.push({
        from: source.matchId,
        to: match.id,
        side,
        kind: source.kind,
        path: `M ${String(x1)} ${String(y1)} H ${String(channel)} V ${String(y2)} H ${String(target.x)}`,
        consistent: destination?.matchId === match.id && destination.side === side,
      })
    })
  }
  return {
    positions,
    edges,
    missingSources,
    lowerTop,
    rounds,
    width: 32 + NODE_WIDTH + Math.max(0, rounds.length - 1) * COLUMN_STEP,
    height: 20 + NODE_HEIGHT + Math.max(52, ...[...positions.values()].map((p) => p.y)),
  }
}
