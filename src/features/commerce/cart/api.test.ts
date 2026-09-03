import { afterEach, describe, expect, it, vi } from 'vitest'

import { addToCart, fetchCart, openCart, removeFromCart, setCartQuantity } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const CART = {
  id: 'ord-1',
  customerId: 'acc-1',
  status: 'DRAFT',
  currency: 'COP',
  total: 30_000,
  itemCount: 2,
  lines: [{ sku: 'espada-de-hierro', unitPrice: 15_000, quantity: 2, subtotal: 30_000 }],
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/** Instala un `fetch` de prueba y devuelve el doble para poder inspeccionarlo. */
const stubFetch = (response: Response) => {
  const fetchImpl = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

const initOf = (fetchImpl: ReturnType<typeof stubFetch>): RequestInit =>
  fetchImpl.mock.calls[0]?.[1] as RequestInit

const urlOf = (fetchImpl: ReturnType<typeof stubFetch>): string =>
  String(fetchImpl.mock.calls[0]?.[0])

describe('api del carrito', () => {
  /** Un 404 significa «todavia no hay carrito», que no es un fallo. */
  it('fetchCart devuelve null cuando el servicio responde 404', async () => {
    stubFetch(jsonResponse({ message: 'No hay carrito.' }, 404))

    expect(await fetchCart()).toBeNull()
  })

  it('fetchCart devuelve el carrito cuando existe', async () => {
    stubFetch(jsonResponse(CART))

    expect(await fetchCart()).toEqual(CART)
  })

  /** Cualquier otro error si es un fallo y debe llegar a la interfaz. */
  it('fetchCart propaga un error que no sea 404', async () => {
    stubFetch(jsonResponse({ message: 'El servicio fallo.' }, 500))

    await expect(fetchCart()).rejects.toThrow()
  })

  it('openCart envia la moneda', async () => {
    const fetchImpl = stubFetch(jsonResponse(CART))

    await openCart('COP')

    expect(urlOf(fetchImpl)).toContain('/orders/cart')
    expect(initOf(fetchImpl).method).toBe('POST')
    expect(JSON.parse(initOf(fetchImpl).body as string)).toEqual({ currency: 'COP' })
  })

  it('addToCart pide la referencia y la cantidad', async () => {
    const fetchImpl = stubFetch(jsonResponse(CART))

    await addToCart('ord-1', 'espada-de-hierro', 2)

    expect(urlOf(fetchImpl)).toContain('/orders/ord-1/lines')
    expect(JSON.parse(initOf(fetchImpl).body as string)).toEqual({
      productId: 'espada-de-hierro',
      quantity: 2,
    })
  })

  /**
   * El precio NUNCA viaja desde la interfaz: lo determina el catalogo. Si se
   * enviara, quien usa la aplicacion podria fijar el precio de su compra.
   */
  it('addToCart no envia el precio', async () => {
    const fetchImpl = stubFetch(jsonResponse(CART))

    await addToCart('ord-1', 'espada-de-hierro', 2)

    const body = initOf(fetchImpl).body as string
    expect(body).not.toContain('unitPrice')
    expect(body).not.toContain('price')
  })

  it('setCartQuantity usa PATCH y envia la cantidad total deseada', async () => {
    const fetchImpl = stubFetch(jsonResponse(CART))

    await setCartQuantity('ord-1', 'espada-de-hierro', 5)

    expect(urlOf(fetchImpl)).toContain('/orders/ord-1/lines/espada-de-hierro')
    expect(initOf(fetchImpl).method).toBe('PATCH')
    expect(JSON.parse(initOf(fetchImpl).body as string)).toEqual({ quantity: 5 })
  })

  it('removeFromCart usa DELETE sobre la referencia', async () => {
    const fetchImpl = stubFetch(jsonResponse(CART))

    await removeFromCart('ord-1', 'espada-de-hierro')

    expect(urlOf(fetchImpl)).toContain('/orders/ord-1/lines/espada-de-hierro')
    expect(initOf(fetchImpl).method).toBe('DELETE')
  })
})
