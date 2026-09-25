import { httpClient, HttpError } from '@/lib/http'
import { i18n } from '@/shared/i18n/i18n'
import type { WatchlistResponse } from './contract'

/** Consulta la lista privada; Auction deduce al jugador desde su JWT. */
export const fetchWatchlist = (signal?: AbortSignal): Promise<WatchlistResponse> =>
  httpClient.get('/v1/auctions/watchlist', signal)

/** Agrega una subasta activa a la lista privada del jugador autenticado. */
export const followAuction = (auctionId: string): Promise<unknown> =>
  httpClient.post('/v1/auctions/watchlist', { auctionId })

/** Elimina el seguimiento sin afectar la subasta ni sus pujas. */
export const unfollowAuction = (auctionId: string): Promise<unknown> =>
  httpClient.delete(`/v1/auctions/watchlist/${encodeURIComponent(auctionId)}`)

/** Traduce el rechazo de `followAuction` (HU-68), compartido entre las pantallas que ofrecen "Seguir". */
export const describeFollowError = (error: unknown): string => {
  if (error instanceof HttpError && error.status === 409) return i18n.t('auction:follow.already')
  if (error instanceof HttpError && (error.status === 404 || error.status === 422))
    return i18n.t('auction:follow.unavailable')
  return i18n.t('auction:follow.failed')
}
