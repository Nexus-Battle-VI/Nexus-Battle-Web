import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { CartPanel } from './CartPanel'
import { useCartPanelState } from './useCartPanelState'
import type { Cart } from './api'

const CART: Cart = {
  id: 'ord-1',
  customerId: 'acc-1',
  status: 'DRAFT',
  currency: 'COP',
  total: 32_000,
  itemCount: 3,
  lines: [
    { sku: 'espada-de-hierro', unitPrice: 15_000, quantity: 2, subtotal: 30_000 },
    { sku: 'pocion-de-vida', unitPrice: 2_000, quantity: 1, subtotal: 2_000 },
  ],
}

const renderPanel = (overrides: Partial<Parameters<typeof CartPanel>[0]> = {}) =>
  renderWithProviders(
    <CartPanel
      cart={CART}
      expanded
      onToggle={vi.fn()}
      onChangeQuantity={vi.fn()}
      onRemove={vi.fn()}
      {...overrides}
    />,
  )

describe('CartPanel — vista minimizada', () => {
  it('muestra solo el icono y el numero de productos agregados', () => {
    renderPanel({ expanded: false })

    expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3')
    // Ni detalle, ni total, ni boton de pago: RF-58 dice «unicamente».
    expect(screen.queryByText('espada-de-hierro')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cart-total')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Proceder al pago' })).not.toBeInTheDocument()
  })

  it('el numero esta en el nombre accesible, no solo pintado', () => {
    renderPanel({ expanded: false })

    expect(screen.getByRole('button', { name: 'Carrito, 3 productos' })).toBeInTheDocument()
  })

  it('muestra cero cuando no hay carrito', () => {
    renderPanel({ expanded: false, cart: null })

    expect(screen.getByTestId('cart-item-count')).toHaveTextContent('0')
  })

  it('despliega el carrito al pulsarlo', async () => {
    const onToggle = vi.fn()
    renderPanel({ expanded: false, onToggle })

    await userEvent.click(screen.getByRole('button', { name: 'Carrito, 3 productos' }))

    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe('CartPanel — vista desplegada', () => {
  /** CA-01: imagen, nombre, precio unitario, cantidad y subtotal por producto. */
  it('muestra los cinco datos de cada producto', () => {
    renderPanel({
      cart: {
        ...CART,
        lines: [
          {
            ...CART.lines[0]!,
            productId: 'product-uuid',
            name: 'Espada real',
            imageUrl: 'https://images.example.test/espada.webp',
          },
        ],
      },
    })

    expect(screen.getByText('Espada real')).toBeInTheDocument()
    expect(screen.getByText('$ 150,00 por unidad')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad de Espada real')).toHaveValue(2)
    expect(screen.getByTestId('subtotal-espada-de-hierro')).toHaveTextContent('300,00')
    expect(screen.getByRole('img', { name: 'Espada real' })).toHaveAttribute(
      'src',
      'https://images.example.test/espada.webp',
    )
  })

  it('muestra el total y el boton para proceder al pago', () => {
    renderPanel({ onCheckout: vi.fn() })

    expect(screen.getByTestId('cart-total')).toHaveTextContent('320,00')
    expect(screen.getByRole('button', { name: 'Proceder al pago' })).toBeEnabled()
  })

  it('muestra el recuento de unidades junto al titulo', () => {
    renderPanel()

    expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3')
  })

  it('declara el carrito vacio sin inventar lineas', () => {
    renderPanel({ cart: { ...CART, lines: [], total: 0, itemCount: 0 } })

    expect(screen.getByText('Tu carrito esta vacio.')).toBeInTheDocument()
    expect(screen.queryByTestId('cart-total')).not.toBeInTheDocument()
  })

  it('tambien lo declara vacio cuando todavia no hay carrito', () => {
    renderPanel({ cart: null })

    expect(screen.getByText('Tu carrito esta vacio.')).toBeInTheDocument()
  })
})

describe('CartPanel — modificar el contenido', () => {
  /** CA-02: la cantidad enviada es el total deseado, no un incremento. */
  it('envia la cantidad exacta al salir del campo', async () => {
    const onChangeQuantity = vi.fn()
    renderPanel({ onChangeQuantity })

    const field = screen.getByLabelText('Cantidad de espada-de-hierro')
    await userEvent.clear(field)
    await userEvent.type(field, '5')
    await userEvent.tab()

    expect(onChangeQuantity).toHaveBeenCalledExactlyOnceWith('espada-de-hierro', 5)
  })

  it('tambien confirma con Enter', async () => {
    const onChangeQuantity = vi.fn()
    renderPanel({ onChangeQuantity })

    const field = screen.getByLabelText('Cantidad de espada-de-hierro')
    await userEvent.clear(field)
    await userEvent.type(field, '7{Enter}')

    expect(onChangeQuantity).toHaveBeenCalledExactlyOnceWith('espada-de-hierro', 7)
  })

  /**
   * Escribir «12» no puede producir dos peticiones, la primera pidiendo una
   * cantidad de 1 que nadie quiso.
   */
  it('no envia una peticion por cada tecla', async () => {
    const onChangeQuantity = vi.fn()
    renderPanel({ onChangeQuantity })

    const field = screen.getByLabelText('Cantidad de espada-de-hierro')
    await userEvent.clear(field)
    await userEvent.type(field, '12')

    expect(onChangeQuantity).not.toHaveBeenCalled()

    await userEvent.tab()

    expect(onChangeQuantity).toHaveBeenCalledExactlyOnceWith('espada-de-hierro', 12)
  })

  /**
   * Vaciar el campo para escribir otra cifra no es pedir cantidad cero: se
   * descarta el borrador y vuelve lo que hay en el carrito.
   */
  it('un campo vacio no envia nada y recupera la cantidad vigente', async () => {
    const onChangeQuantity = vi.fn()
    renderPanel({ onChangeQuantity })

    const field = screen.getByLabelText('Cantidad de espada-de-hierro')
    await userEvent.clear(field)
    await userEvent.tab()

    expect(onChangeQuantity).not.toHaveBeenCalled()
    expect(field).toHaveValue(2)
  })

  it('no envia nada si la cantidad no cambio', async () => {
    const onChangeQuantity = vi.fn()
    renderPanel({ onChangeQuantity })

    await userEvent.click(screen.getByLabelText('Cantidad de espada-de-hierro'))
    await userEvent.tab()

    expect(onChangeQuantity).not.toHaveBeenCalled()
  })

  it('retira una referencia', async () => {
    const onRemove = vi.fn()
    renderPanel({ onRemove })

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar espada-de-hierro del carrito' }),
    )

    expect(onRemove).toHaveBeenCalledWith('espada-de-hierro')
  })

  /** Solo se bloquea la fila en curso, no el carrito entero. */
  it('deshabilita unicamente la fila con una operacion en curso', () => {
    renderPanel({ busySku: 'espada-de-hierro' })

    expect(screen.getByLabelText('Cantidad de espada-de-hierro')).toBeDisabled()
    expect(screen.getByLabelText('Cantidad de pocion-de-vida')).toBeEnabled()
  })

  it('minimiza el carrito desde la vista desplegada', async () => {
    const onToggle = vi.fn()
    renderPanel({ onToggle })

    await userEvent.click(screen.getByRole('button', { name: 'Minimizar' }))

    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe('useCartPanelState', () => {
  const Probe = (): React.JSX.Element => {
    const panel = useCartPanelState()

    return (
      <button type="button" onClick={panel.toggle}>
        {panel.expanded ? 'desplegado' : 'minimizado'}
      </button>
    )
  }

  it('empieza minimizado y alterna al pulsar', async () => {
    renderWithProviders(<Probe />)

    expect(screen.getByRole('button', { name: 'minimizado' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: 'desplegado' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: 'minimizado' })).toBeInTheDocument()
  })
})

describe('CartPanel — los importes vienen del servicio', () => {
  /**
   * El subtotal que se muestra es el que devuelve el servicio, no
   * `precio x cantidad` calculado aqui. Se comprueba con un subtotal que NO
   * coincide con esa multiplicacion: si la interfaz lo recalculara, mostraria
   * otra cosa.
   */
  it('no recalcula el subtotal por su cuenta', () => {
    renderPanel({
      cart: {
        ...CART,
        lines: [{ sku: 'espada-de-hierro', unitPrice: 15_000, quantity: 2, subtotal: 27_000 }],
        total: 27_000,
      },
    })

    expect(screen.getByTestId('subtotal-espada-de-hierro')).toHaveTextContent('270,00')
  })

  it('tampoco recalcula el total', () => {
    renderPanel({ cart: { ...CART, total: 99_900 } })

    expect(screen.getByTestId('cart-total')).toHaveTextContent('999,00')
  })
})
