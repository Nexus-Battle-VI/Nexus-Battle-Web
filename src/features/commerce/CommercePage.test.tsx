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
    expect(screen.getByRole('button', { name: 'Carrito, 0 productos' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Carrito de compras' })).not.toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole('button', { name: `Anadir ${product.name} al carrito` }),
    )
    const cartBubble = await screen.findByRole('button', { name: 'Carrito, 1 productos' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(cartBubble)
    const cartDialog = screen.getByRole('dialog', { name: 'Tu carrito' })
    const cartPanel = within(within(cartDialog).getByRole('region', { name: 'Carrito de compras' }))
    expect(await cartPanel.findByText(product.name)).toBeInTheDocument()
    expect(cartPanel.getByRole('img', { name: product.name })).toHaveAttribute(
      'src',
      product.imageUrl,
    )
    await userEvent.click(cartPanel.getByRole('button', { name: 'Proceder al pago' }))
    const checkoutDialog = await screen.findByRole('dialog', { name: 'Finalizar compra' })
    expect(screen.queryByRole('dialog', { name: 'Tu carrito' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('resumen-total')).toHaveTextContent('150,00')
    await userEvent.click(
      within(checkoutDialog).getByRole('button', { name: 'Cerrar Finalizar compra' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Carrito, 1 productos' }))
    const reopenedCart = within(screen.getByRole('region', { name: 'Carrito de compras' }))
    const quantity = reopenedCart.getByLabelText(`Cantidad de ${product.name}`)
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '2{Enter}')
    await waitFor(() => {
      expect(reopenedCart.getByTestId('cart-total')).toHaveTextContent('300,00')
    })
    await userEvent.click(reopenedCart.getByRole('button', { name: 'Proceder al pago' }))
    expect(await screen.findByTestId('resumen-total')).toHaveTextContent('300,00')
    expect(screen.queryByRole('dialog', { name: 'Tu carrito' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nombre del titular'), 'A')
    await userEvent.type(screen.getByLabelText('Numero de tarjeta'), 'tarjeta-test')
    await userEvent.type(screen.getByLabelText('Vencimiento'), 'prueba')
    await userEvent.type(screen.getByLabelText('Codigo de seguridad'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))
    expect(await screen.findByRole('heading', { name: 'Compra completada' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Seguir comprando' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const emptyBubble = await screen.findByRole('button', { name: 'Carrito, 0 productos' })
    expect(await screen.findByTestId(`badge-propio-${product.sku}`)).toHaveTextContent('Propio')
    await userEvent.click(emptyBubble)
    expect(
      within(screen.getByRole('region', { name: 'Carrito de compras' })).getByText(
        'Tu carrito esta vacio.',
      ),
    ).toBeInTheDocument()
    const add = fetcher.mock.calls.find(
      ([url, init]) => url.endsWith('/lines') && init.method === 'POST',
    )
    expect(JSON.parse(add![1].body as string)).toEqual({
      productId: product.productId,
      quantity: 1,
    })
    const change = fetcher.mock.calls.find(
      ([url, init]) => url.endsWith(`/lines/${product.productId}`) && init.method === 'PATCH',
    )
    expect(JSON.parse(change![1].body as string)).toEqual({ quantity: 2 })
    const payments = fetcher.mock.calls.filter(
      ([url, init]) => url.endsWith('/payment') && init.method === 'POST',
    )
    expect(payments).toHaveLength(1)
    expect(JSON.parse(payments[0]![1].body as string)).toEqual({
      holder: 'A',
      number: 'tarjeta-test',
      expiry: 'prueba',
      securityCode: 'x',
      expectedVersion: 2,
    })
  })

  it('recupera el carrito guardado desde el popup y mantiene su contenido al reabrirlo', async () => {
    const product = showcaseProduct()
    const line = {
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: 15000,
      quantity: 1,
      subtotal: 15000,
    }
    const restored: Cart = {
      id: 'order-restored',
      customerId: 'player',
      status: 'DRAFT',
      currency: 'COP',
      total: 15000,
      itemCount: 1,
      version: 1,
      lines: [line],
    }
    let cart: Cart | null = null
    const fetcher = vi.fn((input: string, init: RequestInit) => {
      const path = new URL(input, globalThis.location.origin).pathname
      if (path === '/api/v1/catalog/products')
        return Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 16, total: 0 }))
      if (path === '/api/orders/cart')
        return Promise.resolve(
          cart === null ? jsonResponse({ message: 'Sin carrito' }, 404) : jsonResponse(cart),
        )
      if (path === '/api/orders/cart/persistence')
        return Promise.resolve(
          jsonResponse({ currency: 'COP', total: 15000, itemCount: 1, items: [line] }),
        )
      if (path === '/api/orders/cart/persistence/restoration' && init.method === 'POST') {
        cart = restored
        return Promise.resolve(jsonResponse(restored))
      }
      return Promise.resolve(jsonResponse({ message: 'Ruta inesperada' }, 404))
    })
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<CommercePage />)

    expect(screen.queryByRole('region', { name: 'Carrito guardado' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Carrito, 0 productos' }))
    const savedPanel = within(await screen.findByRole('region', { name: 'Carrito guardado' }))
    expect(savedPanel.getByText(product.name)).toBeInTheDocument()
    await userEvent.click(savedPanel.getByRole('button', { name: 'Recuperar carrito' }))
    const cartPanel = within(screen.getByRole('region', { name: 'Carrito de compras' }))
    expect(await cartPanel.findByText(product.name)).toBeInTheDocument()
    expect(cartPanel.getByTestId('cart-total')).toHaveTextContent('150,00')
    expect(cartPanel.getByLabelText(`Cantidad de ${product.name}`)).toHaveValue(1)
    expect(
      fetcher.mock.calls.filter(
        ([url, init]) => url.endsWith('/persistence/restoration') && init.method === 'POST',
      ),
    ).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar Tu carrito' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Carrito, 1 productos' }))
    expect(
      within(screen.getByRole('region', { name: 'Carrito de compras' })).getByText(product.name),
    ).toBeInTheDocument()
  })
})
