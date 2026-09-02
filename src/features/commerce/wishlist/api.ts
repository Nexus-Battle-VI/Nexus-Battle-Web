import { httpClient } from '@/lib/http'

/**
 * Estado de una referencia respecto a quien realiza la peticion.
 *
 * `enDeseos` y `adquirido` son **conceptos distintos**, y la historia insiste
 * en ello: anadir a deseos no marca nada como adquirido. Por eso viajan como
 * dos campos y no como un unico estado con varios valores, que obligaria a
 * elegir cual gana cuando ambos son ciertos.
 *
 * `adquirido` lo **deriva el servicio** de los pedidos confirmados del
 * cliente. La interfaz no lo calcula ni lo guarda: si lo hiciera, tendria que
 * saber que cuenta como compra, y esa regla vive en Commerce.
 */
export interface WishlistItem {
  readonly sku: string
  readonly enDeseos: boolean
  readonly adquirido: boolean
}

/** Referencias deseadas, cada una con su estado de adquisicion. */
export const fetchWishlist = (signal?: AbortSignal): Promise<WishlistItem[]> =>
  httpClient.get<WishlistItem[]>('/wishlist', signal)

/** Anadir es idempotente: hacerlo dos veces no falla ni duplica. */
export const addToWishlist = (sku: string): Promise<WishlistItem> =>
  httpClient.post<WishlistItem>(`/wishlist/${encodeURIComponent(sku)}`)

export const removeFromWishlist = (sku: string): Promise<WishlistItem> =>
  httpClient.delete<WishlistItem>(`/wishlist/${encodeURIComponent(sku)}`)
