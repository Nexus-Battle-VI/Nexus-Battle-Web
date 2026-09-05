import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { jsonResponse, showcaseProduct } from '@/test/commerce-fixtures'
import { Showcase } from './Showcase'

afterEach(() => {
  vi.unstubAllGlobals()
})
const product = showcaseProduct()
const catalogProducts = Array.from({ length: 25 }, (_, index) =>
  showcaseProduct({
    productId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    sku: `producto-${String(index + 1)}`,
    name: `Producto ${String(index + 1)}`,
  }),
)
const catalogPage = (url: URL): Response => {
  const page = Number(url.searchParams.get('page'))
  return jsonResponse({
    items: catalogProducts.slice((page - 1) * 16, page * 16),
    page,
    pageSize: 16,
    total: catalogProducts.length,
  })
}
const visibleNames = (): (string | null)[] =>
  within(screen.getByRole('list', { name: 'Productos' }))
    .getAllByText(/^Producto [0-9]+$/u)
    .map((name) => name.textContent)
const setup = (
  list: (url: URL) => Response | Promise<Response> = () =>
    jsonResponse({ items: [product], page: 1, pageSize: 16, total: 1 }),
  status = { productId: product.productId, sku: product.sku, enDeseos: false, adquirido: false },
) => {
  const fetcher = vi.fn((input: string) => {
    const url = new URL(input, globalThis.location.origin)
    if (url.pathname.startsWith('/api/wishlist/')) return Promise.resolve(jsonResponse(status))
    if (url.pathname === `/api/v1/catalog/products/${product.productId}`)
      return Promise.resolve(jsonResponse(product))
    return Promise.resolve(list(url))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
const show = (props: Partial<Parameters<typeof Showcase>[0]> = {}) =>
  renderWithProviders(<Showcase onAddToCart={vi.fn()} {...props} />)

describe('Vitrina canonica', () => {
  it('muestra nombre, imagen, descripcion y precios de dinero y creditos separados en la tarjeta', async () => {
    setup()
    show()
    const card = within(await screen.findByTestId(`product-${product.sku}`))
    expect(card.getByRole('img', { name: product.name })).toHaveAttribute('src', product.imageUrl)
    expect(card.getByText(product.description)).toBeInTheDocument()
    expect(card.getByText('250 créditos')).toBeInTheDocument()
    expect(card.getByText(/150,00/u)).toBeInTheDocument()
  })
  it('muestra carga antes de la respuesta', () => {
    setup(() => new Promise<Response>(() => undefined))
    show()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })
  it('distingue vacio de fallo', async () => {
    setup(() => jsonResponse({ items: [], page: 1, pageSize: 16, total: 0 }))
    show()
    expect(
      await screen.findByText('Ningun producto cumple los criterios seleccionados.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('muestra el error de Catalog sin presentarlo como cero resultados', async () => {
    setup(() => jsonResponse({ message: 'Rango de precio invalido.' }, 400))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Rango de precio invalido.')
    expect(
      screen.queryByText('Ningun producto cumple los criterios seleccionados.'),
    ).not.toBeInTheDocument()
  })
  it('envia busqueda, tipo y precios menores con moneda al backend sin volver a filtrar sus resultados', async () => {
    const fetcher = setup()
    show()
    await screen.findByText(product.description)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'consulta')
    await userEvent.selectOptions(screen.getByLabelText('Tipo de producto'), 'HEROE')
    await userEvent.selectOptions(screen.getByLabelText('Moneda del precio'), 'USD')
    await userEvent.type(screen.getByLabelText('Precio desde'), '12')
    await userEvent.type(screen.getByLabelText('Precio hasta'), '40')
    await waitFor(() => {
      const call = fetcher.mock.calls
        .filter(([url]) => url.includes('/v1/catalog/products?'))
        .at(-1)
      const url = new URL(call![0], globalThis.location.origin)
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        query: 'consulta',
        type: 'HEROE',
        currency: 'USD',
        minPrice: '1200',
        maxPrice: '4000',
        page: '1',
      })
    })
    expect(await screen.findByText(product.description)).toBeInTheDocument()
  })
  it('recorre 25 productos en paginas de 12, 12 y 1 y vuelve atras sin perder ni repetir articulos', async () => {
    const fetcher = setup(catalogPage)
    show()
    await screen.findByText(/pagina 1 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(0, 12).map((item) => item.name))
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/pagina 2 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(12, 24).map((item) => item.name))

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/pagina 3 de 3/u)
    expect(visibleNames()).toEqual(['Producto 25'])
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await screen.findByText(/pagina 2 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(12, 24).map((item) => item.name))

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await screen.findByText(/pagina 1 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(0, 12).map((item) => item.name))
    const requestedPages = fetcher.mock.calls
      .filter(([input]) => input.includes('/v1/catalog/products?'))
      .map(([input]) => new URL(input, globalThis.location.origin).searchParams.get('page'))
    expect(new Set(requestedPages)).toEqual(new Set(['1', '2']))
  })
  it('conserva buscador y filtros al paginar, vuelve a pagina uno al cambiarlos y los restablece al limpiar', async () => {
    const fetcher = setup(catalogPage)
    show()
    await screen.findByText(/pagina 1 de 3/u)
    const search = screen.getByRole('searchbox', { name: 'Buscar' })
    await userEvent.type(search, 'espada')
    await userEvent.selectOptions(screen.getByLabelText('Tipo de producto'), 'ARMA')
    await userEvent.selectOptions(screen.getByLabelText('Moneda del precio'), 'USD')
    await userEvent.type(screen.getByLabelText('Precio desde'), '12')
    await userEvent.type(screen.getByLabelText('Precio hasta'), '40')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled())

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/pagina 2 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(12, 24).map((item) => item.name))
    expect(search).toHaveValue('espada')
    expect(screen.getByLabelText('Tipo de producto')).toHaveValue('ARMA')
    expect(screen.getByLabelText('Moneda del precio')).toHaveValue('USD')
    expect(screen.getByLabelText('Precio desde')).toHaveValue(12)
    expect(screen.getByLabelText('Precio hasta')).toHaveValue(40)
    const lastRequests = fetcher.mock.calls
      .filter(([input]) => input.includes('/v1/catalog/products?'))
      .slice(-2)
      .map(([input]) => Object.fromEntries(new URL(input, globalThis.location.origin).searchParams))
    expect(lastRequests).toEqual([
      {
        page: '1',
        query: 'espada',
        type: 'ARMA',
        currency: 'USD',
        minPrice: '1200',
        maxPrice: '4000',
      },
      {
        page: '2',
        query: 'espada',
        type: 'ARMA',
        currency: 'USD',
        minPrice: '1200',
        maxPrice: '4000',
      },
    ])

    await userEvent.type(search, 's')
    await screen.findByText(/pagina 1 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(0, 12).map((item) => item.name))
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/pagina 2 de 3/u)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await screen.findByText(/pagina 1 de 3/u)
    expect(visibleNames()).toEqual(catalogProducts.slice(0, 12).map((item) => item.name))
    expect(search).toHaveValue('')
    expect(screen.getByLabelText('Tipo de producto')).toHaveValue('')
    expect(screen.getByLabelText('Moneda del precio')).toHaveValue('')
    expect(screen.getByLabelText('Precio desde')).toHaveValue(null)
    expect(screen.getByLabelText('Precio hasta')).toHaveValue(null)
    expect(screen.getByLabelText('Precio desde')).toBeDisabled()
    expect(screen.getByLabelText('Precio hasta')).toBeDisabled()
    const lastRequest = fetcher.mock.calls
      .filter(([input]) => input.includes('/v1/catalog/products?'))
      .at(-1)!
    expect(
      Object.fromEntries(new URL(lastRequest[0], globalThis.location.origin).searchParams),
    ).toEqual({ page: '1' })
  })
  it('abre un detalle modal por UUID con los atributos completos y permite cerrarlo', async () => {
    const fetcher = setup()
    show()
    await userEvent.click(
      await screen.findByRole('button', { name: `Ver detalle de ${product.name}` }),
    )
    const modal = await screen.findByRole('dialog', { name: 'Detalle del producto' })
    expect(modal).toHaveAttribute('open')
    const detail = within(within(modal).getByRole('region', { name: 'Detalle del producto' }))
    expect(await detail.findByText(product.description)).toBeInTheDocument()
    expect(detail.getByText('Daño')).toBeInTheDocument()
    expect(
      fetcher.mock.calls.some(
        ([url]) => url.endsWith(product.productId) && url.includes('/catalog/'),
      ),
    ).toBe(true)
    await userEvent.click(detail.getByRole('button', { name: 'Cerrar detalle' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle del producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Detalle del producto' })).not.toBeInTheDocument()
  })
  it('marca adquirido aunque nunca se haya agregado a deseos', async () => {
    setup(undefined, {
      productId: product.productId,
      sku: product.sku,
      enDeseos: false,
      adquirido: true,
    })
    show()
    expect(await screen.findByTestId(`badge-propio-${product.sku}`)).toHaveTextContent('Propio')
    expect(screen.queryByTestId(`badge-deseos-${product.sku}`)).not.toBeInTheDocument()
  })
  it('entrega al carrito identidad canonica y moneda del producto', async () => {
    const onAddToCart = vi.fn()
    setup()
    show({ onAddToCart })
    await userEvent.click(
      await screen.findByRole('button', { name: `Anadir ${product.name} al carrito` }),
    )
    expect(onAddToCart).toHaveBeenCalledExactlyOnceWith(product)
  })
  it('impide añadir durante una mutacion o desde otra moneda de carrito', async () => {
    setup()
    const { rerender } = show({ busySku: product.productId })
    expect(
      await screen.findByRole('button', { name: `Anadir ${product.name} al carrito` }),
    ).toBeDisabled()
    rerender(<Showcase onAddToCart={vi.fn()} cartCurrency="USD" />)
    expect(screen.getByRole('button', { name: `Anadir ${product.name} al carrito` })).toBeDisabled()
    expect(screen.getByText(/Tu carrito está en USD/u)).toBeInTheDocument()
  })
})
