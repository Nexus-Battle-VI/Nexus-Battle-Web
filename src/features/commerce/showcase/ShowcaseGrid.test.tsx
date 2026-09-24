import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { ShowcaseGrid } from './ShowcaseGrid'
import type { ShowcaseProduct } from './api'
import { showcaseProduct } from '@/test/commerce-fixtures'

/**
 * Marcadores de lista de deseos y de producto adquirido (HU-56).
 *
 * Viven aqui y no en `wishlist/` porque prueban `ShowcaseGrid`, que es de esta
 * feature: una feature no importa de otra, ni siquiera en sus pruebas.
 */
const product = (sku: string, name: string): ShowcaseProduct =>
  showcaseProduct({ productId: sku, sku, name })

const PRODUCTS = [
  product('espada-de-hierro', 'Espada de hierro'),
  product('arco-corto', 'Arco corto'),
]

const renderGrid = (overrides: Partial<Parameters<typeof ShowcaseGrid>[0]> = {}) =>
  renderWithProviders(
    <ShowcaseGrid
      products={PRODUCTS}
      onAddToCart={vi.fn()}
      onOpenDetail={vi.fn()}
      isWished={() => false}
      isOwned={() => false}
      onToggleWish={vi.fn()}
      {...overrides}
    />,
  )

describe('Marcadores en la tarjeta de producto', () => {
  /** CA-02: un producto en deseos se distingue visualmente. */
  it('marca «En deseos» y rellena el corazon', () => {
    renderGrid({ isWished: (sku) => sku === 'espada-de-hierro' })

    expect(screen.getByTestId('badge-deseos-espada-de-hierro')).toHaveTextContent('En deseos')
    expect(screen.getByTestId('wish-espada-de-hierro')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('badge-deseos-arco-corto')).not.toBeInTheDocument()
  })

  /** CA-03: un producto adquirido muestra su marca. */
  it('marca «Propio» cuando la referencia esta adquirida', () => {
    renderGrid({ isOwned: (sku) => sku === 'arco-corto' })

    expect(screen.getByTestId('badge-propio-arco-corto')).toHaveTextContent('Propio')
  })

  /** CA-04: lo no adquirido no se muestra como adquirido. */
  it('no marca como propio lo que no lo esta', () => {
    renderGrid()

    expect(screen.queryByTestId('badge-propio-espada-de-hierro')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-propio-arco-corto')).not.toBeInTheDocument()
  })

  /**
   * CA-05: son conceptos distintos. Estar en deseos no puede implicar estar
   * adquirido, y esta prueba lo fija de forma explicita.
   */
  it('en deseos y adquirido son marcas independientes', () => {
    renderGrid({
      isWished: (sku) => sku === 'espada-de-hierro',
      isOwned: (sku) => sku === 'arco-corto',
    })

    const espada = within(screen.getByTestId('product-espada-de-hierro'))
    const arco = within(screen.getByTestId('product-arco-corto'))

    expect(espada.getByText('En deseos')).toBeInTheDocument()
    expect(espada.queryByText('Propio')).not.toBeInTheDocument()
    expect(arco.getByText('Propio')).toBeInTheDocument()
    expect(arco.queryByText('En deseos')).not.toBeInTheDocument()
  })

  it('un producto puede estar en deseos y adquirido a la vez', () => {
    renderGrid({ isWished: () => true, isOwned: () => true })

    const espada = within(screen.getByTestId('product-espada-de-hierro'))

    expect(espada.getByText('En deseos')).toBeInTheDocument()
    expect(espada.getByText('Propio')).toBeInTheDocument()
  })

  /** El estado tambien llega a quien no ve el corazon relleno. */
  it('el estado esta en el nombre accesible, no solo en el icono', () => {
    renderGrid({ isWished: (sku) => sku === 'espada-de-hierro' })

    expect(
      screen.getByRole('button', { name: 'Quitar Espada de hierro de la lista de deseos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Anadir Arco corto a la lista de deseos' }),
    ).toBeInTheDocument()
  })
})

describe('Anadir y retirar de la lista de deseos', () => {
  /** CA-01: se anade desde la vitrina. */
  it('anade la referencia al pulsar el corazon', async () => {
    const onToggleWish = vi.fn()
    renderGrid({ onToggleWish })

    await userEvent.click(screen.getByTestId('wish-espada-de-hierro'))

    expect(onToggleWish).toHaveBeenCalledExactlyOnceWith('espada-de-hierro')
  })

  it('retira la referencia si ya estaba en deseos', async () => {
    const onToggleWish = vi.fn()
    renderGrid({ onToggleWish, isWished: () => true })

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar Espada de hierro de la lista de deseos' }),
    )

    expect(onToggleWish).toHaveBeenCalledExactlyOnceWith('espada-de-hierro')
  })

  it('deshabilita solo el corazon con una operacion en curso', () => {
    renderGrid({ wishBusySku: 'espada-de-hierro' })

    expect(screen.getByTestId('wish-espada-de-hierro')).toBeDisabled()
    expect(screen.getByTestId('wish-arco-corto')).toBeEnabled()
  })

  /**
   * Anadir a deseos no es comprar: el boton del carrito sigue siendo otra
   * accion distinta y separada.
   */
  it('el corazon no anade al carrito', async () => {
    const onAddToCart = vi.fn()
    renderGrid({ onAddToCart })

    await userEvent.click(screen.getByTestId('wish-espada-de-hierro'))

    expect(onAddToCart).not.toHaveBeenCalled()
  })
})

describe('Un heroe ya adquirido no se puede volver a comprar', () => {
  const hero = (sku: string, name: string): ShowcaseProduct =>
    showcaseProduct({ productId: sku, sku, name, type: 'HEROE' })
  const HERO_PRODUCTS = [hero('guerrero-tanque', 'Guerrero Tanque')]

  it('deshabilita "Añadir al carrito" y dice "Ya lo tienes" cuando el heroe ya es propio', () => {
    renderWithProviders(
      <ShowcaseGrid
        products={HERO_PRODUCTS}
        onAddToCart={vi.fn()}
        onOpenDetail={vi.fn()}
        isOwned={() => true}
      />,
    )

    const button = screen.getByRole('button', { name: 'Anadir Guerrero Tanque al carrito' })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Ya lo tienes')
  })

  /**
   * "Propio" es informativo para cualquier producto (CA-03); solo un heroe
   * ademas bloquea la compra, porque solo el es unico por jugador.
   */
  it('un producto que no es heroe sigue siendo comprable aunque ya sea propio', () => {
    renderGrid({ isOwned: () => true })

    const button = screen.getByRole('button', { name: 'Anadir Espada de hierro al carrito' })
    expect(button).toBeEnabled()
    expect(button).toHaveTextContent('Añadir al carrito')
  })
})

describe('Productos que nunca son candidatos de compra con dinero se omiten', () => {
  /**
   * No-premium o sin `realMoneyPrice` es un estado ESTRUCTURAL (ver
   * "Elegibilidad de comercializacion premium" en
   * ecommerce-integration-v1.md): la tarjeta no se pinta como "No disponible",
   * directamente no ocupa espacio en la vitrina.
   */
  it('omite un producto no premium en vez de mostrarlo deshabilitado', () => {
    const noPremium = product('sin-premium', 'Escudo de madera')
    renderGrid({ products: [...PRODUCTS, { ...noPremium, premium: false }] })

    expect(screen.queryByTestId('product-sin-premium')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-espada-de-hierro')).toBeInTheDocument()
  })

  it('omite un producto premium sin realMoneyPrice en vez de mostrarlo deshabilitado', () => {
    const sinPrecio = product('sin-precio', 'Yelmo antiguo')
    renderGrid({ products: [...PRODUCTS, { ...sinPrecio, premium: true, realMoneyPrice: null }] })

    expect(screen.queryByTestId('product-sin-precio')).not.toBeInTheDocument()
  })
})

describe('Agotado y suspendido son informativos: se muestran deshabilitados, no se omiten', () => {
  /**
   * A diferencia de no-premium/sin precio, agotado y suspendido son estados
   * TEMPORALES del propio producto comercializable: ocultarlos le quitaria al
   * comprador informacion legitimamente util (p. ej. que vuelva mas tarde).
   */
  it('muestra "Agotado" deshabilitado cuando availableUnits es 0', () => {
    const agotado = product('agotado', 'Arco corto agotado')
    renderGrid({ products: [{ ...agotado, availableUnits: 0 }] })

    const card = screen.getByTestId('product-agotado')
    expect(card).toBeInTheDocument()
    const button = within(card).getByRole('button', {
      name: 'Anadir Arco corto agotado al carrito',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Agotado')
  })

  it('muestra "Suspendido" deshabilitado cuando lifecycleStatus no es ACTIVE', () => {
    const suspendido = product('suspendido', 'Arma suspendida')
    renderGrid({ products: [{ ...suspendido, lifecycleStatus: 'SUSPENDED' }] })

    const card = screen.getByTestId('product-suspendido')
    expect(card).toBeInTheDocument()
    const button = within(card).getByRole('button', { name: 'Anadir Arma suspendida al carrito' })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Suspendido')
  })

  it('un producto comercializable, disponible y activo se muestra habilitado', () => {
    renderGrid()

    const button = screen.getByRole('button', { name: 'Anadir Espada de hierro al carrito' })
    expect(button).toBeEnabled()
    expect(button).toHaveTextContent('Añadir al carrito')
  })
})

describe('La vitrina funciona sin lista de deseos', () => {
  /** Si no se pasan las props de HU-56, la tarjeta no inventa marcadores. */
  it('no muestra corazon ni marcas', () => {
    renderWithProviders(
      <ShowcaseGrid products={PRODUCTS} onAddToCart={vi.fn()} onOpenDetail={vi.fn()} />,
    )

    expect(screen.queryByTestId('wish-espada-de-hierro')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-deseos-espada-de-hierro')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-propio-espada-de-hierro')).not.toBeInTheDocument()
    // Y lo que si existia sigue funcionando.
    expect(screen.getByRole('button', { name: 'Anadir Espada de hierro al carrito' })).toBeEnabled()
  })
})
