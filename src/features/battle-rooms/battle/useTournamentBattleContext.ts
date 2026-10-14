import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { httpClient } from '@/lib/http'
import { encounterApi } from '@/features/tournament/registration/encounterApi'

export interface TournamentBattleContext {
  readonly isTest?: boolean
  readonly tournamentId: string
  readonly matchId: string
  readonly bracketLabel?: string
}
/** El enlace lleva el contexto. Una entrada directa lo recupera de la sala autorizada. */
export const useTournamentBattleContext = (
  roomId: string | null,
  subject: string | null,
): TournamentBattleContext | null => {
  const location = useLocation()
  const state = location.state as { tournament?: TournamentBattleContext } | null
  const linked = state?.tournament
  const valid =
    linked &&
    typeof linked.tournamentId === 'string' &&
    linked.tournamentId !== '' &&
    typeof linked.matchId === 'string'
  const view = useQuery({
    queryKey: ['battle-tournament-context', subject, roomId],
    enabled: roomId !== null && subject !== null && !valid,
    retry: false,
    queryFn: async ({ signal }) => {
      if (roomId === null) return null
      const room = await httpClient.get<{
        id: string
        createdBy: string
        tournament?: { isTest?: boolean }
      }>(`/v1/combat/rooms/${encodeURIComponent(roomId)}`, signal)
      if (room.id !== roomId || !room.createdBy.startsWith('tournament:')) return null
      const id = room.createdBy.slice('tournament:'.length)
      const match = (await encounterApi.list(id)).find(
        (m) => m.tournamentId === id && m.combatRoomId === roomId,
      )
      return match
        ? {
            tournamentId: id,
            matchId: match.matchId,
            bracketLabel: match.bracketLabel,
            ...(room.tournament?.isTest ? { isTest: true } : {}),
          }
        : null
    },
  })
  return valid ? linked : (view.data ?? null)
}
