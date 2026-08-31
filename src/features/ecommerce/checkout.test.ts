import { describe, expect, it } from 'vitest'
import {
  formatCardNumber,
  formatCvv,
  formatExpiry,
  formatTitular,
  sendPurchaseConfirmation,
  simulateCheckout,
  simulatePaymentGateway,
  validatePaymentForm,
  type CheckoutCart,
  type PaymentForm,
} from './checkout'

function validForm(overrides: Partial<PaymentForm> = {}): PaymentForm {
  return {
    titular: 'JUAN PEREZ',
    numeroTarjeta: '4111 1111 1111 1111',
    fechaVencimiento: '12/29',
    codigoSeguridad: '123',
    ...overrides,
  }
}

function cart(overrides: Partial<CheckoutCart> = {}): CheckoutCart {
  return {
    id: 'cart-1',
    userId: 'cliente-nexus',
    items: [{ id: 'p01', name: 'Espada de una mano', qty: 1, price: 20000, isAvailable: true }],
    total: 20000,
    ...overrides,
  }
}

describe('formatters de pago', () => {
  it('el titular queda solo en mayúsculas', () => {
    expect(formatTitular('juan pérez 99')).toBe('JUAN PÉREZ ')
  })

  it('el número no pasa de 16 dígitos y se agrupa', () => {
    expect(formatCardNumber('41111111111111119999')).toBe('4111 1111 1111 1111')
  })

  it('formatea vencimiento MM/AA y CVV de 3 o 4 dígitos', () => {
    expect(formatExpiry('1229')).toBe('12/29')
    expect(formatCvv('12345')).toBe('1234')
  })
})

describe('validatePaymentForm', () => {
  it('acepta un formulario válido', () => {
    const errors = validatePaymentForm(validForm())
    expect(Object.values(errors).every((e) => e === null)).toBe(true)
  })

  it('exige 16 dígitos, mes 01-12 y CVV 3-4', () => {
    expect(validatePaymentForm(validForm({ numeroTarjeta: '4111' })).numeroTarjeta).toMatch(/16/)
    expect(validatePaymentForm(validForm({ fechaVencimiento: '13/29' })).fechaVencimiento).toMatch(
      /mes/,
    )
    expect(validatePaymentForm(validForm({ codigoSeguridad: '12' })).codigoSeguridad).toMatch(/CVV/)
  })
})

describe('simulatePaymentGateway', () => {
  it('declina si termina en 0000', () => {
    expect(simulatePaymentGateway('4111 1111 1111 0000').success).toBe(false)
    expect(simulatePaymentGateway('4111 1111 1111 1111').success).toBe(true)
  })
})

describe('simulateCheckout', () => {
  it('rechaza carrito vacío', async () => {
    const result = await simulateCheckout(cart({ items: [], total: 0 }), validForm())
    expect(result.success).toBe(false)
    expect(result.status).toBe('FAILED')
  })

  it('rechaza total no conciliado', async () => {
    const result = await simulateCheckout(cart({ total: 1 }), validForm())
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/conciliado/)
  })

  it('declina 0000 y no marca éxito', async () => {
    const result = await simulateCheckout(
      cart(),
      validForm({ numeroTarjeta: '4111 1111 1111 0000' }),
    )
    expect(result.success).toBe(false)
    expect(result.transactionId).toBeUndefined()
  })

  it('aprueba un cobro simulado sin guardar tarjeta', async () => {
    const result = await simulateCheckout(cart(), validForm())
    expect(result.success).toBe(true)
    expect(result.status).toBe('SUCCESS')
    expect(result.transactionId).toMatch(/^SIM-TX-/)
    expect(result.message).toMatch(/sin movimientos financieros/i)
  })
})

describe('sendPurchaseConfirmation', () => {
  it('no genera correo si el pago falló', async () => {
    const failed = await simulateCheckout(
      cart(),
      validForm({ numeroTarjeta: '0000 0000 0000 0000' }),
    )
    const mail = await sendPurchaseConfirmation(failed, 'cliente@local', '$ 20.000 COP')
    expect(mail.sent).toBe(false)
  })

  it('prepara stub de confirmación en éxito, sin SMTP', async () => {
    const ok = await simulateCheckout(cart(), validForm())
    const mail = await sendPurchaseConfirmation(ok, 'cliente@local', '$ 20.000 COP')
    expect(mail.sent).toBe(true)
    expect(mail.message).toMatch(/stub/i)
    expect(mail.preview).toContain('Espada de una mano')
  })
})
