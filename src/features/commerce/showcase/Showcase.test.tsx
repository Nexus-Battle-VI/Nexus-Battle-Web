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
  it('muestra nombre, imagen, descripcion, atributos y precios de dinero y creditos separados', async () => {
    setup()
    show()
    const card = within(await screen.findByTestId(`product-${product.sku}`))
    expect(card.getByRole('img', { name: product.name })).toHaveAttribute('src', product.imageUrl)
    expect(card.getByText(product.description)).toBeInTheDocument()
    expect(card.getByText('Daño')).toBeInTheDocument()
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
    await userEvent.type(screen.getByLabelText('Buscar'), 'consulta')
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
  it('pagina en el servicio y vuelve a pagina uno al cambiar filtros', async () => {
    const fetcher = setup((url) =>
      jsonResponse({
        items: [product],
        page: Number(url.searchParams.get('page')),
        pageSize: 16,
        total: 17,
      }),
    )
    show()
    await screen.findByText(product.description)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText(/pagina 2 de 2/u)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Buscar'), 'a')
    expect(await screen.findByText(/pagina 1 de 2/u)).toBeInTheDocument()
    expect(fetcher.mock.calls.some(([url]) => url.includes('page=2'))).toBe(true)
  })
  it('abre un detalle real por UUID y permite cerrarlo', async () => {
    const fetcher = setup()
    show()
    await userEvent.click(
      await screen.findByRole('button', { name: `Ver detalle de ${product.name}` }),
    )
    const detail = within(await screen.findByRole('region', { name: 'Detalle del producto' }))
    expect(await detail.findByText(product.description)).toBeInTheDocument()
    expect(
      fetcher.mock.calls.some(
        ([url]) => url.endsWith(product.productId) && url.includes('/catalog/'),
      ),
    ).toBe(true)
    await userEvent.click(detail.getByRole('button', { name: 'Cerrar detalle' }))
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
