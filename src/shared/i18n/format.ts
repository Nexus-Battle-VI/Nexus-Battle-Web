import { currentLanguage } from './language'
import { FORMAT_LOCALES } from './languages'

/**
 * Locale de `Intl` del idioma activo (`es` → `es-CO`, `en` → `en-US`,
 * `fr` → `fr-FR`, `pt` → `pt-BR`). Solo presentacion: ningun valor de negocio
 * cambia al cambiar el idioma.
 */
export const formatLocale = (): string => FORMAT_LOCALES[currentLanguage()]

/** Entero con separador de miles del idioma activo ("49.800", "49,800", "49 800"). */
export const formatInteger = (value: number): string =>
  new Intl.NumberFormat(formatLocale()).format(value)

/** Numero con, como mucho, `digits` decimales. */
export const formatDecimal = (value: number, digits: number): string =>
  new Intl.NumberFormat(formatLocale(), { maximumFractionDigits: digits }).format(value)

/** Hora corta ("14:05", "2:05 PM"). */
export const formatTime = (date: Date): string =>
  date.toLocaleTimeString(formatLocale(), { hour: '2-digit', minute: '2-digit' })

/**
 * Conteo pluralizado ("1 crédito", "2 créditos", "0 crédit", "1.000.000 de
 * créditos"). `count` decide la forma segun las reglas CLDR del idioma; la
 * cifra se muestra ya formateada. Nada de condicionales por idioma.
 */
export const countLabel = (
  t: (key: string, options: { count: number; value: string }) => string,
  key: string,
  count: number,
): string => t(key, { count, value: formatInteger(count) })
