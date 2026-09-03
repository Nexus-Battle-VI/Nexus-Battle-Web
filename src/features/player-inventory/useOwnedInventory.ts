import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import {
  fetchOwnedItemDetail,
  fetchOwnedItems,
  type OwnedInventoryItemDetail,
  type OwnedInventoryPage,
  type ProductType,
} from './api'

/** Termino minimo para que la busqueda por nombre se envie al servicio (RF-27). */
export const MIN_SEARCH_LENGTH = 4

export interface OwnedInventoryParams {
  readonly page: number
  readonly term: string
  readonly type: ProductType | null
}

/**
 * Solo se envia `q` cuando el termino tiene 4 caracteres o mas: por debajo, la
 * pantalla se comporta como un listado normal y muestra una pista.
 */
export const effectiveSearch = (term: string): string => {
  const trimmed = term.trim()
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : ''
}

export const useOwnedInventory = (
  params: OwnedInventoryParams,
): UseQueryResult<OwnedInventoryPage> => {
  const q = effectiveSearch(params.term)

  return useQuery({
    queryKey: queryKeys.inventory.mine({ page: params.page, q, type: params.type }),
    queryFn: ({ signal }) =>
      fetchOwnedItems({ page: params.page, ...(q === '' ? {} : { q }), type: params.type }, signal),
    // Mantiene la pagina anterior visible mientras llega la siguiente: evita el
    // parpadeo a "vacio" al pasar de pagina o teclear en la busqueda.
    placeholderData: keepPreviousData,
  })
}

export const useOwnedItemDetail = (
  itemReference: string | null,
): UseQueryResult<OwnedInventoryItemDetail> =>
  useQuery({
    queryKey: queryKeys.inventory.mineItem(itemReference ?? ''),
    queryFn: ({ signal }) => fetchOwnedItemDetail(itemReference ?? '', signal),
    enabled: itemReference !== null && itemReference !== '',
  })
