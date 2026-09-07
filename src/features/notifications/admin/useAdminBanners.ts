import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { createBanner, fetchAdminBanners } from '../api'
import type { CreateBannerCommand } from '../contract'

/** Listado administrativo de banners (HU-38, Task #181). Sin editar/eliminar: el backend no los ofrece. */
export const useAdminBanners = () => {
  const query = useQuery({
    queryKey: queryKeys.notifications.adminBanners,
    queryFn: ({ signal }) => fetchAdminBanners(signal),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export const useCreateBanner = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (command: CreateBannerCommand) => createBanner(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.adminBanners })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.banners })
    },
  })
}
