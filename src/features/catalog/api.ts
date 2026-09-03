import { httpClient } from '@/lib/http'

export interface ProductMoney {
  readonly amount: number
  readonly currency: string
}

export interface Product {
  readonly sku: string
  readonly name: string
  readonly category: string
  readonly price: ProductMoney
  readonly status: string
}

export const fetchProducts = (
  category: string | null,
  signal?: AbortSignal,
): Promise<Product[]> => {
  const query =
    category === null || category === '' ? '' : `?category=${encodeURIComponent(category)}`

  return httpClient.get<Product[]>(`/products${query}`, signal)
}

export const fetchProduct = (sku: string, signal?: AbortSignal): Promise<Product> =>
  httpClient.get<Product>(`/products/${encodeURIComponent(sku)}`, signal)

/**
 * Producto CANÓNICO (ADR-013), distinto del `Product` heredado de arriba.
 *
 * `averageRating`/`reviewCount` los calcula Community y los conserva Catalog
 * (HU-40, CA-03): esta pantalla nunca los calcula, solo los muestra tal cual
 * llegan.
 */
export interface CanonicalProduct {
  readonly productId: string
  readonly sku: string
  readonly name: string
  readonly description: string
  readonly imageUrl: string
  readonly type: string
  readonly lifecycleStatus: string
  readonly creditsPrice: number
  readonly premium: boolean
  readonly realMoneyPrice: ProductMoney | null
  readonly averageRating: number | null
  readonly reviewCount: number
}

/** `GET /api/v1/catalog/products/:reference`, público: acepta productId (UUID) o sku. */
export const fetchCanonicalProduct = (
  reference: string,
  signal?: AbortSignal,
): Promise<CanonicalProduct> =>
  httpClient.get<CanonicalProduct>(`/v1/catalog/products/${encodeURIComponent(reference)}`, signal)
