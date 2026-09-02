import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { fetchCheckoutSummary, payOrder, type CheckoutSummary, type PaymentResult } from './api'
import type { CardForm } from './validation'

export interface CheckoutState {
  readonly summary: CheckoutSummary | null
  readonly isLoading: boolean
  readonly error: unknown
  readonly pay: (card: CardForm) => void
  readonly isPaying: boolean
  readonly paymentError: unknown
  readonly result: PaymentResult | null
}

/**
 * Resumen de compra y pago simulado de un pedido.
 *
 * Tras una compra completada se invalida el carrito: el pedido pasa a
 * confirmado y deja de ser el carrito vigente, asi que dejar el anterior en
 * cache mostraria como carrito algo que ya se compro.
 */
export const useCheckout = (orderId: string | null): CheckoutState => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.commerce.checkout(orderId ?? ''),
    queryFn: ({ signal }) => fetchCheckoutSummary(orderId ?? '', signal),
    // Sin pedido no hay resumen que pedir.
    enabled: orderId !== null,
  })

  const mutation = useMutation({
    mutationFn: (card: CardForm) => {
      if (orderId === null) {
        throw new Error('No hay un pedido que pagar.')
      }

      return payOrder(orderId, card)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart })
    },
  })

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    pay: mutation.mutate,
    isPaying: mutation.isPending,
    paymentError: mutation.error,
    result: mutation.data ?? null,
  }
}
