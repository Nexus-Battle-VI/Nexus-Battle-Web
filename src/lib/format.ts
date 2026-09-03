/**
 * Formato de importes.
 *
 * Los servicios devuelven el importe como **entero en la unidad minima de la
 * moneda**. Convertirlo a una representacion legible es responsabilidad de la
 * presentacion, y ocurre en un unico lugar para que no aparezcan divisiones
 * por 100 repartidas por la interfaz.
 */
const MINOR_UNITS: Readonly<Record<string, number>> = {
  COP: 2,
  USD: 2,
  EUR: 2,
}

export const formatMoney = (amount: number, currency: string, locale = 'es-CO'): string => {
  const digits = MINOR_UNITS[currency] ?? 2

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits)
}

export const formatDateTime = (iso: string, locale = 'es-CO'): string => {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Traduce un estado del dominio a una etiqueta legible. */
export const STATUS_LABELS: Readonly<Record<string, string>> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  PENDING_VERIFICATION: 'Pendiente de verificacion',
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  RECEIVED: 'Recibida',
}

export const statusLabel = (status: string): string => STATUS_LABELS[status] ?? status
