import { httpClient } from '@/lib/http'
import type { CardForm } from './validation'

export interface CheckoutLine {
  readonly productId?: string
  readonly name?: string
  readonly imageUrl?: string
  readonly sku: string
  readonly unitPrice: number
  readonly quantity: number
  readonly subtotal: number
}

/** Resumen de la compra: el contenido vigente del carrito y su total. */
export interface CheckoutSummary {
  readonly version: number
  readonly id: string
  readonly status: string
  readonly currency: string
  readonly total: number
  readonly itemCount: number
  readonly lines: readonly CheckoutLine[]
}

export interface PaymentResult {
  readonly status: 'COMPLETED' | 'PROCESSING'
  readonly order: CheckoutSummary
  readonly paymentReference: string
  /** Cuatro ultimos digitos. El servicio nunca devuelve el numero completo. */
  readonly maskedCard: string
  /** Siempre `false`: el flujo es academico y no ejecuta cobros reales. */
  readonly realMoneyMoved: boolean
}

export const fetchCheckoutSummary = (
  orderId: string,
  signal?: AbortSignal,
): Promise<CheckoutSummary> =>
  httpClient.get<CheckoutSummary>(`/orders/${encodeURIComponent(orderId)}/checkout`, signal)

/**
 * Confirma el pago simulado.
 *
 * Los datos de la tarjeta se envian y **no se guardan en ninguna parte**: no
 * hay estado global, ni almacenamiento local, ni registro. Lo unico que vuelve
 * es la referencia de la transaccion y los cuatro ultimos digitos.
 */
export const payOrder = (
  orderId: string,
  card: CardForm,
  expectedVersion: number,
): Promise<PaymentResult> =>
  httpClient.post<PaymentResult>(`/orders/${encodeURIComponent(orderId)}/payment`, {
    holder: card.holder.trim(),
    number: card.number.trim(),
    expiry: card.expiry.trim(),
    securityCode: card.securityCode.trim(),
    expectedVersion,
  })

export const fetchPayment = (orderId: string, signal?: AbortSignal): Promise<PaymentResult> =>
  httpClient.get<PaymentResult>(`/orders/${encodeURIComponent(orderId)}/payment`, signal)
