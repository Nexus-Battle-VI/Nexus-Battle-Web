import { httpClient } from '@/lib/http'

/**
 * Cliente de "Mi Inventario" (HU-27).
 *
 * Consume Player/Inventory, que a su vez compone la informacion vigente del
 * producto con Catalog. El frontend NO llama a Catalog por su cuenta: la
 * propiedad del inventario y el enriquecimiento se resuelven en un solo
 * contrato (`Web -> Player/Inventory -> Catalog`).
 *
 * Rating y comentarios no forman parte de esta pantalla: pertenecen a la ficha
 * de E-commerce/Subasta.
 */

/** Tipos canonicos de producto de Catalog. */
export const PRODUCT_TYPES = ['HEROE', 'HABILIDAD', 'ARMA', 'ARMADURA', 'ITEM', 'EPICA'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export interface CatalogProductSummary {
  readonly productId: string
  readonly sku: string
  readonly name: string
  readonly imageUrl: string
  readonly type: string
  readonly lifecycleStatus: string
}

export interface OwnedInventoryItem {
  readonly itemId: string
  readonly quantity: number
  /** `null` cuando Catalog no conoce la referencia o no respondio en un listado sin busqueda. */
  readonly product: CatalogProductSummary | null
}

export interface OwnedInventoryPage {
  readonly items: readonly OwnedInventoryItem[]
  readonly page: number
  readonly pageSize: number
  readonly totalItems: number
  readonly totalPages: number
}

export interface RealMoneyPrice {
  readonly amount: number
  readonly currency: string
}

export interface OwnedInventoryItemDetail {
  readonly itemId: string
  readonly quantity: number
  readonly product: {
    readonly productId: string
    readonly sku: string
    readonly name: string
    readonly imageUrl: string
    readonly description: string
    readonly type: string
    readonly lifecycleStatus: string
    readonly creditsPrice: number
    readonly premium: boolean
    readonly realMoneyPrice: RealMoneyPrice | null
    readonly attributes: unknown
  }
}

export interface OwnedInventoryQuery {
  readonly page: number
  /** Termino de busqueda. La regla de "desde 4 caracteres" la aplica quien llama. */
  readonly q?: string
  readonly type?: ProductType | null
}

const buildQueryString = (query: OwnedInventoryQuery): string => {
  const params = new URLSearchParams()
  params.set('page', String(query.page))

  if (query.q !== undefined && query.q.length > 0) {
    params.set('q', query.q)
  }

  if (query.type !== undefined && query.type !== null) {
    params.set('type', query.type)
  }

  return params.toString()
}

export const fetchOwnedItems = (
  query: OwnedInventoryQuery,
  signal?: AbortSignal,
): Promise<OwnedInventoryPage> =>
  httpClient.get<OwnedInventoryPage>(`/inventories/me/items?${buildQueryString(query)}`, signal)

export const fetchOwnedItemDetail = (
  itemReference: string,
  signal?: AbortSignal,
): Promise<OwnedInventoryItemDetail> =>
  httpClient.get<OwnedInventoryItemDetail>(
    `/inventories/me/items/${encodeURIComponent(itemReference)}`,
    signal,
  )
