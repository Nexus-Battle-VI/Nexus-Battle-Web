import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { fetchOwnedItems, type OwnedInventoryItem } from '@/features/player-inventory/api'
import { queryKeys } from '@/shared/query-keys'

const isPublishable = (item: OwnedInventoryItem): boolean =>
  item.quantity > 0 &&
  item.product !== null &&
  item.product.lifecycleStatus === 'ACTIVE' &&
  !item.product.premium

/**
 * La publicación no es el visor paginado de inventario: debe poder seleccionar
 * cualquier producto propio elegible. Primero se conoce totalPages y después se
 * solicita el resto en paralelo; itemId es la identidad de la tenencia.
 */
export const useAuctionPublishableInventory = (): UseQueryResult<readonly OwnedInventoryItem[]> =>
  useQuery({
    queryKey: queryKeys.inventory.auctionPublishable,
    queryFn: async ({ signal }) => {
      const firstPage = await fetchOwnedItems({ page: 1 }, signal)
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
          fetchOwnedItems({ page: index + 2 }, signal),
        ),
      )
      const uniqueItems = new Map<string, OwnedInventoryItem>()

      for (const item of [firstPage, ...remainingPages].flatMap((page) => page.items)) {
        uniqueItems.set(item.itemId, item)
      }

      return [...uniqueItems.values()].filter(isPublishable)
    },
  })
