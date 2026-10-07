import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { fetchAnalytics, fetchModelVersions, startModelTraining } from './api'

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

export const useAnalytics = (from: string, to: string) => {
  const query = useQuery({
    queryKey: [...queryKeys.admin.chatbotAnalytics, from, to],
    queryFn: ({ signal }) => fetchAnalytics(from, to, signal),
  })

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
