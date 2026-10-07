import { httpClient } from '@/lib/http'
import type { PublishedBracket } from './bracketApi'

export interface Champion {
  readonly teamId: string
  readonly teamName: string
  readonly memberIds: readonly string[]
  readonly heroes: readonly { readonly playerId: string; readonly heroId: string }[]
  readonly finalEncounterId: string
  readonly finalRoomId: string | null
  readonly declaredAt: string
}
export interface ProgressBracket extends Omit<PublishedBracket, 'matches'> {
  readonly matches: readonly (Omit<PublishedBracket['matches'][number], 'status'> & {
    readonly status: 'WAITING' | 'READY' | 'FINISHED' | 'RESOLUTION_REQUIRED'
    readonly winnerTeamId: string | null
    readonly loserTeamId: string | null
  })[]
}
export interface ProgressView {
  readonly bracket: ProgressBracket | null
  readonly champion: Champion | null
  readonly eliminatedTeamIds: readonly string[]
}
export interface ProgressApi {
  view(id: string, signal?: AbortSignal): Promise<ProgressView>
}
export const progressApi: ProgressApi = {
  view: async (id, signal) => {
    const result = await httpClient.get<ProgressView>(
      `/v1/tournaments/${encodeURIComponent(id)}/progress`,
      signal,
    )
    if (result.bracket !== null && result.bracket.tournamentId !== id)
      throw new Error('El progreso recibido pertenece a otro torneo.')
    return result
  },
}
