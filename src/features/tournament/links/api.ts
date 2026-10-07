import { httpClient } from '@/lib/http'
export interface TournamentLinks {
  readonly tournamentId: string
  readonly liveUrl: string | null
  readonly youtubeArchiveUrl: string | null
  readonly revision: number
  readonly updatedAt: string | null
}
export interface SaveTournamentLinks {
  readonly liveUrl: string | null
  readonly youtubeArchiveUrl: string | null
  readonly expectedRevision: number
}
export interface TournamentLinksApi {
  view: (id: string, signal?: AbortSignal) => Promise<TournamentLinks>
  save: (id: string, command: SaveTournamentLinks) => Promise<TournamentLinks>
}
export const tournamentLinksApi: TournamentLinksApi = {
  view: (id, signal) => httpClient.get(`/v1/tournaments/${encodeURIComponent(id)}/links`, signal),
  save: (id, body) =>
    httpClient.request(`/v1/tournaments/admin/${encodeURIComponent(id)}/links`, {
      method: 'PUT',
      body,
    }),
}
