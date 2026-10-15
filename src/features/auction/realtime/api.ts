import { HttpError, httpClient } from '@/lib/http'

/**
 * `POST /v1/auctions/realtime/tickets` (EN-034, ADR-024): ticket de un solo uso para abrir el
 * WebSocket de Subasta. El JWT viaja en la cabecera, como en cualquier otra peticion
 * (`httpClient`); el ticket devuelto es opaco y caduca a los 30 s. Sin cuerpo: nadie puede pedir
 * un ticket para otro jugador.
 */
export const issueAuctionRealtimeTicket = async (): Promise<string> => {
  const response = await httpClient.post<{ readonly ticket: string }>(
    '/v1/auctions/realtime/tickets',
  )

  return response.ticket
}

/**
 * Un `404` al pedir el ticket significa que Auction tiene el realtime apagado
 * (`AUCTION_REALTIME_ENABLED=false`, la reversion de ADR-024): la ruta no existe. No es un fallo
 * transitorio, asi que no se reintenta; la pantalla sigue funcionando por HTTP, como siempre.
 */
export const isAuctionRealtimeUnavailable = (error: unknown): boolean =>
  error instanceof HttpError && error.isNotFound
