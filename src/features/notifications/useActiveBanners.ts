import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { fetchActiveBanners } from './api'

/**
 * Banners vigentes para la vista principal (HU-38, Task #185).
 *
 * El backend ya filtra por `publishAt`/`expiresAt`: Web NUNCA vuelve a
 * comparar fechas, solo presenta lo que llega.
 */
export const useActiveBanners = () => {
  const query = useQuery({
    queryKey: queryKeys.notifications.banners,
    queryFn: ({ signal }) => fetchActiveBanners(signal),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
