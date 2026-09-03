import { httpClient } from '@/lib/http'

export const PRODUCT_TYPES = ['HEROE', 'HABILIDAD', 'ARMA', 'ARMADURA', 'ITEM', 'EPICA'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]
export const PRODUCT_TYPE_LABELS: Readonly<Record<ProductType, string>> = {
  HEROE: 'Héroe',
  HABILIDAD: 'Habilidad',
  ARMA: 'Arma',
  ARMADURA: 'Armadura',
  ITEM: 'Ítem',
  EPICA: 'Épica',
}
export type Currency = 'COP' | 'USD' | 'EUR'
export interface ShowcaseMoney {
  readonly amount: number
  readonly currency: Currency
}

/** DTO canonico de Catalog; los creditos no son unidades menores de dinero. */
export interface ShowcaseProduct {
  readonly productId: string
  readonly sku: string
  readonly name: string
  readonly imageUrl: string
  readonly description: string
  readonly type: ProductType
  readonly attributes: {
    readonly schemaVersion: string
    readonly values: Readonly<Record<string, unknown>>
  }
  readonly printRun: number
  readonly printRunMode: 'UNIQUE' | 'LIMITED' | 'INFINITE'
  readonly availableUnits: number | null
  readonly lifecycleStatus: 'ACTIVE' | 'SUSPENDED'
  readonly creditsPrice: number
  readonly premium: boolean
  readonly realMoneyPrice: ShowcaseMoney | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly version: number
}
export interface ShowcaseFilters {
  readonly term: string
  readonly type: string | null
  readonly minPrice: number | null
  readonly maxPrice: number | null
  readonly currency: Currency | null
}
export const NO_FILTERS: ShowcaseFilters = {
  term: '',
  type: null,
  minPrice: null,
  maxPrice: null,
  currency: null,
}
export interface ShowcasePage {
  readonly items: readonly ShowcaseProduct[]
  readonly page: number
  readonly pageSize: 16
  readonly total: number
}
/** Solo serializa la consulta; Catalog valida, busca, filtra y pagina. */
export const showcaseQuery = (filters: ShowcaseFilters, page: number): string => {
  const query = new URLSearchParams({ page: String(page) })
  if (filters.term.trim() !== '') query.set('query', filters.term.trim())
  if (filters.type !== null) query.set('type', filters.type)
  if (filters.minPrice !== null) query.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== null) query.set('maxPrice', String(filters.maxPrice))
  if (filters.currency !== null) query.set('currency', filters.currency)
  return query.toString()
}
export const fetchShowcase = (query: string, signal?: AbortSignal): Promise<ShowcasePage> =>
  httpClient.get<ShowcasePage>(`/v1/catalog/products?${query}`, signal)
export const fetchProduct = (reference: string, signal?: AbortSignal): Promise<ShowcaseProduct> =>
  httpClient.get<ShowcaseProduct>(`/v1/catalog/products/${encodeURIComponent(reference)}`, signal)
