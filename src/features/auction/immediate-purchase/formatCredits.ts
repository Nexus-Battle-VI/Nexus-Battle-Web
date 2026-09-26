import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

/**
 * `2500` -> `2.500 créditos`. Separador y plural del idioma activo de la
 * interfaz (no del navegador): en es-CO la cifra queda igual que antes.
 */
export const formatCredits = (amount: number): string => {
  const value = Math.trunc(amount)

  return i18n.t('common:count.credits', { count: value, value: formatInteger(value) })
}
