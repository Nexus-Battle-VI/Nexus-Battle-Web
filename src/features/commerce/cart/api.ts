import { httpClient, HttpError } from '@/lib/http'

/**
 * Cliente del carrito de Commerce.
 *
 * Ninguna de estas funciones calcula subtotales ni totales: los devuelve el
 * servicio. Recalcularlos aqui crearia una segunda fuente de verdad que puede
 * divergir de la del pedido, y un total que no cuadra con sus lineas es peor
 * que no tener total.
 */
export interface CartLine {
  readonly sku: string
  readonly unitPrice: number
  readonly quantity: number
  readonly subtotal: number
}

export interface Cart {
  readonly id: string
  readonly customerId: string
  readonly status: string
  readonly currency: string
  readonly total: number
  /** Suma de las cantidades: lo que muestra la vista minimizada. */
  readonly itemCount: number
  readonly lines: readonly CartLine[]
}

/**
 * Carrito vigente, o `null` si el cliente no tiene ninguno abierto.
 *
 * El servicio responde `404` cuando no hay carrito, y aqui se traduce a
 * `null`: para la interfaz «todavia no hay carrito» es un estado normal, no un
 * fallo, y mostrarlo como error asustaria sin motivo. Cualquier otro error si
 * se propaga.
 */
export const fetchCart = async (signal?: AbortSignal): Promise<Cart | null> => {
  try {
    return await httpClient.get<Cart>('/orders/cart', signal)
  } catch (error: unknown) {
    if (error instanceof HttpError && error.isNotFound) {
      return null
    }

    throw error
  }
}

/** Abre el carrito, o devuelve el que ya existiera. Es idempotente. */
export const openCart = async (currency: string): Promise<Cart> =>
  httpClient.post<Cart>('/orders/cart', { currency })

export const addToCart = async (orderId: string, sku: string, quantity: number): Promise<Cart> =>
  httpClient.post<Cart>(`/orders/${orderId}/lines`, { sku, quantity })

/**
 * Fija la cantidad a un valor exacto.
 *
 * La cantidad que se envia es el **total deseado**, no un incremento: la
 * diferencia la calcula el servicio. La interfaz no hace esa aritmetica.
 */
export const setCartQuantity = async (
  orderId: string,
  sku: string,
  quantity: number,
): Promise<Cart> =>
  httpClient.request<Cart>(`/orders/${orderId}/lines/${sku}`, {
    method: 'PATCH',
    body: { quantity },
  })

export const removeFromCart = async (orderId: string, sku: string): Promise<Cart> =>
  httpClient.delete<Cart>(`/orders/${orderId}/lines/${sku}`)
