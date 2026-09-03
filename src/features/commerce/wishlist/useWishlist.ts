import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { addToWishlist, fetchWishlistItem, removeFromWishlist } from './api'

/** Consulta cada referencia visible, incluso si no pertenece a la lista de deseos. */
export const useWishlist = (references: readonly string[]) => {
  const queryClient = useQueryClient()
  const subject = useSession((state) => state.subject)
  const key = queryKeys.commerce.wishlist(subject)
  const unique = [...new Set(references)].sort()
  const query = useQuery({
    queryKey: [...key, unique.join(',')],
    queryFn: ({ signal }) =>
      Promise.all(unique.map((reference) => fetchWishlistItem(reference, signal))),
    enabled: unique.length > 0,
  })
  const items = query.data ?? []
  const find = (reference: string) =>
    items.find((item) => (item.productId ?? item.sku) === reference || item.sku === reference)
  const mutation = useMutation({
    mutationFn: (reference: string) =>
      find(reference)?.enDeseos === true ? removeFromWishlist(reference) : addToWishlist(reference),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    isWished: (reference: string) => find(reference)?.enDeseos === true,
    isOwned: (reference: string) => find(reference)?.adquirido === true,
    toggle: mutation.mutate,
    busySku: mutation.isPending ? mutation.variables : null,
    mutationError: mutation.error,
  }
}
