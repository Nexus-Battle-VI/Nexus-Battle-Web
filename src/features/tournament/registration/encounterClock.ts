import { useEffect, useState } from 'react'
import {
  createServerClock,
  formatRemaining,
  monotonicNow,
  remainingMs,
  type ServerClock,
} from '@/features/battle-rooms/battle/battleClock'
import type { MatchSummary } from './encounterApi'

export type TimedMatch = MatchSummary & { readonly displayClock: ServerClock | null }
/** Sample at response reception, using a monotonic clock. Client wall time is irrelevant. */
export const sampleMatches = (matches: readonly MatchSummary[]): readonly TimedMatch[] => {
  const received = monotonicNow()
  return matches.map((match) => ({
    ...match,
    displayClock: match.serverNow ? createServerClock(match.serverNow, received) : null,
  }))
}
export const useEncounterClock = (clock: ServerClock | null) => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (clock === null) return
    const interval = window.setInterval(() => {
      setTick((current) => current + 1)
    }, 250)
    return () => {
      window.clearInterval(interval)
    }
  }, [clock])
  // The tick requests a render; the monotonic reading supplies elapsed time.
  void tick
  const now = monotonicNow()
  const remaining = (deadline?: string): number | null =>
    clock && deadline && Number.isFinite(Date.parse(deadline))
      ? remainingMs(deadline, clock, now)
      : null
  const untilClose = remaining
  const within = (match: MatchSummary): boolean => {
    if (!clock || !match.acceptanceOpensAt || !match.acceptanceClosesAt) return false
    const serverNow = clock.serverAtSyncMs + monotonicNow() - clock.monotonicAtSyncMs
    return (
      Number.isFinite(Date.parse(match.acceptanceOpensAt)) &&
      serverNow >= Date.parse(match.acceptanceOpensAt) &&
      serverNow < Date.parse(match.acceptanceClosesAt)
    )
  }
  return { remaining: untilClose, within, format: formatRemaining }
}
