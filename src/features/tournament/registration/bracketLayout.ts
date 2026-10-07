import type { BracketSource, PublishedBracket } from './bracketApi'

export const NODE_WIDTH = 238
export const NODE_HEIGHT = 182
export const COLUMN_STEP = 350
export const SIDE_PORTS = [61, 108] as const
export const RESULT_PORTS = { WINNER: 145, LOSER: 167 } as const
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
export function layoutBracket(matches: readonly GraphMatch[]) {
  const positions = new Map<string, NodePosition>()
  const ordered = [...matches].sort((a, b) => a.round - b.round)
  const mainRoots = ordered.filter(
    (m) => m.track === 'MAIN' && m.sources.every((s) => s.kind === 'SEED'),
  )
  const lowerTop = 100 + Math.max(1, mainRoots.length) * 210 + 75
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
        : (match.track === 'SECONDARY' ? lowerTop : 100) + (rootRows.get(match.id) ?? 0) * 210
    positions.set(match.id, { x: 28 + (match.round - 1) * COLUMN_STEP, y })
  }
  const edges: BracketEdge[] = []
  const missingSources: string[] = []
  for (const match of ordered) {
    const target = positions.get(match.id)
    if (!target) continue
    match.sources.forEach((source, sideIndex) => {
      if (source.kind === 'SEED') return
      const origin = positions.get(source.matchId)
      const originMatch = ordered.find((m) => m.id === source.matchId)
      if (!origin || !originMatch) {
        missingSources.push(`${source.matchId} → ${match.id}`)
        return
      }
      const side = sideIndex as 0 | 1
      const destination =
        source.kind === 'WINNER' ? originMatch.destinations.winner : originMatch.destinations.loser
      const x1 = origin.x + NODE_WIDTH
      const y1 = origin.y + RESULT_PORTS[source.kind]
      const y2 = target.y + SIDE_PORTS[side]
      const channel = x1 + 24 + (edges.length % 5) * 13
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
    width: 56 + NODE_WIDTH + (Math.max(1, ...ordered.map((m) => m.round)) - 1) * COLUMN_STEP,
    height: 50 + NODE_HEIGHT + Math.max(100, ...[...positions.values()].map((p) => p.y)),
  }
}
