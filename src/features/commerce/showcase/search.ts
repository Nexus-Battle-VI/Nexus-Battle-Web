import type { ShowcaseProduct } from './api'

/** RF-57 fija dieciseis productos por pagina. */
export const PAGE_SIZE = 16

export interface ShowcaseFilters {
  /** Termino libre. Se busca en nombre, tipo y precio. */
  readonly term: string
  /** Limite inferior del rango, en la unidad minima. `null` = sin limite. */
  readonly minPrice: number | null
  readonly maxPrice: number | null
  /** Tipo de producto exacto. `null` = todos. */
  readonly category: string | null
}

export const NO_FILTERS: ShowcaseFilters = {
  term: '',
  minPrice: null,
  maxPrice: null,
  category: null,
}

/**
 * Normaliza para comparar: sin mayusculas y sin acentos.
 *
 * Sin quitar acentos, buscar «pocion» no encontraria «poción», que es
 * exactamente lo que alguien escribe cuando teclea deprisa.
 */
const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '')

/**
 * Texto sobre el que busca el termino libre.
 *
 * Incluye el precio porque CA-07 lo exige de forma expresa: «cuando el Cliente
 * realiza una busqueda utilizando dicho precio, el producto debe poder
 * localizarse». Se incluyen dos formas —la unidad minima tal cual y la unidad
 * mayor— porque quien busca «150» piensa en pesos, no en centavos.
 */
const searchableText = (product: ShowcaseProduct): string =>
  normalize(
    [
      product.name,
      product.category,
      String(product.price.amount),
      String(product.price.amount / 100),
      product.price.currency,
    ].join(' '),
  )

const matchesTerm = (product: ShowcaseProduct, term: string): boolean => {
  const needle = normalize(term.trim())

  // Un termino vacio no filtra nada. No se impone un minimo de caracteres:
  // RF-57 no lo documenta y hacerlo sorprenderia a quien busca «as».
  return needle === '' || searchableText(product).includes(needle)
}

const matchesPrice = (product: ShowcaseProduct, filters: ShowcaseFilters): boolean => {
  const { amount } = product.price

  if (filters.minPrice !== null && amount < filters.minPrice) {
    return false
  }

  return !(filters.maxPrice !== null && amount > filters.maxPrice)
}

const matchesCategory = (product: ShowcaseProduct, category: string | null): boolean =>
  category === null || product.category === category

/**
 * Aplica termino y filtros a la vez.
 *
 * CA-11: cada producto del resultado debe cumplir el termino **y todos** los
 * filtros activos. Por eso se encadenan con conjuncion y no se aplica solo el
 * ultimo criterio elegido.
 */
export const applyFilters = (
  products: readonly ShowcaseProduct[],
  filters: ShowcaseFilters,
): readonly ShowcaseProduct[] =>
  products.filter(
    (product) =>
      matchesTerm(product, filters.term) &&
      matchesPrice(product, filters) &&
      matchesCategory(product, filters.category),
  )

export interface Page<T> {
  readonly items: readonly T[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
}

/**
 * Reparte en paginas de dieciseis.
 *
 * La pagina pedida se acota al rango disponible: si se filtra estando en la
 * pagina 3 y el resultado ya no llega a tantas paginas, se muestra la ultima
 * existente en lugar de una pagina vacia que parece un fallo.
 */
export const paginate = <T>(items: readonly T[], page: number): Page<T> => {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * PAGE_SIZE

  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: current,
    pageCount,
    total: items.length,
  }
}

/** Tipos presentes, para ofrecer solo los que existen. */
export const categoriesOf = (products: readonly ShowcaseProduct[]): readonly string[] =>
  [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b))
