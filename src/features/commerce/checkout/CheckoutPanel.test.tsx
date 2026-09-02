import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { CheckoutPanel } from './CheckoutPanel'
import type { CheckoutSummary, PaymentResult } from './api'

const SUMMARY: CheckoutSummary = {
  id: 'ord-1',
  status: 'DRAFT',
  currency: 'COP',
  total: 32_000,
  itemCount: 3,
  lines: [
    { sku: 'espada-de-hierro', unitPrice: 15_000, quantity: 2, subtotal: 30_000 },
    { sku: 'pocion-de-vida', unitPrice: 2_000, quantity: 1, subtotal: 2_000 },
  ],
}

const RESULT: PaymentResult = {
  order: { ...SUMMARY, status: 'CONFIRMED' },
  paymentReference: 'sim-ord-1',
  maskedCard: '1111',
  realMoneyMoved: false,
}

const renderPanel = (overrides: Partial<Parameters<typeof CheckoutPanel>[0]> = {}) =>
  renderWithProviders(
    <CheckoutPanel summary={SUMMARY} onPay={vi.fn()} onCancel={vi.fn()} {...overrides} />,
  )

/** Rellena los cuatro campos con datos validos. */
const fillValidCard = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText('Nombre del titular'), 'Ana Gomez')
  await userEvent.type(screen.getByLabelText('Numero de tarjeta'), '4111111111111111')
  await userEvent.type(screen.getByLabelText('Vencimiento'), '12/30')
  await userEvent.type(screen.getByLabelText('Codigo de seguridad'), '123')
}

describe('Resumen de la compra (CA-02)', () => {
  it('muestra los productos vigentes y sus subtotales', () => {
    renderPanel()

    expect(screen.getByText(/espada-de-hierro/u)).toBeInTheDocument()
    expect(screen.getByTestId('resumen-subtotal-espada-de-hierro')).toHaveTextContent('300,00')
    expect(screen.getByTestId('resumen-subtotal-pocion-de-vida')).toHaveTextContent('20,00')
  })

  it('muestra el total a pagar', () => {
    renderPanel()

    expect(screen.getByTestId('resumen-total')).toHaveTextContent('320,00')
  })

  /** El total mostrado es el del servicio, no uno recalculado aqui. */
  it('no recalcula el total por su cuenta', () => {
    renderPanel({ summary: { ...SUMMARY, total: 99_900 } })

    expect(screen.getByTestId('resumen-total')).toHaveTextContent('999,00')
  })
})

describe('Formulario de pago simulado', () => {
  it('pide exactamente los cuatro datos documentados', () => {
    renderPanel()

    expect(screen.getByLabelText('Nombre del titular')).toBeInTheDocument()
    expect(screen.getByLabelText('Numero de tarjeta')).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimiento')).toBeInTheDocument()
    expect(screen.getByLabelText('Codigo de seguridad')).toBeInTheDocument()
  })

  it('declara que la pasarela es simulada', () => {
    renderPanel()

    expect(screen.getByText(/no ejecuta ningun movimiento financiero real/u)).toBeInTheDocument()
  })

  /**
   * La pasarela es academica y no cobra: invitar al navegador a rellenar una
   * tarjeta real seria pedir un dato sensible para un flujo que no lo necesita.
   */
  it('no invita al navegador a autocompletar una tarjeta real', () => {
    renderPanel()

    for (const label of [
      'Nombre del titular',
      'Numero de tarjeta',
      'Vencimiento',
      'Codigo de seguridad',
    ]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('autocomplete', 'off')
    }
  })

  it('envia los cuatro datos al confirmar', async () => {
    const onPay = vi.fn()
    renderPanel({ onPay })

    await fillValidCard()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))

    expect(onPay).toHaveBeenCalledExactlyOnceWith({
      holder: 'Ana Gomez',
      number: '4111111111111111',
      expiry: '12/30',
      securityCode: '123',
    })
  })

  /** CP-59-02: con un dato ausente, no se intenta la compra. */
  it('no confirma cuando falta un dato documentado', async () => {
    const onPay = vi.fn()
    renderPanel({ onPay })

    await userEvent.type(screen.getByLabelText('Nombre del titular'), 'Ana Gomez')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))

    expect(onPay).not.toHaveBeenCalled()
    expect(
      screen.getByText('El numero de tarjeta solo admite digitos, espacios o guiones.'),
    ).toBeInTheDocument()
  })

  it('los errores solo aparecen tras intentar confirmar', async () => {
    renderPanel()

    expect(screen.queryByText('Escribe el nombre del titular.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))

    expect(screen.getByText('Escribe el nombre del titular.')).toBeInTheDocument()
  })

  it('marca los campos invalidos para las tecnologias de apoyo', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))

    expect(screen.getByLabelText('Numero de tarjeta')).toHaveAttribute('aria-invalid', 'true')
  })

  it('muestra el error que devuelve el servicio', () => {
    renderPanel({ error: new Error('La pasarela simulada rechazo la tarjeta.') })

    expect(screen.getByRole('alert')).toHaveTextContent('La pasarela simulada rechazo la tarjeta.')
  })

  it('permite volver al carrito', async () => {
    const onCancel = vi.fn()
    renderPanel({ onCancel })

    await userEvent.click(screen.getByRole('button', { name: 'Volver al carrito' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('bloquea las acciones mientras se procesa el pago', () => {
    renderPanel({ isPaying: true })

    expect(screen.getByRole('button', { name: 'Volver al carrito' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()
  })
})

describe('Compra completada (CA-01, CA-03)', () => {
  it('muestra la referencia, el total y los cuatro ultimos digitos', () => {
    renderPanel({ result: RESULT })

    expect(screen.getByRole('heading', { name: 'Compra completada' })).toBeInTheDocument()
    expect(screen.getByText(/sim-ord-1/u)).toBeInTheDocument()
    expect(screen.getByText(/terminada en 1111/u)).toBeInTheDocument()
    expect(screen.getByText(/320,00/u)).toBeInTheDocument()
  })

  /** CA-03: la evidencia de que no hubo movimiento real esta a la vista. */
  it('declara que no se ejecuto ningun movimiento financiero real', () => {
    renderPanel({ result: RESULT })

    expect(screen.getByText(/no se ejecuto ningun movimiento financiero real/u)).toBeInTheDocument()
  })

  /**
   * Si el servicio dijera lo contrario, la pantalla NO lo silencia: lo avisa.
   * Callarlo convertiria la declaracion en decorativa.
   */
  it('avisa si el servicio informa de un movimiento real', () => {
    renderPanel({ result: { ...RESULT, realMoneyMoved: true } })

    expect(screen.getByText(/informa de un movimiento financiero real/u)).toBeInTheDocument()
  })

  it('el formulario desaparece tras completar la compra', () => {
    renderPanel({ result: RESULT })

    expect(screen.queryByLabelText('Numero de tarjeta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar pago' })).not.toBeInTheDocument()
  })

  it('no muestra el numero completo de la tarjeta en ningun momento', async () => {
    const { container } = renderPanel({ onPay: vi.fn() })

    await fillValidCard()
    // Se comprueba sobre el texto renderizado, no sobre el valor del campo.
    expect(container.textContent).not.toContain('4111111111111111')
  })
})
