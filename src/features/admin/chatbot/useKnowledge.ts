import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import {
  createKnowledge,
  deleteKnowledge,
  fetchKnowledge,
  updateKnowledge,
  type KnowledgeDraft,
} from './api'

export const useKnowledgeEntries = () => {
  const query = useQuery({
    queryKey: queryKeys.admin.chatbotKnowledge,
    queryFn: ({ signal }) => fetchKnowledge(signal),
  })

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    reload: () => {
      void query.refetch()
    },
  }
}

export const useSaveKnowledge = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, draft }: { readonly id: string | null; readonly draft: KnowledgeDraft }) =>
      id === null ? createKnowledge(draft) : updateKnowledge(id, draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.chatbotKnowledge })
    },
  })
}

export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.chatbotKnowledge })
    },
  })
}
