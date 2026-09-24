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

/**
 * Tipos que el dominio de E-commerce puede comercializar (PDF §7.2.2 +
 * aclaracion del PO 2026-09-24; ver "Elegibilidad de comercializacion premium"
 * en `docs/contracts/ecommerce-integration-v1.md` de Infrastructure). `ITEM` y
 * `EPICA` siguen existiendo en Catalog/Player-Inventory/Missions -la epica se
 * obtiene por Mision/Master, no por compra- pero nunca son candidatos de
 * compra: la vitrina no debe ofrecerlos ni como filtro ni como tarjeta.
 *
 * La autoridad de esta regla es Commerce, no esta constante: aqui solo se usa
 * para no listar dos tipos que el propio dominio del E-commerce nunca vende,
 * con el campo `type` que Catalog ya entrega por producto.
 */
export const SHOWCASE_PRODUCT_TYPES = [
  'HEROE',
  'HABILIDAD',
  'ARMA',
  'ARMADURA',
] as const satisfies readonly ProductType[]
export type ShowcaseProductType = (typeof SHOWCASE_PRODUCT_TYPES)[number]
const SHOWCASE_TYPE_SET = new Set<ProductType>(SHOWCASE_PRODUCT_TYPES)
/** `true` si Catalog marca `type` como comercializable en la vitrina de E-commerce. */
export const isShowcaseType = (type: ProductType): boolean => SHOWCASE_TYPE_SET.has(type)
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

  // Catalog solo admite un valor en `type` (confirmado por auditoria) y no
  // filtra por `premium`, asi que no hay forma de pedirle de una sola vez "los
  // 4 tipos comercializables": se excluyen aqui ITEM y EPICA, que el dominio
  // del E-commerce nunca vende (ver `isShowcaseType`). `total`/`pageSize`
  // siguen siendo los que reporta Catalog (incluyen ITEM/EPICA), asi que una
  // pagina visible puede traer menos de `SHOWCASE_PAGE_SIZE` tarjetas cuando
  // el lote traia productos no comercializables; no es una segunda fuente de
  // verdad del precio/elegibilidad, solo evita listar tipos que este dominio
  // nunca ofrece.
  const visible = items.filter((item) => isShowcaseType(item.type))

  return { items: visible, page, pageSize: SHOWCASE_PAGE_SIZE, total: first.total }
}
export const fetchProduct = (reference: string, signal?: AbortSignal): Promise<ShowcaseProduct> =>
  httpClient.get<ShowcaseProduct>(`/v1/catalog/products/${encodeURIComponent(reference)}`, signal)
