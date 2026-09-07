import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { fetchCatalogNotificationHistory } from './api'

/** Historial completo de novedades del catalogo (HU-38). No marca nada como leido. */
export const useCatalogNotificationHistory = () => {
  const subject = useSession((state) => state.subject)

  const query = useQuery({
    queryKey: queryKeys.notifications.history(subject),
    queryFn: ({ signal }) => fetchCatalogNotificationHistory(signal),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
