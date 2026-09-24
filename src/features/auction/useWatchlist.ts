import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query-keys'
import { followAuction, fetchWatchlist, unfollowAuction } from './api'

/** Mantiene sincronizadas las altas, bajas y el listado de seguimiento. */
export const useWatchlist = () => {
  const queryClient = useQueryClient()
  const key = queryKeys.auction.watchlist
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => fetchWatchlist(signal) })
  const refresh = (): void => void queryClient.invalidateQueries({ queryKey: key })
  const follow = useMutation({ mutationFn: followAuction, onSuccess: refresh })
  const unfollow = useMutation({ mutationFn: unfollowAuction, onSuccess: refresh })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    loadError: query.error,
    follow: follow.mutateAsync,
    unfollow: unfollow.mutate,
    isSaving: follow.isPending || unfollow.isPending,
  }
}
