import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { HttpError } from '@/lib/http'
import { fetchCheckoutSummary, fetchPayment, payOrder } from './api'
import type { CardForm } from './validation'

export const useCheckout = (orderId: string | null) => {
  const queryClient = useQueryClient()
  const subject = useSession((state) => state.subject)
  const key = queryKeys.commerce.checkout(subject, orderId ?? '')
  const cardToSend = useRef<{ card: CardForm; version: number } | null>(null)
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchCheckoutSummary(orderId ?? '', signal),
    enabled: orderId !== null,
    staleTime: 0,
  })
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart(subject) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.wishlist(subject) })
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }
  const mutation = useMutation({
    // La cache de mutaciones conserva solo el ID, nunca los cuatro datos de tarjeta.
    mutationFn: async (id: string) => {
      const input = cardToSend.current
      if (input === null) throw new Error('Completa los datos del pago.')
      try {
        return await payOrder(id, input.card, input.version)
      } finally {
        cardToSend.current = null
      }
    },
    onSuccess: (result) => {
      if (result.status === 'COMPLETED') refresh()
      void queryClient.invalidateQueries({ queryKey: key })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart(subject) })
    },
  })
  const ownMutation = mutation.variables === orderId ? (mutation.data ?? null) : null
  const receipt = useQuery({
    queryKey: queryKeys.commerce.payment(subject, orderId),
    queryFn: ({ signal }) => fetchPayment(orderId ?? '', signal),
    enabled:
      orderId !== null &&
      (query.data?.status === 'PROCESSING' ||
        query.data?.status === 'CONFIRMED' ||
        ownMutation?.status === 'PROCESSING'),
    refetchInterval: ({ state }) =>
      state.data?.status === 'COMPLETED' ||
      (state.error instanceof HttpError && state.error.isClientError)
        ? false
        : 2000,
    retry: false,
  })
  const completed = receipt.data?.status === 'COMPLETED'
  useEffect(() => {
    if (!completed) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart(subject) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.wishlist(subject) })
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }, [completed, queryClient, subject])
  const result = ownMutation?.status === 'COMPLETED' ? ownMutation : (receipt.data ?? ownMutation)
  const processing =
    result?.status !== 'COMPLETED' &&
    (result?.status === 'PROCESSING' || query.data?.status === 'PROCESSING')
  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error: query.error,
    pay: (card: CardForm): void => {
      if (
        orderId === null ||
        query.data === undefined ||
        query.isFetching ||
        mutation.isPending ||
        processing
      )
        return
      cardToSend.current = { card, version: query.data.version }
      mutation.mutate(orderId)
    },
    isPaying: mutation.isPending || processing,
    processing,
    paymentError: receipt.error ?? (mutation.variables === orderId ? mutation.error : null),
    result,
  }
}
