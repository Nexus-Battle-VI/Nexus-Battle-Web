import { formatMoney } from '@/lib/format'
import { formatDecimal, formatInteger, formatLocale } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'

import type { CreditsAmount, RealMoneyAmount } from './types'

/** Valor ausente: tasas y promedios no se calculan sin datos y se muestran como "—". */
export const DASH = '—'

export const formatCount = (value: number): string => formatInteger(value)

/** Razon 0..1 como porcentaje entero ("63 %"); `null` (sin denominador) es "—", nunca 0 %. */
export const formatRate = (value: number | null): string =>
  value === null
    ? DASH
    : new Intl.NumberFormat(formatLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(
        value,
      )

/**
 * Importe en creditos con plural ("1 crédito", "2 créditos"), mismo patron que
 * `common:count.credits`. El importe puede tener hasta 2 decimales, asi que NO pasa por
 * `countLabel` (que redondea a entero).
 */
export const formatCredits = (amount: CreditsAmount | number | null): string => {
  if (amount === null) {
    return DASH
  }

  const value = typeof amount === 'number' ? amount : amount.amount

  return i18n.t('common:count.credits', { count: value, value: formatDecimal(value, 2) })
}

/** Dinero real: entero en la unidad minima de SU moneda (`amountMinor`), nunca convertido a creditos. */
export const formatRealMoney = (amount: RealMoneyAmount): string =>
  formatMoney(amount.amountMinor, amount.currency)

/** Duracion en segundos: "2 d", "1 d 8 h", "2 h 37 min", "41 s". `null` es "—". */
export const formatDuration = (seconds: number | null): string => {
  if (seconds === null) {
    return DASH
  }

  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const parts: string[] = []

  if (days > 0) parts.push(`${String(days)} d`)
  if (hours > 0) parts.push(`${String(hours)} h`)
  if (minutes > 0 && days === 0) parts.push(`${String(minutes)} min`)
  if (parts.length === 0) parts.push(`${String(seconds)} s`)

  return parts.join(' ')
}

const dayFormatter = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(formatLocale(), { ...options, timeZone: 'UTC' })

/** "7 sept": dia y mes abreviado, siempre en UTC (el periodo del contrato es UTC). */
export const formatDay = (iso: string): string =>
  dayFormatter({ day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '')

/** "oct 2026" para los buckets mensuales. */
export const formatMonth = (iso: string): string =>
  dayFormatter({ month: 'short', year: 'numeric' }).format(new Date(iso)).replace('.', '')

/** "6 oct 2026, 3:20 p. m. UTC": el instante de la consulta, sin convertirlo a hora local. */
export const formatInstantUtc = (iso: string): string =>
  `${dayFormatter({ dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))} UTC`

/** Rango "7 sept – 5 oct de 2026" (o con ambos anios si cruza de anio). */
export const formatPeriodRange = (from: string, to: string): string => {
  const fromYear = String(new Date(from).getUTCFullYear())
  const toYear = String(new Date(to).getUTCFullYear())

  return fromYear === toYear
    ? i18n.t('auctionMetrics:filters.rangeSameYear', {
        from: formatDay(from),
        to: formatDay(to),
        year: toYear,
      })
    : i18n.t('auctionMetrics:filters.rangeCrossYear', {
        from: formatDay(from),
        to: formatDay(to),
        fromYear,
        toYear,
      })
}

/** Primer caracter visible del nombre: la "imagen" del producto en la tabla (sin recurso externo). */
export const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase()
