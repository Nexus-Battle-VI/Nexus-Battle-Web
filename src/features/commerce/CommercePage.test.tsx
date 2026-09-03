import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { jsonResponse, showcaseProduct } from '@/test/commerce-fixtures'
import { CommercePage } from './CommercePage'
import type { Cart } from './cart/api'
import type { PaymentResult } from './checkout/api'

afterEach(() => {
  vi.unstubAllGlobals()
})
describe('Recorrido de interfaz con contratos HTTP', () => {
  it('anade por UUID, actualiza el resumen al cambiar cantidad y refresca adquirido despues del pago', async () => {
    const product = showcaseProduct()
    let cart: Cart | null = null
    let completed: PaymentResult | null = null
    const fetcher = vi.fn((input: string, init: RequestInit) => {
      const path = new URL(input, globalThis.location.origin).pathname
      const body =
        typeof init.body === 'string'
          ? (JSON.parse(init.body) as {
              currency?: string
              quantity?: number
              expectedVersion?: number
            })
          : {}
      if (path === '/api/v1/catalog/products')
        return Promise.resolve(jsonResponse({ items: [product], page: 1, pageSize: 16, total: 1 }))
      if (path.startsWith('/api/wishlist/'))
        return Promise.resolve(
          jsonResponse({
            productId: product.productId,
            sku: product.sku,
            enDeseos: false,
            adquirido: completed !== null,
          }),
        )
      if (path === '/api/orders/cart/persistence')
        return Promise.resolve(jsonResponse({ message: 'Sin guardado' }, 404))
      if (path === '/api/orders/cart') {
        if (init.method === 'POST')
          cart = {
            id: 'order-1',
            customerId: 'player',
            currency: body.currency!,
            status: 'DRAFT',
            total: 0,
            itemCount: 0,
            lines: [],
            version: 0,
          }
        return Promise.resolve(
          cart === null ? jsonResponse({ message: 'Sin carrito' }, 404) : jsonResponse(cart),
        )
      }
      if (path.includes('/lines')) {
        const quantity = body.quantity!
        cart = {
          ...cart!,
          total: quantity * 15000,
          itemCount: quantity,
          version: (cart?.version ?? 0) + 1,
          lines: [
            {
              productId: product.productId,
              sku: product.sku,
              name: product.name,
              imageUrl: product.imageUrl,
              unitPrice: 15000,
              quantity,
              subtotal: quantity * 15000,
            },
          ],
        }
        return Promise.resolve(jsonResponse(cart))
      }
      if (path.endsWith('/checkout')) return Promise.resolve(jsonResponse(cart ?? completed?.order))
      if (path.endsWith('/payment')) {
        if (init.method === 'POST') {
          if (body.expectedVersion !== cart?.version)
            return Promise.resolve(jsonResponse({ message: 'Cambio el carrito' }, 409))
          completed = {
            status: 'COMPLETED',
            order: { ...cart!, version: cart!.version!, status: 'CONFIRMED' },
            paymentReference: 'sim-1',
            maskedCard: 'test',
            realMoneyMoved: false,
          }
          cart = null
        }
        return Promise.resolve(jsonResponse(completed))
      }
      return Promise.resolve(jsonResponse({ message: 'Ruta inesperada' }, 404))
    })
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<CommercePage />)
    await userEvent.click(
      await screen.findByRole('button', { name: `Anadir ${product.name} al carrito` }),
    )
    const cartPanel = within(screen.getByRole('region', { name: 'Carrito de compras' }))
    expect(await cartPanel.findByText(product.name)).toBeInTheDocument()
    expect(cartPanel.getByRole('img', { name: product.name })).toHaveAttribute(
      'src',
      product.imageUrl,
    )
    await userEvent.click(cartPanel.getByRole('button', { name: 'Proceder al pago' }))
    expect(await screen.findByTestId('resumen-total')).toHaveTextContent('150,00')
    const quantity = cartPanel.getByLabelText(`Cantidad de ${product.name}`)
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '2{Enter}')
    await waitFor(() => {
      expect(screen.getByTestId('resumen-total')).toHaveTextContent('300,00')
    })
    await userEvent.type(screen.getByLabelText('Nombre del titular'), 'A')
    await userEvent.type(screen.getByLabelText('Numero de tarjeta'), 'tarjeta-test')
    await userEvent.type(screen.getByLabelText('Vencimiento'), 'prueba')
    await userEvent.type(screen.getByLabelText('Codigo de seguridad'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))
    expect(await screen.findByRole('heading', { name: 'Compra completada' })).toBeInTheDocument()
    expect(await screen.findByText('Tu carrito esta vacio.')).toBeInTheDocument()
    expect(await screen.findByTestId(`badge-propio-${product.sku}`)).toHaveTextContent('Propio')
    const add = fetcher.mock.calls.find(
      ([url, init]) => url.endsWith('/lines') && init.method === 'POST',
    )
    expect(JSON.parse(add![1].body as string)).toEqual({
      productId: product.productId,
      quantity: 1,
    })
    expect(
      fetcher.mock.calls.filter(
        ([url, init]) => url.endsWith('/payment') && init.method === 'POST',
      ),
    ).toHaveLength(1)
  })
})
