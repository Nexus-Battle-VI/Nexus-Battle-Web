/**
 * Pago simulado (HU-59) y confirmación en pantalla (HU-60).
 * No hay pasarela real, no se guarda la tarjeta y no se envía SMTP.
 */

export interface CheckoutItem {
  id: string
  name: string
  qty: number
  price: number
  isAvailable: boolean
}

export interface CheckoutCart {
  id: string
  userId: string
  items: CheckoutItem[]
  total: number
}

export interface PaymentForm {
  titular: string
  numeroTarjeta: string
  fechaVencimiento: string
  codigoSeguridad: string
}

export interface CheckoutResult {
  success: boolean
  transactionId?: string
  itemsDelivered?: number
  message: string
  status: 'SUCCESS' | 'FAILED'
  items: CheckoutItem[]
  total: number
}

export interface ConfirmationResult {
  sent: boolean
  message: string
  preview?: string
}

export function cardDigits(numeroTarjeta: string): string {
  return numeroTarjeta.replace(/\D/g, '').slice(0, 16)
}

export function formatCardNumber(raw: string): string {
  return cardDigits(raw)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function formatCvv(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4)
}

export function formatTitular(raw: string): string {
  return raw
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
    .toUpperCase()
    .slice(0, 40)
}

export type PaymentErrors = Record<keyof PaymentForm, string | null>

export function validatePaymentForm(form: PaymentForm): PaymentErrors {
  const titular = form.titular.trim()
  const digits = cardDigits(form.numeroTarjeta)
  const expiry = form.fechaVencimiento.trim()
  const cvv = form.codigoSeguridad.replace(/\D/g, '')

  let titularError: string | null = null
  if (!titular) titularError = 'Escribe el nombre del titular.'
  else if (titular.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').length < 2) {
    titularError = 'El titular debe tener al menos dos letras.'
  }

  let numeroError: string | null = null
  if (!digits) numeroError = 'Escribe el número de la tarjeta.'
  else if (digits.length !== 16) numeroError = 'El número debe tener exactamente 16 dígitos.'

  let expiryError: string | null = null
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry)
  if (!expiry) expiryError = 'Escribe el vencimiento (MM/AA).'
  else if (!match) expiryError = 'Usa el formato MM/AA.'
  else {
    const month = Number(match[1])
    const year = 2000 + Number(match[2])
    if (month < 1 || month > 12) expiryError = 'El mes debe estar entre 01 y 12.'
    else {
      const now = new Date()
      const exp = new Date(year, month, 0, 23, 59, 59)
      if (exp < now) expiryError = 'La tarjeta está vencida.'
    }
  }

  let cvvError: string | null = null
  if (!cvv) cvvError = 'Escribe el CVV.'
  else if (cvv.length < 3 || cvv.length > 4) cvvError = 'El CVV debe tener 3 o 4 dígitos.'

  return {
    titular: titularError,
    numeroTarjeta: numeroError,
    fechaVencimiento: expiryError,
    codigoSeguridad: cvvError,
  }
}

/** Declina si los dígitos son 0000 o terminan en 0000 (regla de la demo PI). */
export function simulatePaymentGateway(numeroTarjeta: string): { success: boolean } {
  const digits = cardDigits(numeroTarjeta)
  if (digits === '0000' || digits.endsWith('0000')) {
    return { success: false }
  }
  return { success: true }
}

export async function simulateCheckout(
  cart: CheckoutCart,
  paymentForm: PaymentForm,
): Promise<CheckoutResult> {
  await Promise.resolve()
  const failed = (message: string): CheckoutResult => ({
    success: false,
    message,
    status: 'FAILED',
    items: cart.items,
    total: cart.total,
  })

  if (cart.items.length === 0) {
    return failed('Operación rechazada: El carrito está vacío.')
  }

  const fieldError = Object.values(validatePaymentForm(paymentForm)).find(Boolean)
  if (fieldError) {
    return failed(`Operación rechazada: ${fieldError}`)
  }

  if (!cart.items.every((item) => item.isAvailable)) {
    return failed('Operación rechazada: Un producto ya no cumple las reglas de disponibilidad.')
  }

  const calculatedTotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  if (Math.abs(calculatedTotal - cart.total) > 0.01) {
    return failed('Operación rechazada: El total del carrito no está conciliado.')
  }

  if (!simulatePaymentGateway(paymentForm.numeroTarjeta).success) {
    return failed('Operación rechazada: La pasarela simulada declinó la transacción.')
  }

  return {
    success: true,
    transactionId: `SIM-TX-${String(Date.now())}`,
    itemsDelivered: cart.items.length,
    message: 'Compra simulada completada. Sin movimientos financieros reales.',
    status: 'SUCCESS',
    items: cart.items,
    total: cart.total,
  }
}

export function composeConfirmationPreview(items: CheckoutItem[], totalLabel: string): string {
  const list = items.map((i) => `• ${i.name} ×${String(i.qty)}`).join('\n')
  return `Confirmación institucional\nHas adquirido:\n${list}\nTotal: ${totalLabel}`
}

export async function sendPurchaseConfirmation(
  result: CheckoutResult,
  clientEmail: string,
  totalLabel: string,
): Promise<ConfirmationResult> {
  await Promise.resolve()
  if (result.status !== 'SUCCESS') {
    return { sent: false, message: 'Transacción no exitosa. No se genera confirmación.' }
  }
  if (!clientEmail.trim()) {
    return { sent: false, message: 'Cliente sin correo electrónico registrado.' }
  }

  const preview = composeConfirmationPreview(result.items, totalLabel)
  return {
    sent: true,
    message: `Confirmación preparada para ${clientEmail} (stub: no se envió correo).`,
    preview,
  }
}
