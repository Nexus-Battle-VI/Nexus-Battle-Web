import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { fetchModelVersions, startModelTraining } from './api'

export const useModelVersions = () => {
  const query = useQuery({
    queryKey: queryKeys.admin.chatbotModels,
    queryFn: ({ signal }) => fetchModelVersions(signal),
  })

  return {
    versions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export const useStartModelTraining = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => startModelTraining(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.chatbotModels })
    },
  })
}
