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
