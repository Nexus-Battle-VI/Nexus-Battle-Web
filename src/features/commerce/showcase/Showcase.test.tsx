import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { Showcase } from './Showcase'

afterEach(() => {
  vi.unstubAllGlobals()
})

const product = (sku: string, name: string, category: string, amount: number) => ({
  sku,
  name,
  category,
  price: { amount, currency: 'COP' },
  isPremium: false,
  realMoneyPrice: null,
  status: 'PUBLISHED',
})

const CATALOG = [
  product('espada-de-hierro', 'Espada de hierro', 'armas', 15_000),
  product('arco-corto', 'Arco corto', 'armas', 12_000),
  product('pocion-de-vida', 'Pocion de vida', 'consumibles', 2_000),
]

const stubCatalog = (body: unknown, status = 200): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
}

const renderShowcase = (overrides: Partial<Parameters<typeof Showcase>[0]> = {}) =>
  renderWithProviders(<Showcase onAddToCart={vi.fn()} {...overrides} />)

describe('Showcase — presentacion', () => {
  it('muestra el banner y los productos publicados', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    expect(await screen.findByRole('heading', { name: 'Vitrina' })).toBeInTheDocument()
    expect(await screen.findByText('Espada de hierro')).toBeInTheDocument()
    expect(screen.getByText('Arco corto')).toBeInTheDocument()
    expect(screen.getByText('Pocion de vida')).toBeInTheDocument()
  })

  /** CA-02, en la medida en que Catalog publica los datos hoy. */
  it('cada producto muestra nombre, tipo y precio', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    const card = within(await screen.findByTestId('product-espada-de-hierro'))

    expect(card.getByRole('heading', { name: 'Espada de hierro' })).toBeInTheDocument()
    expect(card.getByText('armas')).toBeInTheDocument()
    expect(card.getByText(/150,00/u)).toBeInTheDocument()
  })

  it('informa cuantos productos hay', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    // Por texto y no por rol: mientras carga, `QueryState` tambien expone un
    // `role="status"` con «Cargando...», y seria el primero en encontrarse.
    expect(await screen.findByText(/3 productos/u)).toBeInTheDocument()
  })

  it('declara la ausencia de resultados sin confundirla con un error', async () => {
    stubCatalog([])
    renderShowcase()

    expect(
      await screen.findByText('Ningun producto cumple los criterios seleccionados.'),
    ).toBeInTheDocument()
  })

  it('un fallo del servicio no se presenta como catalogo vacio', async () => {
    stubCatalog({ message: 'Catalog no respondio.' }, 500)
    renderShowcase()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('Showcase — busqueda y filtros', () => {
  it('filtra por termino de busqueda', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    await userEvent.type(screen.getByLabelText('Buscar'), 'arco')

    expect(screen.getByText('Arco corto')).toBeInTheDocument()
    expect(screen.queryByText('Espada de hierro')).not.toBeInTheDocument()
  })

  /**
   * CA-07: el precio tambien localiza el producto.
   *
   * Se busca «150» y no «20»: la coincidencia es por subcadena, asi que «20»
   * encontraria tambien el arco (precio 120), que es correcto pero no sirve
   * para demostrar que se localiza un producto concreto.
   */
  it('filtra buscando por precio', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    await userEvent.type(screen.getByLabelText('Buscar'), '150')

    expect(screen.getByText('Espada de hierro')).toBeInTheDocument()
    expect(screen.queryByText('Arco corto')).not.toBeInTheDocument()
    expect(screen.queryByText('Pocion de vida')).not.toBeInTheDocument()
  })

  it('filtra por tipo de producto', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    await userEvent.selectOptions(screen.getByLabelText('Tipo de producto'), 'consumibles')

    expect(screen.getByText('Pocion de vida')).toBeInTheDocument()
    expect(screen.queryByText('Espada de hierro')).not.toBeInTheDocument()
  })

  it('solo ofrece los tipos que existen en el catalogo', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    const options = within(screen.getByLabelText('Tipo de producto')).getAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual(['Todos', 'armas', 'consumibles'])
  })

  it('filtra por rango de precio', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    await userEvent.type(screen.getByLabelText('Precio desde'), '130')

    expect(screen.getByText('Espada de hierro')).toBeInTheDocument()
    expect(screen.queryByText('Arco corto')).not.toBeInTheDocument()
  })

  /** CA-11: termino y filtros se cumplen a la vez. */
  it('combina busqueda y filtros', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')
    await userEvent.selectOptions(screen.getByLabelText('Tipo de producto'), 'armas')
    await userEvent.type(screen.getByLabelText('Buscar'), 'espada')

    expect(screen.getByText('Espada de hierro')).toBeInTheDocument()
    expect(screen.queryByText('Arco corto')).not.toBeInTheDocument()
    expect(screen.queryByText('Pocion de vida')).not.toBeInTheDocument()
  })
})

describe('Showcase — paginacion de dieciseis', () => {
  const many = Array.from({ length: 17 }, (_, index) =>
    product(`sku-${String(index)}`, `Producto ${String(index)}`, 'armas', 1_000 + index),
  )

  it('la primera pagina presenta dieciseis y el resto queda paginado', async () => {
    stubCatalog(many)
    renderShowcase()

    await screen.findByText('Producto 0')

    expect(screen.getAllByRole('listitem')).toHaveLength(16)
    expect(screen.getByRole('status')).toHaveTextContent('pagina 1 de 2')
  })

  it('avanza a la siguiente pagina', async () => {
    stubCatalog(many)
    renderShowcase()

    await screen.findByText('Producto 0')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Producto 16')).toBeInTheDocument()
  })

  it('no pagina cuando todo cabe en una pagina', async () => {
    stubCatalog(CATALOG)
    renderShowcase()

    await screen.findByText('Espada de hierro')

    expect(screen.queryByRole('navigation', { name: 'Paginacion' })).not.toBeInTheDocument()
  })

  /** Filtrar en una pagina alta no puede dejar un vacio que parece un fallo. */
  it('vuelve a la primera pagina al cambiar los criterios', async () => {
    stubCatalog(many)
    renderShowcase()

    await screen.findByText('Producto 0')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Producto 16')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Buscar'), 'Producto 1')

    // Se muestra el principio del resultado filtrado, no la segunda pagina de
    // un resultado que ya no la tiene.
    expect(screen.getByText('Producto 1')).toBeInTheDocument()
    expect(screen.getByText(/8 productos/u)).toBeInTheDocument()
  })
})

describe('Showcase — anadir al carrito', () => {
  it('anade la referencia seleccionada', async () => {
    const onAddToCart = vi.fn()
    stubCatalog(CATALOG)
    renderShowcase({ onAddToCart })

    await screen.findByText('Espada de hierro')
    await userEvent.click(
      screen.getByRole('button', { name: 'Anadir Espada de hierro al carrito' }),
    )

    expect(onAddToCart).toHaveBeenCalledExactlyOnceWith('espada-de-hierro')
  })

  it('abre el detalle al seleccionar el producto', async () => {
    const onOpenDetail = vi.fn()
    stubCatalog(CATALOG)
    renderShowcase({ onOpenDetail })

    await userEvent.click(await screen.findByRole('button', { name: 'Espada de hierro armas' }))

    expect(onOpenDetail).toHaveBeenCalledExactlyOnceWith('espada-de-hierro')
  })

  it('deshabilita solo la tarjeta con una operacion en curso', async () => {
    stubCatalog(CATALOG)
    renderShowcase({ busySku: 'espada-de-hierro' })

    await screen.findByText('Espada de hierro')

    expect(
      screen.getByRole('button', { name: 'Anadir Espada de hierro al carrito' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anadir Arco corto al carrito' })).toBeEnabled()
  })
})
