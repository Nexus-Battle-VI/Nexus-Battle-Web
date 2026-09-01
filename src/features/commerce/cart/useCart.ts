import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { addToCart, fetchCart, openCart, removeFromCart, setCartQuantity, type Cart } from './api'

/**
 * Carrito vigente y las operaciones que lo modifican.
 *
 * Cada mutacion escribe en la cache el carrito que devuelve el servicio en
 * lugar de invalidar y volver a pedirlo: la respuesta **ya es** el carrito
 * recalculado, asi que una segunda peticion solo anadiria un parpadeo y una
 * ventana en la que el total mostrado no corresponde a las lineas mostradas.
 */
export const useCart = () => {
  const queryClient = useQueryClient()
  const key = queryKeys.commerce.cart

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchCart(signal),
  })

  const write = (cart: Cart): void => {
    queryClient.setQueryData(key, cart)
  }

  /** El carrito sobre el que operar, abriendolo si todavia no existe. */
  const ensureCart = async (currency: string): Promise<Cart> => {
    if (query.data !== null && query.data !== undefined) {
      return query.data
    }

    const opened = await openCart(currency)
    write(opened)

    return opened
  }

  const add = useMutation({
    mutationFn: async ({
      sku,
      quantity,
      currency = 'COP',
    }: {
      sku: string
      quantity: number
      currency?: string
    }) => {
      const cart = await ensureCart(currency)

      return addToCart(cart.id, sku, quantity)
    },
    onSuccess: write,
  })

  const changeQuantity = useMutation({
    mutationFn: ({ sku, quantity }: { sku: string; quantity: number }) => {
      const cart = query.data

      if (cart === null || cart === undefined) {
        throw new Error('No hay un carrito sobre el que cambiar cantidades.')
      }

      return setCartQuantity(cart.id, sku, quantity)
    },
    onSuccess: write,
  })

  const remove = useMutation({
    mutationFn: (sku: string) => {
      const cart = query.data

      if (cart === null || cart === undefined) {
        throw new Error('No hay un carrito del que retirar productos.')
      }

      return removeFromCart(cart.id, sku)
    },
    onSuccess: write,
  })

  /** Referencia con una operacion en curso, para deshabilitar solo esa fila. */
  const busySku =
    (changeQuantity.isPending ? changeQuantity.variables.sku : null) ??
    (remove.isPending ? remove.variables : null)

  return {
    cart: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    busySku,
    add: add.mutate,
    changeQuantity: (sku: string, quantity: number): void => {
      changeQuantity.mutate({ sku, quantity })
    },
    remove: remove.mutate,
    mutationError: add.error ?? changeQuantity.error ?? remove.error,
  }
}
