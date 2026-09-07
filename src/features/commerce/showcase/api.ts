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
export const SHOWCASE_PAGE_SIZE = 12
const CATALOG_PAGE_SIZE = 16

export interface ShowcasePage {
  readonly items: readonly ShowcaseProduct[]
  readonly page: number
  readonly pageSize: typeof SHOWCASE_PAGE_SIZE
  readonly total: number
}
interface CatalogPage extends Omit<ShowcasePage, 'pageSize'> {
  readonly pageSize: typeof CATALOG_PAGE_SIZE
}

/** Serializa filtros de Catalog y el numero de pagina visible de la vitrina. */
export const showcaseQuery = (filters: ShowcaseFilters, page: number): string => {
  const query = new URLSearchParams({ page: String(page) })
  if (filters.term.trim() !== '') query.set('query', filters.term.trim())
  if (filters.type !== null) query.set('type', filters.type)
  if (filters.minPrice !== null) query.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== null) query.set('maxPrice', String(filters.maxPrice))
  if (filters.currency !== null) query.set('currency', filters.currency)
  return query.toString()
}
/** Adapta paginas visibles de 12 al contrato HTTP de 16 sin filtrar resultados. */
export const fetchShowcase = async (query: string, signal?: AbortSignal): Promise<ShowcasePage> => {
  signal?.throwIfAborted()
  const params = new URLSearchParams(query)
  const page = Number(params.get('page') ?? '1')
  const start = (page - 1) * SHOWCASE_PAGE_SIZE
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(start + SHOWCASE_PAGE_SIZE)
  ) {
    throw new RangeError('La pagina de la vitrina debe ser un entero positivo valido.')
  }

  const catalogPage = Math.floor(start / CATALOG_PAGE_SIZE) + 1
  const offset = start % CATALOG_PAGE_SIZE
  params.set('page', String(catalogPage))
  const first = await httpClient.get<CatalogPage>(`/v1/catalog/products?${params}`, signal)
  signal?.throwIfAborted()

  const firstCount = Math.min(SHOWCASE_PAGE_SIZE, CATALOG_PAGE_SIZE - offset)
  const items = first.items.slice(offset, offset + firstCount)
  if (firstCount < SHOWCASE_PAGE_SIZE && first.total > catalogPage * CATALOG_PAGE_SIZE) {
    params.set('page', String(catalogPage + 1))
    const second = await httpClient.get<CatalogPage>(`/v1/catalog/products?${params}`, signal)
    signal?.throwIfAborted()
    items.push(...second.items.slice(0, SHOWCASE_PAGE_SIZE - firstCount))
  }

  return { items, page, pageSize: SHOWCASE_PAGE_SIZE, total: first.total }
}
export const fetchProduct = (reference: string, signal?: AbortSignal): Promise<ShowcaseProduct> =>
  httpClient.get<ShowcaseProduct>(`/v1/catalog/products/${encodeURIComponent(reference)}`, signal)
