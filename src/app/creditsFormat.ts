import { i18n } from '@/shared/i18n/i18n'
import { formatDecimal, formatInteger } from '@/shared/i18n/format'

/**
 * Cifra completa con el separador de miles del idioma activo ("49.800" en
 * español, "49,800" en ingles). El valor es el mismo: solo cambia como se lee.
 */
export const fullCredits = (value: number): string => formatInteger(value)

/**
 * Cifra corta para pantallas estrechas ("49,8 mil", "1,2 M"). Propia en vez de
 * `notation: 'compact'`, cuya abreviatura cambia entre motores ("mil" / "k").
 * El sufijo sale de la traduccion (`common:number.*`). Trunca en lugar de
 * redondear: nunca muestra mas creditos de los que hay.
 */
export const compactCredits = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    return `${formatDecimal(Math.trunc(value / 100_000) / 10, 1)} ${i18n.t('common:number.million')}`
  }

  if (Math.abs(value) >= 10_000) {
    return `${formatDecimal(Math.trunc(value / 100) / 10, 1)} ${i18n.t('common:number.thousand')}`
  }

  return formatInteger(value)
}
