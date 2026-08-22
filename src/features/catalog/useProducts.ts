import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { fetchProducts, type Product } from './api'

export const useProducts = (category: string | null): UseQueryResult<Product[]> =>
  useQuery({
    queryKey: queryKeys.catalog.byCategory(category),
    queryFn: ({ signal }) => fetchProducts(category, signal),
  })
