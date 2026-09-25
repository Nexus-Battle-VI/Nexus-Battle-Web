import { formatLocale } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'

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

/**
 * `locale` por defecto: el del idioma activo (`es-CO`, `en-US`, `fr-FR`,
 * `pt-BR`). Cambia como se lee el importe, nunca el importe.
 */
export const formatMoney = (amount: number, currency: string, locale = formatLocale()): string => {
  const digits = MINOR_UNITS[currency] ?? 2

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits)
}

export const formatDateTime = (iso: string, locale = formatLocale()): string => {
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
  // Estado de moderacion de un comentario (HU-41).
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  DELETED: 'Eliminado',
  HIDDEN: 'Oculto',
  EDITED: 'Editado',
  MARKED: 'Marcado',
  // Sala de batalla esperando jugadores (HU-14).
  WAITING_FOR_PLAYERS: 'Esperando jugadores',
  // Sala de batalla en preparacion, tras llenarse (HU-15).
  PREPARING: 'Preparando batalla',
}

/**
 * Etiqueta del estado en el idioma activo. `STATUS_LABELS` queda como la
 * referencia en español de los estados conocidos; un estado desconocido se
 * muestra tal cual.
 */
export const statusLabel = (status: string): string =>
  STATUS_LABELS[status] === undefined ? status : i18n.t(`common:status.${status}`)
