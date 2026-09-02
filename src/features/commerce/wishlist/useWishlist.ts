import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { addToWishlist, fetchWishlist, removeFromWishlist, type WishlistItem } from './api'

export interface WishlistState {
  readonly items: readonly WishlistItem[]
  readonly isLoading: boolean
  readonly error: unknown
  /** `true` si la referencia esta en la lista de deseos. */
  readonly isWished: (sku: string) => boolean
  /** `true` si el cliente ya adquirio la referencia. */
  readonly isOwned: (sku: string) => boolean
  readonly toggle: (sku: string) => void
  readonly busySku: string | null
  readonly mutationError: unknown
}

/**
 * Lista de deseos y marcadores de adquirido.
 *
 * Se consulta **una vez** y se resuelve por referencia en memoria, en lugar de
 * pedir el estado de cada producto de la vitrina: dieciseis productos por
 * pagina significarian dieciseis peticiones para pintar una sola pantalla.
 *
 * Ojo con una consecuencia de como responde el servicio: `GET /api/wishlist`
 * devuelve **solo las referencias deseadas**. Una referencia adquirida que no
 * este en deseos no aparece en esa lista, asi que `isOwned` no puede afirmar
 * nada sobre ella. Se declara aqui porque es justo el limite de lo que esta
 * interfaz puede saber sin una peticion por producto.
 */
export const useWishlist = (): WishlistState => {
  const queryClient = useQueryClient()
  const key = queryKeys.commerce.wishlist

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchWishlist(signal),
  })

  const items = query.data ?? []
  const wished = new Set(items.filter((item) => item.enDeseos).map((item) => item.sku))
  const owned = new Set(items.filter((item) => item.adquirido).map((item) => item.sku))

  const mutation = useMutation({
    mutationFn: (sku: string) => (wished.has(sku) ? removeFromWishlist(sku) : addToWishlist(sku)),
    onSuccess: () => {
      // Se reconsulta en vez de escribir la respuesta en la cache: la
      // respuesta describe una sola referencia, y lo que la vitrina necesita
      // es la lista completa.
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    isWished: (sku) => wished.has(sku),
    isOwned: (sku) => owned.has(sku),
    toggle: mutation.mutate,
    busySku: mutation.isPending ? mutation.variables : null,
    mutationError: mutation.error,
  }
}
